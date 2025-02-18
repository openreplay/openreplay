package query

import (
	"fmt"
	"strings"
)

type TableQueryBuilder struct{}

func (t TableQueryBuilder) Build(p MetricPayload) string {
	return t.buildQuery(p)
}

func (t TableQueryBuilder) buildQuery(r MetricPayload) string {
	s := r.Series[0]
	sessionFilters, eventFilters := partitionFilters(s.Filter.Filters)
	sessionWhere := buildSessionWhere(sessionFilters)
	eventWhere, seqHaving := buildEventsWhere(eventFilters, s.Filter.EventsOrder)

	subQuery := fmt.Sprintf(
		"SELECT %s,\n"+
			"       MIN(%s) AS first_event_ts,\n"+
			"       MAX(%s) AS last_event_ts\n"+
			"FROM %s AS main\n"+
			"WHERE main.project_id = %%(project_id)s\n"+
			"  AND %s >= toDateTime(%%(start_time)s/1000)\n"+
			"  AND %s <= toDateTime(%%(end_time)s/1000)\n"+
			"  AND (%s)\n"+
			"GROUP BY %s\n"+
			"HAVING %s",
		ColEventSessionID,
		ColEventTime,
		ColEventTime,
		TableEvents,
		ColEventTime,
		ColEventTime,
		strings.Join(eventWhere, " OR "),
		ColEventSessionID,
		seqHaving,
	)

	joinQuery := fmt.Sprintf(
		"SELECT *\n"+
			"FROM %s AS s\n"+
			"INNER JOIN (\n"+
			"    SELECT DISTINCT ev.session_id, ev.`$current_url` AS url_path\n"+
			"    FROM %s AS ev\n"+
			"    WHERE ev.created_at >= toDateTime(%%(start_time)s/1000)\n"+
			"      AND ev.created_at <= toDateTime(%%(end_time)s/1000)\n"+
			"      AND ev.project_id = %%(project_id)s\n"+
			"      AND ev.`$event_name` = 'LOCATION'\n"+
			") AS extra_event USING (session_id)\n"+
			"WHERE s.project_id = %%(project_id)s\n"+
			"  AND isNotNull(s.duration)\n"+
			"  AND s.datetime >= toDateTime(%%(start_time)s/1000)\n"+
			"  AND s.datetime <= toDateTime(%%(end_time)s/1000)\n",
		TableSessions,
		TableEvents,
	)

	if len(sessionWhere) > 0 {
		joinQuery += "  AND " + strings.Join(sessionWhere, " AND ") + "\n"
	}

	main := fmt.Sprintf(
		"SELECT s.session_id AS session_id, s.url_path\n"+
			"FROM (\n%s\n) AS f\n"+
			"INNER JOIN (\n%s) AS s\n"+
			"  ON (s.session_id = f.session_id)\n",
		subQuery,
		joinQuery,
	)

	final := fmt.Sprintf(
		"SELECT COUNT(DISTINCT url_path) OVER () AS main_count,\n"+
			"       url_path AS name,\n"+
			"       COUNT(DISTINCT session_id) AS total,\n"+
			"       COALESCE(SUM(COUNT(DISTINCT session_id)) OVER (), 0) AS total_count\n"+
			"FROM (\n%s) AS filtered_sessions\n"+
			"GROUP BY url_path\n"+
			"ORDER BY total DESC\n"+
			"LIMIT 200 OFFSET 0;",
		main,
	)

	return final
}

func partitionFilters(filters []Filter) (sessionFilters []Filter, eventFilters []Filter) {
	for _, f := range filters {
		if f.IsEvent {
			eventFilters = append(eventFilters, f)
		} else {
			sessionFilters = append(sessionFilters, f)
		}
	}
	return
}

func buildSessionWhere(filters []Filter) []string {
	var conds []string
	for _, f := range filters {
		switch f.Type {
		case FilterUserCountry:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserCountry, concatValues(f.Value)))
		case FilterUserCity:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserCity, concatValues(f.Value)))
		case FilterUserState:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserState, concatValues(f.Value)))
		case FilterUserId:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserID, concatValues(f.Value)))
		case FilterUserAnonymousId:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserAnonymousID, concatValues(f.Value)))
		case FilterUserOs:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserOS, concatValues(f.Value)))
		case FilterUserBrowser:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserBrowser, concatValues(f.Value)))
		case FilterUserDevice:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserDevice, concatValues(f.Value)))
		case FilterPlatform:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUserDeviceType, concatValues(f.Value)))
		case FilterRevId:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColRevID, concatValues(f.Value)))
		case FilterReferrer:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColBaseReferrer, concatValues(f.Value)))
		case FilterDuration:
			if len(f.Value) == 2 {
				conds = append(conds, fmt.Sprintf("%s >= '%s'", ColDuration, f.Value[0]))
				conds = append(conds, fmt.Sprintf("%s <= '%s'", ColDuration, f.Value[1]))
			}
		case FilterUtmSource:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUtmSource, concatValues(f.Value)))
		case FilterUtmMedium:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUtmMedium, concatValues(f.Value)))
		case FilterUtmCampaign:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColUtmCampaign, concatValues(f.Value)))
		case FilterMetadata:
			conds = append(conds, fmt.Sprintf("%s = toString('%s')", ColMetadata1, concatValues(f.Value)))
		}
	}
	// adding /n to each condition for better readability, can be removed.
	for i := range conds {
		conds[i] += "\n"
	}
	return conds
}

func concatValues(v []string) string {
	return strings.Join(v, "")
}

func buildEventsWhere(filters []Filter, order EventOrder) (eventConditions []string, having string) {
	basicEventTypes := "(" +
		strings.Join([]string{
			fmt.Sprintf("%s = 'CLICK'", ColEventName),
			fmt.Sprintf("%s = 'INPUT'", ColEventName),
			fmt.Sprintf("%s = 'LOCATION'", ColEventName),
			fmt.Sprintf("%s = 'CUSTOM'", ColEventName),
			fmt.Sprintf("%s = 'REQUEST'", ColEventName),
		}, " OR ") + ")"

	var seq []string
	for _, f := range filters {
		switch f.Type {
		case FilterClick:
			seq = append(seq, seqCond("CLICK", "selector", f))
		case FilterInput:
			seq = append(seq, seqCond("INPUT", "label", f))
		case FilterLocation:
			seq = append(seq, seqCond("LOCATION", "url_path", f))
		case FilterCustom:
			seq = append(seq, seqCond("CUSTOM", "name", f))
		case FilterFetch:
			seq = append(seq, seqFetchCond("REQUEST", f))
		case FilterFetchStatusCode:
			seq = append(seq, seqCond("REQUEST", "status", f))
		default:
			seq = append(seq, fmt.Sprintf("(%s = '%s')", ColEventName, strings.ToUpper(string(f.Type))))
		}
	}
	eventConditions = []string{basicEventTypes}

	// then => sequenceMatch
	// or => OR
	// and => AND
	switch order {
	case EventOrderThen:
		var pattern []string
		for i := range seq {
			pattern = append(pattern, fmt.Sprintf("(?%d)", i+1))
		}
		having = fmt.Sprintf("sequenceMatch('%s')(\n%s,\n%s)",
			strings.Join(pattern, ""), fmt.Sprintf("toUnixTimestamp(%s)", ColEventTime), strings.Join(seq, ",\n"))
	case EventOrderAnd:
		// build AND
		having = strings.Join(seq, " AND ")
	default:
		// default => OR
		var orParts []string
		for _, p := range seq {
			orParts = append(orParts, "("+p+")")
		}
		having = strings.Join(orParts, " OR ")
	}
	return
}

func seqCond(eventName, key string, f Filter) string {
	op := parseOperator(f.Operator)
	return fmt.Sprintf("(%s = '%s' AND JSONExtractString(toString(%s), '%s') %s '%s')",
		ColEventName, strings.ToUpper(eventName), ColEventProperties, key, op, concatValues(f.Value))
}

func seqFetchCond(eventName string, f Filter) string {
	w := []string{fmt.Sprintf("(%s = '%s')", ColEventName, strings.ToUpper(eventName))}
	var extras []string
	for _, c := range f.Filters {
		switch c.Type {
		case FilterFetch:
			if len(c.Value) > 0 {
				extras = append(extras, fmt.Sprintf("(%s = '%s')", ColEventURLPath, concatValues(c.Value)))
			}
		case FilterFetchStatusCode:
			if len(c.Value) > 0 {
				extras = append(extras, fmt.Sprintf("(%s = '%s')", ColEventStatus, concatValues(c.Value)))
			}
		default:
			// placeholder if needed
		}
	}
	if len(extras) > 0 {
		w = append(w, strings.Join(extras, " AND "))
	}
	return "(" + strings.Join(w, " AND ") + ")"
}

func parseOperator(op string) string {
	// TODO implement this properly
	switch strings.ToLower(op) {
	case OperatorStringContains:
		return "LIKE"
	case OperatorStringIs, OperatorStringOn, "=", OperatorStringOnAny:
		return "="
	case OperatorStringStartsWith:
		return "LIKE"
	case OperatorStringEndsWith:
		// might interpret differently in real impl
		return "="
	default:
		return "="
	}
}
