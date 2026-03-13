package charts

import (
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
)

type BreakdownDimension struct {
	SessionColumn string
	EventColumn   string
	EventOnly     bool
}

var breakdownDimensions = map[string]BreakdownDimension{
	"userCountry":     {SessionColumn: "user_country", EventColumn: `e."$country"`},
	"userCity":        {SessionColumn: "user_city", EventColumn: `e."$city"`},
	"userState":       {SessionColumn: "user_state", EventColumn: `e."$state"`},
	"userBrowser":     {SessionColumn: "user_browser", EventColumn: `e."$browser"`},
	"userDevice":      {SessionColumn: "user_device", EventColumn: "s.user_device"},
	"userOs":          {SessionColumn: "user_os", EventColumn: `e."$os"`},
	"referrer":        {SessionColumn: "referrer", EventColumn: `e."$referrer"`},
	"userId":          {SessionColumn: "user_id", EventColumn: "s.user_id"},
	"platform":        {SessionColumn: "platform", EventColumn: "s.platform"},
	"utmSource":       {SessionColumn: "utm_source", EventColumn: `e.utm_source`},
	"utmMedium":       {SessionColumn: "utm_medium", EventColumn: `e.utm_medium`},
	"utmCampaign":     {SessionColumn: "utm_campaign", EventColumn: `e.utm_campaign`},
	"userDeviceType":  {SessionColumn: "user_device_type", EventColumn: `e."$device"`},
	"revId":           {SessionColumn: "rev_id", EventColumn: "s.rev_id"},
	"issueType":       {SessionColumn: "arrayJoin(issue_types)", EventColumn: "e.issue_type"},
	"currentPath":     {EventColumn: `"$current_path"`, EventOnly: true},
	"referringDomain": {EventColumn: `"$referring_domain"`, EventOnly: true},
	"searchEngine":    {EventColumn: `"$search_engine"`, EventOnly: true},
}

func NormalizeBreakdownValue(s string) string {
	if s == "" {
		return "(empty)"
	}
	return s
}

func HasEventOnlyBreakdowns(breakdowns []string) bool {
	for _, b := range breakdowns {
		if dim, ok := breakdownDimensions[b]; ok && dim.EventOnly {
			return true
		}
	}
	return false
}

func SplitBreakdowns(breakdowns []string) (session []string, eventOnly []string) {
	for _, b := range breakdowns {
		if dim, ok := breakdownDimensions[b]; ok {
			if dim.EventOnly {
				eventOnly = append(eventOnly, b)
			} else {
				session = append(session, b)
			}
		}
	}
	return
}

func GetEventOnlyBreakdownProjection(breakdowns []string, tableAlias string) []string {
	parts := make([]string, 0)
	for i, b := range breakdowns {
		dim, ok := breakdownDimensions[b]
		if !ok || !dim.EventOnly {
			continue
		}
		parts = append(parts, fmt.Sprintf(`%s.%s AS break%d`, tableAlias, dim.EventColumn, i+1))
	}
	return parts
}

func GetEventOnlyBreakdownNamedProjection(breakdowns []string, tableAlias string) []string {
	parts := make([]string, 0)
	for _, b := range breakdowns {
		dim, ok := breakdownDimensions[b]
		if !ok || !dim.EventOnly {
			continue
		}
		parts = append(parts, fmt.Sprintf(`%s.%s AS %s`, tableAlias, dim.EventColumn, b))
	}
	return parts
}

func ValidateBreakdowns(breakdowns []string) error {
	for _, b := range breakdowns {
		if _, ok := breakdownDimensions[b]; !ok {
			return fmt.Errorf("unsupported breakdown %q", b)
		}
	}
	return nil
}

func SeriesKey(name, fallback string) string {
	if name != "" {
		return name
	}
	return fallback
}

func WrapInSeries(key string, value interface{}) map[string]interface{} {
	return map[string]interface{}{
		"series": map[string]interface{}{key: value},
	}
}

func BuildScanArgs(before []interface{}, bdVals []string, after []interface{}) []interface{} {
	args := make([]interface{}, 0, len(before)+len(bdVals)+len(after))
	args = append(args, before...)
	for i := range bdVals {
		args = append(args, &bdVals[i])
	}
	args = append(args, after...)
	return args
}

type BreakdownTree[T any] struct {
	Value    T
	Children map[string]*BreakdownTree[T]
	IsLeaf   bool
}

func NewBreakdownTree[T any](zero T) *BreakdownTree[T] {
	return &BreakdownTree[T]{
		Value:    zero,
		Children: make(map[string]*BreakdownTree[T]),
	}
}

func (t *BreakdownTree[T]) Insert(bdVals []string, numBreakdowns int, newZero func() T, accumulate func(*T)) {
	accumulate(&t.Value)
	current := t
	for depth := 0; depth < numBreakdowns; depth++ {
		bdVal := NormalizeBreakdownValue(bdVals[depth])
		child, exists := current.Children[bdVal]
		if !exists {
			child = &BreakdownTree[T]{
				Value:    newZero(),
				Children: make(map[string]*BreakdownTree[T]),
				IsLeaf:   depth == numBreakdowns-1,
			}
			current.Children[bdVal] = child
		}
		accumulate(&child.Value)
		current = child
	}
}

func (t *BreakdownTree[T]) ToMap(render func(T) interface{}) map[string]interface{} {
	result := map[string]interface{}{
		"$overall": render(t.Value),
	}
	for key, child := range t.Children {
		if child.IsLeaf {
			result[key] = render(child.Value)
		} else {
			result[key] = child.ToMap(render)
		}
	}
	return result
}

func WalkTree[T any](node *BreakdownTree[T], fn func(*T)) {
	fn(&node.Value)
	for _, child := range node.Children {
		WalkTree(child, fn)
	}
}

func GetBreakdownProjection(breakdowns []string, tableAlias string) string {
	if len(breakdowns) == 0 {
		return ""
	}
	parts := make([]string, 0, len(breakdowns))
	for _, b := range breakdowns {
		if dim, ok := breakdownDimensions[b]; ok {
			if dim.EventOnly {
				continue
			}
			col := dim.SessionColumn
			// If the column already contains a function call or is fully qualified,
			// don't prefix with the table alias.
			if strings.Contains(col, "(") || strings.Contains(col, ".") {
				parts = append(parts, fmt.Sprintf("%s AS %s", col, b))
			} else {
				parts = append(parts, fmt.Sprintf("%s.%s AS %s", tableAlias, col, b))
			}
		}
	}
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, ", ")
}

func GetBreakdownSelectColumns(breakdowns []string, tableAlias ...string) []string {
	prefix := ""
	if len(tableAlias) > 0 && tableAlias[0] != "" {
		prefix = tableAlias[0] + "."
	}
	cols := make([]string, 0, len(breakdowns))
	for _, b := range breakdowns {
		if _, ok := breakdownDimensions[b]; ok {
			cols = append(cols, prefix+b)
		}
	}
	return cols
}

func BuildBreakdownGroupBy(baseColumns []string, breakdowns []string) string {
	if len(breakdowns) > 0 {
		return "GROUP BY ALL"
	}
	if len(baseColumns) == 0 {
		return ""
	}
	return "GROUP BY " + strings.Join(baseColumns, ", ")
}

func AppendBreakdownProjection(projection string, breakdowns []string, tableAlias string) string {
	if bdProj := GetBreakdownProjection(breakdowns, tableAlias); bdProj != "" {
		return projection + ", " + bdProj
	}
	return projection
}

func AppendBreakdownRefs(projection string, breakdowns []string, subqueryAlias string) string {
	if len(breakdowns) == 0 {
		return projection
	}
	var sb strings.Builder
	sb.WriteString(projection)
	for _, bdName := range breakdowns {
		sb.WriteString(", ")
		sb.WriteString(subqueryAlias)
		sb.WriteByte('.')
		sb.WriteString(bdName)
	}
	return sb.String()
}

func BuildSessionsFilterConditions(sessionFilters []model.Filter) []string {
	_, _, sessionConditions := BuildEventConditions(sessionFilters, BuildConditionsOptions{
		DefinedColumns: SessionColumns,
		MainTableAlias: "s",
	})

	durConds, _ := BuildDurationWhere(sessionFilters, "s")

	whereParts := []string{
		"s.project_id = @project_id",
		"s.datetime >= toDateTime(@startTimestamp/1000)",
		"s.datetime <= toDateTime(@endTimestamp/1000)",
	}

	if len(sessionConditions) > 0 {
		whereParts = append(whereParts, strings.Join(sessionConditions, " AND "))
	}
	if durConds != nil {
		whereParts = append(whereParts, durConds...)
	}

	return whereParts
}

func GetTableBreakdownProjection(breakdowns []string) []string {
	parts := make([]string, 0, len(breakdowns))
	for i, b := range breakdowns {
		dim, ok := breakdownDimensions[b]
		if !ok {
			// Note: ValidateBreakdowns is always called before this function,
			// so invalid keys should not appear in practice. This guard
			// prevents panics if the call order ever changes.
			continue
		}
		if dim.EventOnly {
			continue
		}
		// Uses loop index i+1 (not len(parts)+1) to keep alias numbering
		// aligned with the input slice position, matching downstream expectations.
		parts = append(parts, fmt.Sprintf(`%s AS break%d`, dim.SessionColumn, i+1))
	}
	return parts
}

func GetFunnelBreakdownProjection(breakdowns []string) []string {
	parts := make([]string, 0, len(breakdowns))
	for i, b := range breakdowns {
		dim, ok := breakdownDimensions[b]
		if !ok {
			continue
		}
		col := dim.EventColumn
		if dim.EventOnly {
			col = "e." + col
		}
		parts = append(parts, fmt.Sprintf(`%s AS break%d`, col, i+1))
	}
	return parts
}

func GetFunnelBreakdownOuterColumns(n int) []string {
	cols := make([]string, n)
	for i := 0; i < n; i++ {
		cols[i] = fmt.Sprintf("break%d", i+1)
	}
	return cols
}

func FunnelBreakdownNeedsSessions(breakdowns []string) bool {
	for _, b := range breakdowns {
		if strings.HasPrefix(breakdownDimensions[b].EventColumn, "s.") {
			return true
		}
	}
	return false
}

func BuildSessionsSubQuery(sessionFilters []model.Filter, startTimestamp uint64, breakdowns []string) string {
	whereParts := BuildSessionsFilterConditions(sessionFilters)
	sessionsTable := getMainSessionsTable(startTimestamp)

	selectCols := "session_id, datetime, user_id, user_uuid, user_anonymous_id"
	if bdProj := GetBreakdownProjection(breakdowns, "s"); bdProj != "" {
		selectCols += ", " + bdProj
	}

	return fmt.Sprintf(
		"SELECT %s\nFROM %s AS s\nWHERE %s",
		selectCols, sessionsTable, strings.Join(whereParts, " AND "),
	)
}

func newBreakdownKey(timestamp uint64, bdVals []string) breakdownKey {
	var key breakdownKey
	key.Timestamp = timestamp
	copy(key.Values[:], bdVals)
	return key
}

func ScanBreakdownRows(rows driver.Rows, numBreakdowns int, seriesName string, data map[breakdownKey]map[string]uint64) error {
	var timestamp uint64
	var count uint64
	bdVals := make([]string, numBreakdowns)

	scanArgs := BuildScanArgs(
		[]interface{}{&timestamp},
		bdVals,
		[]interface{}{&count},
	)

	for rows.Next() {
		if err := rows.Scan(scanArgs...); err != nil {
			return fmt.Errorf("scan: %w", err)
		}

		key := newBreakdownKey(timestamp, bdVals)
		if data[key] == nil {
			data[key] = map[string]uint64{}
		}
		data[key][seriesName] = count
	}
	return rows.Err()
}

func BuildTimeseriesSeriesMap(data map[breakdownKey]map[string]uint64, breakdowns []string, seriesNames []string) map[string]interface{} {
	numBreakdowns := len(breakdowns)
	type tsCountMap = map[uint64]uint64

	seriesMap := make(map[string]interface{}, len(seriesNames))

	for _, seriesName := range seriesNames {
		if numBreakdowns == 0 {
			flat := make(tsCountMap)
			for key, counts := range data {
				flat[key.Timestamp] += counts[seriesName]
			}
			seriesMap[seriesName] = flat
			continue
		}

		tree := NewBreakdownTree(make(tsCountMap))
		newZero := func() tsCountMap { return make(tsCountMap) }
		var ts uint64
		var count uint64
		accumulate := func(v *tsCountMap) { (*v)[ts] += count }

		for key, counts := range data {
			count = counts[seriesName]
			ts = key.Timestamp
			tree.Insert(key.Values[:numBreakdowns], numBreakdowns, newZero, accumulate)
		}

		WalkTree(tree, func(v *tsCountMap) {
			for ts := range tree.Value {
				if _, exists := (*v)[ts]; !exists {
					(*v)[ts] = 0
				}
			}
		})

		seriesMap[seriesName] = tree.ToMap(func(v tsCountMap) interface{} { return v })
	}

	return map[string]interface{}{
		"series": seriesMap,
	}
}
