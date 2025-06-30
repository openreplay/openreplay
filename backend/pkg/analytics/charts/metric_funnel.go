package charts

import (
	"context"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
)

type FunnelStepResult struct {
	LevelNumber  uint64   `json:"step"`
	StepName     string   `json:"type"`
	CountAtLevel uint64   `json:"count"`
	Operator     string   `json:"operator"`
	Value        []string `json:"value"`
	DropPct      float64  `json:"dropPct"`
}

type FunnelResponse struct {
	Steps []FunnelStepResult `json:"stages"`
}

type FunnelQueryBuilder struct{}

func (f *FunnelQueryBuilder) Execute(p Payload, conn driver.Conn) (interface{}, error) {
	q, err := f.buildQuery(p)
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(context.Background(), q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// extract step filters
	s := p.MetricPayload.Series[0]
	var stepFilters []model.Filter
	for _, flt := range s.Filter.Filters {
		if flt.IsEvent {
			stepFilters = append(stepFilters, flt)
		}
	}

	var steps []FunnelStepResult
	for rows.Next() {
		var r FunnelStepResult
		if err := rows.Scan(&r.LevelNumber, &r.StepName, &r.CountAtLevel); err != nil {
			return nil, err
		}
		idx := int(r.LevelNumber) - 1
		if idx >= 0 && idx < len(stepFilters) {
			r.Operator = stepFilters[idx].Operator
			r.Value = stepFilters[idx].Value
		}
		steps = append(steps, r)
	}

	// compute drop percentages
	if len(steps) > 0 {
		prev := steps[0].CountAtLevel
		steps[0].DropPct = 0
		for i := 1; i < len(steps); i++ {
			curr := steps[i].CountAtLevel
			if prev > 0 {
				steps[i].DropPct = (float64(prev-curr) / float64(prev)) * 100
			} else {
				steps[i].DropPct = 0
			}
			prev = curr
		}
	}

	return FunnelResponse{Steps: steps}, nil
}

func (f *FunnelQueryBuilder) buildQuery(p Payload) (string, error) {
	if len(p.MetricPayload.Series) == 0 {
		return "", fmt.Errorf("series empty")
	}
	s := p.MetricPayload.Series[0]
	metricFormat := p.MetricPayload.MetricFormat

	var (
		globalFilters         []model.Filter
		stepFilters           []model.Filter
		sessionDurationFilter *model.Filter
	)
	for _, flt := range s.Filter.Filters {
		if flt.IsEvent {
			stepFilters = append(stepFilters, flt)
		} else if flt.Type == "duration" {
			sessionDurationFilter = &flt
		} else {
			globalFilters = append(globalFilters, flt)
		}
	}

	requiredColumns := make(map[string]struct{})
	var collectColumns func([]model.Filter)
	collectColumns = func(filters []model.Filter) {
		for _, flt := range filters {
			if col, ok := mainColumns[string(flt.Type)]; ok {
				requiredColumns[col] = struct{}{}
			}
			collectColumns(flt.Filters)
		}
	}
	collectColumns(globalFilters)
	collectColumns(stepFilters)

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

	globalConds, _ := buildEventConditions(globalFilters, BuildConditionsOptions{
		DefinedColumns:       mainColumns,
		MainTableAlias:       "e",
		PropertiesColumnName: "$properties",
	})

	base := []string{
		fmt.Sprintf("e.created_at >= toDateTime(%d/1000)", p.MetricPayload.StartTimestamp),
		fmt.Sprintf("e.created_at < toDateTime(%d/1000)", p.MetricPayload.EndTimestamp+86400000),
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
	}
	base = append(base, globalConds...)
	if sessionDurationFilter != nil {
		vals := sessionDurationFilter.Value
		if len(vals) > 0 && vals[0] != "" {
			base = append(base, fmt.Sprintf("s.duration >= %s", vals[0]))
		}
		if len(vals) > 1 && vals[1] != "" {
			base = append(base, fmt.Sprintf("s.duration <= %s", vals[1]))
		}
	}
	where := strings.Join(base, " AND ")

	var (
		stepNames  []string
		stepExprs  []string
		clickCount int
	)
	for i, flt := range stepFilters {
		stepNames = append(stepNames, fmt.Sprintf("'%s'", flt.Type))
		conds, _ := buildEventConditions([]model.Filter{flt}, BuildConditionsOptions{
			DefinedColumns:       cteColumnAliases(),
			PropertiesColumnName: "properties",
			MainTableAlias:       "",
		})
		var exprParts []string
		exprParts = append(exprParts, fmt.Sprintf("event_name = funnel_steps[%d]", i+1))
		if flt.Type == "CLICK" {
			clickCount++
			exprParts = append(exprParts, fmt.Sprintf("click_idx = %d", clickCount))
		}
		exprParts = append(exprParts, conds...)
		stepExprs = append(stepExprs, fmt.Sprintf("(%s)", strings.Join(exprParts, " AND ")))
	}

	stepsArr := fmt.Sprintf("[%s]", strings.Join(stepNames, ","))
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
        ORDER BY e.session_id, e.created_at
    ),
    numbered_clicks AS (
        SELECT
            entity_id,
            created_at,
            row_number() OVER (PARTITION BY entity_id ORDER BY created_at) AS click_idx
        FROM events_for_funnel
        WHERE event_name = 'CLICK'
    ),
    funnel_levels_reached AS (
        SELECT
            ef.entity_id,
            windowFunnel(funnel_window_seconds)(
                toDateTime(ef.created_at),
                %s
            ) AS max_level
        FROM events_for_funnel ef
        LEFT JOIN numbered_clicks nc
          ON ef.entity_id = nc.entity_id
         AND ef.created_at = nc.created_at
        GROUP BY ef.entity_id
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
ORDER BY s.level_number;`,
		stepsArr,
		strings.Join(selectCols, ",\n            "),
		where,
		windowArgs,
	)

	return q, nil
}
