package users

import (
	"fmt"
	"strings"

	"openreplay/backend/pkg/filters"
	"openreplay/backend/pkg/users/model"
)

func buildFilterCondition(tableAlias string, filter model.UserFilter) (string, []interface{}) {
	alias := tableAlias
	if alias != "" && !strings.HasSuffix(alias, ".") {
		alias += "."
	}

	column := filter.Name
	values := filter.Value
	operator := filter.Operator

	var dbCol string
	var fullCol string

	if mappedCol, exists := model.ColumnMapping[column]; exists {
		dbCol = mappedCol
		fullCol = alias + dbCol
	} else {
		fullCol = alias + column
	}

	return filters.BuildOperatorCondition(fullCol, operator, values, filters.DefaultConfig, "", "")
}

func BuildUserSearchQuery(tableAlias string, filters []model.UserFilter) ([]string, []interface{}) {
	if tableAlias == "" {
		tableAlias = "u"
	}

	conditions := make([]string, 0)
	params := make([]interface{}, 0)

	for _, filter := range filters {
		cond, condParams := buildFilterCondition(tableAlias, filter)
		if cond != "" {
			conditions = append(conditions, cond)
			params = append(params, condParams...)
		}
	}

	return conditions, params
}

func ValidateSortColumn(column string) string {
	switch column {
	case "$created_at", "created_at", "$last_seen", "last_seen", "$first_event_at", "first_event_at":
		if mappedCol, ok := model.ColumnMapping[column]; ok {
			return mappedCol
		}
		return "_timestamp"
	default:
		if dbCol, ok := model.ColumnMapping[column]; ok {
			return dbCol
		}
		return "_timestamp"
	}
}


func formatColumnForSelect(alias, col string, dbCol string) string {
	switch col {
	case "$created_at":
		return fmt.Sprintf("toInt64(toUnixTimestamp(%s%s) * 1000) AS created_at", alias, dbCol)
	case "$first_event_at":
		return fmt.Sprintf("toInt64(toUnixTimestamp(%s%s) * 1000) AS first_event_at", alias, dbCol)
	case "$last_seen":
		return fmt.Sprintf("toInt64(toUnixTimestamp(%s%s) * 1000) AS last_seen", alias, dbCol)
	case "properties":
		return fmt.Sprintf("toString(%s%s) AS properties", alias, dbCol)
	default:
		if strings.HasPrefix(col, "$") {
			return fmt.Sprintf("%s%s AS \"%s\"", alias, dbCol, col)
		}
		return fmt.Sprintf("%s%s AS %s", alias, dbCol, col)
	}
}

func BuildSelectColumns(tableAlias string, requestedColumns []string) []string {
	alias := tableAlias
	if alias != "" && !strings.HasSuffix(alias, ".") {
		alias += "."
	}

	baseColumns := []string{
		alias + "project_id",
		fmt.Sprintf("%s\"$user_id\" AS \"$user_id\"", alias),
		fmt.Sprintf("%s\"$email\" AS \"$email\"", alias),
		fmt.Sprintf("%s\"$name\" AS \"$name\"", alias),
		fmt.Sprintf("%s\"$first_name\" AS \"$first_name\"", alias),
		fmt.Sprintf("%s\"$last_name\" AS \"$last_name\"", alias),
		fmt.Sprintf("toInt64(toUnixTimestamp(%s\"$created_at\") * 1000) AS created_at", alias),
		fmt.Sprintf("toInt64(toUnixTimestamp(%s\"$last_seen\") * 1000) AS last_seen", alias),
	}

	if len(requestedColumns) == 0 {
		return baseColumns
	}

	for _, col := range requestedColumns {
		if col == "$user_id" || col == "$email" || col == "$name" || col == "$first_name" || col == "$last_name" || col == "$created_at" || col == "$last_seen" || col == "project_id" {
			continue
		}
		if dbCol, ok := model.ColumnMapping[col]; ok {
			baseColumns = append(baseColumns, formatColumnForSelect(alias, col, dbCol))
		}
	}

	return baseColumns
}
