package charts

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"openreplay/backend/pkg/analytics/model"
)

type TimeSeriesQueryBuilder struct{}

func (t *TimeSeriesQueryBuilder) Execute(p *Payload, conn driver.Conn) (interface{}, error) {
	data := make(map[uint64]map[string]uint64)
	for _, series := range p.Series {
		query, err := t.buildQuery(p, series)
		if err != nil {
			log.Printf("buildQuery %s: %v", series.Name, err)
			return nil, fmt.Errorf("series %s: %v", series.Name, err)
		}

		rows, err := conn.Query(context.Background(), query)
		if err != nil {
			log.Printf("exec %s: %v", series.Name, err)
			return nil, fmt.Errorf("series %s: %v", series.Name, err)
		}
		var pts []DataPoint
		for rows.Next() {
			var dp DataPoint
			if err := rows.Scan(&dp.Timestamp, &dp.Count); err != nil {
				rows.Close()
				return nil, err
			}
			pts = append(pts, dp)
		}
		rows.Close()

		filled := FillMissingDataPoints(p.StartTimestamp, p.EndTimestamp, p.Density, DataPoint{}, pts, 1000)
		for _, dp := range filled {
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
	sort.Slice(timestamps, func(i, j int) bool { return timestamps[i] < timestamps[j] })

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

func (t *TimeSeriesQueryBuilder) buildQuery(p *Payload, s model.Series) (string, error) {
	switch p.MetricOf {
	case "sessionCount":
		return t.buildTimeSeriesQuery(p, s, "sessionCount", "session_id"), nil
	case "userCount":
		return t.buildTimeSeriesQuery(p, s, "userCount", "user_id"), nil
	default:
		return "", fmt.Errorf("unsupported metric %q", p.MetricOf)
	}
}

func (t *TimeSeriesQueryBuilder) buildTimeSeriesQuery(p *Payload, s model.Series, metric, idField string) string {
	sub := t.buildSubQuery(p, s, metric)
	step := int(getStepSize(p.StartTimestamp, p.EndTimestamp, p.Density, false, 1000)) * 1000

	query := fmt.Sprintf(
		"SELECT gs.generate_series AS timestamp, COALESCE(COUNT(DISTINCT ps.%s),0) AS count "+
			"FROM generate_series(%d,%d,%d) AS gs "+
			"LEFT JOIN (%s) AS ps ON TRUE "+
			"WHERE ps.datetime >= toDateTime(timestamp/1000) AND ps.datetime < toDateTime((timestamp+%d)/1000) "+
			"GROUP BY timestamp ORDER BY timestamp;",
		idField, p.StartTimestamp, p.EndTimestamp, step, sub, step,
	)

	logQuery(fmt.Sprintf("TimeSeriesQueryBuilder.buildQuery: %s", query))
	return query
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

	// combine static + non-event filters
	whereParts := []string{staticEvt}
	if len(otherConds) > 0 {
		whereParts = append(whereParts, strings.Join(otherConds, " AND "))
	}
	whereClause := strings.Join(whereParts, " AND ")

	// build subquery with GROUP BY always
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(
		"SELECT main.session_id, MIN(main.created_at) AS first_event_ts, MAX(main.created_at) AS last_event_ts "+
			"FROM product_analytics.events AS main "+
			"WHERE %s\n",
		whereClause,
	))
	sb.WriteString("GROUP BY main.session_id\n")

	// append HAVING based on EventsOrder
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
	proj := map[string]string{
		"sessionCount": "evt.session_id AS session_id",
		"userCount":    "multiIf(s.user_id!='',s.user_id,s.user_anonymous_id!='',s.user_anonymous_id,toString(s.user_uuid)) AS user_id",
	}[metric] + ", s.datetime AS datetime"

	return fmt.Sprintf(
		"SELECT %s FROM (\n%s\n) AS evt "+
			"INNER JOIN experimental.sessions AS s ON s.session_id = evt.session_id",
		proj, sub,
	)
}
