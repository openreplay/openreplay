package charts

import (
	"context"
	"encoding/json"
	"fmt"
	"openreplay/backend/pkg/logger"
	"slices"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type ClickRageRow struct {
	PayloadS  string    `ch:"payload"`
	Count     int       `json:"Count"`
	CreatedAt time.Time `ch:"created_at"`
}
type HeatmapPoint struct {
	NormalizedX float64   `json:"normalizedX" ch:"normalized_x"`
	NormalizedY float64   `json:"normalizedY" ch:"normalized_y"`
	CreatedAt   time.Time `json:"-" ch:"created_at"`
}

type HeatmapQueryBuilder struct {
	Logger logger.Logger
}

func (h *HeatmapQueryBuilder) Execute(ctx context.Context, p *Payload, conn driver.Conn) (interface{}, error) {
	query, err := h.buildQuery(p)
	if err != nil {
		h.Logger.Error(ctx, "Error building query: %v", err)
		return nil, err
	}
	_start := time.Now()
	h.Logger.Debug(ctx, "Executing query: %s", query)

	var pts []HeatmapPoint = make([]HeatmapPoint, 0)

	if err = conn.Select(ctx, &pts, query); err != nil {
		h.Logger.Error(ctx, "Error executing query: %v, query: %s", err, query)
		return nil, err
	}
	if time.Since(_start) > 2*time.Second {
		h.Logger.Warn(ctx, "Query execution took longer than 2s: %s", query)
	}

	if pts == nil {
		pts = []HeatmapPoint{}
	}

	if !p.IncludeClickRage {
		query, err = h.buildClickRageQuery(p)
		if err != nil {
			h.Logger.Error(ctx, "Error building click rage query: %v", err)
			return nil, err
		}
		var clickRages []ClickRageRow = make([]ClickRageRow, 0)

		if err = conn.Select(ctx, &clickRages, query); err != nil {
			h.Logger.Error(ctx, "Error executing click rage query: %v, query: %s", err, query)
			return nil, err
		}
		for _, cr := range clickRages {
			// payload is a string like this: {"Count":3}
			err := json.Unmarshal([]byte(cr.PayloadS), &cr)
			if err != nil {
				h.Logger.Error(ctx, "Error unmarshalling click rage payload: %v", err)
				return nil, err
			}
			if cr.Count > 0 {
				found := false
				i := 0
				for i < len(pts) && cr.Count > 0 {
					//Assuming that click rage points are within 5 seconds of the issue's creation time
					diff := pts[i].CreatedAt.Sub(cr.CreatedAt).Seconds()
					if diff < 5 || diff > -5 {
						cr.Count--
						if found {
							pts = slices.Delete(pts, i, i+1)
							continue
						}
						found = true
					}
					i++
				}
			}
		}
	}

	return pts, nil
}

func (h *HeatmapQueryBuilder) buildQuery(p *Payload) (string, error) {
	filter := p.MetricPayload.Series[0].Filter

	base := []string{
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
		fmt.Sprintf("e.created_at BETWEEN toDateTime(%d) AND toDateTime(%d)", p.MetricPayload.StartTimestamp/1000, p.MetricPayload.EndTimestamp/1000),
		"e.session_id IS NOT NULL",
		"e.`$event_name` = 'CLICK'",
		"isNotNull(e.\"$properties\".normalized_x)",
		"isNotNull(e.\"$properties\".normalized_y)",
	}
	if p.SampleRate > 0 && p.SampleRate < 100 {
		base = append(base, fmt.Sprintf("e.sample_key < %d", p.SampleRate))
	}

	eventsWhere, filtersWhere, _, sessionsWhere := BuildWhere(filter.Filters, string(filter.EventsOrder), "l", "ls")

	subBase := []string{
		fmt.Sprintf("l.project_id = %d", p.ProjectId),
		fmt.Sprintf("l.created_at BETWEEN toDateTime(%d) AND toDateTime(%d)", p.MetricPayload.StartTimestamp/1000, p.MetricPayload.EndTimestamp/1000),
		"l.session_id IS NOT NULL",
	}
	if p.SampleRate > 0 && p.SampleRate < 100 {
		subBase = append(subBase, fmt.Sprintf("l.sample_key < %d", p.SampleRate))
	}
	subBase = append(subBase, eventsWhere...)
	subBase = append(subBase, filtersWhere...)

	var subJoin string
	if len(sessionsWhere) > 0 {
		subJoin = "JOIN experimental.sessions AS ls ON l.session_id = ls.session_id"
		subBase = append(subBase, sessionsWhere...)
	}

	subWhere := strings.Join(subBase, "\n\tAND ")

	var subqueryClause string
	if subJoin != "" {
		subqueryClause = fmt.Sprintf(
			"e.session_id IN (SELECT DISTINCT l.session_id FROM product_analytics.events AS l %s WHERE %s)",
			subJoin,
			subWhere,
		)
	} else {
		subqueryClause = fmt.Sprintf(
			"e.session_id IN (SELECT DISTINCT l.session_id FROM product_analytics.events AS l WHERE %s)",
			subWhere,
		)
	}
	base = append(base, subqueryClause)

	where := strings.Join(base, "\n\tAND ")

	q := fmt.Sprintf(`
SELECT
	accurateCastOrNull(e."$properties".normalized_x,'Float64') AS normalized_x,
	accurateCastOrNull(e."$properties".normalized_y,'Float64') AS normalized_y,
	e.created_at
FROM product_analytics.events AS e
WHERE %s
ORDER BY e.created_at
LIMIT 500;`, where)

	logQuery(fmt.Sprintf("HeatmapQueryBuilder.buildQuery: %s", q))
	return q, nil
}

func (h *HeatmapQueryBuilder) buildClickRageQuery(p *Payload) (string, error) {
	filter := p.MetricPayload.Series[0].Filter

	base := []string{
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
		fmt.Sprintf("e.created_at BETWEEN toDateTime(%d) AND toDateTime(%d)", p.MetricPayload.StartTimestamp/1000, p.MetricPayload.EndTimestamp/1000),
		"e.session_id IS NOT NULL",
		"e.`$event_name` = 'ISSUE'",
		"e.issue_type = 'click_rage'",
		"isNotNull(e.\"$properties\".payload)",
	}
	if p.SampleRate > 0 && p.SampleRate < 100 {
		base = append(base, fmt.Sprintf("e.sample_key < %d", p.SampleRate))
	}

	eventsWhere, filtersWhere, _, sessionsWhere := BuildWhere(filter.Filters, string(filter.EventsOrder), "l", "ls")

	subBase := []string{
		fmt.Sprintf("l.project_id = %d", p.ProjectId),
		fmt.Sprintf("l.created_at BETWEEN toDateTime(%d) AND toDateTime(%d)", p.MetricPayload.StartTimestamp/1000, p.MetricPayload.EndTimestamp/1000),
		"l.session_id IS NOT NULL",
	}
	if p.SampleRate > 0 && p.SampleRate < 100 {
		subBase = append(subBase, fmt.Sprintf("l.sample_key < %d", p.SampleRate))
	}
	subBase = append(subBase, eventsWhere...)
	subBase = append(subBase, filtersWhere...)

	var subJoin string
	if len(sessionsWhere) > 0 {
		subJoin = "JOIN experimental.sessions AS ls ON l.session_id = ls.session_id"
		subBase = append(subBase, sessionsWhere...)
	}

	subWhere := strings.Join(subBase, "\n\tAND ")

	var subqueryClause string
	if subJoin != "" {
		subqueryClause = fmt.Sprintf(
			"e.session_id IN (SELECT DISTINCT l.session_id FROM product_analytics.events AS l %s WHERE %s)",
			subJoin,
			subWhere,
		)
	} else {
		subqueryClause = fmt.Sprintf(
			"e.session_id IN (SELECT DISTINCT l.session_id FROM product_analytics.events AS l WHERE %s)",
			subWhere,
		)
	}
	base = append(base, subqueryClause)

	where := strings.Join(base, "\n\tAND ")

	q := fmt.Sprintf(`
SELECT
	e."$properties".payload AS payload,
	e.created_at
FROM product_analytics.events AS e
WHERE %s
ORDER BY e.created_at
LIMIT 500;`, where)

	logQuery(fmt.Sprintf("HeatmapQueryBuilder.buildClickRageQuery: %s", q))
	return q, nil
}
