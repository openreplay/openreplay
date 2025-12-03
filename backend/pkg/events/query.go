package events

import (
	"fmt"
	"strings"

	analyticsModel "openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/events/model"
)

func buildMultiValueCondition(fullCol string, values []string, conditionTemplate string, transformValue func(string) interface{}) (string, []interface{}) {
	parts := make([]string, len(values))
	params := make([]interface{}, len(values))
	for i, v := range values {
		parts[i] = conditionTemplate
		if transformValue != nil {
			params[i] = transformValue(v)
		} else {
			params[i] = v
		}
	}
	if len(parts) == 1 {
		return parts[0], params
	}
	return "(" + strings.Join(parts, " OR ") + ")", params
}

func buildPlaceholderList(values []string) ([]string, []interface{}) {
	placeholders := make([]string, len(values))
	params := make([]interface{}, len(values))
	for i, v := range values {
		placeholders[i] = "?"
		params[i] = v
	}
	return placeholders, params
}

func buildOperatorCondition(fullCol string, operator string, values []string, nature string, dataType string) (string, []interface{}) {
	if dataType == "boolean" {
		switch operator {
		case "true":
			return fmt.Sprintf("%s = 1", fullCol), nil
		case "false":
			return fmt.Sprintf("%s = 0", fullCol), nil
		case "isUndefined":
			return fmt.Sprintf("isNull(%s)", fullCol), nil
		case "isAny", "onAny":
			return fmt.Sprintf("isNotNull(%s)", fullCol), nil
		default:
			return "", nil
		}
	}

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
		placeholders, params := buildPlaceholderList(values)
		return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case "isNot", "notEquals", "not", "off", "notOn":
		if len(values) == 1 {
			return fmt.Sprintf("%s != ?", fullCol), []interface{}{values[0]}
		}
		placeholders, params := buildPlaceholderList(values)
		return fmt.Sprintf("%s NOT IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case "contains":
		return buildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return "%" + v + "%" })

	case "notContains", "doesNotContain":
		cond, params := buildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return "%" + v + "%" })
		return "NOT (" + cond + ")", params

	case "startsWith":
		return buildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return v + "%" })

	case "endsWith":
		return buildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return "%" + v })

	case "regex":
		return buildMultiValueCondition(fullCol, values, fmt.Sprintf("match(%s, ?)", fullCol), nil)

	case "in":
		placeholders, params := buildPlaceholderList(values)
		return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case "notIn":
		placeholders, params := buildPlaceholderList(values)
		return fmt.Sprintf("%s NOT IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case ">=", "gte", "greaterThanOrEqual":
		if len(values) == 1 {
			return fmt.Sprintf("%s >= ?", fullCol), []interface{}{values[0]}
		}
		return buildMultiValueCondition(fullCol, values, fmt.Sprintf("%s >= ?", fullCol), nil)

	case ">", "gt", "greaterThan":
		if len(values) == 1 {
			return fmt.Sprintf("%s > ?", fullCol), []interface{}{values[0]}
		}
		return buildMultiValueCondition(fullCol, values, fmt.Sprintf("%s > ?", fullCol), nil)

	case "<=", "lte", "lessThanOrEqual":
		if len(values) == 1 {
			return fmt.Sprintf("%s <= ?", fullCol), []interface{}{values[0]}
		}
		return buildMultiValueCondition(fullCol, values, fmt.Sprintf("%s <= ?", fullCol), nil)

	case "<", "lt", "lessThan":
		if len(values) == 1 {
			return fmt.Sprintf("%s < ?", fullCol), []interface{}{values[0]}
		}
		return buildMultiValueCondition(fullCol, values, fmt.Sprintf("%s < ?", fullCol), nil)

	default:
		if nature == "arrayColumn" {
			if len(values) == 0 {
				return "", nil
			}
			placeholders, params := buildPlaceholderList(values)
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
		placeholders, params := buildPlaceholderList(values)
		return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params
	}
}

func buildFilterCondition(tableAlias string, filter analyticsModel.Filter) (string, []interface{}) {
	alias := tableAlias
	if alias != "" && !strings.HasSuffix(alias, ".") {
		alias += "."
	}

	if filter.IsEvent {
		var sb strings.Builder
		allParams := make([]interface{}, 0)

		sb.WriteString("(")
		sb.WriteString(alias)
		sb.WriteString(`"$event_name" = ?`)
		allParams = append(allParams, filter.Name)

		if filter.AutoCaptured {
			sb.WriteString(" AND ")
			sb.WriteString(alias)
			sb.WriteString(`"$auto_captured"`)
		}

		if len(filter.Filters) > 0 {
			var subConditions []string
			var subAllParams []interface{}
			for _, sub := range filter.Filters {
				subCond, subParams := buildFilterCondition(tableAlias, sub)
				if subCond != "" {
					subConditions = append(subConditions, subCond)
					subAllParams = append(subAllParams, subParams...)
				}
			}

			if len(subConditions) > 0 {
				joinOp := " AND "
				if filter.PropertyOrder == "or" {
					joinOp = " OR "
				}
				sb.WriteString(" AND (")
				sb.WriteString(strings.Join(subConditions, joinOp))
				sb.WriteString(")")
				allParams = append(allParams, subAllParams...)
			}
		}

		sb.WriteString(")")
		return sb.String(), allParams
	}

	column := filter.Name
	values := filter.Value
	operator := filter.Operator

	var dbCol string
	var fullCol string
	var nature string = "singleColumn"

	var dataType string = filter.DataType

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
		} else if isBoolean := filter.DataType == "boolean"; isBoolean {
			fullCol = fmt.Sprintf("JSONExtractBool(toString(%s%s), ?)", alias, propertiesCol)
		} else {
			fullCol = fmt.Sprintf("JSONExtractString(toString(%s%s), ?)", alias, propertiesCol)
		}

		cond, params := buildOperatorCondition(fullCol, operator, values, nature, dataType)
		if cond != "" {
			allParams := []interface{}{column}
			allParams = append(allParams, params...)
			return cond, allParams
		}
		return "", nil
	}

	return buildOperatorCondition(fullCol, operator, values, nature, dataType)
}

func BuildEventSearchQuery(tableAlias string, filters []analyticsModel.Filter) ([]string, []interface{}) {
	if tableAlias == "" {
		tableAlias = "e"
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
	case "created_at", "time", "properties", "$properties":
		return "created_at"
	case "eventName", "$event_name":
		return `"$event_name"`
	case "distinctId", "distinct_id":
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

func formatColumnForSelect(alias, col string, dbCol string) string {
	if col == "properties" {
		return fmt.Sprintf("toString(%s%s) AS properties", alias, dbCol)
	}
	if col == "$properties" {
		return fmt.Sprintf("toString(%s%s) AS \"$properties\"", alias, dbCol)
	}
	
	if strings.HasPrefix(col, "$") {
		return fmt.Sprintf("%s%s AS \"%s\"", alias, dbCol, col)
	}

	return fmt.Sprintf("%s%s AS %s", alias, dbCol, col)
}

func BuildSelectColumns(tableAlias string, requestedColumns []string) []string {
	alias := tableAlias
	if alias != "" && !strings.HasSuffix(alias, ".") {
		alias += "."
	}

	baseColumns := []string{
		alias + "project_id",
		fmt.Sprintf("toString(%sevent_id) AS event_id", alias),
		fmt.Sprintf("%s\"$event_name\" AS \"$event_name\"", alias),
		fmt.Sprintf("toUnixTimestamp64Milli(%screated_at) AS created_at", alias),
		alias + "distinct_id",
		fmt.Sprintf("toString(%ssession_id) AS session_id", alias),
	}

	if len(requestedColumns) == 0 {
		return baseColumns
	}

	for _, col := range requestedColumns {
		if col == "session_id" || col == "event_id" {
			continue
		}
		if dbCol, ok := model.ColumnMapping[col]; ok {
			baseColumns = append(baseColumns, formatColumnForSelect(alias, col, dbCol))
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
