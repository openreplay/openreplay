package charts

import (
	"openreplay/backend/pkg/analytics/model"
	"reflect"
	"testing"
)

func TestBuildEventConditions(t *testing.T) {
	tests := []struct {
		name           string
		filters        []model.Filter
		options        []BuildConditionsOptions
		wantEventConds []string
		wantOtherConds []string
		wantParams     map[string]any
	}{
		{
			name: "Event filter with equals operator",
			filters: []model.Filter{
				{
					Name:     "CLICK",
					Operator: "is",
					Value:    []string{},
					IsEvent:  true,
					Filters: []model.Filter{
						{
							Name:     "label",
							Operator: "is",
							Value:    []string{"button"},
						},
					},
				},
			},
			wantEventConds: []string{"(e.\"$event_name\" = @p1 AND (JSONExtractString(e.properties, @p2) = @p3))"},
			wantOtherConds: nil,
			wantParams:     map[string]any{"p1": "CLICK", "p2": "label", "p3": "button"},
		},
		{
			name: "Event filter with isAny operator",
			filters: []model.Filter{
				{
					Name:     "CLICK",
					Operator: "isAny",
					Value:    []string{},
					IsEvent:  true,
				},
			},
			wantEventConds: []string{"(e.\"$event_name\" = @p1)"},
			wantOtherConds: nil,
			wantParams:     map[string]any{"p1": "CLICK"},
		},
		{
			name: "Event filter with contains operator",
			filters: []model.Filter{
				{
					Name:     "CLICK",
					Operator: "isAny",
					Value:    []string{},
					IsEvent:  true,
					Filters: []model.Filter{
						{
							Name:     "label",
							Operator: "contains",
							Value:    []string{"button"},
						},
					},
				},
			},
			wantEventConds: []string{"(e.\"$event_name\" = @p1 AND (JSONExtractString(e.properties, @p2) ILIKE @p3))"},
			wantOtherConds: nil,
			wantParams:     map[string]any{"p1": "CLICK", "p2": "label", "p3": "%button%"},
		},

		{
			name: "Events filters with contains operator and multiple values",
			filters: []model.Filter{
				{
					Name:     "CLICK",
					Operator: "isAny",
					Value:    []string{},
					IsEvent:  true,
					Filters: []model.Filter{
						{
							Name:     "url_path",
							Operator: "contains",
							Value:    []string{"login", "signup"},
						},
					},
				},
			},
			wantEventConds: []string{"(e.\"$event_name\" = @p1 AND ((e.\"$current_path\" ILIKE @p2 OR e.\"$current_path\" ILIKE @p3)))"},
			wantOtherConds: nil,
			wantParams:     map[string]any{"p1": "CLICK", "p2": "%login%", "p3": "%signup%"},
		},

		{
			name: "Events filters with notEqual operator",
			filters: []model.Filter{
				{
					Name:     "CLICK",
					Operator: "is",
					Value:    []string{"login", "signup"},
					IsEvent:  true,
					Filters: []model.Filter{
						{
							Name:     "url_path",
							Operator: "isNot",
							Value:    []string{"login"},
						},
					},
				},
			},
			wantEventConds: []string{"(e.\"$event_name\" = @p1 AND (e.\"$current_path\" != @p2))"},
			wantOtherConds: nil,
			wantParams:     map[string]any{"p1": "CLICK", "p2": "login"},
		},
		{
			// NOTE: PropertyOrder is currently not used by addFilter for joining
			// nested sub-conditions — they are always joined with AND.
			name: "Events filters with multiple properties (nested) and proper order OR",
			filters: []model.Filter{
				{
					Name:          "CLICK",
					Operator:      "is",
					Value:         []string{},
					IsEvent:       true,
					PropertyOrder: "or",
					Filters: []model.Filter{
						{
							Name:     "label",
							Operator: "is",
							Value:    []string{"button"},
						},
						{
							Name:     "url_path",
							Operator: "is",
							Value:    []string{"login"},
						},
					},
				},
			},
			wantEventConds: []string{"(e.\"$event_name\" = @p1 AND (JSONExtractString(e.properties, @p2) = @p3) AND (e.\"$current_path\" = @p4))"},
			wantOtherConds: nil,
			wantParams:     map[string]any{"p1": "CLICK", "p2": "label", "p3": "button", "p4": "login"},
		},
		{
			name: "Events filters with multiple properties (nested) and proper order AND",
			filters: []model.Filter{
				{
					Name:          "CLICK",
					Operator:      "is",
					Value:         []string{},
					IsEvent:       true,
					PropertyOrder: "and",
					Filters: []model.Filter{
						{
							Name:     "label",
							Operator: "is",
							Value:    []string{"button"},
						},
						{
							Name:     "url_path",
							Operator: "is",
							Value:    []string{"login"},
						},
					},
				},
			},
			wantEventConds: []string{"(e.\"$event_name\" = @p1 AND (JSONExtractString(e.properties, @p2) = @p3) AND (e.\"$current_path\" = @p4))"},
			wantOtherConds: nil,
			wantParams:     map[string]any{"p1": "CLICK", "p2": "label", "p3": "button", "p4": "login"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			qp := NewParams()
			gotEventConds, _, gotOtherConds := BuildEventConditions(tt.filters, BuildConditionsOptions{
				MainTableAlias: "e",
				DefinedColumns: mainColumns,
			}, qp)

			if !reflect.DeepEqual(gotEventConds, tt.wantEventConds) {
				t.Errorf("BuildEventConditions() Events: \ngot = %v, \nwant %v", gotEventConds, tt.wantEventConds)
			}

			if tt.wantParams != nil && !reflect.DeepEqual(qp.Values(), tt.wantParams) {
				t.Errorf("BuildEventConditions() Params: \ngot = %v, \nwant %v", qp.Values(), tt.wantParams)
			}

			// Normalise nil vs empty slice for comparison
			if len(gotOtherConds) == 0 && len(tt.wantOtherConds) == 0 {
				return // both empty — pass
			}
			if !reflect.DeepEqual(gotOtherConds, tt.wantOtherConds) {
				t.Errorf("BuildEventConditions() OtherConds: \notherConds = %v, \nwant %v", gotOtherConds, tt.wantOtherConds)
			}
		})
	}
}

func TestBuildCondEscapesLikeMetacharacters(t *testing.T) {
	qp := NewParams()
	cond := buildCond("s.name", []string{"100%"}, "contains", false, "singleColumn", qp)
	if cond != "s.name ILIKE @p1" {
		t.Errorf("contains: got %q", cond)
	}
	if got := qp.Values()["p1"]; got != `%100\%%` {
		t.Errorf("contains pattern = %q, want %q", got, `%100\%%`)
	}
}

func TestParamsAddDeduplicatesEqualValues(t *testing.T) {
	qp := NewParams()
	if p1, p2 := qp.Add("CLICK"), qp.Add("CLICK"); p1 != p2 {
		t.Errorf("equal values got different placeholders: %s vs %s", p1, p2)
	}
	if p1, p3 := qp.Add("CLICK"), qp.Add("INPUT"); p1 == p3 {
		t.Errorf("different values got the same placeholder: %s", p1)
	}
	// slices with the same joined text must not collide
	if pa, pb := qp.Add([]string{"a", "b"}), qp.Add([]string{"a b"}); pa == pb {
		t.Errorf("distinct slices got the same placeholder: %s", pa)
	}
	// string vs numeric values must not collide
	if ps, pn := qp.Add("42"), qp.Add(float64(42)); ps == pn {
		t.Errorf("string and numeric values got the same placeholder: %s", ps)
	}
}

func TestGetColumnAccessor_DoesNotMutateSharedMap(t *testing.T) {
	// Snapshot the original value
	original := mainColumns["userCountry"][0]

	opts := BuildConditionsOptions{
		MainTableAlias: "e",
		DefinedColumns: mainColumns,
	}

	// Call twice — the bug causes progressive mutation
	getColumnAccessor("userCountry", false, false, false, opts, NewParams())
	getColumnAccessor("userCountry", false, false, false, opts, NewParams())

	if mainColumns["userCountry"][0] != original {
		t.Errorf("getColumnAccessor mutated shared map: got %q, want %q",
			mainColumns["userCountry"][0], original)
	}
}

func TestCamelToSnake(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"userCountry", "user_country"},
		{"userBrowser", "user_browser"},
		{"userOs", "user_os"},
		{"userId", "user_id"},
		{"alreadysnake", "alreadysnake"},
		{"ABCDef", "abcdef"},
		{"", ""},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := CamelToSnake(tt.input)
			if got != tt.want {
				t.Errorf("CamelToSnake(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestBuildCond_IsUndefined(t *testing.T) {
	got := buildCond("s.user_country", nil, "isUndefined", false, "singleColumn", NewParams())
	want := "(isNull(s.user_country) OR s.user_country = '')"
	if got != want {
		t.Errorf("buildCond isUndefined:\ngot  = %q\nwant = %q", got, want)
	}
}

func TestBuildCond_IsUndefined_ArrayColumn(t *testing.T) {
	got := buildCond("s.issue_types", nil, "isUndefined", false, "arrayColumn", NewParams())
	want := "empty(s.issue_types)"
	if got != want {
		t.Errorf("buildCond isUndefined array:\ngot  = %q\nwant = %q", got, want)
	}
}

// Test for getColumnAccessor function
func TestGetColumnAccessor(t *testing.T) {
	tests := []struct {
		name          string
		logical       string
		isNumeric     bool
		inDProperties bool
		inProperties  bool
		opts          BuildConditionsOptions
		wantAccessor  string
		wantNature    string
		wantParams    map[string]any
	}{
		{
			name:          "Defined column mapping",
			logical:       "userDevice",
			isNumeric:     false,
			inDProperties: false,
			inProperties:  false,
			opts: BuildConditionsOptions{
				MainTableAlias: "e",
				DefinedColumns: mainColumns,
			},
			wantAccessor: "sessions.user_device",
			wantNature:   "singleColumn",
			wantParams:   map[string]any{},
		},
		{
			name:          "Column with $ prefix gets quoted",
			logical:       "$special",
			isNumeric:     false,
			inDProperties: true,
			inProperties:  false,
			opts: BuildConditionsOptions{
				MainTableAlias:       "e",
				PropertiesColumnName: "$properties",
			},
			wantAccessor: "JSONExtractString(e.\"$properties\", @p1)",
			wantNature:   "singleColumn",
			wantParams:   map[string]any{"p1": "$special"},
		},
		{
			name:          "Numeric property extraction",
			logical:       "count",
			isNumeric:     true,
			inDProperties: true,
			inProperties:  false,
			opts: BuildConditionsOptions{
				MainTableAlias:       "e",
				PropertiesColumnName: "$properties",
			},
			wantAccessor: "JSONExtractFloat(e.\"$properties\", @p1)",
			wantNature:   "singleColumn",
			wantParams:   map[string]any{"p1": "count"},
		},
		{
			name:          "Property mapping from propertyKeyMap",
			logical:       "LOCATION",
			isNumeric:     false,
			inDProperties: false,
			inProperties:  false,
			opts: BuildConditionsOptions{
				MainTableAlias:       "e",
				PropertiesColumnName: "$properties",
			},
			wantAccessor: "e.\"$current_path\"",
			wantNature:   "singleColumn",
			wantParams:   map[string]any{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			qp := NewParams()
			gotAccessor, gotNature := getColumnAccessor(tt.logical, tt.isNumeric, tt.inDProperties, tt.inProperties, tt.opts, qp)
			if gotAccessor != tt.wantAccessor {
				t.Errorf("getColumnAccessor() accessor = %v, want %v", gotAccessor, tt.wantAccessor)
			}
			if gotNature != tt.wantNature {
				t.Errorf("getColumnAccessor() nature = %v, want %v", gotNature, tt.wantNature)
			}
			if tt.wantParams != nil && !reflect.DeepEqual(qp.Values(), tt.wantParams) {
				t.Errorf("getColumnAccessor() params = %v, want %v", qp.Values(), tt.wantParams)
			}
		})
	}
}
