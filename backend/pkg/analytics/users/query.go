package users

import (
	"fmt"
	"strings"

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
		if strings.HasPrefix(col, "$") {
			return fmt.Sprintf("%s%s AS \"%s\"", alias, dbCol, col)
		}
		return fmt.Sprintf("%s%s AS %s", alias, dbCol, col)
	}
}

func BuildSelectColumns(tableAlias string, requestedColumns []string) []string {
	alias := filters.NormalizeAlias(tableAlias)

	baseColumns := []string{alias + "project_id"}
	for _, col := range model.BaseUserColumns {
		colStr := string(col)
		baseColumns = append(baseColumns, formatColumnForSelect(alias, colStr, model.ColumnMapping[colStr]))
	}

	if len(requestedColumns) == 0 {
		return baseColumns
	}

	result := make([]string, len(baseColumns))
	copy(result, baseColumns)
	
	baseColumnSet := model.GetBaseColumnStringSet()
	
	for _, col := range requestedColumns {
		if baseColumnSet[col] {
			continue
		}
		if dbCol, ok := model.ColumnMapping[col]; ok {
			result = append(result, formatColumnForSelect(alias, col, dbCol))
		}
	}

	return result
}
