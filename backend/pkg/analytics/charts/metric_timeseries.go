package charts

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/logger"
)

type TimeSeriesQueryBuilder struct {
	Logger logger.Logger
}

const (
	MetricSessionCount = "sessionCount"
	MetricUserCount    = "userCount"
	MetricEventCount   = "eventCount"
)

func (t *TimeSeriesQueryBuilder) Execute(ctx context.Context, p *Payload, conn driver.Conn) (interface{}, error) {
	numBreakdowns := len(p.Breakdowns)

	if err := ValidateBreakdowns(p.Breakdowns); err != nil {
		return nil, err
	}

	data := make(map[breakdownKey]map[string]uint64)

	for _, series := range p.Series {
		query, params, err := t.buildQuery(p, series)
		if err != nil {
			t.Logger.Error(ctx, "buildQuery %s: %v", series.Name, err)
			return nil, fmt.Errorf("series %s: %v", series.Name, err)
		}
		_start := time.Now()
		t.Logger.Debug(ctx, "Executing query: %s", query)

		chParams := convertParams(params)

		if numBreakdowns == 0 {
			var pts []DataPoint
			if err = conn.Select(ctx, &pts, query, chParams...); err != nil {
				t.Logger.Error(ctx, "Select timeseries %s error: %v", series.Name, err)
				return nil, fmt.Errorf("series %s: %v", series.Name, err)
			}
			for _, dp := range pts {
				key := breakdownKey{Timestamp: dp.Timestamp}
				if data[key] == nil {
					data[key] = map[string]uint64{}
				}
				data[key][series.Name] = dp.Count
			}
		} else {
			rows, qErr := conn.Query(ctx, query, chParams...)
			if qErr != nil {
				t.Logger.Error(ctx, "Query timeseries %s error: %v", series.Name, qErr)
				return nil, fmt.Errorf("series %s: %v", series.Name, qErr)
			}
			if err = ScanBreakdownRows(rows, numBreakdowns, series.Name, data); err != nil {
				rows.Close()
				return nil, fmt.Errorf("series %s: %v", series.Name, err)
			}
			rows.Close()
		}

		if time.Since(_start) > 2*time.Second {
			t.Logger.Warn(ctx, "Query execution took longer than 2s: %s", query)
		}
	}

	seriesNames := make([]string, len(p.Series))
	for i, s := range p.Series {
		seriesNames[i] = s.Name
	}
	return BuildTimeseriesSeriesMap(data, p.Breakdowns, seriesNames), nil
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

	selectParts := []string{"gs.generate_series AS timestamp"}
	selectParts = append(selectParts, GetBreakdownSelectColumns(p.Breakdowns, "ps")...)
	selectParts = append(selectParts, fmt.Sprintf("COALESCE(COUNT(DISTINCT ps.%s),0) AS count", idField))

	groupByClause := BuildBreakdownGroupBy([]string{"timestamp"}, p.Breakdowns)

	query := fmt.Sprintf(`SELECT %s
					FROM generate_series(@startTimestamp,@endTimestamp,@step) AS gs
							LEFT JOIN (%s) AS ps ON TRUE
					WHERE ps.datetime >= toDateTime(timestamp/1000)
						AND ps.datetime < toDateTime((timestamp+@step)/1000)
					%s ORDER BY timestamp;`,
		strings.Join(selectParts, ", "), sub, groupByClause)

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
	sessionsQuery := BuildSessionsSubQuery(sessionFilters, p.StartTimestamp, p.Breakdowns)
	projection, joinEvents := t.getProjectionAndJoin(metric, p)
	projection = AppendBreakdownRefs(projection, p.Breakdowns, "s")

	return fmt.Sprintf(
		`SELECT %s
		   FROM (%s) AS evt
		   INNER JOIN (%s) AS s ON s.session_id = evt.session_id%s`,
		projection, subQuery, sessionsQuery, joinEvents,
	), nil
}

func (t *TimeSeriesQueryBuilder) buildSessionsOnlySubQuery(p *Payload, s model.Series, metric string, sessionFilters []model.Filter) (string, error) {
	whereParts := BuildSessionsFilterConditions(sessionFilters)
	projection := t.getSessionsOnlyProjection(metric)
	projection = AppendBreakdownProjection(projection, p.Breakdowns, "s")

	return fmt.Sprintf(
		`SELECT %s
		 FROM experimental.sessions AS s
		 WHERE %s`,
		projection, strings.Join(whereParts, " AND "),
	), nil
}

func (t *TimeSeriesQueryBuilder) getSessionsOnlyProjection(metric string) string {
	switch metric {
	case MetricUserCount:
		return "s.user_id AS user_id, s.datetime AS datetime"
	default:
		return "s.session_id AS session_id, s.datetime AS datetime"
	}
}

func (t *TimeSeriesQueryBuilder) getProjectionAndJoin(metric string, p *Payload) (string, string) {
	switch metric {
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
		return "evt.session_id AS session_id, s.datetime AS datetime", ""
	}
}
