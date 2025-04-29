package charts

import (
	"fmt"
	"openreplay/backend/pkg/analytics/db"
	"strings"
)

type HeatmapPoint struct {
	NormalizedX float64 `json:"normalized_x"`
	NormalizedY float64 `json:"normalized_y"`
}

type HeatmapResponse struct {
	Points []HeatmapPoint `json:"points"`
}

type HeatmapQueryBuilder struct{}

func (h HeatmapQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
	q, err := h.buildQuery(p)
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pts []HeatmapPoint
	for rows.Next() {
		var x, y float64
		if err := rows.Scan(&x, &y); err != nil {
			return nil, err
		}
		pts = append(pts, HeatmapPoint{x, y})
	}

	return HeatmapResponse{
		Points: pts,
	}, nil
}

func (h HeatmapQueryBuilder) buildQuery(p Payload) (string, error) {
	if len(p.MetricPayload.Series) == 0 {
		return "", fmt.Errorf("series empty")
	}
	s := p.MetricPayload.Series[0]

	var globalFilters, eventFilters []Filter
	for _, flt := range s.Filter.Filters {
		if flt.IsEvent {
			eventFilters = append(eventFilters, flt)
		} else {
			globalFilters = append(globalFilters, flt)
		}
	}

	globalConds, globalNames := buildEventConditions(globalFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
	})

	eventConds, eventNames := buildEventConditions(eventFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
	})

	base := []string{
		fmt.Sprintf("e.created_at >= toDateTime(%d/1000)", p.MetricPayload.StartTimestamp),
		fmt.Sprintf("e.created_at < toDateTime(%d/1000)", p.MetricPayload.EndTimestamp+86400000),
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
	}
	base = append(base, globalConds...)
	if len(globalNames) > 0 {
		base = append(base, "e.`$event_name` IN ("+buildInClause(globalNames)+")")
	}

	if len(eventNames) > 0 {
		base = append(base, "e.`$event_name` IN ("+buildInClause(eventNames)+")")
	}

	base = append(base, eventConds...)

	where := strings.Join(base, " AND ")

	q := fmt.Sprintf(`
SELECT
    
    
	JSONExtractFloat(toString(e."$properties"), 'normalized_x') AS normalized_x,
	JSONExtractFloat(toString(e."$properties"), 'normalized_y') AS normalized_y
FROM product_analytics.events AS e
JOIN experimental.sessions AS s USING(session_id)
WHERE %s;`, where)

	return q, nil
}
