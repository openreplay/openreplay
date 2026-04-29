package filters_catalog

import (
	"context"
	"fmt"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

var (
	mobileOnlyEvents = map[string]struct{}{"TAP": {}, "SWIPE": {}, "CRASH": {}}
	webOnlyEvents    = map[string]struct{}{"CLICK": {}, "LOCATION": {}, "ERROR": {}}
)

const eventsCatalogQuery = `
SELECT DISTINCT
ON(event_name, auto_captured)
    COUNT(1) OVER () AS total,
    event_name AS name,
    aec.display_name AS display_name,
    auto_captured
FROM product_analytics.all_events
    LEFT JOIN product_analytics.all_events_customized AS aec USING (project_id, auto_captured, event_name)
WHERE project_id = ?
    AND (aec.status = 'visible' OR aec.status = '')
ORDER BY auto_captured, aec.display_name, all_events.event_name`

// eventCatalogRow holds one scanned row from the CH events catalog query.
type eventCatalogRow struct {
	Total        uint64
	Name         string
	DisplayName  string
	AutoCaptured bool
}

// getEventsCatalog mirrors api/chalicelib/core/product_analytics/events.py:get_events.
// It returns the events FilterSection, applying mobile/web event-name filtering
// based on the project's platform and merging in any predefined events the CH
// query did not return.
func (s *filtersCatalogImpl) getEventsCatalog(ctx context.Context, projectID uint32, platform string) (model.FilterSection, error) {
	rows, err := s.ch.Query(ctx, eventsCatalogQuery, projectID)
	if err != nil {
		return model.FilterSection{}, fmt.Errorf("ch query events catalog: %w", err)
	}
	defer rows.Close()

	var fetched []eventCatalogRow
	for rows.Next() {
		var r eventCatalogRow
		if err := rows.Scan(&r.Total, &r.Name, &r.DisplayName, &r.AutoCaptured); err != nil {
			return model.FilterSection{}, fmt.Errorf("scan events row: %w", err)
		}
		fetched = append(fetched, r)
	}
	if err := rows.Err(); err != nil {
		return model.FilterSection{}, err
	}

	return buildEventsCatalogSection(fetched, platform), nil
}

// buildEventsCatalogSection is the pure post-query transformation. Exposed
// (lowercase, package-private) for testing.
func buildEventsCatalogSection(fetched []eventCatalogRow, platform string) model.FilterSection {
	isMobile := platform == "ios" || platform == "android"
	predefined := PredefinedEvents
	order := PredefinedEventsOrder
	if isMobile {
		predefined = PredefinedEventsMobile
		order = PredefinedEventsMobileOrder
	}

	scope := []string{"sessions", "events", "users"}

	// Empty CH result → predefined-only fallback (matches Python events.py:113-126).
	// Iterate over the ordered slice so output matches Python's dict insertion order.
	if len(fetched) == 0 {
		list := make([]any, 0, len(order))
		for _, name := range order {
			list = append(list, model.EventCatalogItem{
				Name:                  name,
				DisplayName:           OREventDisplayName(name),
				AutoCaptured:          true,
				ID:                    StringToID("event_" + name),
				DataType:              "string",
				PossibleTypes:         []string{"string"},
				FoundInPredefinedList: false,
			})
		}
		return model.FilterSection{Total: len(predefined), DisplayName: "Events", Scope: scope, List: list}
	}

	total := int(fetched[0].Total)
	keys := make(map[string]struct{}, len(fetched))
	list := make([]any, 0, len(fetched)+len(predefined))
	for _, r := range fetched {
		// Skip auto-captured events that are explicitly excluded.
		if r.AutoCaptured {
			if _, excluded := ExcludedEvents[r.Name]; excluded {
				continue
			}
		}
		// Skip events that don't apply to this platform.
		if isMobile {
			if _, weo := webOnlyEvents[r.Name]; weo {
				continue
			}
		} else {
			if _, meo := mobileOnlyEvents[r.Name]; meo {
				continue
			}
		}
		keys[r.Name] = struct{}{}
		display := r.DisplayName
		if r.AutoCaptured && display == "" {
			display = OREventDisplayName(r.Name)
		}
		list = append(list, model.EventCatalogItem{
			Name:                  r.Name,
			DisplayName:           display,
			AutoCaptured:          r.AutoCaptured,
			ID:                    StringToID("event_" + r.Name),
			DataType:              "string",
			PossibleTypes:         []string{"string"},
			IsConditional:         true,
			FoundInPredefinedList: true,
		})
	}

	// Append predefined entries the CH query didn't return.
	// Iterate over the ordered slice so appended items follow Python's dict insertion order.
	for _, name := range order {
		if _, ok := keys[name]; ok {
			continue
		}
		total++
		list = append(list, model.EventCatalogItem{
			Name:                  name,
			DisplayName:           OREventDisplayName(name),
			AutoCaptured:          true,
			ID:                    StringToID("event_" + name),
			DataType:              "string",
			PossibleTypes:         []string{"string"},
			IsConditional:         true,
			FoundInPredefinedList: false,
		})
	}

	return model.FilterSection{Total: total, DisplayName: "Events", Scope: scope, List: list}
}
