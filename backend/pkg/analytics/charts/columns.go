package charts

import (
	"openreplay/backend/pkg/analytics/model"
)

// sessionColumnsOnEvents maps session-level filter names (the snake_case keys
// of SessionColumns) to the equivalent column of product_analytics.events.
// Both tables carry these values, so a filter on one of them can be evaluated
// directly on the events table instead of forcing a join with
// experimental.sessions.
//
// Session-only attributes are deliberately absent: duration, platform,
// user_device, rev_id, user_anonymous_id, issue_types, events_count and
// metadata_1..10 exist only on experimental.sessions. ("$device" on the
// events table carries the device type, so it pairs with user_device_type,
// not user_device.)
var sessionColumnsOnEvents = map[string][]string{
	"user_browser":         {"$browser", "singleColumn"},
	"user_browser_version": {"$browser_version", "singleColumn"},
	"user_os":              {"$os", "singleColumn"},
	"user_os_version":      {"$os_version", "singleColumn"},
	"user_country":         {"$country", "singleColumn"},
	"user_city":            {"$city", "singleColumn"},
	"user_state":           {"$state", "singleColumn"},
	"user_id":              {"$user_id", "singleColumn"},
	"user_id_ios":          {"$user_id", "singleColumn"},
	"user_device_type":     {"$device", "singleColumn"},
	"referrer":             {"$referrer", "singleColumn"},
	"utm_source":           {"utm_source", "singleColumn"},
	"utm_medium":           {"utm_medium", "singleColumn"},
	"utm_campaign":         {"utm_campaign", "singleColumn"},
	"screen_width":         {"$screen_width", "singleColumn"},
	"screen_height":        {"$screen_height", "singleColumn"},
}

// sessionFilterName returns the canonical (snake_case) name used to look a
// session-level filter up in SessionColumns / sessionColumnsOnEvents.
func sessionFilterName(f model.Filter) string {
	if f.AutoCaptured {
		return CamelToSnake(f.Name)
	}
	return f.Name
}

// CanRunOnEventsTable reports whether a session-level filter has an
// equivalent column on product_analytics.events.
func CanRunOnEventsTable(f model.Filter) bool {
	_, ok := sessionColumnsOnEvents[sessionFilterName(f)]
	return ok
}

// SplitSessionFilters separates session-level filters into the ones that can
// be evaluated on the events table and the ones that only exist on
// experimental.sessions (and therefore require the sessions table).
func SplitSessionFilters(filters []model.Filter) (onEvents, sessionOnly []model.Filter) {
	for _, f := range filters {
		if CanRunOnEventsTable(f) {
			onEvents = append(onEvents, f)
		} else {
			sessionOnly = append(sessionOnly, f)
		}
	}
	return
}

// BuildSessionConditionsOnEvents renders session-level filters against their
// events-table columns on the given table alias. Filters without an events
// equivalent are ignored; split them out with SplitSessionFilters first.
// The generated SQL carries "@pN" placeholders whose values accumulate in qp.
func BuildSessionConditionsOnEvents(filters []model.Filter, tableAlias string, qp *Params) []string {
	if len(filters) == 0 {
		return nil
	}
	_, _, conds := BuildEventConditions(filters, BuildConditionsOptions{
		DefinedColumns: sessionColumnsOnEvents,
		MainTableAlias: tableAlias,
	}, qp)
	return conds
}
