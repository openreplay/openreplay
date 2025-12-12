package events

import (
	"fmt"
	"strings"

	"openreplay/backend/pkg/analytics/events/model"
	"openreplay/backend/pkg/analytics/filters"
)

func BuildEventSearchQuery(tableAlias string, filtersSlice []filters.Filter) ([]string, []interface{}, bool) {
	if tableAlias == "" {
		tableAlias = "e"
	}

	conditions := make([]string, 0)
	params := make([]interface{}, 0)
	needsUserJoin := filters.HasUserOnlyFilters(filtersSlice)

	userAlias := ""
	if needsUserJoin {
		userAlias = "u"
	}

	mappings := filters.FilterMappings{
		ColumnMapping:       model.ColumnMapping,
		FilterColumnMapping: model.FilterColumnMapping,
	}

	for _, filter := range filtersSlice {
		cond, condParams := filters.BuildFilterCondition(tableAlias, filter, userAlias, mappings)
		if cond != "" {
			conditions = append(conditions, cond)
			params = append(params, condParams...)
		}
	}

	return conditions, params, needsUserJoin
}

func ValidateSortColumn(column string) string {
	switch filters.EventColumn(column) {
	case filters.EventColumnCreatedAt, filters.EventColumnTime,
		filters.EventColumnProperties, filters.EventColumnAutoProperties:
		return string(filters.EventColumnCreatedAt)
	case filters.EventColumnEventName:
		return `"` + string(filters.EventColumnEventName) + `"`
	case filters.EventColumnDistinctID:
		return string(filters.EventColumnDistinctID)
	default:
		return filters.ValidateSortColumnGeneric(column, model.ColumnMapping, string(filters.EventColumnCreatedAt))
	}
}

func formatColumnForSelect(alias, col string, dbCol string) string {
	switch filters.EventColumn(col) {
	case filters.EventColumnProperties:
		return fmt.Sprintf("toString(%s%s) AS %s", alias, dbCol, string(filters.EventColumnProperties))
	case filters.EventColumnAutoProperties:
		return fmt.Sprintf("toString(%s%s) AS \"%s\"", alias, dbCol, string(filters.EventColumnAutoProperties))
	default:
		if strings.HasPrefix(col, "$") {
			return fmt.Sprintf("%s%s AS \"%s\"", alias, dbCol, col)
		}
		return fmt.Sprintf("%s%s AS %s", alias, dbCol, col)
	}
}

func BuildSelectColumns(tableAlias string, requestedColumns []filters.EventColumn) []string {
	alias := filters.NormalizeAlias(tableAlias)

	baseColumns := []string{
		alias + "project_id",
		fmt.Sprintf("toString(%s%s) AS %s", alias, string(filters.EventColumnEventID), string(filters.EventColumnEventID)),
		fmt.Sprintf("%s\"%s\" AS \"%s\"", alias, string(filters.EventColumnEventName), string(filters.EventColumnEventName)),
		fmt.Sprintf("%s%s AS %s", alias, string(filters.EventColumnCreatedAt), string(filters.EventColumnCreatedAt)),
		alias + string(filters.EventColumnDistinctID),
		fmt.Sprintf("toString(%s%s) AS %s", alias, string(filters.EventColumnSessionID), string(filters.EventColumnSessionID)),
	}

	skipColumns := map[string]bool{
		"project_id":                           true,
		string(filters.EventColumnEventID):     true,
		string(filters.EventColumnEventName):   true,
		string(filters.EventColumnCreatedAt):   true,
		string(filters.EventColumnDistinctID):  true,
		string(filters.EventColumnSessionID):   true,
	}

	return filters.GenericBuildSelectColumns(tableAlias, baseColumns, requestedColumns, model.ColumnMapping, skipColumns, formatColumnForSelect)
}