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
			wantEventConds: []string{"(e.\"$event_name\" = 'CLICK' AND (JSONExtractString(toString(e.properties), 'label') = 'button'))"},
			wantOtherConds: nil,
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
			wantEventConds: []string{"(e.\"$event_name\" = 'CLICK')"},
			wantOtherConds: nil,
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
			wantEventConds: []string{"(e.\"$event_name\" = 'CLICK' AND (JSONExtractString(toString(e.properties), 'label') ILIKE '%button%'))"},
			wantOtherConds: nil,
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
			wantEventConds: []string{"(e.\"$event_name\" = 'CLICK' AND ((e.\"$current_path\" ILIKE '%login%' OR e.\"$current_path\" ILIKE '%signup%')))"},
			wantOtherConds: nil,
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
			wantEventConds: []string{"(e.\"$event_name\" = 'CLICK' AND (e.\"$current_path\" != 'login'))"},
			wantOtherConds: nil,
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
			wantEventConds: []string{"(e.\"$event_name\" = 'CLICK' AND (JSONExtractString(toString(e.properties), 'label') = 'button') AND (e.\"$current_path\" = 'login'))"},
			wantOtherConds: nil,
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
			wantEventConds: []string{"(e.\"$event_name\" = 'CLICK' AND (JSONExtractString(toString(e.properties), 'label') = 'button') AND (e.\"$current_path\" = 'login'))"},
			wantOtherConds: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotEventConds, _, gotOtherConds := BuildEventConditions(tt.filters, BuildConditionsOptions{
				MainTableAlias: "e",
				DefinedColumns: mainColumns,
			})

			if !reflect.DeepEqual(gotEventConds, tt.wantEventConds) {
				t.Errorf("BuildEventConditions() Events: \ngot = %v, \nwant %v", gotEventConds, tt.wantEventConds)
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

func TestGetColumnAccessor_DoesNotMutateSharedMap(t *testing.T) {
	// Snapshot the original value
	original := mainColumns["userCountry"][0]

	opts := BuildConditionsOptions{
		MainTableAlias: "e",
		DefinedColumns: mainColumns,
	}

	// Call twice — the bug causes progressive mutation
	getColumnAccessor("userCountry", false, false, false, opts)
	getColumnAccessor("userCountry", false, false, false, opts)

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
	got := buildCond("s.user_country", nil, "isUndefined", false, "singleColumn")
	want := "(isNull(s.user_country) OR s.user_country = '')"
	if got != want {
		t.Errorf("buildCond isUndefined:\ngot  = %q\nwant = %q", got, want)
	}
}

func TestBuildCond_IsUndefined_ArrayColumn(t *testing.T) {
	got := buildCond("s.issue_types", nil, "isUndefined", false, "arrayColumn")
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
			wantAccessor: "JSONExtractString(toString(e.\"$properties\"), '$special')",
			wantNature:   "singleColumn",
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
			wantAccessor: "JSONExtractFloat(toString(e.\"$properties\"), 'count')",
			wantNature:   "singleColumn",
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
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotAccessor, gotNature := getColumnAccessor(tt.logical, tt.isNumeric, tt.inDProperties, tt.inProperties, tt.opts)
			if gotAccessor != tt.wantAccessor {
				t.Errorf("getColumnAccessor() accessor = %v, want %v", gotAccessor, tt.wantAccessor)
			}
			if gotNature != tt.wantNature {
				t.Errorf("getColumnAccessor() nature = %v, want %v", gotNature, tt.wantNature)
			}
		})
	}
}
