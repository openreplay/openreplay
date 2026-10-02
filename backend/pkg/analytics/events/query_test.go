package events

import (
	"fmt"
	"regexp"
	"strings"
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2"

	"openreplay/backend/pkg/analytics/events/model"
	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/analytics/lexicon"
)

var placeholderRe = regexp.MustCompile(`@[a-zA-Z0-9_]+`)

func renderValue(v any) string {
	switch x := v.(type) {
	case string:
		return "'" + strings.NewReplacer(`\`, `\\`, `'`, `\'`).Replace(x) + "'"
	case clickhouse.GroupSet:
		parts := make([]string, len(x.Value))
		for i, e := range x.Value {
			parts[i] = renderValue(e)
		}
		return "(" + strings.Join(parts, ", ") + ")"
	}
	return fmt.Sprintf("%v", v)
}

func render(t *testing.T, sql string, qp *filters.Params) string {
	t.Helper()
	values := qp.Values()
	used := make(map[string]bool)
	out := placeholderRe.ReplaceAllStringFunc(sql, func(m string) string {
		name := strings.TrimPrefix(m, "@")
		v, ok := values[name]
		if !ok {
			t.Errorf("placeholder %s has no bound parameter in %s", m, sql)
			return m
		}
		used[name] = true
		return renderValue(v)
	})
	for name := range values {
		if !used[name] {
			t.Errorf("parameter %s bound but not referenced in %s", name, sql)
		}
	}
	return out
}

func renderAll(t *testing.T, conds []string, qp *filters.Params) []string {
	t.Helper()
	return strings.Split(render(t, strings.Join(conds, "\x00"), qp), "\x00")
}

const latestUsersFmt = `SELECT "$user_id", %s, _deleted_at FROM product_analytics.users WHERE project_id = %d ORDER BY _timestamp DESC LIMIT 1 BY "$user_id"`

func wantUserCond(proj uint32, col, def, cond string) string {
	inner := fmt.Sprintf(latestUsersFmt, col, proj)
	return fmt.Sprintf(
		`if((SELECT ifNull((%[3]s), 0) FROM (SELECT %[2]s AS %[1]s) AS u), `+
			`e."$user_id" NOT IN (SELECT "$user_id" FROM (%[4]s) AS u WHERE u._deleted_at = '1970-01-01 00:00:00' AND NOT ifNull((%[3]s), 0)), `+
			`e."$user_id" IN (SELECT "$user_id" FROM (%[4]s) AS u WHERE u._deleted_at = '1970-01-01 00:00:00' AND (%[3]s)))`,
		col, def, cond, inner)
}

func userFilter(name string, op filters.FilterOperatorType, values ...string) filters.Filter {
	return filters.Filter{Name: name, Operator: op, Value: values}
}

func TestBuildEventSearchQueryForProjectUserOperators(t *testing.T) {
	const proj = uint32(7)
	tests := []struct {
		name   string
		filter filters.Filter
		col    string
		def    string
		cond   string
	}{
		{"is", userFilter("$email", filters.FilterOperatorIs, "a@x.io"), `"$email"`, `''`, `u."$email" = 'a@x.io'`},
		{"is multi", userFilter("$email", filters.FilterOperatorIs, "a", ""), `"$email"`, `''`, `u."$email" IN ('a', '')`},
		{"is empty", userFilter("$email", filters.FilterOperatorIs, ""), `"$email"`, `''`, `u."$email" = ''`},
		{"isNot", userFilter("$email", filters.FilterOperatorIsNot, "a"), `"$email"`, `''`, `u."$email" != 'a'`},
		{"isNot empty", userFilter("$email", filters.FilterOperatorIsNot, ""), `"$email"`, `''`, `u."$email" != ''`},
		{"contains", userFilter("$name", filters.FilterOperatorContains, "bo"), `"$name"`, `''`, `u."$name" ILIKE '%bo%'`},
		{"contains empty", userFilter("$name", filters.FilterOperatorContains, ""), `"$name"`, `''`, `u."$name" ILIKE '%%'`},
		{"notContains multi", userFilter("$name", filters.FilterOperatorNotContains, "bo", "al"), `"$name"`, `''`, `NOT ((u."$name" ILIKE '%bo%' OR u."$name" ILIKE '%al%'))`},
		{"startsWith", userFilter("$name", filters.FilterOperatorStartsWith, "bo"), `"$name"`, `''`, `u."$name" ILIKE 'bo%'`},
		{"endsWith", userFilter("$name", filters.FilterOperatorEndsWith, "bo"), `"$name"`, `''`, `u."$name" ILIKE '%bo'`},
		{"isAny", userFilter("$email", filters.FilterOperatorIsAny), `"$email"`, `''`, `isNotNull(u."$email")`},
		{"isUndefined", userFilter("$email", filters.FilterOperatorIsUndefined), `"$email"`, `''`, `isNull(u."$email")`},
		{"notIn", userFilter("$email", filters.FilterOperatorNotIn, "a", "b"), `"$email"`, `''`, `u."$email" NOT IN ('a', 'b')`},
		{"bare column", userFilter("initial_utm_source", filters.FilterOperatorIs, "g"), `initial_utm_source`, `''`, `u.initial_utm_source = 'g'`},
		{"datetime default", filters.Filter{Name: "$created_at", Operator: filters.FilterOperatorBefore, Value: []string{"1700000000000"}, DataType: filters.DataTypeTimestamp}, `"$created_at"`, `toDateTime(0)`, `u."$created_at" < toDateTime(1700000000)`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			qp := filters.NewParams()
			conds := BuildEventSearchQueryForProject("e", proj, []filters.Filter{tt.filter}, []lexicon.HiddenProperty{}, qp)
			if len(conds) != 1 {
				t.Fatalf("conds %v", conds)
			}
			if strings.Contains(conds[0], "LEFT JOIN") {
				t.Errorf("join present: %s", conds[0])
			}
			if got, want := render(t, conds[0], qp), wantUserCond(proj, tt.col, tt.def, tt.cond); got != want {
				t.Errorf("cond\n got %s\nwant %s", got, want)
			}
		})
	}
}

func TestBuildEventSearchQueryForProjectEventSubfilters(t *testing.T) {
	const proj = uint32(5)
	ev := filters.Filter{
		Name:    "click",
		IsEvent: true,
		Filters: []filters.Filter{
			userFilter("$email", filters.FilterOperatorIs, "a"),
			userFilter("$name", filters.FilterOperatorIsNot, "z"),
		},
	}
	qp := filters.NewParams()
	conds := BuildEventSearchQueryForProject("e", proj, []filters.Filter{
		ev,
		userFilter("$phone", filters.FilterOperatorIs, "1"),
	}, nil, qp)
	if len(conds) != 2 {
		t.Fatalf("conds %v", conds)
	}
	wantEvent := `(e."$event_name" = 'click' AND (` +
		wantUserCond(proj, `"$email"`, `''`, `u."$email" = 'a'`) + ` OR ` +
		wantUserCond(proj, `"$name"`, `''`, `u."$name" != 'z'`) + `))`
	rendered := renderAll(t, conds, qp)
	if got := rendered[0]; got != wantEvent {
		t.Errorf("event cond\n got %s\nwant %s", got, wantEvent)
	}
	if got, want := rendered[1], wantUserCond(proj, `"$phone"`, `''`, `u."$phone" = '1'`); got != want {
		t.Errorf("top-level cond\n got %s\nwant %s", got, want)
	}
}

func TestBuildEventSearchQueryForProjectNestedEventFilter(t *testing.T) {
	const proj = uint32(5)
	inner := filters.Filter{
		Name:    "nested",
		IsEvent: true,
		Filters: []filters.Filter{userFilter("$email", filters.FilterOperatorIs, "a")},
	}
	outer := filters.Filter{Name: "click", IsEvent: true, Filters: []filters.Filter{inner}}
	qp := filters.NewParams()
	conds := BuildEventSearchQueryForProject("e", proj, []filters.Filter{outer}, nil, qp)
	if len(conds) != 1 || strings.Contains(conds[0], "getSubcolumn") || !strings.Contains(conds[0], "product_analytics.users") {
		t.Fatalf("nested user filter not resolved: %v", conds)
	}
	want := `(e."$event_name" = 'click' AND ((e."$event_name" = 'nested' AND (` +
		wantUserCond(proj, `"$email"`, `''`, `u."$email" = 'a'`) + `))))`
	if got := render(t, conds[0], qp); got != want {
		t.Errorf("cond\n got %s\nwant %s", got, want)
	}
}

func TestBuildEventSearchQueryForProjectMultiEventGroup(t *testing.T) {
	const proj = uint32(5)
	mk := func(name string, sub filters.Filter) filters.Filter {
		return filters.Filter{Name: name, IsEvent: true, Filters: []filters.Filter{sub}}
	}
	qp := filters.NewParams()
	conds := BuildEventSearchQueryForProject("e", proj, []filters.Filter{
		mk("a", userFilter("$email", filters.FilterOperatorIs, "x")),
		mk("b", userFilter("$name", filters.FilterOperatorNotContains, "y")),
	}, nil, qp)
	if len(conds) != 1 {
		t.Fatalf("conds %v", conds)
	}
	want := `(e."$event_name" IN ('a', 'b') AND (` +
		wantUserCond(proj, `"$email"`, `''`, `u."$email" = 'x'`) + ` OR ` +
		wantUserCond(proj, `"$name"`, `''`, `NOT (u."$name" ILIKE '%y%')`) + `))`
	if got := render(t, conds[0], qp); got != want {
		t.Errorf("cond\n got %s\nwant %s", got, want)
	}
}

func TestBuildSearchQueryParamsOrdering(t *testing.T) {
	const proj = uint32(11)
	e := &eventsImpl{}
	req := &model.EventsSearchRequest{
		StartDate: 1000,
		EndDate:   2000,
		Filters: []filters.Filter{
			{Name: "click", IsEvent: true, Filters: []filters.Filter{userFilter("$email", filters.FilterOperatorIs, "a")}},
			userFilter("$name", filters.FilterOperatorContains, "bo"),
			{Name: "$browser", Operator: filters.FilterOperatorIs, Value: []string{"chrome"}},
		},
	}
	hidden := []lexicon.HiddenEvent{{EventName: "h1", AutoCaptured: true}, {EventName: "h2", AutoCaptured: false}}
	qp := filters.NewParams()
	where := e.buildSearchQueryParams(proj, req, hidden, nil, qp)
	if strings.Contains(where, "LEFT JOIN") {
		t.Errorf("join in where: %s", where)
	}
	if qp.Values()["projectId"] != proj {
		t.Errorf("projectId bound to %v", qp.Values()["projectId"])
	}

	got := render(t, where, qp)
	if !strings.HasPrefix(where, `e.project_id = @projectId AND e.created_at >= @startDate AND e.created_at <= @endDate AND `) {
		t.Errorf("base conditions: %s", where)
	}
	want := `e."$event_name" != 'TAG_TRIGGER'` +
		` AND (e."$event_name", e."$auto_captured") NOT IN (('h1', true), ('h2', false))` +
		` AND (e."$event_name" = 'click' AND (` + wantUserCond(proj, `"$email"`, `''`, `u."$email" = 'a'`) + `))` +
		` AND ` + wantUserCond(proj, `"$name"`, `''`, `u."$name" ILIKE '%bo%'`) +
		` AND e."$browser" = 'chrome'`
	if !strings.Contains(got, want) {
		t.Errorf("where\n got %s\nwant %s", got, want)
	}
}

func TestBuildEventSearchQueryForProjectNoUserFilters(t *testing.T) {
	qp := filters.NewParams()
	conds := BuildEventSearchQueryForProject("e", 1, []filters.Filter{
		{Name: "$browser", Operator: filters.FilterOperatorIs, Value: []string{"chrome"}},
	}, nil, qp)
	if len(conds) != 1 || strings.Contains(conds[0], "product_analytics.users") {
		t.Fatalf("unexpected conds %v", conds)
	}
	if got := render(t, conds[0], qp); got != `e."$browser" = 'chrome'` {
		t.Errorf("cond %s", got)
	}
}

func TestBuildEventSearchQueryLegacyUnchanged(t *testing.T) {
	nested := filters.Filter{Name: "click", IsEvent: true, Filters: []filters.Filter{userFilter("$email", filters.FilterOperatorIs, "n")}}
	tests := []struct {
		name      string
		filters   []filters.Filter
		wantConds []string
		wantJoin  bool
	}{
		{"top level", []filters.Filter{userFilter("$email", filters.FilterOperatorIs, "a")}, []string{`u."$email" = 'a'`}, true},
		{"nested", []filters.Filter{nested}, []string{`(e."$event_name" = 'click' AND (u."$email" = 'n'))`}, true},
		{"none", []filters.Filter{{Name: "$browser", Operator: filters.FilterOperatorIs, Value: []string{"c"}}}, []string{`e."$browser" = 'c'`}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			qp := filters.NewParams()
			conds, needs := BuildEventSearchQuery("e", tt.filters, nil, qp)
			if needs != tt.wantJoin || len(conds) != len(tt.wantConds) {
				t.Fatalf("got %v %v", conds, needs)
			}
			for i := range conds {
				if got := render(t, conds[i], qp); got != tt.wantConds[i] {
					t.Errorf("cond %d got %s want %s", i, got, tt.wantConds[i])
				}
			}
		})
	}
}
