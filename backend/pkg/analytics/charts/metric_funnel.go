package charts

import (
	"context"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
)

type FilterDetail struct {
	Name     string   `json:"name"`
	Operator string   `json:"operator"`
	Value    []string `json:"value"`
}

type FunnelStageResult struct {
	Value         []string       `json:"value"`
	Type          string         `json:"type"`
	Operator      string         `json:"operator"`
	DropPct       *float64       `json:"dropPct"`
	Count         uint64         `json:"count"`
	Filters       []FilterDetail `json:"filters,omitempty"`
	PropertyOrder string         `json:"propertyOrder"`
}

type FunnelResponse struct {
	Stages []FunnelStageResult `json:"stages"`
}

type FunnelQueryBuilder struct{}

func (f *FunnelQueryBuilder) Execute(p *Payload, conn driver.Conn) (interface{}, error) {
	q, err := f.buildQuery(p)
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(context.Background(), q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	s := p.MetricPayload.Series[0]
	var stepFilters []model.Filter
	for _, flt := range s.Filter.Filters {
		if flt.IsEvent {
			stepFilters = append(stepFilters, flt)
		}
	}

	var stages []FunnelStageResult

	if rows.Next() {
		stageCount := len(stepFilters)

		scanValues := make([]interface{}, stageCount)
		stageCountPointers := make([]*uint64, stageCount)

		for i := 0; i < stageCount; i++ {
			var count uint64
			stageCountPointers[i] = &count
			scanValues[i] = stageCountPointers[i]
		}

		if err := rows.Scan(scanValues...); err != nil {
			return nil, err
		}

		for i := 0; i < stageCount; i++ {
			count := *stageCountPointers[i]

			stage := FunnelStageResult{
				Type:          stepFilters[i].Name,
				Count:         count,
				Value:         []string{},
				Operator:      stepFilters[i].Operator,
				PropertyOrder: stepFilters[i].PropertyOrder,
				Filters:       convertToFilterDetails(stepFilters[i].Filters), // Include nested filters
			}

			if len(stepFilters[i].Value) > 0 {
				stage.Value = stepFilters[i].Value
			}

			stages = append(stages, stage)
		}
	}

	if len(stages) > 0 {
		stages[0].DropPct = nil // First stage has no drop percentage

		for i := 1; i < len(stages); i++ {
			prevCount := stages[i-1].Count
			currCount := stages[i].Count

			if prevCount > 0 {
				dropPct := (float64(prevCount-currCount) / float64(prevCount)) * 100
				stages[i].DropPct = &dropPct
			} else {
				stages[i].DropPct = nil
			}
		}
	}

	return FunnelResponse{Stages: stages}, nil
}

func (f *FunnelQueryBuilder) buildQuery(p *Payload) (string, error) {
	allFilters := p.MetricPayload.Series[0].Filter.Filters

	var (
		eventFilters   []model.Filter
		sessionFilters []model.Filter
		stages         []string
	)

	for _, filter := range allFilters {
		if _, exists := SessionColumns[filter.Name]; exists {
			sessionFilters = append(sessionFilters, filter)
		} else {
			eventFilters = append(eventFilters, filter)
		}

		if filter.IsEvent {
			stages = append(stages, filter.Name)
		}
	}

	eventConditions, otherConditions := BuildEventConditions(eventFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
	})

	_, sessionConditions := BuildEventConditions(sessionFilters, BuildConditionsOptions{
		DefinedColumns: SessionColumns,
		MainTableAlias: "s",
	})

	durConds, _ := BuildDurationWhere(allFilters, "s")
	if durConds != nil {
		sessionConditions = append(sessionConditions, durConds...)
	}

	stageColumns := make([]string, len(stages))
	for i := range stages {
		stageColumns[i] = fmt.Sprintf("coalesce(SUM(S%d), 0) AS stage%d", i+1, i+1)
	}

	tColumns := buildTColumns(stages, eventConditions, p.MetricFormat)

	baseWhere := []string{
		fmt.Sprintf("e.created_at >= toDateTime(%d)", p.MetricPayload.StartTimestamp/1000),
		fmt.Sprintf("e.created_at < toDateTime(%d)", (p.MetricPayload.EndTimestamp)/1000),
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
		fmt.Sprintf("e.`$event_name` IN %s", formatEventNames(stages)),
	}

	if p.MetricFormat == MetricFormatUserCount {
		baseWhere = append(baseWhere, fmt.Sprintf("isNotNull(s.user_id)"))
	}

	if len(otherConditions) > 0 {
		baseWhere = append(baseWhere, strings.Join(otherConditions, " AND "))
	}
	var mainTables string = fmt.Sprintf("%s AS e", getMainEventsTable(p.StartTimestamp))
	if len(sessionConditions) > 0 || p.MetricFormat == MetricFormatUserCount {
		mainTables = fmt.Sprintf("%s AS s INNER JOIN %s AS e USING(session_id)", getMainSessionsTable(p.StartTimestamp), mainTables)
		baseWhere = append(baseWhere, []string{
			fmt.Sprintf("s.project_id = %d", p.ProjectId),
			fmt.Sprintf("s.datetime >= toDateTime(%d)", p.MetricPayload.StartTimestamp/1000),
			fmt.Sprintf("s.datetime < toDateTime(%d)", p.MetricPayload.EndTimestamp/1000)}...)
		if len(sessionConditions) > 0 {
			baseWhere = append(baseWhere, fmt.Sprintf("%s", strings.Join(sessionConditions, " AND ")))
		}
	}

	groupColumn := "GROUP BY e.session_id"
	if p.MetricFormat == MetricFormatUserCount {
		groupColumn = "GROUP BY s.user_id"
	}
	subQuery := fmt.Sprintf(`
        SELECT
            %s
        FROM %s
        WHERE
            %s
        %s`,
		strings.Join(tColumns, ",\n"),
		mainTables,
		strings.Join(baseWhere, " AND "),
		groupColumn)

	q := fmt.Sprintf(`
        SELECT
            %s
        FROM (%s) AS raw`,
		strings.Join(stageColumns, ",\n"),
		subQuery)

	return q, nil
}

func findEventConditionForStage(eventConditions []string, stageName string) string {
	for _, condition := range eventConditions {
		if strings.Contains(condition, fmt.Sprintf("`$event_name` = '%s'", stageName)) {
			condition = strings.TrimPrefix(condition, "(")
			condition = strings.TrimSuffix(condition, ")")
			return condition
		}
	}
	return fmt.Sprintf("`$event_name` = '%s'", stageName)
}

func buildTColumns(stages []string, eventConditions []string, metricFormat string) []string {
	if len(stages) == 0 {
		return nil
	}
	tColumns := make([]string, len(stages))

	// S1
	stage1Cond := findEventConditionForStage(eventConditions, stages[0])
	if metricFormat == MetricFormatEventCount {
		tColumns[0] = fmt.Sprintf("countIf(%s) AS S1", stage1Cond)
	} else {
		tColumns[0] = fmt.Sprintf("anyIf(1, %s) AS S1", stage1Cond) // 0/1 per group (session)
	}

	// S2...Sn
	for i := 1; i < len(stages); i++ {
		pattern := buildSequencePattern(i + 1)
		conds := buildSequenceConditions(stages[:i+1], eventConditions)

		fn := "sequenceMatch"
		if metricFormat == MetricFormatEventCount {
			fn = "sequenceCount"
		}
		tColumns[i] = fmt.Sprintf("%s(%s)(toDateTime(e.created_at), %s) AS S%d",
			fn, pattern, strings.Join(conds, ", "), i+1)
	}
	return tColumns
}

func buildSequencePattern(stageCount int) string {
	patternParts := make([]string, stageCount)
	for i := 0; i < stageCount; i++ {
		patternParts[i] = fmt.Sprintf("(?%d)", i+1)
	}
	return fmt.Sprintf("'%s'", strings.Join(patternParts, ""))
}

func buildSequenceConditions(stages []string, eventConditions []string) []string {
	sequenceConditions := make([]string, len(stages))
	for i, stage := range stages {
		sequenceConditions[i] = findEventConditionForStage(eventConditions, stage)
	}
	return sequenceConditions
}

func formatEventNames(stages []string) string {
	quoted := make([]string, len(stages))
	for i, stage := range stages {
		quoted[i] = fmt.Sprintf("'%s'", stage)
	}
	return fmt.Sprintf("(%s)", strings.Join(quoted, ", "))
}

func convertToFilterDetails(filters []model.Filter) []FilterDetail {
	if len(filters) == 0 {
		return nil
	}

	details := make([]FilterDetail, len(filters))
	for i, filter := range filters {
		details[i] = FilterDetail{
			Name:     filter.Name,
			Operator: filter.Operator,
			Value:    filter.Value,
		}
	}

	return details
}
