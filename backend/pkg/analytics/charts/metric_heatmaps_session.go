package charts

import (
	"context"
	"fmt"
	"openreplay/backend/pkg/analytics/model"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/logger"
)

type HeatmapSessionResponse struct {
	SessionID      string `json:"sessionId"`
	StartTs        uint64 `json:"startTs"`
	Duration       uint32 `json:"duration"`
	EventTimestamp uint64 `json:"eventTimestamp"`
	UrlPath        string `json:"urlPath"`
}

type HeatmapSessionQueryBuilder struct {
	Logger logger.Logger
}

func (h *HeatmapSessionQueryBuilder) Execute(ctx context.Context, p *Payload, conn driver.Conn) (interface{}, error) {
	shortestQ, params, err := h.buildQuery(p)
	if err != nil {
		h.Logger.Error(ctx, "Failed to build query: %v", err)
		return nil, err
	}

	h.Logger.Debug(ctx, "Executing Heatmap query: %s", shortestQ)
	_start := time.Now()
	row := conn.QueryRow(ctx, shortestQ, convertParams(params)...)
	if time.Since(_start) > 2*time.Second {
		h.Logger.Warn(ctx, "Heatmap query execution took longer than 2s: %s", shortestQ)
	}
	if err = row.Err(); err != nil {
		h.Logger.Error(ctx, "QueryRow error: %v", err)
		return nil, err
	}

	var (
		sid      string
		startTs  uint64
		duration uint32
		eventTs  uint64
		urlPath  string
	)
	if err = row.Scan(&sid, &startTs, &duration, &eventTs, &urlPath); err != nil {
		h.Logger.Error(ctx, "Row scan error: %v", err)
		return HeatmapSessionResponse{}, nil
	}

	return HeatmapSessionResponse{
		SessionID:      sid,
		StartTs:        startTs,
		Duration:       duration,
		EventTimestamp: eventTs,
		UrlPath:        urlPath,
	}, nil
}

const (
	sqlWithLocationTemplate = `SELECT
    toString(session_id) AS session_id,
    startTs,
    duration,
    eventTs,
    url_path
FROM (
    SELECT
        toString(s.session_id) AS session_id,
        toUnixTimestamp(s.datetime) * 1000 AS startTs,
        s.duration,
        toUnixTimestamp(e.created_at) * 1000 AS eventTs,
        e.url_path
    FROM (
        SELECT
            session_id,
            created_at,
            "$current_path" AS url_path
        FROM product_analytics.events AS e
        WHERE %s
    ) AS e
    INNER JOIN experimental.sessions AS s USING (session_id)
    WHERE %s
    ORDER BY s.duration ASC, e.created_at ASC
    LIMIT 10
) AS subquery
ORDER BY rand()
LIMIT 1;`

	sqlWithoutLocationTemplate = `WITH top_url_path AS (
    SELECT
        "$current_path" AS url_path,
        COUNT(*) AS cnt
    FROM product_analytics.events AS e
    WHERE %s
    GROUP BY url_path
    ORDER BY cnt DESC
    LIMIT 1
)

SELECT
    toString(session_id) AS session_id,
    startTs,
    duration,
    eventTs,
    url_path
FROM (
    SELECT
        toString(s.session_id) AS session_id,
        toUnixTimestamp(s.datetime) * 1000 AS startTs,
        s.duration,
        toUnixTimestamp(e.created_at) * 1000 AS eventTs,
        e.url_path
    FROM (
        SELECT
            session_id,
            created_at,
            "$current_path" AS url_path
        FROM product_analytics.events AS e
        WHERE %s
    ) AS e
    INNER JOIN experimental.sessions AS s USING (session_id)
    WHERE %s
    ORDER BY e.created_at ASC, s.duration ASC
    LIMIT 10
) AS subquery
ORDER BY rand()
LIMIT 1;`
)

func (h *HeatmapSessionQueryBuilder) buildQuery(p *Payload) (string, map[string]any, error) {
	projectId := p.ProjectId
	startSec := p.MetricPayload.StartTimestamp / 1000
	endSec := (p.MetricPayload.EndTimestamp + 86400000) / 1000
	series := p.MetricPayload.Series[0]
	qp := NewParams()

	for i := range series.Filter.Filters {
		for j := range series.Filter.Filters[i].Filters {
			if series.Filter.Filters[i].Filters[j].AutoCaptured {
				series.Filter.Filters[i].Filters[j].Name = CamelToSnake(series.Filter.Filters[i].Filters[j].Name)
			}
		}
	}
	filters := []model.Filter{}
	hasLocationFilter := false
	var locationFilter model.Filter

	for _, filter := range series.Filter.Filters {
		if filter.Name == "LOCATION" {
			for _, nested := range filter.Filters {
				if nested.Name == "url_path" && len(nested.Value) > 0 && nested.Value[0] != "" {
					hasLocationFilter = true
					locationFilter = nested
					filters = append(filters, filter)
				}
			}
		}
		filters = append(filters, filter)
	}

	qp.Set("projectId", projectId)
	qp.Set("startSec", startSec)
	qp.Set("endSec", endSec)
	if p.SampleRate > 0 && p.SampleRate < 100 {
		qp.Set("sampleRate", p.SampleRate)
	}

	// Common session WHERE clauses. The sessions table is the main table of
	// this query, so session filters stay on its own columns (4th return
	// value of BuildWhere).
	sessionsWhere := []string{
		"s.project_id = @projectId",
		"s.datetime BETWEEN toDateTime(@startSec) AND toDateTime(@endSec)",
		"s.duration > 500",
	}
	_, filtersWhere, _, extraSessions := BuildWhere(filters, string(series.Filter.EventsOrder), "e", "s", qp)
	sessionsWhere = append(sessionsWhere, extraSessions...)

	var query string
	if hasLocationFilter {
		eventsWhere := []string{
			"e.project_id = @projectId",
			"e.created_at BETWEEN toDateTime(@startSec) AND toDateTime(@endSec)",
			"e.`$event_name` = 'CLICK'",
		}
		if cond := buildCond(`e."$current_path"`, locationFilter.Value, locationFilter.Operator, false, "singleColumn", qp); cond != "" {
			eventsWhere = append(eventsWhere, cond)
		}
		if p.SampleRate > 0 && p.SampleRate < 100 {
			eventsWhere = append(eventsWhere, "e.sample_key < @sampleRate")
		}
		eventsWhere = append(eventsWhere, filtersWhere...)

		query = fmt.Sprintf(
			sqlWithLocationTemplate,
			strings.Join(eventsWhere, " AND "),
			strings.Join(sessionsWhere, " AND "),
		)
	} else {
		// Use CTE to find top URL path
		eventsWhere := []string{
			"e.project_id = @projectId",
			"e.created_at BETWEEN toDateTime(@startSec) AND toDateTime(@endSec)",
			"e.`$event_name` = 'CLICK'",
		}
		if p.SampleRate > 0 && p.SampleRate < 100 {
			eventsWhere = append(eventsWhere, "e.sample_key < @sampleRate")
		}
		eventsWhere = append(eventsWhere, filtersWhere...)
		cteWhere := strings.Join(eventsWhere, " AND ")

		subWhereConditions := []string{
			"created_at BETWEEN toDateTime(@startSec) AND toDateTime(@endSec)",
			"project_id = @projectId",
			"`$event_name` = 'CLICK'",
			"`$current_path` = (SELECT url_path FROM top_url_path)",
		}
		if p.SampleRate > 0 && p.SampleRate < 100 {
			subWhereConditions = append(subWhereConditions, "sample_key < @sampleRate")
		}
		subWhere := strings.Join(subWhereConditions, " AND ")

		query = fmt.Sprintf(
			sqlWithoutLocationTemplate,
			cteWhere,
			subWhere,
			strings.Join(sessionsWhere, " AND "),
		)
	}

	h.Logger.Debug(context.Background(), "Built query: %s", query)
	return query, qp.Values(), nil
}
