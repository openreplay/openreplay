package charts

import (
	"context"
	"fmt"
	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/logger"
	"sort"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type TimeSeriesQueryBuilder struct {
	//conn   *clickhouse.Conn
	Logger logger.Logger
}

// Supported metrics for time series queries
const (
	MetricSessionCount = "sessionCount"
	MetricUserCount    = "userCount"
	MetricEventCount   = "eventCount"
)

func (t *TimeSeriesQueryBuilder) Execute(ctx context.Context, p *Payload, conn driver.Conn) (interface{}, error) {
	data := make(map[uint64]map[string]uint64)

	for _, series := range p.Series {
		query, params, err := t.buildQuery(p, series)
		if err != nil {
			t.Logger.Error(ctx, "buildQuery %s: %v", series.Name, err)
			return nil, fmt.Errorf("series %s: %v", series.Name, err)
		}
		_start := time.Now()
		t.Logger.Debug(ctx, "Executing query: %s", query)
		var pts []DataPoint
		if err = conn.Select(ctx, &pts, query, convertParams(params)...); err != nil {
			t.Logger.Error(ctx, "Select timeseries %s error: %v", series.Name, err)
			return nil, fmt.Errorf("series %s: %v", series.Name, err)
		}
		if time.Since(_start) > 2*time.Second {
			t.Logger.Warn(ctx, "Query execution took longer than 2s: %s", query)
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

	var result []map[string]interface{} = make([]map[string]interface{}, 0)
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
		if filter.AutoCaptured && !filter.IsEvent {
			filter.Name = CamelToSnake(filter.Name)
		}
		if _, exists := SessionColumns[filter.Name]; exists || strings.HasPrefix(filter.Name, "metadata_") {
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
	eventConds, eventNameConds, otherConds := BuildEventConditions(
		eventFilters,
		BuildConditionsOptions{
			DefinedColumns:             mainColumns,
			MainTableAlias:             "main",
			PropertiesColumnName:       "$properties",
			CustomPropertiesColumnName: "properties",
			EventsOrder:                string(s.Filter.EventsOrder),
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

	if len(eventNameConds) > 0 {
		whereParts = append(whereParts, fmt.Sprintf("(%s)", strings.Join(eventNameConds, " OR ")))
	}
	if len(extraWhereParts) > 0 {
		whereParts = append(whereParts, fmt.Sprintf("(%s)", strings.Join(extraWhereParts, " AND ")))
	}
	var mainEventsTable = getMainEventsTable(p.StartTimestamp)

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(
		`SELECT main.session_id,
					   MIN(main.created_at) AS first_event_ts,
					   MAX(main.created_at) AS last_event_ts
				FROM %s AS main
				WHERE %s
				GROUP BY main.session_id`,
		mainEventsTable,
		strings.Join(whereParts, " AND "),
	))

	if joinClause != "" {
		sb.WriteString(" ")
		sb.WriteString(joinClause)
	}

	subQuery := sb.String()
	sessionsQuery := t.buildSessionsFilterQuery(sessionFilters, p.StartTimestamp)
	projection, joinEvents := t.getProjectionAndJoin(metric, p)

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
func (t *TimeSeriesQueryBuilder) buildSessionsFilterQuery(sessionFilters []model.Filter, startTimestamp uint64) string {
	whereParts := t.buildSessionsFilterConditions(sessionFilters)
	var mainSessionsTable = getMainSessionsTable(startTimestamp)
	return fmt.Sprintf(`
SELECT
	session_id,
	datetime,
	user_id,
	user_uuid,
	user_anonymous_id
FROM %s AS s
WHERE %s`, mainSessionsTable, strings.Join(whereParts, " AND "))
}

// buildSessionsFilterConditions builds WHERE conditions for sessions table queries
func (t *TimeSeriesQueryBuilder) buildSessionsFilterConditions(sessionFilters []model.Filter) []string {
	_, _, sessionConditions := BuildEventConditions(sessionFilters, BuildConditionsOptions{
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

func (t *TimeSeriesQueryBuilder) getProjectionAndJoin(metric string, p *Payload) (string, string) {
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
		if p.SampleRate > 0 && p.SampleRate < 100 {
			joinEvents += fmt.Sprintf(" AND e.sample_key < %d", p.SampleRate)
		}
		return projection, joinEvents

	default:
		// Fallback to session_id for unknown metrics
		return "evt.session_id AS session_id, s.datetime AS datetime", ""
	}
}
