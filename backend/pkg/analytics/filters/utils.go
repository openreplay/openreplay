package filters

import (
	"encoding/json"
	"fmt"
	"strings"
)

func BuildColumnMapping(columns []string) map[string]string {
	mapping := make(map[string]string, len(columns))
	for _, col := range columns {
		if strings.HasPrefix(col, "$") {
			mapping[col] = `"` + col + `"`
		} else {
			mapping[col] = col
		}
	}
	return mapping
}

func UnmarshalJSONProperties(rawJSON *string) (*map[string]interface{}, error) {
	if rawJSON == nil || *rawJSON == "" || *rawJSON == "null" {
		return nil, nil
	}

	m := make(map[string]interface{})
	if err := json.Unmarshal([]byte(*rawJSON), &m); err != nil {
		return nil, fmt.Errorf("failed to unmarshal properties: %w", err)
	}
	return &m, nil
}

func MarshalJSONProperties(properties *map[string]interface{}) (string, error) {
	if properties == nil {
		return "{}", nil
	}
	data, err := json.Marshal(properties)
	if err != nil {
		return "", fmt.Errorf("failed to marshal properties: %w", err)
	}
	return string(data), nil
}

func BuildJSONExtractColumn(alias, propertiesCol, dataType string) string {
	switch dataType {
	case "float", "number", "int":
		return fmt.Sprintf("JSONExtractFloat(toString(%s%s), ?)", alias, propertiesCol)
	case "boolean":
		return fmt.Sprintf("JSONExtractBool(toString(%s%s), ?)", alias, propertiesCol)
	default:
		return fmt.Sprintf("JSONExtractString(toString(%s%s), ?)", alias, propertiesCol)
	}
}

func NormalizeAlias(alias string) string {
	if alias == "" {
		return ""
	}
	if !strings.HasSuffix(alias, ".") {
		return alias + "."
	}
	return alias
}

func BuildQuotedColumn(alias, column string) string {
	if strings.HasPrefix(column, "$") {
		return fmt.Sprintf("%s\"%s\"", alias, column)
	}
	return alias + column
}

var UserColumnMapping = map[string]string{
	"$email":               `"$email"`,
	"$name":                `"$name"`,
	"$first_name":          `"$first_name"`,
	"$last_name":           `"$last_name"`,
	"$phone":               `"$phone"`,
	"$avatar":              `"$avatar"`,
	"$created_at":          `"$created_at"`,
	"$first_event_at":      `"$first_event_at"`,
	"$last_seen":           `"$last_seen"`,
	"$user_id":             `"$user_id"`,
	"$country":             `"$country"`,
	"$state":               `"$state"`,
	"$city":                `"$city"`,
	"$timezone":            `"$timezone"`,
	"$sdk_edition":         `"$sdk_edition"`,
	"$sdk_version":         `"$sdk_version"`,
	"$current_url":         `"$current_url"`,
	"$initial_referrer":    `"$initial_referrer"`,
	"$referring_domain":    `"$referring_domain"`,
	"initial_utm_source":   "initial_utm_source",
	"initial_utm_medium":              "initial_utm_medium",
	"initial_utm_campaign":            "initial_utm_campaign",
	string(UserColumnProperties):      string(UserColumnProperties),
	string(UserColumnGroupID1):        string(UserColumnGroupID1),
	string(UserColumnGroupID2):        string(UserColumnGroupID2),
	string(UserColumnGroupID3):        string(UserColumnGroupID3),
	string(UserColumnGroupID4):        string(UserColumnGroupID4),
	string(UserColumnGroupID5):        string(UserColumnGroupID5),
	string(UserColumnGroupID6):        string(UserColumnGroupID6),
	string(UserColumnOrAPIEndpoint):   `"` + string(UserColumnOrAPIEndpoint) + `"`,
}

var UserOnlyColumns = map[string]bool{
	"$email":               true,
	"$name":                true,
	"$first_name":          true,
	"$last_name":           true,
	"$phone":               true,
	"$avatar":              true,
	"$created_at":          true,
	"$first_event_at":      true,
	"$last_seen":           true,
	"initial_utm_source":   true,
	"initial_utm_medium":   true,
	"initial_utm_campaign": true,
}

func IsUserOnlyColumn(column string) bool {
	return UserOnlyColumns[column]
}

func GetUserColumnMapping(column string) (string, bool) {
	col, ok := UserColumnMapping[column]
	return col, ok
}

type ColumnFormatter func(alias, col, dbCol string) string

func FormatColumnForSelect(alias, col, dbCol string, formatter ColumnFormatter) string {
	if formatter != nil {
		return formatter(alias, col, dbCol)
	}
	if strings.HasPrefix(col, "$") {
		return fmt.Sprintf("%s%s AS \"%s\"", alias, dbCol, col)
	}
	return fmt.Sprintf("%s%s AS %s", alias, dbCol, col)
}

func GenericBuildSelectColumns(tableAlias string, baseColumns []string, requestedColumns []string, columnMapping map[string]string, skipColumns map[string]bool, formatter ColumnFormatter) []string {
	if len(requestedColumns) == 0 {
		return baseColumns
	}

	alias := NormalizeAlias(tableAlias)
	result := make([]string, len(baseColumns))
	copy(result, baseColumns)

	for _, col := range requestedColumns {
		if skipColumns[col] {
			continue
		}
		if dbCol, ok := columnMapping[col]; ok {
			result = append(result, FormatColumnForSelect(alias, col, dbCol, formatter))
		}
	}

	return result
}

func ValidateSortColumnGeneric(column string, columnMapping map[string]string, defaultColumn string) string {
	if dbCol, ok := columnMapping[column]; ok {
		return dbCol
	}
	return defaultColumn
}

func BuildFilterConditionGeneric(alias string, filter Filter, columnMapping map[string]string, propertiesCol string) (string, []interface{}) {
	alias = NormalizeAlias(alias)

	column := filter.Name
	values := filter.Value
	operator := filter.Operator
	dataType := string(filter.DataType)
	nature := "singleColumn"

	var fullCol string

	if mappedCol, ok := columnMapping[column]; ok {
		fullCol = alias + mappedCol
		return BuildOperatorCondition(fullCol, string(operator), values, nature, dataType)
	}

	fullCol = BuildJSONExtractColumn(alias, propertiesCol, dataType)
	cond, params := BuildOperatorCondition(fullCol, string(operator), values, nature, dataType)
	if cond != "" {
		allParams := []interface{}{column}
		allParams = append(allParams, params...)
		return cond, allParams
	}

	return "", nil
}

type FilterConditionBuilder func(alias string, filter Filter) (string, []interface{})

func BuildQueryConditions(tableAlias string, filters []Filter, skipEventFilters bool, conditionBuilder FilterConditionBuilder) ([]string, []interface{}) {
	alias := NormalizeAlias(tableAlias)
	conditions := make([]string, 0)
	params := make([]interface{}, 0)

	for _, filter := range filters {
		if skipEventFilters && filter.IsEvent {
			continue
		}

		cond, condParams := conditionBuilder(alias, filter)
		if cond != "" {
			conditions = append(conditions, cond)
			params = append(params, condParams...)
		}
	}

	return conditions, params
}

func ConvertColumnsToStrings[T ~string](columns []T) []string {
	result := make([]string, len(columns))
	for i, col := range columns {
		result[i] = string(col)
	}
	return result
}

func CalculateOffset(page, limit int) int {
	return (page - 1) * limit
}

func BuildSimpleFilterQuery(tableAlias string, filters []Filter, columnMapping map[string]string, propertiesCol string) ([]string, []interface{}) {
	conditionBuilder := func(alias string, filter Filter) (string, []interface{}) {
		return BuildFilterConditionGeneric(alias, filter, columnMapping, propertiesCol)
	}
	return BuildQueryConditions(tableAlias, filters, true, conditionBuilder)
}

func HasUserOnlyFilters(filtersList []Filter) bool {
	for _, filter := range filtersList {
		if IsUserOnlyColumn(filter.Name) {
			return true
		}
		if filter.IsEvent && len(filter.Filters) > 0 {
			if HasUserOnlyFilters(filter.Filters) {
				return true
			}
		}
	}
	return false
}

func ExtractEventFilters(filtersList []Filter) []Filter {
	eventFilters := make([]Filter, 0)
	for _, filter := range filtersList {
		if filter.IsEvent {
			eventFilters = append(eventFilters, filter)
		}
	}
	return eventFilters
}

func ExtractNonEventFilters(filtersList []Filter) []Filter {
	nonEventFilters := make([]Filter, 0)
	for _, filter := range filtersList {
		if !filter.IsEvent {
			nonEventFilters = append(nonEventFilters, filter)
		}
	}
	return nonEventFilters
}

func BuildLatestRecordCTE(tableName, alias string, selectColumns []string, whereClause string) string {
	return fmt.Sprintf(`
		WITH %s AS (
			SELECT %s
			FROM product_analytics.%s
			WHERE %s AND _deleted_at = '1970-01-01 00:00:00'
			ORDER BY _timestamp DESC
			LIMIT 1 BY project_id, "$user_id"
		)`, alias, strings.Join(selectColumns, ", "), tableName, whereClause)
}

type FilterMappings struct {
	ColumnMapping       map[string]string
	FilterColumnMapping map[string][]string
}

func BuildFilterCondition(tableAlias string, filter Filter, userAlias string, mappings FilterMappings) (string, []interface{}) {
	alias := NormalizeAlias(tableAlias)

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
				subCond, subParams := BuildFilterCondition(tableAlias, sub, userAlias, mappings)
				if subCond != "" {
					subConditions = append(subConditions, subCond)
					subAllParams = append(subAllParams, subParams...)
				}
			}

			if len(subConditions) > 0 {
				joinOp := " AND "
				if filter.PropertyOrder == PropertyOrderOr {
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
	var fullCol string
	nature := "singleColumn"
	dataType := string(filter.DataType)

	if IsUserOnlyColumn(column) && userAlias != "" {
		uAlias := NormalizeAlias(userAlias)
		if col, exists := GetUserColumnMapping(column); exists {
			fullCol = uAlias + col
		} else {
			fullCol = BuildJSONExtractColumn(uAlias, string(UserColumnProperties), dataType)
			cond, params := BuildOperatorCondition(fullCol, string(operator), values, nature, dataType)
			if cond != "" {
				allParams := []interface{}{column}
				allParams = append(allParams, params...)
				return cond, allParams
			}
			return "", nil
		}
		return BuildOperatorCondition(fullCol, string(operator), values, nature, dataType)
	}

	if filterMapping, exists := mappings.FilterColumnMapping[column]; exists {
		fullCol = alias + filterMapping[0]
		if len(filterMapping) > 1 {
			nature = filterMapping[1]
		}
	} else if col, exists := mappings.ColumnMapping[column]; exists {
		fullCol = alias + col
	} else {
		propertiesCol := `"` + string(EventColumnAutoProperties) + `"`
		if !filter.AutoCaptured {
			propertiesCol = string(EventColumnProperties)
		}
		fullCol = BuildJSONExtractColumn(alias, propertiesCol, dataType)
		cond, params := BuildOperatorCondition(fullCol, string(operator), values, nature, dataType)
		if cond != "" {
			allParams := []interface{}{column}
			allParams = append(allParams, params...)
			return cond, allParams
		}
		return "", nil
	}

	return BuildOperatorCondition(fullCol, string(operator), values, nature, dataType)
}
