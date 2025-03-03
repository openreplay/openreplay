package charts

import (
	"fmt"
	"log"
	"openreplay/backend/pkg/analytics/db"
	"sort"
	"strings"
)

type TimeSeriesQueryBuilder struct{}

func (t TimeSeriesQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
	consolidated := map[uint64]map[string]uint64{}

	for _, s := range p.Series {
		query, err := t.buildQuery(p, s)
		if err != nil {
			log.Fatalf("Error building query for series %s: %v", s.Name, err)
			return nil, err
		}

		rows, err := conn.Query(query)
		if err != nil {
			log.Fatalf("Error executing query for series %s: %v", s.Name, err)
			return nil, err
		}

		var results []DataPoint
		for rows.Next() {
			var res DataPoint
			if err := rows.Scan(&res.Timestamp, &res.Count); err != nil {
				rows.Close()
				return nil, err
			}
			results = append(results, res)
		}
		rows.Close()

		filled := FillMissingDataPoints(p.StartTimestamp, p.EndTimestamp, p.Density, DataPoint{}, results, 1000)
		for _, dp := range filled {
			if _, ok := consolidated[dp.Timestamp]; !ok {
				consolidated[dp.Timestamp] = map[string]uint64{}
			}
			consolidated[dp.Timestamp][s.Name] = dp.Count
		}
	}

	var timestamps []uint64
	for ts := range consolidated {
		timestamps = append(timestamps, ts)
	}
	sort.Slice(timestamps, func(i, j int) bool { return timestamps[i] < timestamps[j] })

	var finalResults []map[string]interface{}
	for _, ts := range timestamps {
		row := map[string]interface{}{"timestamp": ts}
		for _, s := range p.Series {
			if count, ok := consolidated[ts][s.Name]; ok {
				row[s.Name] = count
			} else {
				row[s.Name] = uint64(0)
			}
		}
		finalResults = append(finalResults, row)
	}

	return finalResults, nil
}

func (t TimeSeriesQueryBuilder) buildQuery(p Payload, s Series) (string, error) {
	var query string
	switch p.MetricOf {
	case "sessionCount":
		query = t.buildSessionCountQuery(p, s)
	case "userCount":
		query = t.buildUserCountQuery(p, s)
	default:
		query = ""
	}
	return query, nil
}

func (TimeSeriesQueryBuilder) buildSessionCountQuery(p Payload, s Series) string {
	eventConds, eventNames := buildEventConditions(s.Filter.Filters)
	sessionConds := buildSessionConditions(s.Filter.Filters)
	staticEvt := buildStaticEventWhere(p)
	sessWhere, sessJoin := buildStaticSessionWhere(p, sessionConds)
	eventsSubQuery := buildEventsSubQuery("sessionCount", eventConds, eventNames, staticEvt, sessWhere, sessJoin)
	mainQuery := buildMainQuery(p, eventsSubQuery, "sessionCount")
	return mainQuery
}

func (TimeSeriesQueryBuilder) buildUserCountQuery(p Payload, s Series) string {
	eventConds, eventNames := buildEventConditions(s.Filter.Filters)
	sessionConds := buildSessionConditions(s.Filter.Filters)
	staticEvt := buildStaticEventWhere(p)
	sessWhere, sessJoin := buildStaticSessionWhere(p, sessionConds)
	eventsSubQuery := buildEventsSubQuery("userCount", eventConds, eventNames, staticEvt, sessWhere, sessJoin)
	mainQuery := buildMainQuery(p, eventsSubQuery, "userCount")
	return mainQuery
}

func buildEventsSubQuery(metric string, eventConds, eventNames []string, staticEvt, sessWhere, sessJoin string) string {
	if len(eventConds) == 0 && len(eventNames) == 0 {
		if metric == "sessionCount" {
			return fmt.Sprintf(sessionNoFiltersSubQueryTpl, sessJoin)
		}
		return fmt.Sprintf(noFiltersSubQueryTpl, sessJoin)
	}
	var evtNameClause string
	var unique []string
	for _, name := range eventNames {
		if !contains(unique, name) {
			unique = append(unique, name)
		}
	}
	if len(unique) > 0 {
		evtNameClause = fmt.Sprintf("AND main.`$event_name` IN (%s)", buildInClause(unique))
	}
	having := ""
	if len(eventConds) > 0 {
		having = buildHavingClause(eventConds)
	}
	evtWhere := staticEvt
	if len(eventConds) > 0 {
		evtWhere += " AND " + strings.Join(eventConds, " AND ")
	}
	if metric == "sessionCount" {
		return fmt.Sprintf(sessionSubQueryTpl, evtWhere, sessWhere, evtNameClause, having, sessJoin)
	}
	return fmt.Sprintf(subQueryTpl, evtWhere, sessWhere, evtNameClause, having, sessJoin)
}

func buildMainQuery(p Payload, subQuery, metric string) string {
	step := int(getStepSize(p.StartTimestamp, p.EndTimestamp, p.Density, false, 1000))
	if metric == "sessionCount" {
		return fmt.Sprintf(sessionMainQueryTpl, p.StartTimestamp, p.EndTimestamp, step, subQuery, step)
	}
	return fmt.Sprintf(mainQueryTpl, p.StartTimestamp, p.EndTimestamp, step, subQuery, step)
}

var subQueryTpl = `
SELECT multiIf(
         s.user_id IS NOT NULL AND s.user_id != '', s.user_id,
         s.user_anonymous_id IS NOT NULL AND s.user_anonymous_id != '', s.user_anonymous_id,
         toString(s.user_uuid)) AS user_id,
       s.datetime AS datetime
FROM (
  SELECT main.session_id,
         MIN(main.created_at) AS first_event_ts,
         MAX(main.created_at) AS last_event_ts
  FROM product_analytics.events AS main
  WHERE %s
    AND main.session_id IN (
      SELECT s.session_id
      FROM experimental.sessions AS s
      WHERE %s
    )
    %s
  GROUP BY session_id
  %s
  INNER JOIN (
      SELECT *
      FROM experimental.sessions AS s
      WHERE %s
  ) AS s ON (s.session_id = f.session_id)
`

var noFiltersSubQueryTpl = `
SELECT multiIf(
         s.user_id IS NOT NULL AND s.user_id != '', s.user_id,
         s.user_anonymous_id IS NOT NULL AND s.user_anonymous_id != '', s.user_anonymous_id,
         toString(s.user_uuid)) AS user_id,
       s.datetime AS datetime
FROM experimental.sessions AS s
WHERE %s
`

var sessionSubQueryTpl = `
SELECT s.session_id AS session_id,
       s.datetime AS datetime
FROM (
  SELECT main.session_id,
         MIN(main.created_at) AS first_event_ts,
         MAX(main.created_at) AS last_event_ts
  FROM product_analytics.events AS main
  WHERE %s
    AND main.session_id IN (
      SELECT s.session_id
      FROM experimental.sessions AS s
      WHERE %s
    )
    %s
  GROUP BY session_id
  %s
  INNER JOIN (
      SELECT *
      FROM experimental.sessions AS s
      WHERE %s
  ) AS s ON (s.session_id = f.session_id)
`

var sessionNoFiltersSubQueryTpl = `
SELECT s.session_id AS session_id,
       s.datetime AS datetime
FROM experimental.sessions AS s
WHERE %s
`

var mainQueryTpl = `
SELECT gs.generate_series AS timestamp,
       COALESCE(COUNT(DISTINCT processed_sessions.user_id), 0) AS count
FROM generate_series(%d, %d, %d) AS gs
LEFT JOIN (
  %s
) AS processed_sessions ON (TRUE)
WHERE processed_sessions.datetime >= toDateTime(timestamp / 1000)
  AND processed_sessions.datetime < toDateTime((timestamp + %d) / 1000)
GROUP BY timestamp
ORDER BY timestamp;
`

var sessionMainQueryTpl = `
SELECT gs.generate_series AS timestamp,
       COALESCE(COUNT(DISTINCT processed_sessions.session_id), 0) AS count
FROM generate_series(%d, %d, %d) AS gs
LEFT JOIN (
  %s
) AS processed_sessions ON (TRUE)
WHERE processed_sessions.datetime >= toDateTime(timestamp / 1000)
  AND processed_sessions.datetime < toDateTime((timestamp + %d) / 1000)
GROUP BY timestamp
ORDER BY timestamp;
`
