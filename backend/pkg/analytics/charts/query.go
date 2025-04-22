package charts

import (
	"fmt"
	"openreplay/backend/pkg/analytics/db"
	"strings"
)

type Payload struct {
	*MetricPayload
	GroupByColumn string // TODO remove this field
	ProjectId     int
	UserId        uint64
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

func buildEventConditions(filters []Filter) (conds, names []string) {
	for _, f := range filters {
		//if f.IsEvent {
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
		//}
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
			case FilterUtmSource:
				conds = append(conds, buildCond("s.utm_source", f.Value, f.Operator))
			case FilterUtmMedium:
				conds = append(conds, buildCond("s.utm_medium", f.Value, f.Operator))
			case FilterUtmCampaign:
				conds = append(conds, buildCond("s.utm_campaign", f.Value, f.Operator))
			case FilterDuration:
				if len(f.Value) == 2 {
					conds = append(conds, fmt.Sprintf("s.duration >= '%s'", f.Value[0]))
					conds = append(conds, fmt.Sprintf("s.duration <= '%s'", f.Value[1]))
				}
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
	case "notEquals":
		if len(values) > 1 {
			return fmt.Sprintf("%s NOT IN (%s)", expr, buildInClause(values))
		}
		return fmt.Sprintf("%s <> '%s'", expr, values[0])
	case "greaterThan":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s > '%s'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "greaterThanOrEqual":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s >= '%s'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "lessThan":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s < '%s'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "lessThanOrEqual":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s <= '%s'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "in":
		if len(values) > 1 {
			return fmt.Sprintf("%s IN (%s)", expr, buildInClause(values))
		}
		return fmt.Sprintf("%s = '%s'", expr, values[0])
	case "notIn":
		if len(values) > 1 {
			return fmt.Sprintf("%s NOT IN (%s)", expr, buildInClause(values))
		}
		return fmt.Sprintf("%s <> '%s'", expr, values[0])
	case "equals", "is":
		if len(values) > 1 {
			return fmt.Sprintf("%s IN (%s)", expr, buildInClause(values))
		}
		return fmt.Sprintf("%s = '%s'", expr, values[0])
	default:
		if len(values) > 1 {
			return fmt.Sprintf("%s IN (%s)", expr, buildInClause(values))
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
