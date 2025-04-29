package charts

import (
	"fmt"
	"openreplay/backend/pkg/analytics/db"
	"strings"
)

type HeatmapSessionResponse struct {
	//Points    []HeatmapPoint `json:"points"`
	SessionID uint64 `json:"session_id"`
}

type HeatmapSessionQueryBuilder struct{}

func (h HeatmapSessionQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
	shortestQ, err := h.buildQuery(p)
	if err != nil {
		return nil, err
	}
	var sid uint64
	row, err := conn.QueryRow(shortestQ)
	if err != nil {
		return nil, err
	}

	if err := row.Scan(&sid); err != nil {
		return nil, err
	}

	return HeatmapSessionResponse{
		SessionID: sid,
	}, nil
}

func (h HeatmapSessionQueryBuilder) buildQuery(p Payload) (string, error) {
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
	eventConds, _ := buildEventConditions(eventFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
	})

	base := []string{
		fmt.Sprintf("e.created_at >= toDateTime(%d/1000)", p.MetricPayload.StartTimestamp),
		fmt.Sprintf("e.created_at < toDateTime(%d/1000)", p.MetricPayload.EndTimestamp+86400000),
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
		"e.\"$event_name\" = 'CLICK'",
	}
	base = append(base, globalConds...)
	if len(globalNames) > 0 {
		base = append(base, "e.`$event_name` IN ("+buildInClause(globalNames)+")")
	}
	base = append(base, eventConds...)

	where := strings.Join(base, " AND ")

	return fmt.Sprintf(`
		SELECT
			s.session_id
		FROM product_analytics.events AS e
		JOIN experimental.sessions AS s USING(session_id)
		WHERE %s
		ORDER BY s.duration ASC
		LIMIT 1;`, where), nil
}
