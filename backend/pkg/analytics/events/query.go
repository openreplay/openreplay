package events

import (
	"fmt"
	"strings"

	analyticsModel "openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/analytics/events/model"
	"openreplay/backend/pkg/analytics/filters"
)

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

		cond, params := filters.BuildOperatorCondition(fullCol, operator, values, filters.EventsConfig, nature, dataType)
		if cond != "" {
			allParams := []interface{}{column}
			allParams = append(allParams, params...)
			return cond, allParams
		}
		return "", nil
	}

	return filters.BuildOperatorCondition(fullCol, operator, values, filters.EventsConfig, nature, dataType)
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
