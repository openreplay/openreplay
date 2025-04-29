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

	// Separate global vs step filters
	var globalFilters, stepFilters []Filter
	for _, flt := range s.Filter.Filters {
		if flt.IsEvent {
			stepFilters = append(stepFilters, flt)
		} else {
			globalFilters = append(globalFilters, flt)
		}
	}

	// 1. Collect required mainColumns from all filters (including nested)
	requiredColumns := make(map[string]struct{})
	var collectColumns func([]Filter)
	collectColumns = func(filters []Filter) {
		for _, flt := range filters {
			if col, ok := mainColumns[string(flt.Type)]; ok {
				requiredColumns[col] = struct{}{}
			}
			collectColumns(flt.Filters)
		}
	}
	collectColumns(globalFilters)
	collectColumns(stepFilters)

	// 2. Build SELECT clause for CTE
	selectCols := []string{
		`e.created_at`,
		`e."$event_name" AS event_name`,
		`e."$properties" AS properties`,
	}
	for col := range requiredColumns {
		logical := reverseLookup(mainColumns, col)
		selectCols = append(selectCols, fmt.Sprintf(`e."%s" AS %s`, col, logical))
	}
	selectCols = append(selectCols,
		`e.session_id`,
		`e.distinct_id`,
		`s.user_id AS session_user_id`,
		fmt.Sprintf("if('%s' = 'sessionCount', toString(e.session_id), coalesce(nullif(s.user_id,''),e.distinct_id)) AS entity_id", metricFormat),
	)

	// 3. Global conditions
	globalConds, _ := buildEventConditions(globalFilters, BuildConditionsOptions{
		DefinedColumns:       cteColumnAliases(), // logical -> logical (CTE alias)
		MainTableAlias:       "e",
		PropertiesColumnName: "$properties",
	})
	base := []string{
		fmt.Sprintf("e.created_at >= toDateTime(%d/1000)", p.MetricPayload.StartTimestamp),
		fmt.Sprintf("e.created_at < toDateTime(%d/1000)", p.MetricPayload.EndTimestamp+86400000),
		"s.duration > 0",
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
	}
	base = append(base, globalConds...)
	where := strings.Join(base, " AND ")

	// 4. Step conditions
	var stepNames []string
	var stepExprs []string
	for i, filter := range stepFilters {
		stepNames = append(stepNames, fmt.Sprintf("'%s'", filter.Type))
		stepConds, _ := buildEventConditions([]Filter{filter}, BuildConditionsOptions{
			DefinedColumns:       cteColumnAliases(), // logical -> logical (CTE alias)
			PropertiesColumnName: "properties",
			MainTableAlias:       "",
		})

		stepCondExprs := []string{fmt.Sprintf("event_name = funnel_steps[%d]", i+1)}
		if len(stepConds) > 0 {
			stepCondExprs = append(stepCondExprs, stepConds...)
		}
		stepExprs = append(stepExprs, fmt.Sprintf("(%s)", strings.Join(stepCondExprs, " AND ")))
	}

	stepsArr := "[" + strings.Join(stepNames, ",") + "]"
	windowArgs := strings.Join(stepExprs, ",\n                ")

	q := fmt.Sprintf(`
WITH
    %s AS funnel_steps,
    86400 AS funnel_window_seconds,
    events_for_funnel AS (
        SELECT
            %s
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
`, stepsArr, strings.Join(selectCols, ",\n            "), where, windowArgs)

	return q, nil
}
