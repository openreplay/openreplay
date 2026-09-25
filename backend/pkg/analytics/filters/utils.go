package filters

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

func ConvertTimeToMillis(t time.Time) int64 {
	return t.UnixMilli()
}

func ConvertMillisToTime(millis int64) time.Time {
	return time.UnixMilli(millis)
}

func BuildColumnMapping[T ~string](columns []T) map[string]string {
	mapping := make(map[string]string, len(columns))
	for _, col := range columns {
		colStr := string(col)
		if strings.HasPrefix(colStr, "$") {
			mapping[colStr] = `"` + colStr + `"`
		} else {
			mapping[colStr] = colStr
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

func BuildJSONExtractColumn(alias, propertiesCol, dataType, property string, qp *Params) string {
	prop := qp.Add(property)
	dtType := DataTypeType(dataType)
	switch dtType {
	case DataTypeNumber, DataTypeInteger:
		return fmt.Sprintf("toFloat64OrNull(toString(getSubcolumn(%s%s, %s)))", alias, propertiesCol, prop)
	case DataTypeBoolean:
		return fmt.Sprintf("toBool(getSubcolumn(%s%s, %s))", alias, propertiesCol, prop)
	case DataTypeTimestamp:
		return fmt.Sprintf("toDateTime(toInt64OrNull(toString(getSubcolumn(%s%s, %s))))", alias, propertiesCol, prop)
	default:
		return fmt.Sprintf("getSubcolumn(%s%s, %s)", alias, propertiesCol, prop)
	}
}

func IsDynamicColumn(propertiesCol string) bool {
	return strings.Contains(propertiesCol, `"$properties"`) ||
		strings.Contains(propertiesCol, string(EventColumnAutoProperties)) ||
		strings.Contains(propertiesCol, string(EventColumnProperties))
}

func RequiresToString(operator FilterOperatorType) bool {
	return OperatorsRequiringToString[operator]
}

func WrapWithToStringIfNeeded(columnExpr, propertiesCol, operator string, valueCount int) string {
	if !IsDynamicColumn(propertiesCol) {
		return columnExpr
	}

	opType := FilterOperatorType(operator)

	// Always wrap for string pattern operators (ILIKE, regex)
	if opType == FilterOperatorContains || opType == FilterOperatorNotContains ||
		opType == FilterOperatorDoesNotContain || opType == FilterOperatorStartsWith ||
		opType == FilterOperatorEndsWith || opType == FilterOperatorRegex {
		return fmt.Sprintf("toString(%s)", columnExpr)
	}

	// Always wrap for IN/NOT IN operators with Dynamic columns
	if opType == FilterOperatorIn || opType == FilterOperatorNotIn {
		return fmt.Sprintf("toString(%s)", columnExpr)
	}

	// For equality/set operators, only wrap when multiple values
	if valueCount > 1 && RequiresToString(opType) {
		return fmt.Sprintf("toString(%s)", columnExpr)
	}

	return columnExpr
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

var UserColumnMapping = map[UserColumn]string{
	UserColumnEmail:              `"` + string(UserColumnEmail) + `"`,
	UserColumnName:               `"` + string(UserColumnName) + `"`,
	UserColumnFirstName:          `"` + string(UserColumnFirstName) + `"`,
	UserColumnLastName:           `"` + string(UserColumnLastName) + `"`,
	UserColumnPhone:              `"` + string(UserColumnPhone) + `"`,
	UserColumnAvatar:             `"` + string(UserColumnAvatar) + `"`,
	UserColumnCreatedAt:          `"` + string(UserColumnCreatedAt) + `"`,
	UserColumnFirstEventAt:       `"` + string(UserColumnFirstEventAt) + `"`,
	UserColumnLastSeen:           `"` + string(UserColumnLastSeen) + `"`,
	UserColumnUserID:             `"` + string(UserColumnUserID) + `"`,
	UserColumnCountry:            `"` + string(UserColumnCountry) + `"`,
	UserColumnState:              `"` + string(UserColumnState) + `"`,
	UserColumnCity:               `"` + string(UserColumnCity) + `"`,
	UserColumnTimezone:           `"` + string(UserColumnTimezone) + `"`,
	UserColumnSDKEdition:         `"` + string(UserColumnSDKEdition) + `"`,
	UserColumnSDKVersion:         `"` + string(UserColumnSDKVersion) + `"`,
	UserColumnCurrentURL:         `"` + string(UserColumnCurrentURL) + `"`,
	UserColumnInitialReferrer:    `"` + string(UserColumnInitialReferrer) + `"`,
	UserColumnReferringDomain:    `"` + string(UserColumnReferringDomain) + `"`,
	UserColumnInitialUtmSource:   string(UserColumnInitialUtmSource),
	UserColumnInitialUtmMedium:   string(UserColumnInitialUtmMedium),
	UserColumnInitialUtmCampaign: string(UserColumnInitialUtmCampaign),
	UserColumnProperties:         string(UserColumnProperties),
	UserColumnGroupID1:           string(UserColumnGroupID1),
	UserColumnGroupID2:           string(UserColumnGroupID2),
	UserColumnGroupID3:           string(UserColumnGroupID3),
	UserColumnGroupID4:           string(UserColumnGroupID4),
	UserColumnGroupID5:           string(UserColumnGroupID5),
	UserColumnGroupID6:           string(UserColumnGroupID6),
	UserColumnOrAPIEndpoint:      `"` + string(UserColumnOrAPIEndpoint) + `"`,
}

var UserOnlyColumns = map[UserColumn]bool{
	UserColumnEmail:              true,
	UserColumnName:               true,
	UserColumnFirstName:          true,
	UserColumnLastName:           true,
	UserColumnPhone:              true,
	UserColumnAvatar:             true,
	UserColumnCreatedAt:          true,
	UserColumnFirstEventAt:       true,
	UserColumnLastSeen:           true,
	UserColumnInitialReferrer:    true,
	UserColumnReferringDomain:    true,
	UserColumnInitialUtmSource:   true,
	UserColumnInitialUtmMedium:   true,
	UserColumnInitialUtmCampaign: true,
	UserColumnOrAPIEndpoint:      true,
}

func IsUserOnlyColumn(column string) bool {
	return UserOnlyColumns[UserColumn(column)]
}

func GetUserColumnMapping(column string) (string, bool) {
	col, ok := UserColumnMapping[UserColumn(column)]
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

func GenericBuildSelectColumns[T ~string](tableAlias string, baseColumns []string, requestedColumns []T, columnMapping map[string]string, skipColumns map[string]bool, formatter ColumnFormatter) []string {
	if len(requestedColumns) == 0 {
		return baseColumns
	}

	alias := NormalizeAlias(tableAlias)
	result := make([]string, len(baseColumns))
	copy(result, baseColumns)

	for _, col := range requestedColumns {
		colStr := string(col)
		if skipColumns[colStr] {
			continue
		}
		if dbCol, ok := columnMapping[colStr]; ok {
			result = append(result, FormatColumnForSelect(alias, colStr, dbCol, formatter))
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

func BuildFilterConditionGeneric(alias string, filter Filter, columnMapping map[string]string, propertiesCol string, qp *Params) string {
	alias = NormalizeAlias(alias)

	column := filter.Name
	values := filter.Value
	operator := filter.Operator
	dataType := string(filter.DataType)
	nature := "singleColumn"

	var fullCol string

	if mappedCol, ok := columnMapping[column]; ok {
		fullCol = alias + mappedCol
		return BuildOperatorCondition(fullCol, string(operator), values, nature, dataType, qp)
	}

	fullCol = BuildJSONExtractColumn(alias, propertiesCol, dataType, column, qp)

	dtType := DataTypeType(dataType)
	if dtType == "" || dtType == DataTypeString {
		fullCol = WrapWithToStringIfNeeded(fullCol, propertiesCol, string(operator), len(values))
	} else if dtType == DataTypeTimestamp {
		adjustedValues := make([]string, len(values))
		for i, v := range values {
			var millis int64
			fmt.Sscanf(v, "%d", &millis)
			adjustedValues[i] = fmt.Sprintf("%d", millis/1000)
		}
		values = adjustedValues
	}

	return BuildOperatorCondition(fullCol, string(operator), values, nature, dataType, qp)
}

type FilterConditionBuilder func(alias string, filter Filter) string

func BuildQueryConditions(tableAlias string, filters []Filter, skipEventFilters bool, conditionBuilder FilterConditionBuilder) []string {
	alias := NormalizeAlias(tableAlias)
	conditions := make([]string, 0)

	for _, filter := range filters {
		if skipEventFilters && filter.IsEvent {
			continue
		}

		if cond := conditionBuilder(alias, filter); cond != "" {
			conditions = append(conditions, cond)
		}
	}

	return conditions
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

func BuildSimpleFilterQuery(tableAlias string, filters []Filter, columnMapping map[string]string, propertiesCol string, qp *Params) []string {
	conditionBuilder := func(alias string, filter Filter) string {
		return BuildFilterConditionGeneric(alias, filter, columnMapping, propertiesCol, qp)
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

type FilterMappings struct {
	ColumnMapping       map[string]string
	FilterColumnMapping map[string][]string
}

func BuildFilterCondition(tableAlias string, filter Filter, userAlias string, mappings FilterMappings, qp *Params) string {
	alias := NormalizeAlias(tableAlias)

	if filter.IsEvent {
		var sb strings.Builder

		sb.WriteString("(")
		sb.WriteString(alias)
		sb.WriteString(`"$event_name" = `)
		sb.WriteString(qp.Add(filter.Name))

		if filter.AutoCaptured {
			sb.WriteString(" AND ")
			sb.WriteString(alias)
			sb.WriteString(`"$auto_captured"`)
		}

		if len(filter.Filters) > 0 {
			var subConditions []string
			for _, sub := range filter.Filters {
				if subCond := BuildFilterCondition(tableAlias, sub, userAlias, mappings, qp); subCond != "" {
					subConditions = append(subConditions, subCond)
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
			}
		}

		sb.WriteString(")")
		return sb.String()
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
			fullCol = BuildJSONExtractColumn(uAlias, string(UserColumnProperties), dataType, column, qp)

			dtType := DataTypeType(dataType)
			if dtType == "" || dtType == DataTypeString {
				fullCol = WrapWithToStringIfNeeded(fullCol, string(UserColumnProperties), string(operator), len(values))
			} else if dtType == DataTypeTimestamp {
				adjustedValues := make([]string, len(values))
				for i, v := range values {
					var millis int64
					fmt.Sscanf(v, "%d", &millis)
					adjustedValues[i] = fmt.Sprintf("%d", millis/1000)
				}
				values = adjustedValues
			}
		}
		return BuildOperatorCondition(fullCol, string(operator), values, nature, dataType, qp)
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
		fullCol = BuildJSONExtractColumn(alias, propertiesCol, dataType, column, qp)

		dtType := DataTypeType(dataType)
		if dtType == "" || dtType == DataTypeString {
			fullCol = WrapWithToStringIfNeeded(fullCol, propertiesCol, string(operator), len(values))
		} else if dtType == DataTypeTimestamp {
			adjustedValues := make([]string, len(values))
			for i, v := range values {
				var millis int64
				fmt.Sscanf(v, "%d", &millis)
				adjustedValues[i] = fmt.Sprintf("%d", millis/1000)
			}
			values = adjustedValues
		}
	}

	return BuildOperatorCondition(fullCol, string(operator), values, nature, dataType, qp)
}
