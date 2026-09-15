package search

import (
	"strings"
	"testing"

	"openreplay/backend/pkg/analytics/model"
)

func TestBuildCountsQueryNoFilters(t *testing.T) {
	q := buildCountsQuery(42, &model.SessionsSearchRequest{
		StartDate: 1_700_000_000_000,
		EndDate:   1_700_604_800_000,
	})

	if strings.Contains(q, "product_analytics.events") {
		t.Errorf("unfiltered counts query still reads the events table:\n%s", q)
	}
	for _, banned := range []string{"JOIN", "distinct_id", "countDistinct"} {
		if strings.Contains(q, banned) {
			t.Errorf("query contains %q, want it gone:\n%s", banned, q)
		}
	}
	for _, want := range []string{
		"uniq(s.session_id) AS sessions_count",
		"uniqIf(s.user_id, ifNull(s.user_id, '') != '') AS users_count",
		"FROM experimental.sessions AS s",
		"s.project_id = 42",
		"s.datetime >= toDateTime(1700000000)",
		"s.datetime < toDateTime(1700604800)",
		"SETTINGS " + countsQuerySettings,
	} {
		if !strings.Contains(q, want) {
			t.Errorf("query missing %q:\n%s", want, q)
		}
	}
	if strings.Contains(q, "BETWEEN") {
		t.Errorf("query uses BETWEEN, want a half-open range:\n%s", q)
	}
}

func TestBuildCountsQueryUsesSemiJoinNotJoin(t *testing.T) {
	q := buildCountsQuery(7, &model.SessionsSearchRequest{
		StartDate:   1_700_000_000_000,
		EndDate:     1_700_604_800_000,
		EventsOrder: "and",
		Filters: []model.Filter{
			{IsEvent: true, Name: "CLICK", Operator: "=", Value: []string{"buy"}},
		},
	})

	if strings.Contains(q, "JOIN") {
		t.Errorf("event-filtered query still uses a JOIN, want IN:\n%s", q)
	}
	if !strings.Contains(q, "s.session_id IN (") {
		t.Errorf("event-filtered query missing the IN semi-join:\n%s", q)
	}
	if strings.Contains(q, "any(distinct_id)") {
		t.Errorf("query still aggregates distinct_id:\n%s", q)
	}
}

func TestEventSessionsSubqueryNone(t *testing.T) {
	if got := eventSessionsSubquery(1, 100, 200, nil, nil, "and"); got != "" {
		t.Errorf("no event filters should yield no subquery, got:\n%s", got)
	}
}

func TestEventSessionsSubquerySingleEventPushedDown(t *testing.T) {
	got := eventSessionsSubquery(1, 100, 200, []string{`e."$event_name" = 'CLICK'`}, nil, "and")

	if !strings.Contains(got, `e."$event_name" = 'CLICK'`) {
		t.Errorf("single event condition not pushed into WHERE:\n%s", got)
	}
	if strings.Contains(got, "GROUP BY") {
		t.Errorf("single-event subquery should not aggregate:\n%s", got)
	}
}

func TestEventSessionsSubqueryMultiEventGetsOrPrefilter(t *testing.T) {
	evs := []string{`e."$event_name" = 'CLICK'`, `e."$event_name" = 'LOCATION'`}

	for _, order := range []string{"and", "or", "then"} {
		got := eventSessionsSubquery(1, 100, 200, evs, nil, order)

		want := `(e."$event_name" = 'CLICK' OR e."$event_name" = 'LOCATION')`
		if !strings.Contains(got, want) {
			t.Errorf("order %q: missing OR prefilter %q:\n%s", order, want, got)
		}
		if !strings.Contains(got, "HAVING") {
			t.Errorf("order %q: prefilter must not replace the HAVING:\n%s", order, got)
		}
		if !strings.Contains(got, "GROUP BY") {
			t.Errorf("order %q: missing GROUP BY:\n%s", order, got)
		}
	}
}

func TestEventSessionsSubqueryUnknownOrderKeepsOldBehaviour(t *testing.T) {
	evs := []string{`e."$event_name" = 'CLICK'`, `e."$event_name" = 'LOCATION'`}
	got := eventSessionsSubquery(1, 100, 200, evs, nil, "somethingelse")

	if strings.Contains(got, " OR ") {
		t.Errorf("unknown order must not gain a prefilter:\n%s", got)
	}
	if strings.Contains(got, "HAVING") {
		t.Errorf("unknown order should produce no HAVING:\n%s", got)
	}
}

func TestEventSessionsSubqueryGlobalPropertyFiltersOnly(t *testing.T) {
	got := eventSessionsSubquery(1, 100, 200, nil, []string{`e."$browser" = 'Chrome'`}, "and")

	if got == "" {
		t.Fatal("global property filters must still produce a subquery")
	}
	if !strings.Contains(got, `e."$browser" = 'Chrome'`) {
		t.Errorf("global property filter missing:\n%s", got)
	}
	if strings.Contains(got, " OR ") {
		t.Errorf("no event names to prefilter on, got an OR:\n%s", got)
	}
}

func TestBuildCountsQueryNegativeEventsUseNotIn(t *testing.T) {
	q := buildCountsQuery(7, &model.SessionsSearchRequest{
		StartDate:   1_700_000_000_000,
		EndDate:     1_700_604_800_000,
		EventsOrder: "and",
		Filters: []model.Filter{
			{
				IsEvent: true, Name: "CLICK", Operator: "and",
				Filters: []model.Filter{
					{Name: "label", Operator: "isNot", Value: []string{"buy"}},
				},
			},
		},
	})

	if strings.Contains(q, "ANTI JOIN") {
		t.Errorf("negative filters still use LEFT ANTI JOIN:\n%s", q)
	}
	if !strings.Contains(q, "s.session_id NOT IN (") {
		t.Errorf("negative filters missing NOT IN:\n%s", q)
	}
}
