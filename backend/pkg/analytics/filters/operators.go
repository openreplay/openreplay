package filters

import (
	"fmt"
	"strings"
)

// likePatternEscaper escapes LIKE/ILIKE metacharacters so bound values match
// literally; the wildcard wrapping (%…%) is added by the operator cases.
var likePatternEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

// EscapeLikePattern escapes \, % and _ in s so it can be embedded in a
// LIKE/ILIKE pattern and match those characters literally.
func EscapeLikePattern(s string) string {
	return likePatternEscaper.Replace(s)
}

// BuildMultiValueCondition ORs one condition per value. conditionTemplate must
// contain exactly one %s, which receives the bound parameter placeholder.
func BuildMultiValueCondition(values []string, conditionTemplate string, transformValue func(string) interface{}, qp *Params) string {
	parts := make([]string, len(values))
	for i, v := range values {
		var val interface{} = v
		if transformValue != nil {
			val = transformValue(v)
		}
		parts[i] = fmt.Sprintf(conditionTemplate, qp.Add(val))
	}
	if len(parts) == 1 {
		return parts[0]
	}
	return "(" + strings.Join(parts, " OR ") + ")"
}

func convertMillisToSeconds(milliStr string) (int64, error) {
	var millis int64
	_, err := fmt.Sscanf(milliStr, "%d", &millis)
	if err != nil {
		return 0, err
	}
	return millis / 1000, nil
}

func convertTimestampValues(values []string) ([]interface{}, error) {
	converted := make([]interface{}, len(values))
	for i, v := range values {
		seconds, err := convertMillisToSeconds(v)
		if err != nil {
			return nil, err
		}
		converted[i] = seconds
	}
	return converted, nil
}

func buildTimestampInList(convertedValues []interface{}, qp *Params) string {
	placeholders := make([]string, len(convertedValues))
	for i, v := range convertedValues {
		placeholders[i] = "toDateTime(" + qp.Add(v) + ")"
	}
	return strings.Join(placeholders, ", ")
}

func buildTimestampCondition(fullCol string, op string, convertedValues []interface{}, qp *Params) string {
	if len(convertedValues) == 0 {
		return ""
	}
	parts := make([]string, len(convertedValues))
	for i, v := range convertedValues {
		parts[i] = fmt.Sprintf("%s %s toDateTime(%s)", fullCol, op, qp.Add(v))
	}
	if len(parts) == 1 {
		return parts[0]
	}
	return "(" + strings.Join(parts, " OR ") + ")"
}

func BuildOperatorCondition(fullCol string, operator string, values []string, nature string, dataType string, qp *Params) string {
	opType := FilterOperatorType(operator)
	dtType := DataTypeType(dataType)

	if dtType == DataTypeTimestamp {
		convertedValues, err := convertTimestampValues(values)
		if err != nil {
			return ""
		}

		switch opType {
		case FilterOperatorIsBlank, FilterOperatorIsUndefined:
			return fmt.Sprintf("isNull(%s)", fullCol)

		case FilterOperatorIsNotBlank, FilterOperatorIsAny, FilterOperatorOnAny:
			return fmt.Sprintf("isNotNull(%s)", fullCol)

		case FilterOperatorBetween:
			if len(convertedValues) != 2 {
				return ""
			}
			return fmt.Sprintf("%s >= toDateTime(%s) AND %s <= toDateTime(%s)",
				fullCol, qp.Add(convertedValues[0]), fullCol, qp.Add(convertedValues[1]))

		case FilterOperatorOnOrAfter, FilterOperatorGreaterEqual, FilterOperatorGte, FilterOperatorGreaterEqualAlias:
			return buildTimestampCondition(fullCol, ">=", convertedValues, qp)

		case FilterOperatorAfter, FilterOperatorGreaterThan, FilterOperatorGt, FilterOperatorGreaterThanAlias:
			return buildTimestampCondition(fullCol, ">", convertedValues, qp)

		case FilterOperatorOnOrBefore, FilterOperatorLessEqual, FilterOperatorLte, FilterOperatorLessEqualAlias:
			return buildTimestampCondition(fullCol, "<=", convertedValues, qp)

		case FilterOperatorBefore, FilterOperatorLessThan, FilterOperatorLt, FilterOperatorLessThanAlias:
			return buildTimestampCondition(fullCol, "<", convertedValues, qp)

		case FilterOperatorIs, FilterOperatorEquals, FilterOperatorEqual, FilterOperatorOn, FilterOperatorIn:
			if len(convertedValues) == 0 {
				return ""
			}
			if len(convertedValues) == 1 {
				return fmt.Sprintf("%s = toDateTime(%s)", fullCol, qp.Add(convertedValues[0]))
			}
			if len(convertedValues) == 2 {
				return fmt.Sprintf("%s >= toDateTime(%s) AND %s <= toDateTime(%s)",
					fullCol, qp.Add(convertedValues[0]), fullCol, qp.Add(convertedValues[1]))
			}
			return fmt.Sprintf("%s IN (%s)", fullCol, buildTimestampInList(convertedValues, qp))

		case FilterOperatorIsNot, FilterOperatorNotEquals, FilterOperatorNot, FilterOperatorNotEqual, FilterOperatorNotOn, FilterOperatorNotIn:
			if len(convertedValues) == 0 {
				return ""
			}
			if len(convertedValues) == 1 {
				return fmt.Sprintf("%s != toDateTime(%s)", fullCol, qp.Add(convertedValues[0]))
			}
			if len(convertedValues) == 2 {
				return fmt.Sprintf("NOT (%s >= toDateTime(%s) AND %s <= toDateTime(%s))",
					fullCol, qp.Add(convertedValues[0]), fullCol, qp.Add(convertedValues[1]))
			}
			return fmt.Sprintf("%s NOT IN (%s)", fullCol, buildTimestampInList(convertedValues, qp))

		default:
			return ""
		}
	}

	if dtType == DataTypeBoolean {
		switch opType {
		case FilterOperatorTrue:
			return fmt.Sprintf("%s = 1", fullCol)
		case FilterOperatorFalse:
			return fmt.Sprintf("%s = 0", fullCol)
		case FilterOperatorIsUndefined:
			return fmt.Sprintf("isNull(%s)", fullCol)
		case FilterOperatorIsAny, FilterOperatorOnAny:
			return fmt.Sprintf("isNotNull(%s)", fullCol)
		default:
			return ""
		}
	}

	if len(values) == 0 && opType != FilterOperatorIsAny && opType != FilterOperatorIsUndefined && opType != FilterOperatorOnAny {
		return ""
	}

	switch opType {
	case FilterOperatorIsAny, FilterOperatorOnAny:
		if nature == "arrayColumn" {
			return fmt.Sprintf("notEmpty(%s)", fullCol)
		}
		return fmt.Sprintf("isNotNull(%s)", fullCol)

	case FilterOperatorIsUndefined:
		return fmt.Sprintf("isNull(%s)", fullCol)

	case FilterOperatorIs, FilterOperatorEquals, FilterOperatorOn:
		if len(values) == 1 {
			return fmt.Sprintf("%s = %s", fullCol, qp.Add(values[0]))
		}
		return fmt.Sprintf("%s IN %s", fullCol, qp.Add(GroupSetOf(values)))

	case FilterOperatorIsNot, FilterOperatorNotEquals, FilterOperatorNot, FilterOperatorOff, FilterOperatorNotOn:
		if len(values) == 1 {
			return fmt.Sprintf("%s != %s", fullCol, qp.Add(values[0]))
		}
		return fmt.Sprintf("%s NOT IN %s", fullCol, qp.Add(GroupSetOf(values)))

	case FilterOperatorContains:
		return BuildMultiValueCondition(values, fullCol+" ILIKE %s",
			func(v string) interface{} { return "%" + EscapeLikePattern(v) + "%" }, qp)

	case FilterOperatorNotContains, FilterOperatorDoesNotContain:
		cond := BuildMultiValueCondition(values, fullCol+" ILIKE %s",
			func(v string) interface{} { return "%" + EscapeLikePattern(v) + "%" }, qp)
		return "NOT (" + cond + ")"

	case FilterOperatorStartsWith:
		return BuildMultiValueCondition(values, fullCol+" ILIKE %s",
			func(v string) interface{} { return EscapeLikePattern(v) + "%" }, qp)

	case FilterOperatorEndsWith:
		return BuildMultiValueCondition(values, fullCol+" ILIKE %s",
			func(v string) interface{} { return "%" + EscapeLikePattern(v) }, qp)

	case FilterOperatorRegex:
		return BuildMultiValueCondition(values, "match("+fullCol+", %s)", nil, qp)

	case FilterOperatorIn:
		return fmt.Sprintf("%s IN %s", fullCol, qp.Add(GroupSetOf(values)))

	case FilterOperatorNotIn:
		return fmt.Sprintf("%s NOT IN %s", fullCol, qp.Add(GroupSetOf(values)))

	case FilterOperatorGreaterEqual, FilterOperatorGte, FilterOperatorGreaterEqualAlias:
		return BuildMultiValueCondition(values, fullCol+" >= %s", nil, qp)

	case FilterOperatorGreaterThan, FilterOperatorGt, FilterOperatorGreaterThanAlias:
		return BuildMultiValueCondition(values, fullCol+" > %s", nil, qp)

	case FilterOperatorLessEqual, FilterOperatorLte, FilterOperatorLessEqualAlias:
		return BuildMultiValueCondition(values, fullCol+" <= %s", nil, qp)

	case FilterOperatorLessThan, FilterOperatorLt, FilterOperatorLessThanAlias:
		return BuildMultiValueCondition(values, fullCol+" < %s", nil, qp)

	case FilterOperatorEqual, FilterOperatorNotEqual:
		if len(values) == 0 {
			return ""
		}
		return fmt.Sprintf("%s %s %s", fullCol, operator, qp.Add(values[0]))

	default:
		if nature == "arrayColumn" {
			if len(values) == 0 {
				return ""
			}
			opFunc := "hasAny"
			if opType == FilterOperatorIsNot || opType == FilterOperatorNotEquals || opType == FilterOperatorNot || opType == FilterOperatorOff || opType == FilterOperatorNotOn {
				opFunc = "NOT hasAny"
			}
			// a []string parameter is rendered as a ClickHouse array literal
			return fmt.Sprintf("%s(%s, %s)", opFunc, fullCol, qp.Add(append([]string(nil), values...)))
		}

		if len(values) == 0 {
			return ""
		}
		if len(values) == 1 {
			return fmt.Sprintf("%s = %s", fullCol, qp.Add(values[0]))
		}
		return fmt.Sprintf("%s IN %s", fullCol, qp.Add(GroupSetOf(values)))
	}
}

func BuildWhereClause(baseConditions []string, filterConditions []string) string {
	allConditions := append(baseConditions, filterConditions...)
	if len(allConditions) == 0 {
		return "1=1"
	}
	return strings.Join(allConditions, " AND ")
}

func ValidateSortOrder(order string) SortOrderType {
	orderType := SortOrderType(strings.ToLower(order))
	switch orderType {
	case SortOrderAsc:
		return SortOrderAsc
	case SortOrderDesc:
		return SortOrderDesc
	default:
		return SortOrderDesc
	}
}
