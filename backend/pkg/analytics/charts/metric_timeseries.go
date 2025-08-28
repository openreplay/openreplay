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

// Supported metrics for time series queries
const (
	MetricSessionCount = "sessionCount"
	MetricUserCount    = "userCount"
	MetricEventCount   = "eventCount"
)

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
			log.Printf("Select timeseries %s error: %v", series.Name, err)
			return nil, fmt.Errorf("series %s: %v", series.Name, err)
		}

		if len(pts) == 0 {
			return []interface{}{}, nil
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
	if err := t.validatePayload(p); err != nil {
		return "", nil, fmt.Errorf("invalid payload: %w", err)
	}

	switch p.MetricOf {
	case MetricSessionCount:
		return t.buildTimeSeriesQuery(p, s, MetricSessionCount, "session_id")
	case MetricUserCount:
		return t.buildTimeSeriesQuery(p, s, MetricUserCount, "user_id")
	case MetricEventCount:
		return t.buildTimeSeriesQuery(p, s, MetricEventCount, "event_id")
	default:
		return "", nil, fmt.Errorf("unsupported metric %q", p.MetricOf)
	}
}

func (t *TimeSeriesQueryBuilder) validatePayload(p *Payload) error {
	if p == nil {
		return fmt.Errorf("payload cannot be nil")
	}
	if p.ProjectId == 0 {
		return fmt.Errorf("project_id is required")
	}
	if p.StartTimestamp >= p.EndTimestamp {
		return fmt.Errorf("start_timestamp must be less than end_timestamp")
	}
	if len(p.Series) == 0 {
		return fmt.Errorf("at least one series is required")
	}
	return nil
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
	allFilters := s.Filter.Filters

	var (
		eventFilters   []model.Filter
		sessionFilters []model.Filter
	)

	for _, filter := range allFilters {
		if _, exists := SessionColumns[filter.Name]; exists {
			sessionFilters = append(sessionFilters, filter)
		} else {
			eventFilters = append(eventFilters, filter)
		}
	}

	// Determine query strategy based on filters and metric type
	// Use events table when we have event-specific filters or need event-level data
	requiresEventsTable := len(eventFilters) > 0 || metric == MetricEventCount

	if requiresEventsTable {
		return t.buildEventsBasedSubQuery(p, s, metric, eventFilters, sessionFilters)
	} else {
		return t.buildSessionsOnlySubQuery(p, s, metric, sessionFilters)
	}
}

func (t *TimeSeriesQueryBuilder) buildEventsBasedSubQuery(p *Payload, s model.Series, metric string, eventFilters, sessionFilters []model.Filter) (string, error) {
	eventConds, otherConds := BuildEventConditions(
		eventFilters,
		BuildConditionsOptions{
			DefinedColumns:       mainColumns,
			MainTableAlias:       "main",
			PropertiesColumnName: "$properties",
			EventsOrder:          string(s.Filter.EventsOrder),
		},
	)

	staticEvt := buildStaticEventWhere(p)

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

	sessionsQuery := t.buildSessionsFilterQuery(sessionFilters)
	projection, joinEvents := t.getProjectionAndJoin(metric)

	return fmt.Sprintf(
		`SELECT %s
		   FROM (%s) AS evt
		   INNER JOIN (%s) AS s ON s.session_id = evt.session_id%s`,
		projection, subQuery, sessionsQuery, joinEvents,
	), nil
}

func (t *TimeSeriesQueryBuilder) buildSessionsOnlySubQuery(p *Payload, s model.Series, metric string, sessionFilters []model.Filter) (string, error) {
	whereParts := t.buildSessionsFilterConditions(sessionFilters)
	projection := t.getSessionsOnlyProjection(metric)

	return fmt.Sprintf(
		`SELECT %s
		 FROM experimental.sessions AS s
		 WHERE %s`,
		projection, strings.Join(whereParts, " AND "),
	), nil
}

// buildSessionsFilterQuery builds a complete sessions query with filters applied
func (t *TimeSeriesQueryBuilder) buildSessionsFilterQuery(sessionFilters []model.Filter) string {
	whereParts := t.buildSessionsFilterConditions(sessionFilters)

	return fmt.Sprintf(`
SELECT
	session_id,
	datetime,
	user_id,
	user_uuid,
	user_anonymous_id
FROM experimental.sessions AS s
WHERE %s`, strings.Join(whereParts, " AND "))
}

// buildSessionsFilterConditions builds WHERE conditions for sessions table queries
func (t *TimeSeriesQueryBuilder) buildSessionsFilterConditions(sessionFilters []model.Filter) []string {
	_, sessionConditions := BuildEventConditions(sessionFilters, BuildConditionsOptions{
		DefinedColumns: SessionColumns,
		MainTableAlias: "s",
	})

	durConds, _ := BuildDurationWhere(sessionFilters, "s")

	whereParts := []string{
		"s.project_id = @project_id",
		"s.datetime >= toDateTime(@startTimestamp/1000)",
		"s.datetime <= toDateTime(@endTimestamp/1000)",
	}

	if len(sessionConditions) > 0 {
		whereParts = append(whereParts, strings.Join(sessionConditions, " AND "))
	}

	if durConds != nil {
		whereParts = append(whereParts, durConds...)
	}

	return whereParts
}

func (t *TimeSeriesQueryBuilder) getSessionsOnlyProjection(metric string) string {
	switch metric {
	case MetricSessionCount:
		return "s.session_id AS session_id, s.datetime AS datetime"
	case MetricUserCount:
		return "s.user_id AS user_id, s.datetime AS datetime"
	default:
		// Fallback to session_id for unknown metrics
		return "s.session_id AS session_id, s.datetime AS datetime"
	}
}

func (t *TimeSeriesQueryBuilder) getProjectionAndJoin(metric string) (string, string) {
	switch metric {
	case MetricSessionCount:
		return "evt.session_id AS session_id, s.datetime AS datetime", ""

	case MetricUserCount:
		return "s.user_id AS user_id, s.datetime AS datetime", ""

	case MetricEventCount:
		projection := "e.event_id AS event_id, s.datetime AS datetime"
		joinEvents := `
		LEFT JOIN product_analytics.events AS e
		  ON e.session_id = evt.session_id
		 AND e.project_id = @project_id`
		return projection, joinEvents

	default:
		// Fallback to session_id for unknown metrics
		return "evt.session_id AS session_id, s.datetime AS datetime", ""
	}
}
