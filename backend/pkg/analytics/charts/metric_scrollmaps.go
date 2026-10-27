package charts

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/logger"
)

type ScrollmapDepth struct {
	Depth    uint8  `json:"depth"`
	Sessions uint64 `json:"sessions"`
}

// ScrollmapResponse: how many sessions stopped at each depth of the page (% of its
// height, a session counted once at its deepest), and the median fold.
type ScrollmapResponse struct {
	Sessions uint64           `json:"sessions"`
	Fold     uint8            `json:"fold"`
	Depths   []ScrollmapDepth `json:"depths"`
}

type ScrollmapQueryBuilder struct {
	Logger logger.Logger
}

func (s *ScrollmapQueryBuilder) Execute(ctx context.Context, p *Payload, conn driver.Conn) (interface{}, error) {
	query, params, err := s.buildQuery(p)
	if err != nil {
		s.Logger.Error(ctx, "Error building query: %v", err)
		return nil, err
	}
	_start := time.Now()
	s.Logger.Debug(ctx, "Executing query: %s", query)

	var (
		res    = ScrollmapResponse{Depths: []ScrollmapDepth{}}
		depths []uint8
		counts []uint64
	)
	row := conn.QueryRow(ctx, query, convertParams(params)...)
	if err = row.Scan(&res.Sessions, &res.Fold, &depths, &counts); err != nil {
		s.Logger.Error(ctx, "Error executing query: %v, query: %s", err, query)
		return nil, err
	}
	if time.Since(_start) > 2*time.Second {
		s.Logger.Warn(ctx, "Query execution took longer than 2s: %s", query)
	}
	for i := range depths {
		if i < len(counts) {
			res.Depths = append(res.Depths, ScrollmapDepth{Depth: depths[i], Sessions: counts[i]})
		}
	}
	return res, nil
}

func (s *ScrollmapQueryBuilder) buildQuery(p *Payload) (string, map[string]any, error) {
	filter := p.MetricPayload.Series[0].Filter
	qp := NewParams()
	qp.Set("projectId", p.ProjectId)
	qp.Set("startTimestamp", p.MetricPayload.StartTimestamp)
	qp.Set("endTimestamp", p.MetricPayload.EndTimestamp)

	base := []string{
		"e.project_id = @projectId",
		"e.created_at BETWEEN toDateTime(@startTimestamp/1000) AND toDateTime(@endTimestamp/1000)",
		"e.session_id IS NOT NULL",
		"e.`$event_name` = 'SCROLL'",
		"e.`$auto_captured`",
	}
	if p.SampleRate > 0 && p.SampleRate < 100 {
		qp.Set("sampleRate", p.SampleRate)
		base = append(base, "e.sample_key < @sampleRate")
	}
	base = append(base, buildLocationConditions(filter.Filters, "e", qp)...)
	base = append(base, heatmapMatchingSessions(p, qp))

	// sumMap gives the histogram as two arrays, depths ascending; both halves are one aggregate
	q := fmt.Sprintf(`
SELECT count() AS sessions,
       toUInt8(ifNotFinite(round(median(fold)), 0)) AS fold,
       sumMap([depth], [toUInt64(1)]).1 AS depths,
       sumMap([depth], [toUInt64(1)]).2 AS counts
FROM (
    SELECT e.session_id AS session_id,
           max(d) AS depth,
           argMax(f, d) AS fold
    FROM (
        SELECT e.session_id AS session_id,
               least(100, ifNull(accurateCastOrNull(e."$properties".depth_pct, 'UInt8'), 0)) AS d,
               least(100, ifNull(accurateCastOrNull(e."$properties".fold_pct, 'UInt8'), 100)) AS f
        FROM product_analytics.events AS e
        WHERE %s
    ) AS e
    GROUP BY e.session_id
) AS per_session;`, strings.Join(base, "\n\t\t\tAND "))

	return q, qp.Values(), nil
}
