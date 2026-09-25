package filters

import (
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2"
)

func TestBuildOperatorConditionInBindsGroupSet(t *testing.T) {
	for _, op := range []string{string(FilterOperatorIn), string(FilterOperatorNotIn)} {
		qp := NewParams()
		cond := BuildOperatorCondition("s.user_id", op, []string{"a", "b"}, "singleColumn", "string", qp)

		wantSQL := "s.user_id IN @p1"
		if op == string(FilterOperatorNotIn) {
			wantSQL = "s.user_id NOT IN @p1"
		}
		if cond != wantSQL {
			t.Errorf("%s: got %q, want %q", op, cond, wantSQL)
		}

		v, ok := qp.Values()["p1"]
		if !ok {
			t.Fatalf("%s: p1 not bound, params: %v", op, qp.Values())
		}
		gs, ok := v.(clickhouse.GroupSet)
		if !ok {
			t.Fatalf("%s: p1 bound as %T, want clickhouse.GroupSet", op, v)
		}
		if len(gs.Value) != 2 || gs.Value[0] != "a" || gs.Value[1] != "b" {
			t.Errorf("%s: GroupSet value = %v, want [a b]", op, gs.Value)
		}
	}
}

func TestBuildOperatorConditionScalarBinding(t *testing.T) {
	qp := NewParams()
	if got := BuildOperatorCondition("s.name", string(FilterOperatorIs), []string{"x"}, "singleColumn", "string", qp); got != "s.name = @p1" {
		t.Errorf("is: got %q", got)
	}
	if got := BuildOperatorCondition("s.name", string(FilterOperatorContains), []string{"x"}, "singleColumn", "string", qp); got != "s.name ILIKE @p2" {
		t.Errorf("contains: got %q", got)
	}
	if qp.Values()["p1"] != "x" || qp.Values()["p2"] != "%x%" {
		t.Errorf("params: %v", qp.Values())
	}
}

func TestBuildFilterConditionGenericBindsPropertyName(t *testing.T) {
	qp := NewParams()
	cond := BuildFilterConditionGeneric("s", Filter{
		Name:     "plan",
		Operator: FilterOperatorIs,
		Value:    []string{"pro"},
	}, map[string]string{}, "properties", qp)

	want := "getSubcolumn(s.properties, @p1) = @p2"
	if cond != want {
		t.Errorf("got %q, want %q", cond, want)
	}
	if qp.Values()["p1"] != "plan" || qp.Values()["p2"] != "pro" {
		t.Errorf("params: %v", qp.Values())
	}
}

func TestLikePatternsEscapeMetacharacters(t *testing.T) {
	cases := []struct {
		operator string
		value    string
		want     string
	}{
		{string(FilterOperatorContains), "100%", `%100\%%`},
		{string(FilterOperatorContains), "a_b", `%a\_b%`},
		{string(FilterOperatorContains), `a\b`, `%a\\b%`},
		{string(FilterOperatorStartsWith), "50%", `50\%%`},
		{string(FilterOperatorEndsWith), "_id", `%\_id`},
		{string(FilterOperatorNotContains), "100%", `%100\%%`},
	}
	for _, c := range cases {
		qp := NewParams()
		cond := BuildOperatorCondition("s.name", c.operator, []string{c.value}, "singleColumn", "string", qp)
		if cond == "" {
			t.Fatalf("%s %q: empty condition", c.operator, c.value)
		}
		if got := qp.Values()["p1"]; got != c.want {
			t.Errorf("%s %q: bound pattern = %q, want %q", c.operator, c.value, got, c.want)
		}
	}
}

func TestGroupSetFingerprintNoCollision(t *testing.T) {
	qp := NewParams()
	p1 := qp.Add(GroupSetOf([]string{"a", "b"}))
	p2 := qp.Add(GroupSetOf([]string{"a b"}))
	if p1 == p2 {
		t.Errorf("distinct GroupSets got the same placeholder: %s", p1)
	}
	if p3 := qp.Add(GroupSetOf([]string{"a", "b"})); p3 != p1 {
		t.Errorf("equal GroupSets got different placeholders: %s vs %s", p1, p3)
	}
}
