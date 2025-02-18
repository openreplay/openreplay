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
	Execute(p *Payload, conn db.Connector) (interface{}, error)
}

func NewQueryBuilder(p *Payload) (QueryBuilder, error) {
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

func buildEventSubquery(p *Payload) string {
	baseEventsWhere := buildBaseEventsWhere(p)
	sequenceCond := buildSequenceCondition(p.Series)
	sessionsWhere := buildSessionsWhere(p)

	if sequenceCond.seqPattern == "" {
		return fmt.Sprintf(`
SELECT s.%[1]s AS %[1]s,
	   s.datetime AS datetime
FROM (
	SELECT main.session_id,
		   MIN(main.created_at) AS first_event_ts,
		   MAX(main.created_at) AS last_event_ts
	FROM product_analytics.events AS main
	WHERE %[2]s
	GROUP BY session_id
) AS f
INNER JOIN (
	SELECT *
	FROM experimental.sessions AS s
	WHERE %[3]s
) AS s ON (s.session_id = f.session_id)
`, pickIDField(p), baseEventsWhere, sessionsWhere)
	}

	return fmt.Sprintf(`
SELECT s.%[1]s AS %[1]s,
       s.datetime AS datetime
FROM (
    SELECT main.session_id,
           MIN(main.created_at) AS first_event_ts,
           MAX(main.created_at) AS last_event_ts
    FROM product_analytics.events AS main
    WHERE %[2]s
    GROUP BY session_id
    HAVING sequenceMatch('%[3]s')(toDateTime(main.created_at), %[4]s)
) AS f
INNER JOIN (
    SELECT *
    FROM experimental.sessions AS s
    WHERE %[5]s
) AS s ON (s.session_id = f.session_id)
`, pickIDField(p), baseEventsWhere, sequenceCond.seqPattern, sequenceCond.seqEvents, sessionsWhere)
}

func pickIDField(p *Payload) string {
	if p.MetricOf == "userCount" {
		return "user_id"
	}
	return "session_id"
}

func buildBaseEventsWhere(p *Payload) string {
	ts := fmt.Sprintf(
		`(main.created_at >= toDateTime(%d / 1000) AND main.created_at <= toDateTime(%d / 1000))`,
		p.StartTimestamp,
		p.EndTimestamp,
	)
	return fmt.Sprintf(`main.project_id = %d AND %s`, p.ProjectId, ts)
}

func buildSessionsWhere(p *Payload) string {
	ts := fmt.Sprintf(
		`(s.datetime >= toDateTime(%d / 1000) AND s.datetime <= toDateTime(%d / 1000))`,
		p.StartTimestamp,
		p.EndTimestamp,
	)
	return fmt.Sprintf(`s.project_id = %d AND isNotNull(s.duration) AND %s`, p.ProjectId, ts)
}

type sequenceParts struct {
	seqPattern string
	seqEvents  string
}

func buildSequenceCondition(series []Series) sequenceParts {
	var events []string
	for _, s := range series {
		if len(s.Filter.Filters) > 0 {
			events = append(events, buildOneSeriesSequence(s.Filter.Filters))
		}
	}
	if len(events) < 2 {
		return sequenceParts{"", ""}
	}
	pattern := ""
	for i := 1; i <= len(events); i++ {
		pattern += fmt.Sprintf("(?%d)", i)
	}
	return sequenceParts{
		seqPattern: pattern,
		seqEvents:  strings.Join(events, ", "),
	}
}

func buildOneSeriesSequence(filters []Filter) string {
	return strings.Join(buildFilterConditions(filters), " AND ")
}

func buildFilterConditions(filters []Filter) []string {
	var out []string
	for _, f := range filters {
		switch f.Type {
		case FilterClick:
			out = append(out,
				fmt.Sprintf(`(main."$event_name" = 'CLICK' AND JSONExtractString(toString(main."$properties"), 'label') IN ('%s'))`,
					strings.Join(f.Value, "','")))
		case FilterInput:
			out = append(out,
				fmt.Sprintf(`(main."$event_name" = 'INPUT' AND JSONExtractString(toString(main."$properties"), 'label') IN ('%s'))`,
					strings.Join(f.Value, "','")))

		default:
			out = append(out,
				fmt.Sprintf(`(main."$event_name" = '%s')`, strings.ToUpper(string(f.Type))))
		}
	}
	return out
}
