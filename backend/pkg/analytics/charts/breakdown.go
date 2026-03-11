package charts

import (
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
)

func ValidateBreakdowns(breakdowns []string) error {
	for _, b := range breakdowns {
		if _, ok := breakdownColumnMap[b]; !ok {
			return fmt.Errorf("unsupported breakdown %q", b)
		}
	}
	return nil
}

func GetBreakdownProjection(breakdowns []string, tableAlias string) string {
	if len(breakdowns) == 0 {
		return ""
	}
	parts := make([]string, 0, len(breakdowns))
	for _, b := range breakdowns {
		if col, ok := breakdownColumnMap[b]; ok {
			parts = append(parts, fmt.Sprintf("%s.%s AS %s", tableAlias, col, b))
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
		if _, ok := breakdownColumnMap[b]; ok {
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
	parts := make([]string, len(breakdowns))
	for i, b := range breakdowns {
		parts[i] = fmt.Sprintf(`%s AS break%d`, breakdownColumnMap[b], i+1)
	}
	return parts
}

func GetFunnelBreakdownProjection(breakdowns []string) []string {
	parts := make([]string, len(breakdowns))
	for i, b := range breakdowns {
		parts[i] = fmt.Sprintf(`%s AS break%d`, breakdownFunnelColumnMap[b], i+1)
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
		if col := breakdownFunnelColumnMap[b]; strings.HasPrefix(col, "s.") {
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

	scanArgs := make([]interface{}, 0, 2+numBreakdowns)
	scanArgs = append(scanArgs, &timestamp)
	for i := range bdVals {
		scanArgs = append(scanArgs, &bdVals[i])
	}
	scanArgs = append(scanArgs, &count)

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
		rootOverall := make(tsCountMap)

		if numBreakdowns == 0 {
			for key, counts := range data {
				rootOverall[key.Timestamp] += counts[seriesName]
			}
			seriesMap[seriesName] = rootOverall
			continue
		}

		root := make(map[string]interface{})

		for key, counts := range data {
			count := counts[seriesName]
			rootOverall[key.Timestamp] += count

			current := root
			for depth := 0; depth < numBreakdowns; depth++ {
				bdVal := key.Values[depth]
				if bdVal == "" {
					bdVal = "(empty)"
				}

				isLast := depth == numBreakdowns-1

				if isLast {
					var leaf tsCountMap
					if existing, ok := current[bdVal]; ok {
						leaf = existing.(tsCountMap)
					} else {
						leaf = make(tsCountMap)
						current[bdVal] = leaf
					}
					leaf[key.Timestamp] = count
				} else {
					var branch map[string]interface{}
					if existing, ok := current[bdVal]; ok {
						branch = existing.(map[string]interface{})
					} else {
						branch = make(map[string]interface{})
						current[bdVal] = branch
					}

					var branchOverall tsCountMap
					if existing, ok := branch["$overall"]; ok {
						branchOverall = existing.(tsCountMap)
					} else {
						branchOverall = make(tsCountMap)
						branch["$overall"] = branchOverall
					}
					branchOverall[key.Timestamp] += count

					current = branch
				}
			}
		}

		root["$overall"] = rootOverall
		zeroFillTree(root, rootOverall)
		seriesMap[seriesName] = root
	}

	return map[string]interface{}{
		"series": seriesMap,
	}
}

func zeroFillTree(node map[string]interface{}, allTimestamps map[uint64]uint64) {
	for _, v := range node {
		switch child := v.(type) {
		case map[uint64]uint64:
			for ts := range allTimestamps {
				if _, exists := child[ts]; !exists {
					child[ts] = 0
				}
			}
		case map[string]interface{}:
			zeroFillTree(child, allTimestamps)
		}
	}
}
