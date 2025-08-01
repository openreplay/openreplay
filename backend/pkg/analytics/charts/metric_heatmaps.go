package charts

import (
	"context"
	"fmt"
	"openreplay/backend/pkg/analytics/model"
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
	base := []string{
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
		fmt.Sprintf("e.created_at >= toDateTime(%d)", p.MetricPayload.StartTimestamp/1000),
		fmt.Sprintf("e.created_at < toDateTime(%d)", p.MetricPayload.EndTimestamp/1000),
		"e.session_id IS NOT NULL",
		"e.`$event_name` = 'CLICK'",
		"JSONExtractFloat(toString(e.\"$properties\"), 'normalized_x') IS NOT NULL",
		"JSONExtractFloat(toString(e.\"$properties\"), 'normalized_y') IS NOT NULL",
	}

	var nonSessionFilters []model.Filter
	var sessionTableFilters []model.Filter
	var hasSessionFilters bool

	for _, filter := range p.MetricPayload.Series[0].Filter.Filters {
		if _, exists := SessionColumns[filter.Name]; exists {
			sessionTableFilters = append(sessionTableFilters, filter)
			hasSessionFilters = true
		} else {
			nonSessionFilters = append(nonSessionFilters, filter)
		}
	}

	eventFilters, otherFilters := BuildEventConditions(nonSessionFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "l",
	})

	// filters that uses the sessions table
	_, sessionFilters := BuildEventConditions(sessionTableFilters, BuildConditionsOptions{
		DefinedColumns: SessionColumns,
		MainTableAlias: "ls",
	})

	var joinClause string // This will remain empty; we're using subquery instead of JOIN

	subBase := []string{
		fmt.Sprintf("l.project_id = %d", p.ProjectId),
		fmt.Sprintf("l.created_at >= toDateTime(%d)", p.MetricPayload.StartTimestamp/1000),
		fmt.Sprintf("l.created_at < toDateTime(%d)", p.MetricPayload.EndTimestamp/1000),
		"l.session_id IS NOT NULL",
	}
	subBase = append(subBase, otherFilters...)
	subBase = append(subBase, eventFilters...)

	var subJoin string
	if hasSessionFilters {
		subJoin = "JOIN experimental.sessions AS ls ON l.session_id = ls.session_id"
		subBase = append(subBase, sessionFilters...)
	}

	subWhere := strings.Join(subBase, " AND ")

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
