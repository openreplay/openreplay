package charts

import (
	"context"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
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
	var globalFilters, eventFilters []model.Filter
	for _, flt := range p.MetricPayload.Series[0].Filter.Filters {
		if flt.IsEvent {
			eventFilters = append(eventFilters, flt)
		} else {
			globalFilters = append(globalFilters, flt)
		}
	}

	globalConds, _ := buildEventConditions(globalFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
	})

	var joinClause string
	if len(eventFilters) > 0 {
		eventConds, _ := buildEventConditions(eventFilters, BuildConditionsOptions{
			DefinedColumns: mainColumns,
			MainTableAlias: "l",
		})
		joinClause = fmt.Sprintf(
			"JOIN product_analytics.events AS l ON l.session_id = e.session_id AND %s",
			strings.Join(eventConds, " AND "),
		)
	}

	base := []string{
		fmt.Sprintf("e.created_at >= toDateTime(%d)", p.MetricPayload.StartTimestamp/1000),
		fmt.Sprintf("e.created_at < toDateTime(%d)", p.MetricPayload.EndTimestamp/1000),
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
		"e.session_id IS NOT NULL",
		"e.`$event_name` = 'CLICK'",
	}
	base = append(base, globalConds...)
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
