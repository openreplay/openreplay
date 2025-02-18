package charts

import (
	"fmt"
	"openreplay/backend/pkg/analytics/db"
	"strings"
)

type Payload struct {
	*MetricPayload
	ProjectId int
	UserId    uint64
}

type QueryBuilder interface {
	Execute(p Payload, conn db.Connector) (interface{}, error)
}

func NewQueryBuilder(p Payload) (QueryBuilder, error) {
	switch p.MetricType {
	case MetricTypeTimeseries:
		return TimeSeriesQueryBuilder{}, nil
	case MetricTypeFunnel:
		return FunnelQueryBuilder{}, nil
	case MetricTypeTable:
		return TableQueryBuilder{}, nil
	default:
		return nil, fmt.Errorf("unknown metric type: %s", p.MetricType)
	}
}

//func pickIDField(p Payload) string {
//	if p.MetricOf == "userCount" {
//		return "user_id"
//	}
//	return "session_id"
//}

//func buildBaseEventsWhere(p Payload) string {
//	ts := fmt.Sprintf(
//		`(main.created_at >= toDateTime(%d / 1000) AND main.created_at <= toDateTime(%d / 1000))`,
//		p.StartTimestamp,
//		p.EndTimestamp,
//	)
//	return fmt.Sprintf(`main.project_id = %d AND %s`, p.ProjectId, ts)
//}

//func buildSessionsWhere(p Payload) string {
//	ts := fmt.Sprintf(
//		`(s.datetime >= toDateTime(%d / 1000) AND s.datetime <= toDateTime(%d / 1000))`,
//		p.StartTimestamp,
//		p.EndTimestamp,
//	)
//	return fmt.Sprintf(`s.project_id = %d AND isNotNull(s.duration) AND %s`, p.ProjectId, ts)
//}

//type sequenceParts struct {
//	seqPattern string
//	seqEvents  string
//}

//func buildSequenceCondition(series []Series) sequenceParts {
//	var events []string
//	for _, s := range series {
//		if len(s.Filter.Filters) > 0 {
//			events = append(events, buildOneSeriesSequence(s.Filter.Filters))
//		}
//	}
//	if len(events) < 2 {
//		return sequenceParts{"", ""}
//	}
//	pattern := ""
//	for i := 1; i <= len(events); i++ {
//		pattern += fmt.Sprintf("(?%d)", i)
//	}
//	return sequenceParts{
//		seqPattern: pattern,
//		seqEvents:  strings.Join(events, ", "),
//	}
//}

//func buildOneSeriesSequence(filters []Filter) string {
//	return strings.Join(buildFilterConditions(filters), " AND ")
//}
//
//func buildFilterConditions(filters []Filter) []string {
//	var out []string
//	for _, f := range filters {
//		switch f.Type {
//		case FilterClick:
//			out = append(out,
//				fmt.Sprintf(`(main."$event_name" = 'CLICK' AND JSONExtractString(toString(main."$properties"), 'label') IN ('%s'))`,
//					strings.Join(f.Value, "','")))
//		case FilterInput:
//			out = append(out,
//				fmt.Sprintf(`(main."$event_name" = 'INPUT' AND JSONExtractString(toString(main."$properties"), 'label') IN ('%s'))`,
//					strings.Join(f.Value, "','")))
//
//		default:
//			out = append(out,
//				fmt.Sprintf(`(main."$event_name" = '%s')`, strings.ToUpper(string(f.Type))))
//		}
//	}
//	return out
//}

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
	case EventOrderOr:
	default:
		// default => OR
		var orParts []string
		for _, p := range seq {
			orParts = append(orParts, "("+p+")")
		}
		having = strings.Join(orParts, " OR ")
	}
	return eventConditions, having
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
	case OperatorContains:
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

func buildEventConditions(filters []Filter) (conds, names []string) {
	for _, f := range filters {
		if f.IsEvent {
			switch f.Type {
			case FilterClick:
				c := buildCond("JSONExtractString(toString(main.`$properties`), 'label')", f.Value, "is")
				if c != "" {
					conds = append(conds, c)
				}
				names = append(names, "CLICK")
			case FilterInput:
				c := buildCond("JSONExtractString(toString(main.`$properties`), 'label')", f.Value, f.Operator)
				if c != "" {
					conds = append(conds, c)
				}
				names = append(names, "INPUT")
			case FilterLocation:
				c := buildCond("JSONExtractString(toString(main.`$properties`), 'url_path')", f.Value, f.Operator)
				if c != "" {
					conds = append(conds, c)
				}
				names = append(names, "LOCATION")
			case FilterCustom:
				c := buildCond("JSONExtractString(toString(main.`$properties`), 'name')", f.Value, f.Operator)
				if c != "" {
					conds = append(conds, c)
				}
				names = append(names, "CUSTOM")
			case FilterFetch:
				var fetchConds []string
				for _, nf := range f.Filters {
					switch nf.Type {
					case "fetchUrl":
						c := buildCond("JSONExtractString(toString(main.`$properties`), 'url_path')", nf.Value, f.Operator)
						if c != "" {
							fetchConds = append(fetchConds, c)
						}
					case "fetchStatusCode":
						c := buildCond("JSONExtractFloat(toString(main.`$properties`), 'status')", nf.Value, f.Operator)
						if c != "" {
							fetchConds = append(fetchConds, c)
						}
					}
				}
				if len(fetchConds) > 0 {
					conds = append(conds, strings.Join(fetchConds, " AND "))
				}
				names = append(names, "REQUEST")
			case FilterTag:
				c := buildCond("JSONExtractString(toString(main.`$properties`), 'tag')", f.Value, f.Operator)
				if c != "" {
					conds = append(conds, c)
				}
				names = append(names, "TAG")
			}
		}
	}
	return
}

func buildSessionConditions(filters []Filter) []string {
	var conds []string
	for _, f := range filters {
		if !f.IsEvent {
			switch f.Type {
			case FilterUserCountry:
				conds = append(conds, buildCond("s.user_country", f.Value, f.Operator))
			case FilterUserCity:
				conds = append(conds, buildCond("s.user_city", f.Value, f.Operator))
			case FilterUserState:
				conds = append(conds, buildCond("s.user_state", f.Value, f.Operator))
			case FilterUserId:
				conds = append(conds, buildCond("s.user_id", f.Value, f.Operator))
			case FilterUserAnonymousId:
				conds = append(conds, buildCond("s.user_anonymous_id", f.Value, f.Operator))
			case FilterUserOs:
				conds = append(conds, buildCond("s.user_os", f.Value, f.Operator))
			case FilterUserBrowser:
				conds = append(conds, buildCond("s.user_browser", f.Value, f.Operator))
			case FilterUserDevice:
				conds = append(conds, buildCond("s.user_device", f.Value, f.Operator))
			case FilterPlatform:
				conds = append(conds, buildCond("s.user_device_type", f.Value, f.Operator))
			case FilterRevId:
				conds = append(conds, buildCond("s.rev_id", f.Value, f.Operator))
			case FilterReferrer:
				conds = append(conds, buildCond("s.base_referrer", f.Value, f.Operator))
			case FilterDuration:
				if len(f.Value) == 2 {
					conds = append(conds, fmt.Sprintf("s.duration >= '%s'", f.Value[0]))
					conds = append(conds, fmt.Sprintf("s.duration <= '%s'", f.Value[1]))
				}
			case FilterUtmSource:
				conds = append(conds, buildCond("s.utm_source", f.Value, f.Operator))
			case FilterUtmMedium:
				conds = append(conds, buildCond("s.utm_medium", f.Value, f.Operator))
			case FilterUtmCampaign:
				conds = append(conds, buildCond("s.utm_campaign", f.Value, f.Operator))
			case FilterMetadata:
				if f.Source != "" {
					conds = append(conds, buildCond(fmt.Sprintf("s.%s", f.Source), f.Value, f.Operator))
				}
			}
		}
	}
	return conds
}

func buildCond(expr string, values []string, operator string) string {
	if len(values) == 0 {
		return ""
	}
	switch operator {
	case "contains":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s ILIKE '%%%s%%'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "notContains":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("NOT (%s ILIKE '%%%s%%')", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "startsWith":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s ILIKE '%s%%'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "endsWith":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s ILIKE '%%%s'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	default:
		if len(values) > 1 {
			var quoted []string
			for _, v := range values {
				quoted = append(quoted, fmt.Sprintf("'%s'", v))
			}
			return fmt.Sprintf("%s IN (%s)", expr, strings.Join(quoted, ","))
		}
		return fmt.Sprintf("%s = '%s'", expr, values[0])
	}
}

func buildInClause(values []string) string {
	var quoted []string
	for _, v := range values {
		quoted = append(quoted, fmt.Sprintf("'%s'", v))
	}
	return strings.Join(quoted, ",")
}

func buildStaticEventWhere(p Payload) string {
	return strings.Join([]string{
		fmt.Sprintf("main.project_id = %d", p.ProjectId),
		fmt.Sprintf("main.created_at >= toDateTime(%d / 1000)", p.StartTimestamp),
		fmt.Sprintf("main.created_at <= toDateTime(%d / 1000)", p.EndTimestamp),
	}, " AND ")
}

func buildStaticSessionWhere(p Payload, sessionConds []string) (string, string) {
	static := []string{fmt.Sprintf("s.project_id = %d", p.ProjectId)}
	sessWhere := strings.Join(static, " AND ")
	if len(sessionConds) > 0 {
		sessWhere += " AND " + strings.Join(sessionConds, " AND ")
	}
	sessJoin := strings.Join(append(static, append(sessionConds,
		fmt.Sprintf("s.datetime >= toDateTime(%d / 1000)", p.StartTimestamp),
		fmt.Sprintf("s.datetime <= toDateTime(%d / 1000)", p.EndTimestamp))...), " AND ")
	return sessWhere, sessJoin
}

func buildHavingClause(conds []string) string {
	seqConds := append([]string{}, conds...)
	if len(seqConds) == 1 {
		seqConds = append(seqConds, "1")
	}
	if len(seqConds) == 0 {
		return ""
	}
	var parts []string
	for i := range seqConds {
		parts = append(parts, fmt.Sprintf("(?%d)", i+1))
	}
	pattern := strings.Join(parts, "")
	args := []string{"toDateTime(main.created_at)"}
	args = append(args, seqConds...)
	return fmt.Sprintf("HAVING sequenceMatch('%s')(%s)) AS f", pattern, strings.Join(args, ",\n         "))
}

func contains(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}

func FillMissingDataPoints(
	startTime, endTime int64,
	density int,
	neutral DataPoint,
	rows []DataPoint,
	timeCoefficient int64,
) []DataPoint {
	if density <= 1 {
		return rows
	}

	stepSize := uint64(getStepSize(startTime, endTime, density, false, 1000))
	bucketSize := stepSize * uint64(timeCoefficient)

	lookup := make(map[uint64]DataPoint)
	for _, dp := range rows {
		if dp.Timestamp < uint64(startTime) {
			continue
		}
		bucket := uint64(startTime) + (((dp.Timestamp - uint64(startTime)) / bucketSize) * bucketSize)
		lookup[bucket] = dp
	}

	results := make([]DataPoint, 0, density)
	for i := 0; i < density; i++ {
		ts := uint64(startTime) + uint64(i)*bucketSize
		if dp, ok := lookup[ts]; ok {
			results = append(results, dp)
		} else {
			nd := neutral
			nd.Timestamp = ts
			results = append(results, nd)
		}
	}
	return results
}
