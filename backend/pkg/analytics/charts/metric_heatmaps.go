package charts

import (
	"context"
	"fmt"
	"openreplay/backend/pkg/logger"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type HeatmapPoint struct {
	NormalizedX float64 `json:"normalizedX" ch:"normalized_x"`
	NormalizedY float64 `json:"normalizedY" ch:"normalized_y"`
	Count       uint64  `json:"count" ch:"count"`
}

// heatmapCellsLimit caps the response at the busiest cells. Points are aggregated per
// 0.01% cell, the resolution the player renders at.
const heatmapCellsLimit = 5000

// clickRageWindowMs is how far from a click_rage issue a click still belongs to that burst.
const clickRageWindowMs = 5000

type HeatmapQueryBuilder struct {
	Logger logger.Logger
}

func (h *HeatmapQueryBuilder) Execute(ctx context.Context, p *Payload, conn driver.Conn) (interface{}, error) {
	query, params, err := h.buildQuery(p)
	if err != nil {
		h.Logger.Error(ctx, "Error building query: %v", err)
		return nil, err
	}
	_start := time.Now()
	h.Logger.Debug(ctx, "Executing query: %s", query)

	pts := make([]HeatmapPoint, 0)
	if err = conn.Select(ctx, &pts, query, convertParams(params)...); err != nil {
		h.Logger.Error(ctx, "Error executing query: %v, query: %s", err, query)
		return nil, err
	}
	if time.Since(_start) > 2*time.Second {
		h.Logger.Warn(ctx, "Query execution took longer than 2s: %s", query)
	}
	return pts, nil
}

// heatmapMatchingSessions returns an "e.session_id IN (...)" clause that
// restricts the outer query to sessions matching the card filters. Session
// filters with an events-table equivalent are applied directly on the events
// scan; experimental.sessions is only joined for session-only filters.
// Parameter values accumulate in qp.
func heatmapMatchingSessions(p *Payload, qp *Params) string {
	filter := p.MetricPayload.Series[0].Filter

	eventsWhere, filtersWhere, _, sessionsWhere := BuildWhere(filter.Filters, string(filter.EventsOrder), "l", "ls", qp, true)

	subBase := []string{
		"l.project_id = @projectId",
		"l.created_at BETWEEN toDateTime(@startTimestamp/1000) AND toDateTime(@endTimestamp/1000)",
		"l.session_id IS NOT NULL",
	}
	if p.SampleRate > 0 && p.SampleRate < 100 {
		qp.Set("sampleRate", p.SampleRate)
		subBase = append(subBase, "l.sample_key < @sampleRate")
	}
	subBase = append(subBase, eventsWhere...)
	subBase = append(subBase, filtersWhere...)

	var subJoin string
	if len(sessionsWhere) > 0 {
		subJoin = " JOIN experimental.sessions AS ls ON l.session_id = ls.session_id"
		subBase = append(subBase, sessionsWhere...)
	}

	return fmt.Sprintf(
		"e.session_id IN (SELECT DISTINCT l.session_id FROM product_analytics.events AS l%s WHERE %s)",
		subJoin, strings.Join(subBase, "\n\tAND "),
	)
}

func (h *HeatmapQueryBuilder) buildQuery(p *Payload) (string, map[string]any, error) {
	filter := p.MetricPayload.Series[0].Filter
	qp := NewParams()
	qp.Set("projectId", p.ProjectId)
	qp.Set("startTimestamp", p.MetricPayload.StartTimestamp)
	qp.Set("endTimestamp", p.MetricPayload.EndTimestamp)

	base := []string{
		"e.project_id = @projectId",
		"e.created_at BETWEEN toDateTime(@startTimestamp/1000) AND toDateTime(@endTimestamp/1000)",
		"e.session_id IS NOT NULL",
		"e.`$event_name` = 'CLICK'",
		"isNotNull(e.\"$properties\".normalized_x)",
		"isNotNull(e.\"$properties\".normalized_y)",
	}
	if p.SampleRate > 0 && p.SampleRate < 100 {
		qp.Set("sampleRate", p.SampleRate)
		base = append(base, "e.sample_key < @sampleRate")
	}
	base = append(base, buildLocationConditions(filter.Filters, "e", qp)...)
	base = append(base, heatmapMatchingSessions(p, qp))

	var clicks string
	if p.IncludeClickRage {
		clicks = fmt.Sprintf(`SELECT %s
	FROM product_analytics.events AS e
	WHERE %s`, heatmapClickColumns, strings.Join(base, "\n\tAND "))
	} else {
		clicks = h.buildBurstCollapsedClicks(p, qp, base)
	}

	q := fmt.Sprintf(`
SELECT normalized_x, normalized_y, count() AS count
FROM (%s) AS c
GROUP BY normalized_x, normalized_y
ORDER BY count DESC
LIMIT %d;`, clicks, heatmapCellsLimit)

	return q, qp.Values(), nil
}

const heatmapClickColumns = `round(accurateCastOrNull(e."$properties".normalized_x, 'Float64'), 2) AS normalized_x,
		round(accurateCastOrNull(e."$properties".normalized_y, 'Float64'), 2) AS normalized_y`

// buildBurstCollapsedClicks gives every click near a click_rage issue of its session the
// same burst key, so each click-rage burst contributes one click: its first, so a burst
// spread over several cells lands in the same one on every load.
func (h *HeatmapQueryBuilder) buildBurstCollapsedClicks(p *Payload, qp *Params, base []string) string {
	rageWhere := []string{
		"r.project_id = @projectId",
		"r.created_at BETWEEN toDateTime(@startTimestamp/1000) AND toDateTime(@endTimestamp/1000)",
		"r.`$event_name` = 'ISSUE'",
		"r.issue_type = 'click_rage'",
	}
	if p.SampleRate > 0 && p.SampleRate < 100 {
		rageWhere = append(rageWhere, "r.sample_key < @sampleRate")
	}
	qp.Set("clickRageWindowMs", clickRageWindowMs)

	return fmt.Sprintf(`SELECT argMin(normalized_x, ord) AS normalized_x, argMin(normalized_y, ord) AS normalized_y
	FROM (
		SELECT %s,
			(e.created_at, e.event_id) AS ord,
			arrayFirst(t -> abs(toUnixTimestamp64Milli(e.created_at) - t) <= @clickRageWindowMs, rage.rage_ts) AS rage_at,
			if(rage_at = 0, toString(e.event_id), concat(toString(e.session_id), '-', toString(rage_at))) AS burst_key
		FROM product_analytics.events AS e
		LEFT JOIN (
			SELECT r.session_id AS session_id, groupArray(toUnixTimestamp64Milli(r.created_at)) AS rage_ts
			FROM product_analytics.events AS r
			WHERE %s
			GROUP BY r.session_id
		) AS rage ON e.session_id = rage.session_id
		WHERE %s
	)
	GROUP BY burst_key`, heatmapClickColumns, strings.Join(rageWhere, "\n\t\t\tAND "), strings.Join(base, "\n\t\tAND "))
}
