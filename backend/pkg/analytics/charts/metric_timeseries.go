package charts

import (
	"context"
	"fmt"
	"log"
	"openreplay/backend/pkg/analytics/model"
	"sort"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type TimeSeriesQueryBuilder struct {
	conn *clickhouse.Conn
}

func (t *TimeSeriesQueryBuilder) Execute(p *Payload, conn driver.Conn) (interface{}, error) {
	data := make(map[uint64]map[string]uint64)
	for _, series := range p.Series {
		query, params, err := t.buildQuery(p, series)
		if err != nil {
			log.Printf("buildQuery %s: %v", series.Name, err)
			return nil, fmt.Errorf("series %s: %v", series.Name, err)
		}

		var pts []DataPoint
		if err = conn.Select(context.Background(), &pts, query, convertParams(params)...); err != nil {
			log.Panicf("exec %s: %v", series.Name, err)
			return nil, err
		}

		for _, dp := range pts {
			if data[dp.Timestamp] == nil {
				data[dp.Timestamp] = map[string]uint64{}
			}
			data[dp.Timestamp][series.Name] = dp.Count
		}
	}

	var timestamps []uint64
	for ts := range data {
		timestamps = append(timestamps, ts)
	}

	// Sort timestamps to ensure consistent ordering
	sort.Slice(timestamps, func(i, j int) bool {
		return timestamps[i] < timestamps[j]
	})

	var result []map[string]interface{}
	for _, ts := range timestamps {
		row := map[string]interface{}{"timestamp": ts}
		for _, series := range p.Series {
			row[series.Name] = data[ts][series.Name]
		}
		result = append(result, row)
	}
	return result, nil
}

func (t *TimeSeriesQueryBuilder) buildQuery(p *Payload, s model.Series) (string, map[string]any, error) {
	switch p.MetricOf {
	case "sessionCount":
		return t.buildTimeSeriesQuery(p, s, "sessionCount", "session_id")
	case "userCount":
		return t.buildTimeSeriesQuery(p, s, "userCount", "user_id")
	case "eventCount":
		return t.buildTimeSeriesQuery(p, s, "eventCount", "event_id")
	default:
		return "", nil, fmt.Errorf("unsupported metric %q", p.MetricOf)
	}
}

func (t *TimeSeriesQueryBuilder) buildTimeSeriesQuery(p *Payload, s model.Series, metric, idField string) (string, map[string]any, error) {
	sub, err := t.buildSubQuery(p, s, metric)
	if err != nil {
		return "", nil, fmt.Errorf("buildSubQuery: %w", err)
	}
	step := getStepSize(p.StartTimestamp, p.EndTimestamp, p.Density, 1)
	query := fmt.Sprintf(`SELECT gs.generate_series AS timestamp, COALESCE(COUNT(DISTINCT ps.%s),0) AS count
					FROM generate_series(@startTimestamp,@endTimestamp,@step) AS gs
							LEFT JOIN (%s) AS ps ON TRUE
					WHERE ps.datetime >= toDateTime(timestamp/1000)
						AND ps.datetime < toDateTime((timestamp+@step)/1000)
					GROUP BY timestamp ORDER BY timestamp;`, idField, sub)
	params := map[string]any{
		"startTimestamp": p.StartTimestamp,
		"endTimestamp":   p.EndTimestamp,
		"step":           step,
		"project_id":     p.ProjectId,
	}

	logQuery(fmt.Sprintf("TimeSeriesQueryBuilder.buildQuery: %s", query))
	return query, params, nil
}

func (t *TimeSeriesQueryBuilder) buildSubQuery(p *Payload, s model.Series, metric string) (string, error) {
	eo := string(s.Filter.EventsOrder)
	eventConds, otherConds := BuildEventConditions(
		s.Filter.Filters,
		BuildConditionsOptions{
			DefinedColumns:       mainColumns,
			MainTableAlias:       "main",
			PropertiesColumnName: "$properties",
			EventsOrder:          eo,
		},
	)

	staticEvt := buildStaticEventWhere(p)
	if staticEvt == "" {
		return "", fmt.Errorf("static event condition is required")
	}

	whereParts := []string{staticEvt}
	if len(otherConds) > 0 {
		whereParts = append(whereParts, strings.Join(otherConds, " AND "))
	}

	joinClause, extraWhereParts, err := BuildEventsJoinClause(s.Filter.EventsOrder, eventConds, "main")
	if err != nil {
		return "", fmt.Errorf("BuildEventsJoinClause: %w", err)
	}

	if len(extraWhereParts) > 0 {
		whereParts = append(whereParts, strings.Join(extraWhereParts, " AND "))
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(
		`SELECT main.session_id,
		       MIN(main.created_at) AS first_event_ts,
		       MAX(main.created_at) AS last_event_ts
		  FROM product_analytics.events AS main
		 WHERE %s
		 GROUP BY main.session_id`,
		strings.Join(whereParts, " AND "),
	))

	if joinClause != "" {
		sb.WriteString(" ")
		sb.WriteString(joinClause)
	}

	subQuery := sb.String()

	const sessionsQuery = `
SELECT
	session_id,
	datetime,
	user_id,
	user_uuid,
	user_anonymous_id
FROM experimental.sessions
WHERE project_id = @project_id
  AND datetime >= toDateTime(@startTimestamp/1000)
  AND datetime <= toDateTime(@endTimestamp/1000)`

	projection, joinEvents := t.getProjectionAndJoin(metric)

	return fmt.Sprintf(
		`SELECT %s
		   FROM (%s) AS evt
		   INNER JOIN (%s) AS s ON s.session_id = evt.session_id%s`,
		projection, subQuery, sessionsQuery, joinEvents,
	), nil
}

func (t *TimeSeriesQueryBuilder) getProjectionAndJoin(metric string) (string, string) {
	switch metric {
	case "sessionCount":
		return "evt.session_id AS session_id, s.datetime AS datetime", ""

	case "userCount":
		return "s.user_id AS user_id, s.datetime AS datetime", ""

	case "eventCount":
		projection := "e.event_id AS event_id, s.datetime AS datetime"
		joinEvents := `
		LEFT JOIN product_analytics.events AS e
		  ON e.session_id = evt.session_id
		 AND e.project_id = @project_id`
		return projection, joinEvents

	default:
		return "evt.session_id AS session_id, s.datetime AS datetime", ""
	}
}
