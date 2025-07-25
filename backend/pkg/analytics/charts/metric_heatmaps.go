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

var sessionColumns = map[string]string{
	"userDevice": "user_device",
}

func (h *HeatmapQueryBuilder) buildQuery(p *Payload) (string, error) {

	base := []string{
		fmt.Sprintf("e.created_at >= toDateTime(%d)", p.MetricPayload.StartTimestamp/1000),
		fmt.Sprintf("e.created_at < toDateTime(%d)", p.MetricPayload.EndTimestamp/1000),
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
		"e.session_id IS NOT NULL",
		"e.`$event_name` = 'CLICK'",
		"JSONExtractFloat(toString(e.\"$properties\"), 'normalized_x') IS NOT NULL",
		"JSONExtractFloat(toString(e.\"$properties\"), 'normalized_y') IS NOT NULL",
	}

	eventFilters, otherFilters := BuildEventConditions(p.MetricPayload.Series[0].Filter.Filters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "l",
	})

	var joinClause string // This will remain empty; we're using subquery instead of JOIN

	if len(otherFilters) > 0 {
		subBase := []string{
			fmt.Sprintf("l.created_at >= toDateTime(%d)", p.MetricPayload.StartTimestamp/1000),
			fmt.Sprintf("l.created_at < toDateTime(%d)", p.MetricPayload.EndTimestamp/1000),
			fmt.Sprintf("l.project_id = %d", p.ProjectId),
			"l.session_id IS NOT NULL",
		}
		subBase = append(subBase, otherFilters...)
		subBase = append(subBase, eventFilters...)
		subWhere := strings.Join(subBase, " AND ")

		subqueryClause := fmt.Sprintf(
			"e.session_id IN (SELECT l.session_id FROM product_analytics.events AS l WHERE %s GROUP BY l.session_id)",
			subWhere,
		)
		base = append(base, subqueryClause)
	}

	where := strings.Join(base, " AND ")

	q := fmt.Sprintf(`
SELECT
JSONExtractFloat(toString(e."$properties"), 'normalized_x') AS normalized_x,
JSONExtractFloat(toString(e."$properties"), 'normalized_y') AS normalized_y
FROM product_analytics.events AS e
%s
WHERE %s
LIMIT 500;`, joinClause, where)

	logQuery(fmt.Sprintf("HeatmapQueryBuilder.buildQuery: %s", q))
	return q, nil
}
