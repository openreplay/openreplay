package charts

import (
	"fmt"
	"openreplay/backend/pkg/analytics/db"
	"strings"
)

type FunnelStepResult struct {
	LevelNumber  uint64 `json:"step"`
	StepName     string `json:"type"`
	CountAtLevel uint64 `json:"count"`
}

type FunnelResponse struct {
	Steps []FunnelStepResult `json:"stages"`
}

type FunnelQueryBuilder struct{}

func (f FunnelQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
	q, err := f.buildQuery(p)
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var steps []FunnelStepResult
	for rows.Next() {
		var r FunnelStepResult
		if err := rows.Scan(&r.LevelNumber, &r.StepName, &r.CountAtLevel); err != nil {
			return nil, err
		}
		steps = append(steps, r)
	}
	return FunnelResponse{Steps: steps}, nil
}

func (f FunnelQueryBuilder) buildQuery(p Payload) (string, error) {
	if len(p.MetricPayload.Series) == 0 {
		return "", fmt.Errorf("series empty")
	}

	s := p.MetricPayload.Series[0]
	metricFormat := p.MetricPayload.MetricFormat

	// separate global vs step filters based on IsEvent flag
	var globalFilters []Filter
	var eventFilters []Filter
	for _, flt := range s.Filter.Filters {
		if flt.IsEvent {
			eventFilters = append(eventFilters, flt)
		} else {
			globalFilters = append(globalFilters, flt)
		}
	}

	// extract duration filter
	var minDur, maxDur int64
	for i := len(globalFilters) - 1; i >= 0; i-- {
		if globalFilters[i].Type == "duration" {
			if vals, ok := globalFilters[i].Value.([]interface{}); ok && len(vals) == 2 {
				minDur = int64(vals[0].(float64))
				maxDur = int64(vals[1].(float64))
			}
			globalFilters = append(globalFilters[:i], globalFilters[i+1:]...)
		}
	}

	// Global filters
	globalConds, globalNames := buildEventConditions(globalFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
	})
	base := []string{
		fmt.Sprintf("e.created_at >= toDateTime(%d/1000)", p.MetricPayload.StartTimestamp),
		fmt.Sprintf("e.created_at < toDateTime(%d/1000)", p.MetricPayload.EndTimestamp+86400000),
		"s.duration > 0",
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
	}
	if maxDur > 0 {
		base = append(base, fmt.Sprintf("s.duration BETWEEN %d AND %d", minDur, maxDur))
	}
	base = append(base, globalConds...)
	if len(globalNames) > 0 {
		base = append(base, "e.`$event_name` IN ("+buildInClause(globalNames)+")")
	}

	// Build steps and per-step conditions only for eventFilters
	var stepNames []string
	var stepExprs []string
	for i, filter := range eventFilters {
		stepNames = append(stepNames, fmt.Sprintf("'%s'", filter.Type))
		exprs, _ := buildEventConditions([]Filter{filter}, BuildConditionsOptions{DefinedColumns: mainColumns})
		for j, c := range exprs {
			c = strings.ReplaceAll(c, "toString(main.`$properties`)", "properties")
			c = strings.ReplaceAll(c, "main.`$properties`", "properties")
			c = strings.ReplaceAll(c, "JSONExtractString(properties", "JSONExtractString(toString(properties)")
			exprs[j] = c
		}
		var expr string
		if len(exprs) > 0 {
			expr = fmt.Sprintf("(event_name = funnel_steps[%d] AND %s)", i+1, strings.Join(exprs, " AND "))
		} else {
			expr = fmt.Sprintf("(event_name = funnel_steps[%d])", i+1)
		}
		stepExprs = append(stepExprs, expr)
	}
	stepsArr := "[" + strings.Join(stepNames, ",") + "]"
	windowArgs := strings.Join(stepExprs, ",")

	// Compose WHERE clause
	where := strings.Join(base, " AND ")

	// Final query
	q := fmt.Sprintf(`
WITH
    %s AS funnel_steps,
    86400 AS funnel_window_seconds,
    events_for_funnel AS (
        SELECT
            e.created_at,
            e."$event_name" AS event_name,
            e."$properties" AS properties,
            e.session_id,
            e.distinct_id,
            s.user_id AS session_user_id,
            if('%s' = 'sessionCount', toString(e.session_id), coalesce(nullif(s.user_id,''),e.distinct_id)) AS entity_id
        FROM product_analytics.events AS e
        JOIN experimental.sessions AS s USING(session_id)
        WHERE %s
    ),
    funnel_levels_reached AS (
        SELECT
            entity_id,
            windowFunnel(funnel_window_seconds)(
                toDateTime(created_at),
                %s
            ) AS max_level
        FROM events_for_funnel
        GROUP BY entity_id
    ),
    counts_by_level AS (
        SELECT
            seq.number + 1 AS level_number,
            countDistinctIf(entity_id, max_level >= seq.number + 1) AS cnt
        FROM funnel_levels_reached
        CROSS JOIN numbers(length(funnel_steps)) AS seq
        GROUP BY seq.number
    ),
    step_list AS (
        SELECT
            seq.number + 1 AS level_number,
            funnel_steps[seq.number + 1] AS step_name
        FROM numbers(length(funnel_steps)) AS seq
    )
SELECT
    s.level_number,
    s.step_name,
    ifNull(c.cnt, 0) AS count_at_level
FROM step_list AS s
LEFT JOIN counts_by_level AS c ON s.level_number = c.level_number
ORDER BY s.level_number;
`, stepsArr, metricFormat, where, windowArgs)

	return q, nil
}
