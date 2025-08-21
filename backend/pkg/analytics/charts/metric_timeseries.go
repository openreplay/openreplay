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
	sub := t.buildSubQuery(p, s, metric)
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

func (t *TimeSeriesQueryBuilder) buildSubQuery(p *Payload, s model.Series, metric string) string {
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

	whereParts := []string{staticEvt}
	if len(otherConds) > 0 {
		whereParts = append(whereParts, strings.Join(otherConds, " AND "))
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(
		`SELECT main.session_id,
				MIN(main.created_at) AS first_event_ts,
				MAX(main.created_at) AS last_event_ts
		  FROM product_analytics.events AS main
		 WHERE %s
		 GROUP BY main.session_id `,
		strings.Join(whereParts, " AND "),
	))

	switch eo {
	case "then":
		if len(eventConds) > 1 {
			var pat strings.Builder
			for i := range eventConds {
				pat.WriteString(fmt.Sprintf("(?%d)", i+1))
			}
			sb.WriteString(fmt.Sprintf(
				"HAVING sequenceMatch('%s')(\n    toDateTime(main.created_at),\n    %s\n)",
				pat.String(),
				strings.Join(eventConds, ",\n    "),
			))
		}
	case "and":
		if len(eventConds) > 0 {
			parts := make([]string, len(eventConds))
			for i, c := range eventConds {
				parts[i] = fmt.Sprintf("countIf(%s, 1) > 0", c)
			}
			sb.WriteString("HAVING " + strings.Join(parts, " AND "))
		}
	case "or":
		if len(eventConds) > 0 {
			parts := make([]string, len(eventConds))
			for i, c := range eventConds {
				parts[i] = fmt.Sprintf("countIf(%s, 1) > 0", c)
			}
			sb.WriteString("HAVING " + strings.Join(parts, " OR "))
		}
	}

	sub := sb.String()

	selSessions := `
		SELECT
			session_id,
			datetime,
			user_id,
			user_uuid,
			user_anonymous_id
		FROM experimental.sessions
		WHERE project_id=@project_id
		  AND datetime >= toDateTime(@startTimestamp/1000)
		  AND datetime <= toDateTime(@endTimestamp/1000)
	`

	var proj string
	switch metric {
	case "sessionCount":
		proj = "evt.session_id AS session_id, s.datetime AS datetime"
	case "userCount":
		proj = `s.user_id != '' AS user_id, s.datetime AS datetime`
	case "eventCount":
		proj = "e.event_id AS event_id, s.datetime AS datetime"
	default:
		proj = "evt.session_id AS session_id, s.datetime AS datetime"
	}

	joinEvents := ""
	if metric == "eventCount" {
		joinEvents = `
			LEFT JOIN product_analytics.events AS e
				ON e.session_id = evt.session_id
			   AND e.project_id = @project_id`
	}

	return fmt.Sprintf(
		`SELECT %s
		   FROM (%s) AS evt
		   INNER JOIN (%s) AS s ON s.session_id = evt.session_id
		   %s`,
		proj, sub, selSessions, joinEvents,
	)
}
