package query

import (
	"encoding/json"
	"fmt"
	"strings"
)

type NewQueryBuilder interface {
	Build(MetricPayload) string
}

func buildEventSubquery(p MetricPayload) string {
	baseEventsWhere := buildBaseEventsWhere(p)
	sequenceCond := buildSequenceCondition(p.Series)
	sessionsWhere := buildSessionsWhere(p)

	// If there's no sequence pattern, skip HAVING entirely.
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

func pickIDField(p MetricPayload) string {
	if p.MetricOf == "userCount" {
		return "user_id"
	}
	return "session_id"
}

func buildBaseEventsWhere(p MetricPayload) string {
	projectID := 5
	ts := fmt.Sprintf(
		`(main.created_at >= toDateTime(%d / 1000) AND main.created_at <= toDateTime(%d / 1000))`,
		p.StartTimestamp,
		p.EndTimestamp,
	)
	return fmt.Sprintf(`main.project_id = %d AND %s`, projectID, ts)
}

func buildSessionsWhere(p MetricPayload) string {
	projectID := 5
	ts := fmt.Sprintf(
		`(s.datetime >= toDateTime(%d / 1000) AND s.datetime <= toDateTime(%d / 1000))`,
		p.StartTimestamp,
		p.EndTimestamp,
	)
	return fmt.Sprintf(`s.project_id = %d AND isNotNull(s.duration) AND %s`, projectID, ts)
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

	if len(events) == 0 {
		return sequenceParts{"", ""}
	}

	// For n events, we need a pattern like `(?1)(?2)(?3)...( ?n )`.
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
		// TODO add more cases to cover all the events
		default:
			out = append(out,
				fmt.Sprintf(`(main."$event_name" = '%s')`, strings.ToUpper(string(f.Type))))
		}
	}
	return out
}

func main() {
	//input := GetPayload(MetricTypeTimeseries)
	input := GetPayload(MetricTypeTable)

	var payload MetricPayload
	err := json.Unmarshal([]byte(input), &payload)
	if err != nil {
		return
	}

	var qb NewQueryBuilder
	switch payload.MetricType {
	case MetricTypeTimeseries:
		qb = TimeSeriesQueryBuilder{}
	case MetricTypeFunnel:
		qb = FunnelQueryBuilder{}
	case MetricTypeTable:
		qb = TableQueryBuilder{}
	default:
		qb = TimeSeriesQueryBuilder{}
	}

	query := qb.Build(payload)
	fmt.Println(query)
}

func GetPayload(metricType MetricType) string {
	switch metricType {
	case MetricTypeTimeseries:
		return `{
		  "startTimestamp": 1738796399999,
		  "endTimestamp": 1739401199999,
		  "density": 7,
		  "metricOf": "sessionCount",
		  "metricValue": [],
		  "metricType": "timeseries",
		  "metricFormat": "sessionCount",
		  "viewType": "lineChart",
		  "name": "Untitled Trend",
		  "series": [
			{
			  "name": "Series 1",
			  "filter": {
				"filters": [
				  {
					"type": "userId",
					"isEvent": false,
					"value": [
					  "test@test.com"
					],
					"operator": "is",
					"filters": []
				  }
				],
				"eventsOrder": "then"
			  }
			}
		  ]
		}`
	case MetricTypeFunnel:
		return `{}`
	case MetricTypeTable:
		return `{
			"startTimestamp": 1737586800000,
			"endTimestamp": 1738277999999,
			"density": 7,
			"metricOf": "userDevice",
			"metricType": "table",
			"metricFormat": "sessionCount",
			"viewType": "table",
			"name": "Untitled Trend",
			"series": [
				{
					"name": "Series 1",
					"filter": {
						"filters": [
							{
								"type": "click",
								"isEvent": true,
								"value": ["Manuscripts"],
								"operator": "on",
								"filters": []
							}
						],
						"eventsOrder": "then"
					}
				},
				{
					"name": "Series 2",
					"filter": {
						"filters": [
							{
								"type": "input",
								"isEvent": true,
								"value": ["test"],
								"operator": "is",
								"filters": []
							}
						],
						"eventsOrder": "then"
					}
				}
			],
			"page": 1,
			"limit": 20,
			"compareTo": null,
			"config": {
				"col": 2
			}
		}`
	default:
		return `{}`
	}
}
