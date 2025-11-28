package events

import (
	"fmt"
	"strings"

	analyticsModel "openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/events/model"
)

func buildOperatorCondition(fullCol string, operator string, values []string, isNumeric bool, nature string) (string, []interface{}) {
	if len(values) == 0 && operator != "isAny" && operator != "isUndefined" && operator != "onAny" {
		return "", nil
	}

	switch operator {
	case "isAny", "onAny":
		if nature == "arrayColumn" {
			return fmt.Sprintf("notEmpty(%s)", fullCol), nil
		}
		return fmt.Sprintf("isNotNull(%s)", fullCol), nil

	case "isUndefined":
		return fmt.Sprintf("isNull(%s)", fullCol), nil

	case "is", "equals", "on":
		if len(values) == 1 {
			return fmt.Sprintf("%s = ?", fullCol), []interface{}{values[0]}
		}
		placeholders := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			placeholders[i] = "?"
			params[i] = v
		}
		return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case "isNot", "notEquals", "not", "off", "notOn":
		if len(values) == 1 {
			return fmt.Sprintf("%s != ?", fullCol), []interface{}{values[0]}
		}
		placeholders := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			placeholders[i] = "?"
			params[i] = v
		}
		return fmt.Sprintf("%s NOT IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case "contains":
		parts := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			parts[i] = fmt.Sprintf("%s ILIKE ?", fullCol)
			params[i] = fmt.Sprintf("%%%v%%", v)
		}
		if len(parts) == 1 {
			return parts[0], params
		}
		return fmt.Sprintf("(%s)", strings.Join(parts, " OR ")), params

	case "notContains", "doesNotContain":
		parts := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			parts[i] = fmt.Sprintf("%s ILIKE ?", fullCol)
			params[i] = fmt.Sprintf("%%%v%%", v)
		}
		cond := ""
		if len(parts) == 1 {
			cond = parts[0]
		} else {
			cond = "(" + strings.Join(parts, " OR ") + ")"
		}
		return "NOT (" + cond + ")", params

	case "startsWith":
		parts := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			parts[i] = fmt.Sprintf("%s ILIKE ?", fullCol)
			params[i] = fmt.Sprintf("%v%%", v)
		}
		if len(parts) == 1 {
			return parts[0], params
		}
		return fmt.Sprintf("(%s)", strings.Join(parts, " OR ")), params

	case "endsWith":
		parts := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			parts[i] = fmt.Sprintf("%s ILIKE ?", fullCol)
			params[i] = fmt.Sprintf("%%%v", v)
		}
		if len(parts) == 1 {
			return parts[0], params
		}
		return fmt.Sprintf("(%s)", strings.Join(parts, " OR ")), params

	case "regex":
		parts := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			parts[i] = fmt.Sprintf("match(%s, ?)", fullCol)
			params[i] = v
		}
		if len(parts) == 1 {
			return parts[0], params
		}
		return fmt.Sprintf("(%s)", strings.Join(parts, " OR ")), params

	case "in":
		placeholders := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			placeholders[i] = "?"
			params[i] = v
		}
		return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case "notIn":
		placeholders := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			placeholders[i] = "?"
			params[i] = v
		}
		return fmt.Sprintf("%s NOT IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case ">=", "gte", "greaterThanOrEqual":
		if len(values) == 1 {
			return fmt.Sprintf("%s >= ?", fullCol), []interface{}{values[0]}
		}
		parts := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			parts[i] = fmt.Sprintf("%s >= ?", fullCol)
			params[i] = v
		}
		return fmt.Sprintf("(%s)", strings.Join(parts, " OR ")), params

	case ">", "gt", "greaterThan":
		if len(values) == 1 {
			return fmt.Sprintf("%s > ?", fullCol), []interface{}{values[0]}
		}
		parts := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			parts[i] = fmt.Sprintf("%s > ?", fullCol)
			params[i] = v
		}
		return fmt.Sprintf("(%s)", strings.Join(parts, " OR ")), params

	case "<=", "lte", "lessThanOrEqual":
		if len(values) == 1 {
			return fmt.Sprintf("%s <= ?", fullCol), []interface{}{values[0]}
		}
		parts := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			parts[i] = fmt.Sprintf("%s <= ?", fullCol)
			params[i] = v
		}
		return fmt.Sprintf("(%s)", strings.Join(parts, " OR ")), params

	case "<", "lt", "lessThan":
		if len(values) == 1 {
			return fmt.Sprintf("%s < ?", fullCol), []interface{}{values[0]}
		}
		parts := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			parts[i] = fmt.Sprintf("%s < ?", fullCol)
			params[i] = v
		}
		return fmt.Sprintf("(%s)", strings.Join(parts, " OR ")), params

	default:
		if nature == "arrayColumn" {
			if len(values) == 0 {
				return "", nil
			}
			placeholders := make([]string, len(values))
			params := make([]interface{}, len(values))
			for i, v := range values {
				placeholders[i] = "?"
				params[i] = v
			}
			
			opFunc := "hasAny"
			if operator == "isNot" || operator == "notEquals" || operator == "not" || operator == "off" || operator == "notOn" {
				opFunc = "NOT hasAny"
			}
			return fmt.Sprintf("%s(%s, [%s])", opFunc, fullCol, strings.Join(placeholders, ", ")), params
		}
		
		if len(values) == 0 {
			return "", nil
		}
		if len(values) == 1 {
			return fmt.Sprintf("%s = ?", fullCol), []interface{}{values[0]}
		}
		placeholders := make([]string, len(values))
		params := make([]interface{}, len(values))
		for i, v := range values {
			placeholders[i] = "?"
			params[i] = v
		}
		return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params
	}
}

func buildFilterCondition(tableAlias string, filter analyticsModel.Filter, isEventProperty bool) (string, []interface{}) {
	alias := tableAlias
	if alias != "" && !strings.HasSuffix(alias, ".") {
		alias += "."
	}

	if filter.IsEvent {
		parts := make([]string, 0)
		allParams := make([]interface{}, 0)
		
		parts = append(parts, fmt.Sprintf("%s\"$event_name\" = ?", alias))
		allParams = append(allParams, filter.Name)

		if filter.AutoCaptured {
			parts = append(parts, fmt.Sprintf("%s\"$auto_captured\"", alias))
		}

		for _, sub := range filter.Filters {
			subCond, subParams := buildFilterCondition(tableAlias, sub, true)
			if subCond != "" {
				parts = append(parts, "("+subCond+")")
				allParams = append(allParams, subParams...)
			}
		}
		
		if len(parts) == 0 {
			return "", nil
		}
		return "(" + strings.Join(parts, " AND ") + ")", allParams
	}

	column := filter.Name
	values := filter.Value
	operator := filter.Operator

	var dbCol string
	var fullCol string
	var nature string = "singleColumn"

	if filterMapping, exists := model.FilterColumnMapping[column]; exists {
		dbCol = filterMapping[0]
		fullCol = alias + dbCol
		if len(filterMapping) > 1 {
			nature = filterMapping[1]
		}
	} else if col, exists := model.ColumnMapping[column]; exists {
		dbCol = col
		fullCol = alias + dbCol
	} else {
		propertiesCol := `"$properties"`
		if !filter.AutoCaptured {
			propertiesCol = "properties"
		}
		
		isNumeric := filter.DataType == "float" || filter.DataType == "number" || filter.DataType == "int"
		if isNumeric {
			fullCol = fmt.Sprintf("JSONExtractFloat(toString(%s%s), ?)", alias, propertiesCol)
		} else {
			fullCol = fmt.Sprintf("JSONExtractString(toString(%s%s), ?)", alias, propertiesCol)
		}
		
		cond, params := buildOperatorCondition(fullCol, operator, values, isNumeric, nature)
		if cond != "" {
			allParams := []interface{}{column}
			allParams = append(allParams, params...)
			return cond, allParams
		}
		return "", nil
	}

	isNumeric := filter.DataType == "float" || filter.DataType == "number" || filter.DataType == "int"
	return buildOperatorCondition(fullCol, operator, values, isNumeric, nature)
}

func BuildEventSearchQuery(tableAlias string, filters []analyticsModel.Filter) ([]string, []interface{}) {
	if tableAlias == "" {
		tableAlias = "e"
	}

	conditions := make([]string, 0)
	params := make([]interface{}, 0)

	for _, filter := range filters {
		cond, condParams := buildFilterCondition(tableAlias, filter, false)
		if cond != "" {
			conditions = append(conditions, cond)
			params = append(params, condParams...)
		}
	}

	return conditions, params
}

func ValidateSortColumn(column string) string {
	switch column {
	case "created_at", "time":
		return "created_at"
	case "eventName":
		return `"$event_name"`
	case "distinctId":
		return "distinct_id"
	default:
		if dbCol, ok := model.ColumnMapping[column]; ok {
			return dbCol
		}
		return "created_at"
	}
}

func ValidateSortOrder(order string) string {
	orderUpper := strings.ToUpper(order)
	if orderUpper == "ASC" || orderUpper == "DESC" {
		return orderUpper
	}
	return "DESC"
}

func BuildSelectColumns(tableAlias string, requestedColumns []string) []string {
	alias := tableAlias
	if alias != "" && !strings.HasSuffix(alias, ".") {
		alias += "."
	}

	baseColumns := []string{
		alias + "project_id",
		fmt.Sprintf("toString(%sevent_id) AS event_id", alias),
		fmt.Sprintf("%s\"$event_name\" AS event_name", alias),
		fmt.Sprintf("toUnixTimestamp64Milli(%screated_at) AS created_at", alias),
		alias + "distinct_id",
		fmt.Sprintf("toString(%ssession_id) AS session_id", alias),
	}

	if len(requestedColumns) == 0 {
		return baseColumns
	}

	for _, col := range requestedColumns {
		if col == "session_id" {
			continue
		}
		if dbCol, ok := model.ColumnMapping[col]; ok {
			baseColumns = append(baseColumns, alias+dbCol)
		}
	}

	return baseColumns
}

func BuildWhereClause(baseConditions []string, filterConditions []string) string {
	allConditions := append(baseConditions, filterConditions...)
	if len(allConditions) == 0 {
		return "1=1"
	}
	return strings.Join(allConditions, " AND ")
}