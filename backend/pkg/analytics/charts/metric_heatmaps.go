package charts

import (
	"context"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type HeatmapPoint struct {
	NormalizedX float64 `json:"normalizedX"`
	NormalizedY float64 `json:"normalizedY"`
}

type HeatmapQueryBuilder struct{}

func (h *HeatmapQueryBuilder) Execute(p *Payload, conn driver.Conn) (interface{}, error) {
	q, err := h.buildQuery(p)
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(context.Background(), q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pts []HeatmapPoint
	for rows.Next() {
		var x, y float64
		if err = rows.Scan(&x, &y); err != nil {
			return nil, err
		}
		pts = append(pts, HeatmapPoint{x, y})
	}

	if pts == nil {
		pts = []HeatmapPoint{}
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
		"JSONExtractFloat(toString(e.\"$properties\"), 'normalized_x') IS NOT NULL",
		"JSONExtractFloat(toString(e.\"$properties\"), 'normalized_y') IS NOT NULL",
	}

	eventsWhere, filtersWhere, _, sessionsWhere := BuildWhere(filter.Filters, string(filter.EventsOrder), "l", "ls")

	subBase := []string{
		fmt.Sprintf("l.project_id = %d", p.ProjectId),
		fmt.Sprintf("l.created_at BETWEEN toDateTime(%d) AND toDateTime(%d)", p.MetricPayload.StartTimestamp/1000, p.MetricPayload.EndTimestamp/1000),
		"l.session_id IS NOT NULL",
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
			"e.session_id IN (SELECT l.session_id FROM product_analytics.events AS l %s WHERE %s GROUP BY l.session_id)",
			subJoin,
			subWhere,
		)
	} else {
		subqueryClause = fmt.Sprintf(
			"e.session_id IN (SELECT l.session_id FROM product_analytics.events AS l WHERE %s GROUP BY l.session_id)",
			subWhere,
		)
	}
	base = append(base, subqueryClause)

	where := strings.Join(base, "\n\tAND ")

	q := fmt.Sprintf(`
SELECT
	JSONExtractFloat(toString(e."$properties"), 'normalized_x') AS normalized_x,
	JSONExtractFloat(toString(e."$properties"), 'normalized_y') AS normalized_y
FROM product_analytics.events AS e
WHERE %s
LIMIT 500;`, where)

	logQuery(fmt.Sprintf("HeatmapQueryBuilder.buildQuery: %s", q))
	return q, nil
}
