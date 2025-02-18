package charts

import (
	"fmt"
	"log"
	"openreplay/backend/pkg/analytics/db"
	"strings"
)

type TimeSeriesQueryBuilder struct{}

func (t TimeSeriesQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
	query, err := t.buildQuery(p)
	if err != nil {
		log.Fatalf("Error building query: %v", err)
		return nil, err
	}

	rows, err := conn.Query(query)
	if err != nil {
		log.Fatalf("Error executing query: %v", err)
		return nil, err
	}
	defer rows.Close()

	var results []DataPoint
	for rows.Next() {
		var res DataPoint
		if err := rows.Scan(&res.Timestamp, &res.Count); err != nil {
			return nil, err
		}
		//sum += res.Count
		results = append(results, res)
	}

	filled := FillMissingDataPoints(p.StartTimestamp, p.EndTimestamp, p.Density, DataPoint{}, results, 1000)
	return filled, nil
}

func (t TimeSeriesQueryBuilder) buildQuery(p Payload) (string, error) {
	query := ""
	switch p.MetricOf {
	case "sessionCount":
		query = t.buildSessionCountQuery(p)
	case "userCount":
		query = t.buildUserCountQuery(p)
	default:
		query = ""
	}
	return query, nil
}

func (TimeSeriesQueryBuilder) buildSessionCountQuery(p Payload) string {
	eventConds, eventNames := buildEventConditions(p.Series[0].Filter.Filters)
	sessionConds := buildSessionConditions(p.Series[0].Filter.Filters)
	staticEvt := buildStaticEventWhere(p)
	sessWhere, sessJoin := buildStaticSessionWhere(p, sessionConds)
	eventsSubQuery := buildEventsSubQuery(eventConds, eventNames, staticEvt, sessWhere, sessJoin)
	mainQuery := buildMainQuery(p, eventsSubQuery)
	return mainQuery
}

func (TimeSeriesQueryBuilder) buildUserCountQuery(p Payload) string {
	eventConds, eventNames := buildEventConditions(p.Series[0].Filter.Filters)
	sessionConds := buildSessionConditions(p.Series[0].Filter.Filters)
	staticEvt := buildStaticEventWhere(p)
	sessWhere, sessJoin := buildStaticSessionWhere(p, sessionConds)
	eventsSubQuery := buildEventsSubQuery(eventConds, eventNames, staticEvt, sessWhere, sessJoin)
	mainQuery := buildMainQuery(p, eventsSubQuery)
	return mainQuery
}

func buildEventsSubQuery(eventConds, eventNames []string, staticEvt, sessWhere, sessJoin string) string {
	if len(eventConds) == 0 && len(eventNames) == 0 {
		return fmt.Sprintf(noEventSubQueryTpl, sessJoin)
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
	return fmt.Sprintf(eventsSubQueryTpl, evtWhere, sessWhere, evtNameClause, having, sessJoin)
}

func buildMainQuery(p Payload, subQuery string) string {
	step := int(getStepSize(p.StartTimestamp, p.EndTimestamp, p.Density, false, 1000))
	return fmt.Sprintf(mainQueryTpl, p.StartTimestamp, p.EndTimestamp, step, subQuery, step)
}

var eventsSubQueryTpl = `
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

var noEventSubQueryTpl = `
SELECT multiIf(
         s.user_id IS NOT NULL AND s.user_id != '', s.user_id,
         s.user_anonymous_id IS NOT NULL AND s.user_anonymous_id != '', s.user_anonymous_id,
         toString(s.user_uuid)) AS user_id,
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
