package charts

import (
	"strings"
	"testing"

	"openreplay/backend/pkg/analytics/model"
)

func buildOne(t *testing.T, f model.Filter) string {
	t.Helper()
	ev, ef, nev, sf := BuildWhere([]model.Filter{f}, "", "e", "s")
	return strings.Join(append(append(append(ev, ef...), nev...), sf...), " | ")
}

func TestNumericValueNotInjectable(t *testing.T) {
	inject := []struct {
		name string
		f    model.Filter
	}{
		{"eq", model.Filter{Name: "zz", Operator: "is", Value: []string{"1 OR 1=1"}, DataType: "number"}},
		{"neq", model.Filter{Name: "zz", Operator: "isNot", Value: []string{"1 OR 1=1"}, DataType: "number"}},
		{"in", model.Filter{Name: "zz", Operator: "in", Value: []string{"1 OR 1=1"}, DataType: "number"}},
		{"in-multi", model.Filter{Name: "zz", Operator: "in", Value: []string{"1", "2 OR 1=1"}, DataType: "number"}},
		{"gt", model.Filter{Name: "zz", Operator: ">", Value: []string{"1)) zz"}, DataType: "number"}},
		{"break", model.Filter{Name: "zz", Operator: "is", Value: []string{"1)) zz"}, DataType: "number"}},
	}
	for _, c := range inject {
		got := buildOne(t, c.f)
		if strings.Contains(got, "OR 1=1") || strings.Contains(got, ")) zz") {
			t.Errorf("%s: injection survived: %s", c.name, got)
		}
		if !strings.Contains(got, "NULL") {
			t.Errorf("%s: expected non-numeric value neutralized to NULL: %s", c.name, got)
		}
	}
}

func TestLegitimateNumericPreserved(t *testing.T) {
	cases := map[string]model.Filter{
		"int":   {Name: "zz", Operator: "is", Value: []string{"404"}, DataType: "number"},
		"neg":   {Name: "zz", Operator: "is", Value: []string{"-5"}, DataType: "number"},
		"float": {Name: "zz", Operator: ">", Value: []string{"3.14"}, DataType: "number"},
	}
	for name, f := range cases {
		got := buildOne(t, f)
		if strings.Contains(got, "NULL") {
			t.Errorf("%s: valid numeric wrongly neutralized: %s", name, got)
		}
	}
	if got := buildOne(t, cases["int"]); !strings.Contains(got, "= 404") {
		t.Errorf("int: expected `= 404`, got: %s", got)
	}
}

func TestStringValueStillEscaped(t *testing.T) {
	got := buildOne(t, model.Filter{Name: "zz", Operator: "is", Value: []string{"1 OR 1=1"}, DataType: "string"})
	if strings.Contains(got, "= 1 OR 1=1") {
		t.Errorf("string value not quoted: %s", got)
	}
	if !strings.Contains(got, "'1 OR 1=1'") {
		t.Errorf("expected quoted literal, got: %s", got)
	}
}
