package filters_catalog

import (
	"context"
	"fmt"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

const eventPropertiesQuery = `
SELECT event_properties.property_name                  AS name,
       all_properties_customized.display_name,
       event_properties.auto_captured_property         AS auto_captured,
       arrayDistinct(groupArray(event_properties.value_type)) AS possible_types
FROM product_analytics.event_properties
         LEFT JOIN product_analytics.all_properties_customized USING (property_name)
WHERE event_properties.project_id = ?
  AND event_properties.event_name = ?
  AND event_properties.auto_captured_property = ?
  AND (all_properties_customized.project_id = 0
           AND or_property_visibility(property_name) = 'visible'
           AND event_properties.auto_captured_property
    OR (all_properties_customized.project_id = ?
        AND all_properties_customized.status = 'visible'))
GROUP BY ALL
ORDER BY 1`

var EventDefaultProperties = map[string]string{
	"CLICK":       "label",
	"INPUT":       "label",
	"LOCATION":    "url_path",
	"ERROR":       "name",
	"REQUEST":     "url_path",
	"TAG_TRIGGER": "tag_id",
	"ISSUE":       "issue_type",
	"PERFORMANCE": "max_fps",
}

type eventPropertyRow struct {
	Name          string
	DisplayName   *string
	AutoCaptured  bool
	PossibleTypes []string
}

type tagValue struct {
	ID   int
	Name string
}

func (s *filtersCatalogImpl) SearchEventProperties(ctx context.Context, projectID uint32, eventName string, autoCaptured bool) ([]map[string]any, error) {
	var props []map[string]any
	if autoCaptured && eventName == "TAG_TRIGGER" {
		tags, err := s.features.ListForFilters(int(projectID))
		if err != nil {
			return nil, fmt.Errorf("list tags: %w", err)
		}
		values := make([]tagValue, 0, len(tags))
		for _, t := range tags {
			values = append(values, tagValue{ID: t.TagID, Name: t.Name})
		}
		props = tagTriggerProperties(values)
	} else {
		rows, err := s.ch.Query(ctx, eventPropertiesQuery, projectID, eventName, autoCaptured, projectID)
		if err != nil {
			return nil, fmt.Errorf("ch query event properties: %w", err)
		}
		defer rows.Close()

		var fetched []eventPropertyRow
		for rows.Next() {
			var r eventPropertyRow
			if err := rows.Scan(&r.Name, &r.DisplayName, &r.AutoCaptured, &r.PossibleTypes); err != nil {
				return nil, fmt.Errorf("scan event property: %w", err)
			}
			fetched = append(fetched, r)
		}
		if err := rows.Err(); err != nil {
			return nil, err
		}
		props = buildEventProperties(fetched, eventName, autoCaptured)
	}
	return append(props, globalFilters()...), nil
}

func buildEventProperties(rows []eventPropertyRow, eventName string, autoCaptured bool) []map[string]any {
	out := make([]map[string]any, 0, len(rows)+1)
	defaultSnake, hasDefault := EventDefaultProperties[eventName]

	for _, r := range rows {
		name := r.Name
		snake := keyToSnakeCase(name)
		pp, predefined := PredefinedProperties[snake]
		if predefined {
			name = keyToCamelCase(snake)
		}

		var display any
		if r.DisplayName != nil {
			display = *r.DisplayName
		}
		if r.AutoCaptured && (r.DisplayName == nil || *r.DisplayName == "") {
			display = ORPropertyDisplayName(snake)
		}

		item := map[string]any{
			"name":                   name,
			"displayName":            display,
			"autoCaptured":           r.AutoCaptured,
			"possibleTypes":          SimplifyClickHouseTypes(r.PossibleTypes),
			"id":                     StringToID("prop_" + name),
			"category":               "events",
			"_foundInPredefinedList": false,
			"isPredefined":           false,
			"possibleValues":         []any{},
		}
		if predefined {
			values := pp.PossibleValues
			if values == nil {
				values = []any{}
			}
			item["dataType"] = SimplifyClickHouseType(pp.Type)
			item["_foundInPredefinedList"] = true
			item["isPredefined"] = pp.IsPredefined
			item["possibleValues"] = values
		}
		item["defaultProperty"] = autoCaptured && hasDefault && snake == defaultSnake
		out = append(out, item)
	}

	for _, extra := range eventsExtraProperties(eventName) {
		exists := false
		for _, it := range out {
			if it["name"] == extra["name"] {
				exists = true
				break
			}
		}
		if !exists {
			out = append(out, extra)
		}
	}

	if !autoCaptured && len(out) > 0 {
		hasAny := false
		for _, it := range out {
			if it["defaultProperty"] == true {
				hasAny = true
				break
			}
		}
		if !hasAny {
			out[0]["defaultProperty"] = true
		}
	}
	return out
}

func eventsExtraProperties(eventName string) []map[string]any {
	switch eventName {
	case "REQUEST":
		return []map[string]any{{
			"name":                   "duration",
			"displayName":            "Duration",
			"autoCaptured":           true,
			"possibleTypes":          []string{"int"},
			"id":                     StringToID("prop_duration"),
			"category":               "events",
			"_foundInPredefinedList": true,
			"isPredefined":           false,
			"possibleValues":         []any{},
			"dataType":               "int",
			"defaultProperty":        false,
		}}
	}
	return nil
}

func tagTriggerProperties(tags []tagValue) []map[string]any {
	values := make([]any, 0, len(tags))
	for _, t := range tags {
		values = append(values, map[string]any{"id": t.ID, "name": t.Name, "autoCaptured": false})
	}
	return []map[string]any{{
		"name":                   "tagId",
		"displayName":            "Name",
		"autoCaptured":           true,
		"possibleTypes":          []string{"string"},
		"id":                     StringToID("prop_tagId"),
		"category":               "events",
		"_foundInPredefinedList": false,
		"defaultProperty":        true,
		"isPredefined":           true,
		"possibleValues":         values,
	}}
}

func globalFilters() []map[string]any {
	list := GetSessionsFilters().List
	out := make([]map[string]any, 0, len(list))
	for _, raw := range list {
		f, ok := raw.(model.StaticFilterItem)
		if !ok {
			continue
		}
		out = append(out, map[string]any{
			"id":              f.ID,
			"name":            f.Name,
			"displayName":     f.DisplayName,
			"possibleTypes":   f.PossibleTypes,
			"dataType":        f.DataType,
			"autoCaptured":    f.AutoCaptured,
			"isPredefined":    f.IsPredefined,
			"possibleValues":  f.PossibleValues,
			"isConditional":   f.IsConditional,
			"defaultProperty": false,
			"category":        "session",
		})
	}
	return out
}
