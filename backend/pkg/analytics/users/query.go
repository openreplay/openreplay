package users

import (
	"fmt"
	"strings"

	"openreplay/backend/pkg/analytics/events"
	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/analytics/users/model"
)

func formatColumnForSelect(alias, col string, dbCol string) string {
	switch filters.UserColumn(col) {
	case filters.UserColumnCreatedAt:
		return fmt.Sprintf("toInt64(toUnixTimestamp(%s%s) * 1000) AS %s", alias, dbCol, col)
	case filters.UserColumnFirstEventAt:
		return fmt.Sprintf("toInt64(toUnixTimestamp(%s%s) * 1000) AS %s", alias, dbCol, col)
	case filters.UserColumnLastSeen:
		return fmt.Sprintf("toInt64(toUnixTimestamp(%s%s) * 1000) AS %s", alias, dbCol, col)
	case filters.UserColumnProperties:
		return fmt.Sprintf("toString(%s%s) AS %s", alias, dbCol, col)
	default:
		unquotedDbCol := strings.Trim(dbCol, `"`)
		if col == unquotedDbCol {
			return fmt.Sprintf("%s%s", alias, dbCol)
		}
		if strings.HasPrefix(col, "$") {
			return fmt.Sprintf("%s%s AS \"%s\"", alias, dbCol, col)
		}
		return fmt.Sprintf("%s%s AS %s", alias, dbCol, col)
	}
}

func BuildSelectColumns(tableAlias string, requestedColumns []string, applyTransformations bool) []string {
	alias := filters.NormalizeAlias(tableAlias)

	var baseColumns []string
	if applyTransformations {
		baseColumns = []string{alias + "project_id"}
		for _, col := range model.BaseUserColumns {
			colStr := string(col)
			baseColumns = append(baseColumns, formatColumnForSelect(alias, colStr, model.ColumnMapping[colStr]))
		}
	} else {
		baseColumns = []string{alias + "project_id"}
		for _, col := range model.BaseUserColumns {
			colStr := string(col)
			if strings.HasPrefix(colStr, "$") {
				baseColumns = append(baseColumns, fmt.Sprintf("%s\"%s\"", alias, colStr))
			} else {
				baseColumns = append(baseColumns, alias+colStr)
			}
		}
	}

	if len(requestedColumns) == 0 {
		return baseColumns
	}

	skipColumns := model.GetBaseColumnStringSet()
	
	if applyTransformations {
		return filters.GenericBuildSelectColumns(tableAlias, baseColumns, requestedColumns, model.ColumnMapping, skipColumns, formatColumnForSelect)
	}
	
	result := make([]string, len(baseColumns))
	copy(result, baseColumns)
	
	for _, col := range requestedColumns {
		if skipColumns[col] {
			continue
		}
		if _, ok := model.ColumnMapping[col]; ok {
			if strings.HasPrefix(col, "$") {
				result = append(result, fmt.Sprintf("%s\"%s\"", alias, col))
			} else {
				result = append(result, alias+col)
			}
		}
	}

	return result
}

func BuildEventJoinQuery(tableAlias string, filtersList []filters.Filter, projID uint32, startDate int64, endDate int64) (string, []interface{}, bool) {
	eventFilters := filters.ExtractEventFilters(filtersList)
	if len(eventFilters) == 0 {
		return "", nil, false
	}

	conditions, condParams, _ := events.BuildEventSearchQuery("e", eventFilters)
	if len(conditions) == 0 {
		return "", nil, false
	}

	alias := filters.NormalizeAlias(tableAlias)
	params := make([]interface{}, 0)
	params = append(params, projID)
	
	dateConditions := make([]string, 0, 2)
	if startDate > 0 {
		dateConditions = append(dateConditions, "e.created_at >= ?")
		startTime := filters.ConvertMillisToTime(startDate)
		params = append(params, startTime)
	}
	if endDate > 0 {
		dateConditions = append(dateConditions, "e.created_at <= ?")
		endTime := filters.ConvertMillisToTime(endDate)
		params = append(params, endTime)
	}
	
	params = append(params, condParams...)

	var sb strings.Builder
	sb.WriteString(" INNER JOIN (")
	sb.WriteString("SELECT project_id, \"$user_id\" FROM product_analytics.events AS e WHERE e.project_id = ?")
	
	if len(dateConditions) > 0 {
		sb.WriteString(" AND ")
		sb.WriteString(strings.Join(dateConditions, " AND "))
	}
	
	sb.WriteString(" AND ")
	sb.WriteString(strings.Join(conditions, " AND "))
	sb.WriteString(" GROUP BY project_id, \"$user_id\"")
	sb.WriteString(") AS events_filter ON ")
	sb.WriteString(alias)
	sb.WriteString("project_id = events_filter.project_id AND ")
	sb.WriteString(alias)
	sb.WriteString(`"$user_id" = events_filter."$user_id"`)

	return sb.String(), params, true
}
