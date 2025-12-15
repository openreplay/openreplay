package filters

import (
	"fmt"
	"strings"
)

func BuildMultiValueCondition(fullCol string, values []string, conditionTemplate string, transformValue func(string) interface{}) (string, []interface{}) {
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

func BuildPlaceholderList(values []string) ([]string, []interface{}) {
	placeholders := make([]string, len(values))
	params := make([]interface{}, len(values))
	for i, v := range values {
		placeholders[i] = "?"
		params[i] = v
	}
	return placeholders, params
}

func BuildOperatorCondition(fullCol string, operator string, values []string, nature string, dataType string) (string, []interface{}) {
	opType := FilterOperatorType(operator)
	dtType := DataTypeType(dataType)

	if dtType == DataTypeTimestamp {
		switch opType {
		case FilterOperatorGreaterEqual, FilterOperatorGte, FilterOperatorGreaterEqualAlias:
			if len(values) == 1 {
				return fmt.Sprintf("%s >= fromUnixTimestamp64Milli(CAST(? AS Int64))", fullCol), []interface{}{values[0]}
			}
			return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s >= fromUnixTimestamp64Milli(CAST(? AS Int64))", fullCol), nil)
		case FilterOperatorGreaterThan, FilterOperatorGt, FilterOperatorGreaterThanAlias:
			if len(values) == 1 {
				return fmt.Sprintf("%s > fromUnixTimestamp64Milli(CAST(? AS Int64))", fullCol), []interface{}{values[0]}
			}
			return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s > fromUnixTimestamp64Milli(CAST(? AS Int64))", fullCol), nil)
		case FilterOperatorLessEqual, FilterOperatorLte, FilterOperatorLessEqualAlias:
			if len(values) == 1 {
				return fmt.Sprintf("%s <= fromUnixTimestamp64Milli(CAST(? AS Int64))", fullCol), []interface{}{values[0]}
			}
			return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s <= fromUnixTimestamp64Milli(CAST(? AS Int64))", fullCol), nil)
		case FilterOperatorLessThan, FilterOperatorLt, FilterOperatorLessThanAlias:
			if len(values) == 1 {
				return fmt.Sprintf("%s < fromUnixTimestamp64Milli(CAST(? AS Int64))", fullCol), []interface{}{values[0]}
			}
			return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s < fromUnixTimestamp64Milli(CAST(? AS Int64))", fullCol), nil)
		case FilterOperatorIs, FilterOperatorEquals, FilterOperatorOn, FilterOperatorEqual:
			if len(values) == 1 {
				return fmt.Sprintf("%s = fromUnixTimestamp64Milli(CAST(? AS Int64))", fullCol), []interface{}{values[0]}
			}
			placeholders := make([]string, len(values))
			params := make([]interface{}, len(values))
			for i, v := range values {
				placeholders[i] = "fromUnixTimestamp64Milli(CAST(? AS Int64))"
				params[i] = v
			}
			return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params
		case FilterOperatorIsNot, FilterOperatorNotEquals, FilterOperatorNot, FilterOperatorNotEqual:
			if len(values) == 1 {
				return fmt.Sprintf("%s != fromUnixTimestamp64Milli(CAST(? AS Int64))", fullCol), []interface{}{values[0]}
			}
			placeholders := make([]string, len(values))
			params := make([]interface{}, len(values))
			for i, v := range values {
				placeholders[i] = "fromUnixTimestamp64Milli(CAST(? AS Int64))"
				params[i] = v
			}
			return fmt.Sprintf("%s NOT IN (%s)", fullCol, strings.Join(placeholders, ", ")), params
		case FilterOperatorIsUndefined:
			return fmt.Sprintf("isNull(%s)", fullCol), nil
		case FilterOperatorIsAny, FilterOperatorOnAny:
			return fmt.Sprintf("isNotNull(%s)", fullCol), nil
		default:
			return "", nil
		}
	}

	if dtType == DataTypeBoolean {
		switch opType {
		case FilterOperatorTrue:
			return fmt.Sprintf("%s = 1", fullCol), nil
		case FilterOperatorFalse:
			return fmt.Sprintf("%s = 0", fullCol), nil
		case FilterOperatorIsUndefined:
			return fmt.Sprintf("isNull(%s)", fullCol), nil
		case FilterOperatorIsAny, FilterOperatorOnAny:
			return fmt.Sprintf("isNotNull(%s)", fullCol), nil
		default:
			return "", nil
		}
	}

	if len(values) == 0 && opType != FilterOperatorIsAny && opType != FilterOperatorIsUndefined && opType != FilterOperatorOnAny {
		return "", nil
	}

	switch opType {
	case FilterOperatorIsAny, FilterOperatorOnAny:
		if nature == "arrayColumn" {
			return fmt.Sprintf("notEmpty(%s)", fullCol), nil
		}
		return fmt.Sprintf("isNotNull(%s)", fullCol), nil

	case FilterOperatorIsUndefined:
		return fmt.Sprintf("isNull(%s)", fullCol), nil

	case FilterOperatorIs, FilterOperatorEquals, FilterOperatorOn:
		if len(values) == 1 {
			return fmt.Sprintf("%s = ?", fullCol), []interface{}{values[0]}
		}
		placeholders, params := BuildPlaceholderList(values)
		return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case FilterOperatorIsNot, FilterOperatorNotEquals, FilterOperatorNot, FilterOperatorOff, FilterOperatorNotOn:
		if len(values) == 1 {
			return fmt.Sprintf("%s != ?", fullCol), []interface{}{values[0]}
		}
		placeholders, params := BuildPlaceholderList(values)
		return fmt.Sprintf("%s NOT IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case FilterOperatorContains:
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return "%" + v + "%" })

	case FilterOperatorNotContains, FilterOperatorDoesNotContain:
		cond, params := BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return "%" + v + "%" })
		return "NOT (" + cond + ")", params

	case FilterOperatorStartsWith:
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return v + "%" })

	case FilterOperatorEndsWith:
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return "%" + v })

	case FilterOperatorRegex:
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("match(%s, ?)", fullCol), nil)

	case FilterOperatorIn:
		placeholders, params := BuildPlaceholderList(values)
		return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case FilterOperatorNotIn:
		placeholders, params := BuildPlaceholderList(values)
		return fmt.Sprintf("%s NOT IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case FilterOperatorGreaterEqual, FilterOperatorGte, FilterOperatorGreaterEqualAlias:
		if len(values) == 1 {
			return fmt.Sprintf("%s >= ?", fullCol), []interface{}{values[0]}
		}
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s >= ?", fullCol), nil)

	case FilterOperatorGreaterThan, FilterOperatorGt, FilterOperatorGreaterThanAlias:
		if len(values) == 1 {
			return fmt.Sprintf("%s > ?", fullCol), []interface{}{values[0]}
		}
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s > ?", fullCol), nil)

	case FilterOperatorLessEqual, FilterOperatorLte, FilterOperatorLessEqualAlias:
		if len(values) == 1 {
			return fmt.Sprintf("%s <= ?", fullCol), []interface{}{values[0]}
		}
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s <= ?", fullCol), nil)

	case FilterOperatorLessThan, FilterOperatorLt, FilterOperatorLessThanAlias:
		if len(values) == 1 {
			return fmt.Sprintf("%s < ?", fullCol), []interface{}{values[0]}
		}
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s < ?", fullCol), nil)

	case FilterOperatorEqual, FilterOperatorNotEqual:
		if len(values) == 0 {
			return "", nil
		}
		return fmt.Sprintf("%s %s ?", fullCol, operator), []interface{}{values[0]}

	default:
		if nature == "arrayColumn" {
			if len(values) == 0 {
				return "", nil
			}
			placeholders, params := BuildPlaceholderList(values)
			opFunc := "hasAny"
			if opType == FilterOperatorIsNot || opType == FilterOperatorNotEquals || opType == FilterOperatorNot || opType == FilterOperatorOff || opType == FilterOperatorNotOn {
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
		placeholders, params := BuildPlaceholderList(values)
		return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params
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
