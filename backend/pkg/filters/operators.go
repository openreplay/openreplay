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

type OperatorConfig struct {
	SupportBoolean    bool
	SupportArrays     bool
	SupportRegex      bool
	SupportComparison bool
}

var DefaultConfig = OperatorConfig{
	SupportBoolean:    false,
	SupportArrays:     false,
	SupportRegex:      false,
	SupportComparison: true,
}

var EventsConfig = OperatorConfig{
	SupportBoolean:    true,
	SupportArrays:     true,
	SupportRegex:      true,
	SupportComparison: true,
}

func BuildOperatorCondition(fullCol string, operator string, values []string, config OperatorConfig, nature string, dataType string) (string, []interface{}) {
	if config.SupportBoolean && dataType == "boolean" {
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
		if config.SupportArrays && nature == "arrayColumn" {
			return fmt.Sprintf("notEmpty(%s)", fullCol), nil
		}
		return fmt.Sprintf("isNotNull(%s)", fullCol), nil

	case "isUndefined":
		return fmt.Sprintf("isNull(%s)", fullCol), nil

	case "is", "equals", "on":
		if len(values) == 1 {
			return fmt.Sprintf("%s = ?", fullCol), []interface{}{values[0]}
		}
		placeholders, params := BuildPlaceholderList(values)
		return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case "isNot", "notEquals", "not", "off", "notOn":
		if len(values) == 1 {
			return fmt.Sprintf("%s != ?", fullCol), []interface{}{values[0]}
		}
		placeholders, params := BuildPlaceholderList(values)
		return fmt.Sprintf("%s NOT IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case "contains":
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return "%" + v + "%" })

	case "notContains", "doesNotContain":
		cond, params := BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return "%" + v + "%" })
		return "NOT (" + cond + ")", params

	case "startsWith":
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return v + "%" })

	case "endsWith":
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s ILIKE ?", fullCol),
			func(v string) interface{} { return "%" + v })

	case "regex":
		if config.SupportRegex {
			return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("match(%s, ?)", fullCol), nil)
		}
		return "", nil

	case "in":
		placeholders, params := BuildPlaceholderList(values)
		return fmt.Sprintf("%s IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case "notIn":
		placeholders, params := BuildPlaceholderList(values)
		return fmt.Sprintf("%s NOT IN (%s)", fullCol, strings.Join(placeholders, ", ")), params

	case ">=", "gte", "greaterThanOrEqual":
		if !config.SupportComparison {
			return "", nil
		}
		if len(values) == 1 {
			return fmt.Sprintf("%s >= ?", fullCol), []interface{}{values[0]}
		}
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s >= ?", fullCol), nil)

	case ">", "gt", "greaterThan":
		if !config.SupportComparison {
			return "", nil
		}
		if len(values) == 1 {
			return fmt.Sprintf("%s > ?", fullCol), []interface{}{values[0]}
		}
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s > ?", fullCol), nil)

	case "<=", "lte", "lessThanOrEqual":
		if !config.SupportComparison {
			return "", nil
		}
		if len(values) == 1 {
			return fmt.Sprintf("%s <= ?", fullCol), []interface{}{values[0]}
		}
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s <= ?", fullCol), nil)

	case "<", "lt", "lessThan":
		if !config.SupportComparison {
			return "", nil
		}
		if len(values) == 1 {
			return fmt.Sprintf("%s < ?", fullCol), []interface{}{values[0]}
		}
		return BuildMultiValueCondition(fullCol, values, fmt.Sprintf("%s < ?", fullCol), nil)

	case "=", "!=":
		if !config.SupportComparison {
			return "", nil
		}
		if len(values) == 0 {
			return "", nil
		}
		return fmt.Sprintf("%s %s ?", fullCol, operator), []interface{}{values[0]}

	default:
		if config.SupportArrays && nature == "arrayColumn" {
			if len(values) == 0 {
				return "", nil
			}
			placeholders, params := BuildPlaceholderList(values)
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

func ValidateSortOrder(order string) string {
	orderUpper := strings.ToUpper(order)
	if orderUpper == "ASC" || orderUpper == "DESC" {
		return orderUpper
	}
	return "DESC"
}