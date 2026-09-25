package charts

import (
	"fmt"
	"strings"
	"testing"

	"openreplay/backend/pkg/analytics/model"
)

func buildOne(t *testing.T, f model.Filter) (string, map[string]any) {
	t.Helper()
	qp := NewParams()
	ev, ef, nev, sf := BuildWhere([]model.Filter{f}, "", "e", "s", qp)
	return strings.Join(append(append(append(ev, ef...), nev...), sf...), " | "), qp.Values()
}

func hasParamValue(params map[string]any, want any) bool {
	for _, v := range params {
		if v == want {
			return true
		}
	}
	return false
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
		got, _ := buildOne(t, c.f)
		if strings.Contains(got, "OR 1=1") || strings.Contains(got, ")) zz") {
			t.Errorf("%s: injection survived: %s", c.name, got)
		}
		if !strings.Contains(got, "NULL") {
			t.Errorf("%s: expected non-numeric value neutralized to NULL: %s", c.name, got)
		}
	}
}

func TestLegitimateNumericPreserved(t *testing.T) {
	cases := map[string]struct {
		f    model.Filter
		want float64
	}{
		"int":   {model.Filter{Name: "zz", Operator: "is", Value: []string{"404"}, DataType: "number"}, 404},
		"neg":   {model.Filter{Name: "zz", Operator: "is", Value: []string{"-5"}, DataType: "number"}, -5},
		"float": {model.Filter{Name: "zz", Operator: ">", Value: []string{"3.14"}, DataType: "number"}, 3.14},
	}
	for name, c := range cases {
		got, params := buildOne(t, c.f)
		if strings.Contains(got, "NULL") {
			t.Errorf("%s: valid numeric wrongly neutralized: %s", name, got)
		}
		if !hasParamValue(params, c.want) {
			t.Errorf("%s: expected %v bound as a parameter, params: %v (sql: %s)", name, c.want, params, got)
		}
	}
}

func TestStringValueBoundAsParameter(t *testing.T) {
	got, params := buildOne(t, model.Filter{Name: "zz", Operator: "is", Value: []string{"1 OR 1=1"}, DataType: "string"})
	if strings.Contains(got, "1 OR 1=1") {
		t.Errorf("string value leaked into SQL text: %s", got)
	}
	if !hasParamValue(params, "1 OR 1=1") {
		t.Errorf("expected value bound as a parameter, params: %v (sql: %s)", params, got)
	}
}

func TestMetadataNameNotInjectable(t *testing.T) {
	inject := []struct {
		name string
		f    model.Filter
	}{
		{"isAny-or", model.Filter{
			Name:     "metadata_2) OR ((SELECT user_id FROM experimental.sessions LIMIT 1)='x'",
			Operator: "isAny",
		}},
		{"isAny-break", model.Filter{
			Name:     "metadata_1))) POC_SYNTAX_BREAK (((",
			Operator: "isAny",
		}},
		{"is-value-expr", model.Filter{
			Name:     "metadata_2) OR 1=1 --",
			Operator: "is",
			Value:    []string{"x"},
		}},
		{"contains-expr", model.Filter{
			Name:     "metadata_1) OR 1=1 --",
			Operator: "contains",
			Value:    []string{"x"},
		}},
		{"trailing-index", model.Filter{
			Name:     "metadata_11 OR 1=1",
			Operator: "isAny",
		}},
	}
	for _, c := range inject {
		got, _ := buildOne(t, c.f)
		// Payloads that don't match the metadata allowlist must never reach the
		// SQL expression position. They may only appear (inert) inside quoted
		// string literals, so strip those before checking for injected tokens.
		bare := stripSQLLiterals(got)
		if strings.Contains(bare, "OR ") || strings.Contains(bare, "SELECT") ||
			strings.Contains(bare, "((") || strings.Contains(bare, "--") {
			t.Errorf("%s: metadata name injection survived: %s", c.name, got)
		}
	}
}

// stripSQLLiterals removes single-quoted string literals so tests can assert
// that attacker-controlled text never lands in unquoted expression position.
func stripSQLLiterals(s string) string {
	var b strings.Builder
	inLit := false
	for i := 0; i < len(s); i++ {
		if s[i] == '\'' {
			// collapse doubled '' escapes inside a literal
			if inLit && i+1 < len(s) && s[i+1] == '\'' {
				i++
				continue
			}
			inLit = !inLit
			continue
		}
		if !inLit {
			b.WriteByte(s[i])
		}
	}
	return b.String()
}

func TestLegitimateMetadataPreserved(t *testing.T) {
	for i := 1; i <= 10; i++ {
		name := fmt.Sprintf("metadata_%d", i)
		got, _ := buildOne(t, model.Filter{Name: name, Operator: "isAny"})
		if !strings.Contains(got, fmt.Sprintf("isNotNull(%s)", name)) {
			t.Errorf("%s: valid metadata column wrongly dropped: %s", name, got)
		}
	}
	got, params := buildOne(t, model.Filter{Name: "metadata_3", Operator: "is", Value: []string{"prod"}})
	if !strings.Contains(got, "metadata_3 = @") {
		t.Errorf("valid metadata equals not built: %s", got)
	}
	if !hasParamValue(params, "prod") {
		t.Errorf("expected metadata value bound as a parameter, params: %v", params)
	}
}

func TestIsMetadataColumn(t *testing.T) {
	valid := []string{"metadata_1", "metadata_9", "metadata_10"}
	for _, n := range valid {
		if !IsMetadataColumn(n) {
			t.Errorf("expected %q to be a valid metadata column", n)
		}
	}
	invalid := []string{
		"metadata_0", "metadata_11", "metadata_", "metadata_1a",
		"metadata_2) OR 1=1", "metadata_1 ", " metadata_1", "Metadata_1",
		"metadata_01", "metadata_1;drop",
	}
	for _, n := range invalid {
		if IsMetadataColumn(n) {
			t.Errorf("expected %q to be rejected", n)
		}
	}
}

func TestUserJourneyMetricValueRejected(t *testing.T) {
	h := &UserJourneyQueryBuilder{}
	payload := &model.MetricPayload{
		StartTimestamp: 1704067200000,
		EndTimestamp:   1704153600000,
		Density:        2,
		MetricValue:    []string{"x' OR 1=1 OR '", "click"},
		Series:         []model.Series{{Name: "s1", Filter: model.FilterGroup{}}},
	}
	p := &Payload{MetricPayload: payload, ProjectId: 1, UserId: 1}

	// Only the predefined journey types are accepted; anything else is rejected
	// before reaching SQL expression position.
	queries, _, err := h.buildQuery(p)
	if err == nil {
		t.Fatalf("expected unsupported metricValue to be rejected, got queries:\n%s", strings.Join(queries, "\n"))
	}
}

func TestUserJourneyExcludeValueNotInjectable(t *testing.T) {
	h := &UserJourneyQueryBuilder{}
	mal := "y' OR 1=1 OR '"
	payload := &model.MetricPayload{
		StartTimestamp: 1704067200000,
		EndTimestamp:   1704153600000,
		Density:        2,
		MetricValue:    []string{"location"},
		Exclude:        []model.Filter{{Name: "location", Operator: "is", Value: []string{mal}}},
		Series:         []model.Series{{Name: "s1", Filter: model.FilterGroup{}}},
	}
	p := &Payload{MetricPayload: payload, ProjectId: 1, UserId: 1}

	queries, params, err := h.buildQuery(p)
	if err != nil {
		t.Fatalf("buildQuery error: %v", err)
	}
	// The malicious exclude value may only be bound as a parameter, never
	// spliced into the SQL text.
	joined := strings.Join(queries, "\n")
	if strings.Contains(joined, "OR 1=1") {
		t.Errorf("user-journey Exclude.Value injection survived:\n%s", joined)
	}
	if !hasParamValue(params, mal) {
		t.Errorf("expected exclude value bound as a parameter, params: %v", params)
	}
}
