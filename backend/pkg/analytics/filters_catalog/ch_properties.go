package filters_catalog

import (
	"context"
	"fmt"
	"strings"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

const propertiesCatalogQuery = `
SELECT COUNT(1) OVER () AS total,
    property_name AS name,
    apc.display_name AS display_name,
    event_properties.auto_captured_property AS auto_captured,
    possible_types
FROM product_analytics.all_properties
    LEFT JOIN product_analytics.all_properties_customized AS apc
        USING (project_id, source, property_name, auto_captured)
    LEFT ANY JOIN (
        SELECT property_name,
               auto_captured_property,
               arrayDistinct(groupArray(event_properties.value_type)) AS possible_types
        FROM product_analytics.event_properties
        WHERE event_properties.project_id = ?
        GROUP BY ALL
    ) AS event_properties USING (property_name)
WHERE project_id = ?
    AND (apc.status = 'visible' OR isNull(apc.status))
GROUP BY ALL
ORDER BY apc.display_name, all_properties.property_name`

// propertyCatalogRow holds one scanned row from the CH properties catalog query.
type propertyCatalogRow struct {
	Total         uint64
	Name          string
	DisplayName   string
	AutoCaptured  bool
	PossibleTypes []string
}

// getPropertiesCatalog queries ClickHouse for event properties and delegates to
// buildPropertiesCatalogSection for the pure transformation logic.
func (s *filtersCatalogImpl) getPropertiesCatalog(ctx context.Context, projectID uint32) (model.FilterSection, error) {
	rows, err := s.ch.Query(ctx, propertiesCatalogQuery, projectID, projectID)
	if err != nil {
		return model.FilterSection{}, fmt.Errorf("ch query properties catalog: %w", err)
	}
	defer rows.Close()

	var fetched []propertyCatalogRow
	for rows.Next() {
		var r propertyCatalogRow
		if err := rows.Scan(&r.Total, &r.Name, &r.DisplayName, &r.AutoCaptured, &r.PossibleTypes); err != nil {
			return model.FilterSection{}, fmt.Errorf("scan property: %w", err)
		}
		fetched = append(fetched, r)
	}
	if err := rows.Err(); err != nil {
		return model.FilterSection{}, err
	}
	return buildPropertiesCatalogSection(fetched), nil
}

// buildPropertiesCatalogSection mirrors get_all_properties from
// api/chalicelib/core/product_analytics/properties.py:259-340. Each item is a
// map[string]any because the field set varies:
//   - CH rows that match a PredefinedProperties key: 8 keys (no isPredefined/possibleValues).
//   - CH rows that do NOT match: also 8 keys (same trimmed shape — no isPredefined/possibleValues).
//   - Predefined-fallback appends: 10 keys (includes isPredefined + possibleValues).
//
// NOTE: there is a pre-existing inconsistency in the Python source — live golden
// responses for non-predefined CH rows carry isPredefined/possibleValues, but the
// Python code never sets them for those rows. All non-predefined-flag items in
// the golden are actually from the predefined-fallback append path, not from CH
// rows. This migration faithfully mirrors Python's logic without patching that
// inconsistency.
func buildPropertiesCatalogSection(fetched []propertyCatalogRow) model.FilterSection {
	scope := []string{"sessions", "events"}

	// Python returns {"total": 0, "list": []} on empty input (properties.py:286-287).
	if len(fetched) == 0 {
		return model.FilterSection{Total: 0, DisplayName: "Event Properties", Scope: scope, List: []any{}}
	}

	total := int(fetched[0].Total)
	processed := make([]map[string]any, 0, len(fetched))
	keys := make(map[string]struct{}, len(fetched))

	for _, r := range fetched {
		// Skip rows whose names are in ExcludedProperties before any other
		// processing (mirrors Python's list comprehension filter).
		if _, excluded := ExcludedProperties[r.Name]; excluded {
			continue
		}

		name := r.Name
		snake := keyToSnakeCase(name)
		_, inPredefined := PredefinedProperties[snake]
		if inPredefined {
			// Re-camelCase the name: for inputs already in camelCase the
			// snake→camel round-trip is a no-op, but for snake_case CH
			// values it produces the correct camelCase output.
			name = keyToCamelCase(snake)
		}

		simplified := SimplifyClickHouseTypes(r.PossibleTypes)

		display := r.DisplayName
		if r.AutoCaptured && display == "" {
			display = ORPropertyDisplayName(snake)
		}

		item := map[string]any{
			"name":          name,
			"displayName":   display,
			"autoCaptured":  r.AutoCaptured,
			"id":            StringToID("prop_" + name),
			"possibleTypes": simplified,
		}

		if pp, ok := PredefinedProperties[snake]; ok {
			item["_foundInPredefinedList"] = true
			item["isConditional"] = pp.IsConditional
			item["dataType"] = SimplifyClickHouseType(pp.Type)
		} else {
			item["_foundInPredefinedList"] = false
			if len(simplified) > 0 {
				item["dataType"] = simplified[0]
			} else {
				item["dataType"] = "string"
			}
		}

		processed = append(processed, item)
		keys[snake] = struct{}{}
	}

	// Append predefined entries that the CH query did not return.
	// Iterate over PredefinedPropertiesOrder (not the map) so the appended items
	// follow the Python dict insertion order and output is deterministic.
	for _, snakeKey := range PredefinedPropertiesOrder {
		if _, seen := keys[snakeKey]; seen {
			continue
		}
		pp := PredefinedProperties[snakeKey]
		total++
		camelKey := keyToCamelCase(snakeKey)
		values := pp.PossibleValues
		if values == nil {
			values = []any{}
		}
		processed = append(processed, map[string]any{
			"name":                   camelKey,
			"displayName":            ORPropertyDisplayName(snakeKey),
			"possibleTypes":          []string{pp.Type},
			"id":                     StringToID("prop_" + camelKey),
			"_foundInPredefinedList": false,
			"dataType":               pp.Type,
			"autoCaptured":           true,
			"isPredefined":           pp.IsPredefined,
			"possibleValues":         values,
			"isConditional":          pp.IsConditional,
		})
	}

	list := make([]any, 0, len(processed))
	for _, item := range processed {
		list = append(list, item)
	}
	return model.FilterSection{Total: total, DisplayName: "Event Properties", Scope: scope, List: list}
}

// keyToSnakeCase converts camelCase or PascalCase to snake_case. No acronym
// handling — matches the Python key_to_snake_case used by properties.py.
// Examples: "hesitationTime" → "hesitation_time", "minUsedJsHeapSize" → "min_used_js_heap_size".
func keyToSnakeCase(s string) string {
	if s == "" {
		return s
	}
	var b strings.Builder
	for i, r := range s {
		if i > 0 && r >= 'A' && r <= 'Z' {
			b.WriteByte('_')
		}
		if r >= 'A' && r <= 'Z' {
			r = r + ('a' - 'A')
		}
		b.WriteRune(r)
	}
	return b.String()
}

// keyToCamelCase converts snake_case to camelCase.
// Example: "hesitation_time" → "hesitationTime".
func keyToCamelCase(s string) string {
	if s == "" {
		return s
	}
	parts := strings.Split(s, "_")
	for i := 1; i < len(parts); i++ {
		if parts[i] == "" {
			continue
		}
		parts[i] = strings.ToUpper(parts[i][:1]) + parts[i][1:]
	}
	return strings.Join(parts, "")
}
