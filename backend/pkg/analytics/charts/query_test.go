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
			wantEventConds: []string{"(e.`$event_name` = 'CLICK' AND (JSONExtractString(toString(e.\"$properties\"), 'label') = 'button'))"},
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
			wantEventConds: []string{"e.`$event_name` = 'CLICK'"},
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
			wantEventConds: []string{"(e.`$event_name` = 'CLICK' AND (JSONExtractString(toString(e.\"$properties\"), 'label') ILIKE '%button%'))"},
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
			wantEventConds: []string{"(e.`$event_name` = 'CLICK' AND ((JSONExtractString(toString(e.\"$properties\"), 'url_path') ILIKE '%login%' OR JSONExtractString(toString(e.\"$properties\"), 'url_path') ILIKE '%signup%')))"},
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
			wantEventConds: []string{"(e.`$event_name` = 'CLICK' AND (JSONExtractString(toString(e.\"$properties\"), 'url_path') <> 'login'))"},
			wantOtherConds: nil,
		},
		{
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
			wantEventConds: []string{"(e.`$event_name` = 'CLICK' AND (JSONExtractString(toString(e.\"$properties\"), 'label') = 'button' OR JSONExtractString(toString(e.\"$properties\"), 'url_path') = 'login'))"},
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
			wantEventConds: []string{"(e.`$event_name` = 'CLICK' AND (JSONExtractString(toString(e.\"$properties\"), 'label') = 'button' AND JSONExtractString(toString(e.\"$properties\"), 'url_path') = 'login'))"},
			wantOtherConds: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotEventConds, gotOtherConds := BuildEventConditions(tt.filters, BuildConditionsOptions{
				MainTableAlias: "e",
				DefinedColumns: mainColumns,
			})

			if !reflect.DeepEqual(gotEventConds, tt.wantEventConds) {
				t.Errorf("BuildEventConditions() Events: \ngot = %v, \nwant %v", gotEventConds, tt.wantEventConds)
			}

			if !reflect.DeepEqual(gotOtherConds, tt.wantOtherConds) {
				t.Errorf("BuildEventConditions() OtherConds: \notherConds = %v, \nwant %v", gotOtherConds, tt.wantOtherConds)
			}
		})
	}
}

// Test for getColumnAccessor function
func TestGetColumnAccessor(t *testing.T) {
	tests := []struct {
		name      string
		logical   string
		isNumeric bool
		opts      BuildConditionsOptions
		want      string
	}{
		{
			name:      "Defined column mapping",
			logical:   "customField",
			isNumeric: false,
			opts: BuildConditionsOptions{
				MainTableAlias: "e",
				DefinedColumns: map[string]string{
					"customField": "custom_col",
				},
			},
			want: "e.custom_col",
		},
		{
			name:      "Column with $ prefix gets quoted",
			logical:   "$special",
			isNumeric: false,
			opts: BuildConditionsOptions{
				MainTableAlias:       "e",
				PropertiesColumnName: "$properties",
			},
			want: "JSONExtractString(toString(e.\"$properties\"), '$special')",
		},
		{
			name:      "Numeric property extraction",
			logical:   "count",
			isNumeric: true,
			opts: BuildConditionsOptions{
				MainTableAlias:       "e",
				PropertiesColumnName: "$properties",
			},
			want: "JSONExtractFloat(toString(e.\"$properties\"), 'count')",
		},
		{
			name:      "Property mapping from propertyKeyMap",
			logical:   "LOCATION",
			isNumeric: false,
			opts: BuildConditionsOptions{
				MainTableAlias:       "e",
				PropertiesColumnName: "$properties",
			},
			want: "JSONExtractString(toString(e.\"$properties\"), 'url_path')",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := getColumnAccessor(tt.logical, tt.isNumeric, tt.opts)
			if got != tt.want {
				t.Errorf("getColumnAccessor() = %v, want %v", got, tt.want)
			}
		})
	}
}
