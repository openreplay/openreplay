package events

import (
	"fmt"
	"strings"

	"openreplay/backend/pkg/analytics/events/model"
	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/analytics/lexicon"
)

func BuildEventSearchQuery(tableAlias string, filtersSlice []filters.Filter, hiddenProps []lexicon.HiddenProperty) ([]string, []interface{}, bool) {
	if tableAlias == "" {
		tableAlias = "e"
	}

	eventFilters := make([]filters.Filter, 0)
	nonEventConditions := make([]string, 0)
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

	hiddenPropsMap := make(map[string]bool)
	for _, hp := range hiddenProps {
		key := fmt.Sprintf("%s:%t:%t", hp.PropertyName, hp.AutoCaptured, hp.IsEventProp)
		hiddenPropsMap[key] = true
	}

	for _, filter := range filtersSlice {
		if filter.IsEvent {
			eventFilters = append(eventFilters, filter)
		} else {
			if isHiddenPropertyFilter(filter, mappings, hiddenPropsMap) {
				continue
			}
			cond, condParams := filters.BuildFilterCondition(tableAlias, filter, userAlias, mappings)
			if cond != "" {
				nonEventConditions = append(nonEventConditions, cond)
				params = append(params, condParams...)
			}
		}
	}

	conditions := make([]string, 0)

	if len(eventFilters) > 0 {
		eventCond, eventParams := buildOptimizedEventCondition(tableAlias, eventFilters, userAlias, mappings, hiddenPropsMap)
		if eventCond != "" {
			conditions = append(conditions, eventCond)
			params = append(params, eventParams...)
		}
	}

	conditions = append(conditions, nonEventConditions...)

	return conditions, params, needsUserJoin
}

func isPropertyFilter(filter filters.Filter, mappings filters.FilterMappings) bool {
	if _, ok := mappings.ColumnMapping[filter.Name]; ok {
		return false
	}
	if _, ok := mappings.FilterColumnMapping[filter.Name]; ok {
		return false
	}
	return true
}

func isHiddenPropertyFilter(filter filters.Filter, mappings filters.FilterMappings, hiddenPropsMap map[string]bool) bool {
	if !isPropertyFilter(filter, mappings) {
		return false
	}
	key := fmt.Sprintf("%s:%t:%t", filter.Name, false, true)
	if hiddenPropsMap[key] {
		return true
	}
	keyAuto := fmt.Sprintf("%s:%t:%t", filter.Name, true, true)
	return hiddenPropsMap[keyAuto]
}

func buildOptimizedEventCondition(tableAlias string, eventFilters []filters.Filter, userAlias string, mappings filters.FilterMappings, hiddenPropsMap map[string]bool) (string, []interface{}) {
	if len(eventFilters) == 0 {
		return "", nil
	}

	alias := filters.NormalizeAlias(tableAlias)

	if len(eventFilters) == 1 {
		return buildEventFilterCondition(tableAlias, eventFilters[0], userAlias, mappings, hiddenPropsMap)
	}

	autoCapturedEvents := make([]filters.Filter, 0)
	nonAutoCapturedEvents := make([]filters.Filter, 0)

	for _, ef := range eventFilters {
		if ef.AutoCaptured {
			autoCapturedEvents = append(autoCapturedEvents, ef)
		} else {
			nonAutoCapturedEvents = append(nonAutoCapturedEvents, ef)
		}
	}

	groupConditions := make([]string, 0, 2)
	allParams := make([]interface{}, 0)

	// Build condition for autoCaptured events
	if len(autoCapturedEvents) > 0 {
		cond, params := buildEventGroupCondition(alias, autoCapturedEvents, true, userAlias, mappings, hiddenPropsMap)
		if cond != "" {
			groupConditions = append(groupConditions, cond)
			allParams = append(allParams, params...)
		}
	}

	if len(nonAutoCapturedEvents) > 0 {
		cond, params := buildEventGroupCondition(alias, nonAutoCapturedEvents, false, userAlias, mappings, hiddenPropsMap)
		if cond != "" {
			groupConditions = append(groupConditions, cond)
			allParams = append(allParams, params...)
		}
	}

	if len(groupConditions) == 0 {
		return "", nil
	}

	if len(groupConditions) == 1 {
		return groupConditions[0], allParams
	}

	return "(" + strings.Join(groupConditions, " OR ") + ")", allParams
}

func buildEventFilterCondition(tableAlias string, eventFilter filters.Filter, userAlias string, mappings filters.FilterMappings, hiddenPropsMap map[string]bool) (string, []interface{}) {
	alias := filters.NormalizeAlias(tableAlias)
	allParams := make([]interface{}, 0)

	var sb strings.Builder
	sb.WriteString("(")
	sb.WriteString(alias)
	sb.WriteString(`"$event_name" = ?`)
	allParams = append(allParams, eventFilter.Name)

	if eventFilter.AutoCaptured {
		sb.WriteString(" AND ")
		sb.WriteString(alias)
		sb.WriteString(`"$auto_captured"`)
	}

	if len(eventFilter.Filters) > 0 {
		subConditions := make([]string, 0)
		for _, subFilter := range eventFilter.Filters {
			if isHiddenPropertyFilter(subFilter, mappings, hiddenPropsMap) {
				continue
			}
			subCond, subParams := filters.BuildFilterCondition(tableAlias, subFilter, userAlias, mappings)
			if subCond != "" {
				subConditions = append(subConditions, subCond)
				allParams = append(allParams, subParams...)
			}
		}

		if len(subConditions) > 0 {
			sb.WriteString(" AND (")
			sb.WriteString(strings.Join(subConditions, " OR "))
			sb.WriteString(")")
		}
	}

	sb.WriteString(")")
	return sb.String(), allParams
}

func buildEventGroupCondition(alias string, eventFilters []filters.Filter, isAutoCaptured bool, userAlias string, mappings filters.FilterMappings, hiddenPropsMap map[string]bool) (string, []interface{}) {
	if len(eventFilters) == 0 {
		return "", nil
	}

	if len(eventFilters) == 1 {
		return buildEventFilterCondition(strings.TrimSuffix(alias, "."), eventFilters[0], userAlias, mappings, hiddenPropsMap)
	}

	// Use IN for event names (multiple events in same autoCaptured group)
	eventNames := make([]string, len(eventFilters))
	for i, ef := range eventFilters {
		eventNames[i] = ef.Name
	}

	var parts []string
	params := make([]interface{}, 0)

	// Build event name IN clause
	placeholders := make([]string, len(eventNames))
	for i := range eventNames {
		placeholders[i] = "?"
		params = append(params, eventNames[i])
	}
	parts = append(parts, alias+`"$event_name" IN (`+strings.Join(placeholders, ", ")+`)`)

	if isAutoCaptured {
		parts = append(parts, alias+`"$auto_captured"`)
	}

	// Collect all sub-filters from all events and OR them together
	hasSubFilters := false
	for _, ef := range eventFilters {
		if len(ef.Filters) > 0 {
			hasSubFilters = true
			break
		}
	}

	if hasSubFilters {
		allSubConds := make([]string, 0)
		for _, eventFilter := range eventFilters {
			for _, subFilter := range eventFilter.Filters {
				if isHiddenPropertyFilter(subFilter, mappings, hiddenPropsMap) {
					continue
				}
				cond, condParams := filters.BuildFilterCondition(strings.TrimSuffix(alias, "."), subFilter, userAlias, mappings)
				if cond != "" {
					allSubConds = append(allSubConds, cond)
					params = append(params, condParams...)
				}
			}
		}

		if len(allSubConds) > 0 {
			parts = append(parts, "("+strings.Join(allSubConds, " OR ")+")")
		}
	}

	return "(" + strings.Join(parts, " AND ") + ")", params
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
		"project_id":                          true,
		string(filters.EventColumnEventID):    true,
		string(filters.EventColumnEventName):  true,
		string(filters.EventColumnCreatedAt):  true,
		string(filters.EventColumnDistinctID): true,
		string(filters.EventColumnSessionID):  true,
	}

	return filters.GenericBuildSelectColumns(tableAlias, baseColumns, requestedColumns, model.ColumnMapping, skipColumns, formatColumnForSelect)
}
