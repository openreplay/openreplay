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
	query, params, err := h.buildQuery(p)
	if err != nil {
		h.Logger.Error(ctx, "Failed to build query: %v", err)
		return nil, err
	}

	h.Logger.Debug(ctx, "Executing Heatmap query: %s", query)
	_start := time.Now()
	row := conn.QueryRow(ctx, query, convertParams(params)...)
	if time.Since(_start) > 2*time.Second {
		h.Logger.Warn(ctx, "Heatmap query execution took longer than 2s: %s", query)
	}
	if err = row.Err(); err != nil {
		h.Logger.Error(ctx, "QueryRow error: %v", err)
		return nil, err
	}

	var res HeatmapSessionResponse
	if err = row.Scan(&res.SessionID, &res.StartTs, &res.Duration, &res.EventTimestamp, &res.UrlPath); err != nil {
		h.Logger.Error(ctx, "Row scan error: %v", err)
		return HeatmapSessionResponse{}, nil
	}
	return res, nil
}

// minRenderableSessionMs: shorter sessions are usually bounces whose page never finished
// rendering; they are only picked when nothing longer matches.
const minRenderableSessionMs = 5000

// heatmapSessionTemplate picks the session the heatmap is drawn on: one of the shortest
// renderable sessions with clicks on the page, chosen by hash so a card keeps showing the
// same replay until the seed changes ("get a new image"). The event timestamp is the
// session's last click on the page, when the page is the most complete.
const heatmapSessionTemplate = `%s
SELECT session_id, startTs, duration, eventTs, url_path
FROM (
    SELECT
        toString(s.session_id) AS session_id,
        toUnixTimestamp(s.datetime) * 1000 AS startTs,
        s.duration AS duration,
        toUInt64(toUnixTimestamp64Milli(e.last_click)) AS eventTs,
        e.url_path AS url_path
    FROM (
        SELECT
            e.session_id AS session_id,
            max(e.created_at) AS last_click,
            argMax(e."$current_path", e.created_at) AS url_path
        FROM product_analytics.events AS e
        WHERE %s
        GROUP BY e.session_id
    ) AS e
    INNER JOIN experimental.sessions AS s ON s.session_id = e.session_id
    WHERE %s
    ORDER BY s.duration < @minRenderableSessionMs, s.duration ASC
    LIMIT 10
) AS candidates
ORDER BY cityHash64(session_id, @heatmapSeed)
LIMIT 1;`

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

	qp.Set("minRenderableSessionMs", minRenderableSessionMs)
	qp.Set("heatmapSeed", p.HeatmapSeed)

	eventsWhere := []string{
		"e.project_id = @projectId",
		"e.created_at BETWEEN toDateTime(@startSec) AND toDateTime(@endSec)",
		"e.`$event_name` = 'CLICK'",
	}
	if p.SampleRate > 0 && p.SampleRate < 100 {
		eventsWhere = append(eventsWhere, "e.sample_key < @sampleRate")
	}
	eventsWhere = append(eventsWhere, filtersWhere...)

	var pathCTE string
	if hasLocationFilter {
		if cond := buildCond(`e."$current_path"`, locationFilter.Value, locationFilter.Operator, false, "singleColumn", qp); cond != "" {
			eventsWhere = append(eventsWhere, cond)
		}
	} else {
		pathCTE = fmt.Sprintf(`WITH top_url_path AS (
    SELECT e."$current_path" AS url_path, count() AS cnt
    FROM product_analytics.events AS e
    WHERE %s
    GROUP BY url_path
    ORDER BY cnt DESC
    LIMIT 1
)`, strings.Join(eventsWhere, " AND "))
		eventsWhere = append(eventsWhere, `e."$current_path" = (SELECT url_path FROM top_url_path)`)
	}

	query := fmt.Sprintf(heatmapSessionTemplate,
		pathCTE,
		strings.Join(eventsWhere, " AND "),
		strings.Join(sessionsWhere, " AND "),
	)

	h.Logger.Debug(context.Background(), "Built query: %s", query)
	return query, qp.Values(), nil
}
