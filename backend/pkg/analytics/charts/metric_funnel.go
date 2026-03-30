package charts

import (
	"context"
	"fmt"
	"openreplay/backend/pkg/logger"
	"strings"
	"time"

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

type FunnelQueryBuilder struct {
	Logger logger.Logger
}

func (f *FunnelQueryBuilder) Execute(ctx context.Context, p *Payload, conn driver.Conn) (interface{}, error) {
	if err := ValidateBreakdowns(p.Breakdowns); err != nil {
		return nil, err
	}

	seriesKey := SeriesKey(p.Name, "Funnel")

	if !hasEventFilter(p.MetricPayload.Series[0].Filter.Filters) {
		return WrapInSeries(seriesKey, FunnelResponse{Stages: []FunnelStageResult{}}), nil
	}

	q, params, err := f.buildQuery(p)
	if err != nil {
		return nil, err
	}

	_start := time.Now()
	f.Logger.Debug(ctx, "Executing funnel query: %s", q)
	chParams := convertParams(params)
	rows, err := conn.Query(ctx, q, chParams...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if time.Since(_start) > 2*time.Second {
		f.Logger.Warn(ctx, "Funnel query took more than 2s: %s", q)
	}

	stepFilters := extractStepFilters(p.MetricPayload.Series[0].Filter.Filters)
	stageCount := len(stepFilters)
	numBreakdowns := len(p.Breakdowns)

	if numBreakdowns == 0 {
		if !rows.Next() {
			return WrapInSeries(seriesKey, FunnelResponse{Stages: []FunnelStageResult{}}), nil
		}
		counts := make([]uint64, stageCount)
		scanArgs := make([]interface{}, stageCount)
		for i := range counts {
			scanArgs[i] = &counts[i]
		}
		if err := rows.Scan(scanArgs...); err != nil {
			return nil, err
		}
		return WrapInSeries(seriesKey, FunnelResponse{Stages: buildFunnelStages(counts, stepFilters)}), nil
	}

	tree := NewBreakdownTree(make([]uint64, stageCount))

	bdVals := make([]string, numBreakdowns)
	stageCounts := make([]uint64, stageCount)
	stageArgs := make([]interface{}, stageCount)
	for i := range stageCounts {
		stageArgs[i] = &stageCounts[i]
	}
	scanArgs := BuildScanArgs(nil, bdVals, stageArgs)

	newZero := func() []uint64 { return make([]uint64, stageCount) }
	accumulate := func(v *[]uint64) {
		for i, c := range stageCounts {
			(*v)[i] += c
		}
	}

	for rows.Next() {
		if err := rows.Scan(scanArgs...); err != nil {
			return nil, err
		}
		tree.Insert(bdVals, numBreakdowns, newZero, accumulate)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	render := func(counts []uint64) interface{} {
		return FunnelResponse{Stages: buildFunnelStages(counts, stepFilters)}
	}
	return WrapInSeries(seriesKey, tree.ToMap(render)), nil
}

func buildFunnelStages(counts []uint64, stepFilters []model.Filter) []FunnelStageResult {
	stages := make([]FunnelStageResult, len(counts))
	for i, count := range counts {
		stages[i] = FunnelStageResult{
			Type:          stepFilters[i].Name,
			Count:         count,
			Value:         stepFilters[i].Value,
			Operator:      stepFilters[i].Operator,
			PropertyOrder: stepFilters[i].PropertyOrder,
			Filters:       convertToFilterDetails(stepFilters[i].Filters),
		}
		if len(stages[i].Value) == 0 {
			stages[i].Value = []string{}
		}
	}
	for i := 1; i < len(stages); i++ {
		if stages[i-1].Count > 0 {
			dropPct := (float64(stages[i-1].Count-stages[i].Count) / float64(stages[i-1].Count)) * 100
			stages[i].DropPct = &dropPct
		}
	}
	return stages
}

func extractStepFilters(filters []model.Filter) []model.Filter {
	var stepFilters []model.Filter
	for _, f := range filters {
		if f.IsEvent {
			stepFilters = append(stepFilters, f)
		}
	}
	return stepFilters
}

func (f *FunnelQueryBuilder) buildQuery(p *Payload) (string, map[string]any, error) {
	allFilters := p.MetricPayload.Series[0].Filter.Filters
	numBreakdowns := len(p.Breakdowns)

	var (
		eventFilters         []model.Filter
		namelessEventFilters []model.Filter
		sessionFilters       []model.Filter
		stages               []string
	)

	for _, filter := range allFilters {
		filterName := filter.Name
		if !filter.IsEvent && filter.AutoCaptured {
			filterName = CamelToSnake(filterName)
		}
		if !filter.IsEvent {
			if _, ok := SessionColumns[filterName]; ok ||
				filter.AutoCaptured && strings.HasPrefix(filterName, "metadata_") {
				sessionFilters = append(sessionFilters, filter)
			} else {
				namelessEventFilters = append(namelessEventFilters, filter)
			}
		} else {
			eventFilters = append(eventFilters, filter)
			stages = append(stages, filterName)
		}
	}

	eventConditions, _, otherConditions := BuildEventConditions(eventFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
	})
	_, _, namelessEventConditions := BuildEventConditions(namelessEventFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
	})

	var sessionConditions []string = make([]string, 0)
	if len(sessionFilters) > 0 {
		_, _, sessionConditions = BuildEventConditions(sessionFilters, BuildConditionsOptions{
			DefinedColumns: SessionColumns,
			MainTableAlias: "s",
		})
	}

	durConds, _ := BuildDurationWhere(allFilters, "s")
	if durConds != nil {
		sessionConditions = append(sessionConditions, durConds...)
	}

	tColumns := buildTColumns(stages, eventConditions, p.MetricFormat)

	var innerParts []string
	if numBreakdowns > 0 {
		if p.MetricFormat == MetricFormatUserCount {
			innerParts = append(innerParts, "s.user_id")
		} else {
			innerParts = append(innerParts, "e.session_id")
		}
		innerParts = append(innerParts, GetFunnelBreakdownProjection(p.Breakdowns)...)
	}
	innerParts = append(innerParts, tColumns...)

	baseWhere := []string{
		"e.created_at >= toDateTime(@startTimestamp/1000)",
		"e.created_at < toDateTime(@endTimestamp/1000)",
		"e.project_id = @projectId",
		fmt.Sprintf("e.`$event_name` IN %s", formatEventNames(stages)),
	}

	if p.SampleRate > 0 && p.SampleRate < 100 {
		baseWhere = append(baseWhere, fmt.Sprintf("e.sample_key < %d", p.SampleRate)) // safe: validated integer from struct
	}

	if p.MetricFormat == MetricFormatUserCount {
		baseWhere = append(baseWhere, "isNotNull(s.user_id)")
	}

	if len(otherConditions) > 0 {
		baseWhere = append(baseWhere, strings.Join(otherConditions, " AND "))
	}
	if len(namelessEventConditions) > 0 {
		baseWhere = append(baseWhere, strings.Join(namelessEventConditions, " AND "))
	}

	var mainTables string = fmt.Sprintf("%s AS e", getMainEventsTable(p.StartTimestamp))
	needsSessionsJoin := len(sessionConditions) > 0 || p.MetricFormat == MetricFormatUserCount ||
		(numBreakdowns > 0 && FunnelBreakdownNeedsSessions(p.Breakdowns))
	if needsSessionsJoin {
		mainTables = fmt.Sprintf("%s AS s INNER JOIN %s USING(session_id)", getMainSessionsTable(p.StartTimestamp), mainTables)
		baseWhere = append(baseWhere, []string{
			"s.project_id = @projectId",
			"s.datetime >= toDateTime(@startTimestamp/1000)",
			"s.datetime < toDateTime(@endTimestamp/1000)"}...)
		if len(sessionConditions) > 0 {
			baseWhere = append(baseWhere, strings.Join(sessionConditions, " AND "))
		}
	}

	groupColumn := "GROUP BY e.session_id"
	if p.MetricFormat == MetricFormatUserCount {
		groupColumn = "GROUP BY s.user_id"
	}
	if numBreakdowns > 0 {
		groupColumn = "GROUP BY ALL"
	}

	subQuery := fmt.Sprintf(`
        SELECT %s
        FROM %s
        WHERE %s
        %s`,
		strings.Join(innerParts, ", "),
		mainTables,
		strings.Join(baseWhere, " AND "),
		groupColumn)

	stageColumns := make([]string, len(stages))
	for i := range stages {
		stageColumns[i] = fmt.Sprintf("coalesce(SUM(S%d), 0) AS stage%d", i+1, i+1)
	}

	var outerParts []string
	if numBreakdowns > 0 {
		outerParts = append(outerParts, GetFunnelBreakdownOuterColumns(numBreakdowns)...)
	}
	outerParts = append(outerParts, stageColumns...)

	outerGroupBy := ""
	if numBreakdowns > 0 {
		outerGroupBy = "\nGROUP BY ALL"
	}

	q := fmt.Sprintf(`
        SELECT %s
        FROM (%s) AS raw%s`,
		strings.Join(outerParts, ", "),
		subQuery,
		outerGroupBy)

	params := map[string]any{
		"startTimestamp": p.MetricPayload.StartTimestamp,
		"endTimestamp":   p.MetricPayload.EndTimestamp,
		"projectId":      p.ProjectId,
	}

	return q, params, nil
}

func buildTColumns(stages []string, eventConditions []string, metricFormat string) []string {
	if len(stages) == 0 {
		return nil
	}
	tColumns := make([]string, len(stages))

	// S1
	if metricFormat == MetricFormatEventCount {
		tColumns[0] = fmt.Sprintf("countIf(%s) AS S1", eventConditions[0])
	} else {
		tColumns[0] = fmt.Sprintf("anyIf(1, %s) AS S1", eventConditions[0]) // 0/1 per group (session)
	}

	// S2...Sn
	var pattern string = "(?1)"
	for i := 1; i < len(stages); i++ {
		pattern = fmt.Sprintf("%s(?%d)", pattern, i+1)
		fn := "sequenceMatch"
		if metricFormat == MetricFormatEventCount {
			fn = "sequenceCount"
		}
		tColumns[i] = fmt.Sprintf("%s('%s')(toDateTime(e.created_at), %s) AS S%d",
			fn, pattern, strings.Join(eventConditions[:i+1], ", "), i+1)
	}
	return tColumns
}

func formatEventNames(stages []string) string {
	quoted := make([]string, len(stages))
	for i, stage := range stages {
		quoted[i] = fmt.Sprintf("'%s'", sqlStringReplacer.Replace(stage))
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
