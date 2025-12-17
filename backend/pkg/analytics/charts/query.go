package charts

import (
	"fmt"
	"openreplay/backend/pkg/logger"
	"reflect"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
)

const (
	EventOrderThen = "then"
	EventOrderAnd  = "and"
	EventOrderOr   = "or"
)

var (
	sqlStringReplacer      = strings.NewReplacer(`'`, `''`, `@`, `' || char(64) || '`)
	sqlLikePatternReplacer = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`, `'`, `''`, `@`, `' || char(64) || '`)
)

type Payload struct {
	*model.MetricPayload
	ProjectId int    `validate:"required,min=1"`
	UserId    uint64 `validate:"required,min=1"`
}

type QueryBuilder interface {
	Execute(p *Payload, conn driver.Conn) (interface{}, error)
}

func NewQueryBuilder(logger logger.Logger, p *Payload) (QueryBuilder, error) {
	switch p.MetricType {
	case MetricTypeTimeseries:
		return &TimeSeriesQueryBuilder{Logger: logger}, nil
	case MetricTypeFunnel:
		return &FunnelQueryBuilder{Logger: logger}, nil
	case MetricTypeTable:
		if p.MetricOf == "jsException" {
			return &TableErrorsQueryBuilder{Logger: logger}, nil
		}
		return &TableQueryBuilder{Logger: logger}, nil
	case MetricTypeHeatmap:
		return &HeatmapSessionQueryBuilder{Logger: logger}, nil
	case MetricTypeSession:
		return &HeatmapQueryBuilder{Logger: logger}, nil
	case MetricUserJourney:
		return &UserJourneyQueryBuilder{Logger: logger}, nil
	case MetricWebVitals:
		return WebVitalsQueryBuilder{Logger: logger}, nil
	default:
		return nil, fmt.Errorf("unknown metric type: %s", p.MetricType)
	}
}

type BuildConditionsOptions struct {
	MainTableAlias             string
	PropertiesColumnName       string
	CustomPropertiesColumnName string
	DefinedColumns             map[string][]string
	EventsOrder                string
}

var propertyKeyMap = map[string]filterConfig{
	"LOCATION":        {LogicalProperty: "$current_path", InDProperties: false, InProperties: false},
	"FETCH":           {LogicalProperty: "$current_path", InDProperties: false, InProperties: false},
	"REQUEST":         {LogicalProperty: "$current_path", InDProperties: false, InProperties: false},
	"CLICK":           {LogicalProperty: "label", InDProperties: true, InProperties: false},
	"INPUT":           {LogicalProperty: "label", InDProperties: true, InProperties: false},
	"FETCHURL":        {LogicalProperty: "$current_path", InDProperties: false, InProperties: false},
	"USERDEVICE":      {LogicalProperty: "user_device", InDProperties: true, InProperties: false},
	"FETCHSTATUSCODE": {LogicalProperty: "status", IsNumeric: true, InDProperties: true, InProperties: false},
	//	For some reason, the code is looking for property-name 'url_path' like event name
	"URL_PATH": {LogicalProperty: "$current_path", InDProperties: false, InProperties: false},
}

// The list of event filters that are represented by columns in the events table
var eventPropertyColumns = map[string]string{
	"issue_type": "issue_type",
}

// filterConfig holds configuration for a filter type
type filterConfig struct {
	LogicalProperty string
	IsNumeric       bool
	InDProperties   bool // in $properties or not
	InProperties    bool // in properties or not
}

// out: column accessor ; column nature (singleColumn/arrayColumn)
func getColumnAccessor(logical string, isNumeric bool, inDProperties, inProperties bool, opts BuildConditionsOptions) (string, string) {
	// helper: wrap names starting with $ in quotes
	quote := func(name string) string {
		prefix := opts.MainTableAlias + "."
		if strings.HasPrefix(name, prefix) {
			suffix := strings.TrimPrefix(name, prefix)
			if strings.HasPrefix(suffix, "$") {
				return fmt.Sprintf("%s.\"%s\"", opts.MainTableAlias, suffix)
			}
		}
		if strings.HasPrefix(name, "$") {
			return fmt.Sprintf("\"%s\"", name)
		}
		return name
	}
	// explicit column mapping
	if col, ok := opts.DefinedColumns[logical]; ok {
		col[0] = quote(col[0])
		if opts.MainTableAlias != "" {
			if strings.Contains(col[0], ".") {
				return fmt.Sprintf("%s", col[0]), col[1]
			}
			return fmt.Sprintf("%s.%s", opts.MainTableAlias, col[0]), col[1]
		}
		return col[0], col[1]
	}

	// determine property key
	var propKey filterConfig = filterConfig{logical, isNumeric, inDProperties, inProperties}
	if cfg, ok := propertyKeyMap[strings.ToUpper(logical)]; ok {
		propKey = cfg
	}

	// build properties column reference
	var colName string
	if inDProperties {
		colName = opts.PropertiesColumnName
	} else if inProperties {
		colName = opts.CustomPropertiesColumnName
	}

	if opts.MainTableAlias != "" {
		colName = fmt.Sprintf("%s.%s", opts.MainTableAlias, colName)
	}
	colName = quote(colName)

	if propKey.InDProperties || propKey.InProperties {
		// JSON extraction - escape property name to prevent injection
		escapedProp := sqlStringReplacer.Replace(propKey.LogicalProperty)
		if isNumeric {
			return fmt.Sprintf("JSONExtractFloat(toString(%s), '%s')", colName, escapedProp), "singleColumn"
		}
		return fmt.Sprintf("JSONExtractString(toString(%s), '%s')", colName, escapedProp), "singleColumn"
	} else {
		return fmt.Sprintf("%s.\"%s\"", opts.MainTableAlias, propKey.LogicalProperty), "singleColumn"
	}
}

// out: []eventConditions, []eventNameConditions, []sessionConditions with the same alias as eventConditions
func BuildEventConditions(filters []model.Filter, option BuildConditionsOptions) ([]string, []string, []string) {
	var finalEventConditions []string = make([]string, 0)
	var finalOtherConditions []string = make([]string, 0)

	if option.EventsOrder == "" {
		option.EventsOrder = "then"
	}

	opts := BuildConditionsOptions{
		MainTableAlias:             "e",
		PropertiesColumnName:       "`$properties`",
		CustomPropertiesColumnName: "properties",
		DefinedColumns:             make(map[string][]string),
		EventsOrder:                "then",
	}

	if option.MainTableAlias != "" {
		opts.MainTableAlias = option.MainTableAlias
	}
	if option.PropertiesColumnName != "" {
		opts.PropertiesColumnName = option.PropertiesColumnName
	}
	if option.CustomPropertiesColumnName != "" {
		opts.CustomPropertiesColumnName = option.CustomPropertiesColumnName
	}
	if option.DefinedColumns != nil {
		opts.DefinedColumns = option.DefinedColumns
	}
	if option.EventsOrder != "" {
		opts.EventsOrder = option.EventsOrder
	}
	var eventNames []string

	// A map so it can be used to ensure unique conditions
	var eventConds map[string]any = make(map[string]any)
	var otherConds map[string]any = make(map[string]any)
	for _, f := range filters {
		if f.AutoCaptured && !f.IsEvent {
			f.Name = CamelToSnake(f.Name)
		}
		if f.Name == string(FilterDuration) {
			continue
		}
		conds, nameCondition := addFilter(f, opts, f.IsEvent)
		if !slices.Contains(eventNames, nameCondition) && nameCondition != "" {
			eventNames = append(eventNames, nameCondition)
		}
		isSessionProperty := false
		_, isSessionProperty = sessionProperties[f.Name]
		isSessionProperty = isSessionProperty || strings.HasPrefix(f.Name, "metadata_") && f.AutoCaptured
		if f.IsEvent || !isSessionProperty {
			if option.EventsOrder == "then" {
				//for "then" order, we can have duplicate conditions
				finalEventConditions = append(finalEventConditions, conds...)
			} else {
				for _, c := range conds {
					eventConds[c] = 0
				}
			}
		} else {
			for _, c := range conds {
				otherConds[c] = 0
			}
		}
	}

	for k := range eventConds {
		finalEventConditions = append(finalEventConditions, k)
	}

	for k := range otherConds {
		finalOtherConditions = append(finalOtherConditions, k)
	}
	return finalEventConditions, eventNames, finalOtherConditions
}

// out: []conditions, nameCondition
func addFilter(f model.Filter, opts BuildConditionsOptions, isEventProperty bool) ([]string, string) {
	alias := opts.MainTableAlias
	if alias != "" && !strings.HasSuffix(alias, ".") {
		alias += "."
	}
	var nameCondition string = ""
	if f.IsEvent {
		escapedName := sqlStringReplacer.Replace(f.Name)
		nameCondition = fmt.Sprintf("%s\"$event_name\" = '%s'", alias, escapedName)
		var parts []string
		parts = append(parts, nameCondition)

		if f.AutoCaptured {
			parts = append(parts, fmt.Sprintf("%s\"$auto_captured\"", alias))
		}

		for _, sub := range f.Filters {
			subConds, _ := addFilter(sub, opts, true)
			if len(subConds) > 0 {
				parts = append(parts, "("+strings.Join(subConds, " AND ")+")")
			}
		}
		return []string{"(" + strings.Join(parts, " AND ") + ")"}, nameCondition
	}
	if f.AutoCaptured {
		f.Name = CamelToSnake(f.Name)
	}
	// for event's properties that are represented by columns
	if isEventProperty {
		if col, ok := eventPropertyColumns[f.Name]; ok {
			accessor := fmt.Sprintf("%s%s", alias, col)
			cond := buildCond(accessor, f.Value, f.Operator, false, "singleColumn")
			if cond != "" {
				return []string{cond}, ""
			}
		}
	}
	if strings.HasPrefix(f.Name, "metadata_") {
		cond := buildCond(f.Name, f.Value, f.Operator, false, "singleColumn")
		if cond != "" {
			return []string{cond}, ""
		}
	}

	cfg, ok := propertyKeyMap[strings.ToUpper(f.Name)]
	isNumeric := cfg.IsNumeric || f.DataType == "float" || f.DataType == "number" || f.DataType == "int"
	if !ok {
		cfg = filterConfig{LogicalProperty: f.Name, IsNumeric: isNumeric, InDProperties: f.AutoCaptured, InProperties: !f.AutoCaptured}
	}
	acc, nature := getColumnAccessor(cfg.LogicalProperty, cfg.IsNumeric, cfg.InDProperties, cfg.InProperties, opts)
	switch f.Operator {
	case "isAny", "onAny":
		//This part is unreachable, because you already have if f.IsEvent&return above
		if f.IsEvent {
			escapedName := sqlStringReplacer.Replace(f.Name)
			return []string{fmt.Sprintf("%s\"$event_name\" = '%s'", alias, escapedName)}, ""
		}
	default:
		if c := buildCond(acc, f.Value, f.Operator, cfg.IsNumeric, nature); c != "" {
			return []string{c}, ""
		}
	}
	return []string{}, ""
}

var compOps = map[string]string{
	"equals": "=", "is": "=", "on": "=",
	"notEquals": "<>", "not": "<>", "off": "<>",
	"greaterThan": ">", "gt": ">",
	"greaterThanOrEqual": ">=", "gte": ">=",
	"lessThan": "<", "lt": "<",
	"lessThanOrEqual": "<=", "lte": "<=",
}
var compOpsArrays = map[string]string{
	"equals": "hasAny", "is": "hasAny", "on": "hasAny",
	"notEquals": "NOT hasAny", "not": "NOT hasAny", "off": "NOT hasAny",
}

func buildCond(expr string, values []string, operator string, isNumeric bool, nature string) string {
	if len(values) == 0 && operator != "isAny" {
		return ""
	}
	switch operator {
	case "isAny":
		if nature == "arrayColumn" {
			return fmt.Sprintf("notEmpty(%s)", expr)
		}
		return fmt.Sprintf("isNotNull(%s)", expr)
	case "isNot", "not":
		//TODO: find how to process array column
		if len(values) == 1 {
			return formatCondition(expr, "%s != %s", values[0], isNumeric)
		}
		wrapped := make([]string, len(values))
		for i, v := range values {
			if isNumeric {
				wrapped[i] = v
			} else {
				wrapped[i] = fmt.Sprintf("'%s'", sqlStringReplacer.Replace(v))
			}
		}
		return fmt.Sprintf("%s NOT IN (%s)", expr, strings.Join(wrapped, ", "))
	case "contains":
		// wrap values with % on both sides and escape LIKE pattern
		wrapped := make([]string, len(values))
		for i, v := range values {
			wrapped[i] = fmt.Sprintf("%%%s%%", sqlLikePatternReplacer.Replace(v))
		}
		return multiValCond(expr, wrapped, "%s ILIKE %s", false)
	case "notContains", "doesNotContain":
		wrapped := make([]string, len(values))
		for i, v := range values {
			wrapped[i] = fmt.Sprintf("%%%s%%", sqlLikePatternReplacer.Replace(v))
		}
		cond := multiValCond(expr, wrapped, "%s ILIKE %s", false)
		return "NOT (" + cond + ")"
	case "startsWith":
		wrapped := make([]string, len(values))
		for i, v := range values {
			wrapped[i] = sqlLikePatternReplacer.Replace(v) + "%"
		}
		return multiValCond(expr, wrapped, "%s ILIKE %s", false)
	case "endsWith":
		wrapped := make([]string, len(values))
		for i, v := range values {
			wrapped[i] = "%" + sqlLikePatternReplacer.Replace(v)
		}
		return multiValCond(expr, wrapped, "%s ILIKE %s", false)
	case "regex":
		var parts []string
		for _, v := range values {
			// Escape the regex pattern value for SQL string literal
			parts = append(parts, fmt.Sprintf("match(%s, '%s')", expr, sqlStringReplacer.Replace(v)))
		}
		if len(parts) > 1 {
			return "(" + strings.Join(parts, " OR ") + ")"
		}
		return parts[0]
	case "in", "notIn":
		neg := operator == "notIn"
		return inClause(expr, values, neg, isNumeric)
	case ">=", ">", "<=", "<":
		return multiValCond(expr, values, "%s "+operator+" %s", isNumeric)
	default:
		if nature == "arrayColumn" {
			if op, ok := compOpsArrays[operator]; ok {
				for i := range values {
					values[i] = fmt.Sprintf("'%s'", sqlStringReplacer.Replace(values[i]))
				}
				return fmt.Sprintf("%s(%s,[%s])", op, expr, strings.Join(values, ","))
			}
		} else {
			if op, ok := compOps[operator]; ok {
				tmpl := "%s " + op + " %s"
				return multiValCond(expr, values, tmpl, isNumeric)
			}
		}
		// fallback equals
		tmpl := "%s = %s"
		return multiValCond(expr, values, tmpl, isNumeric)
	}
}

// formatCondition applies a template to a single value, handling quoting and escaping
func formatCondition(expr, tmpl, value string, isNumeric bool) string {
	val := value
	if !isNumeric {
		val = fmt.Sprintf("'%s'", sqlStringReplacer.Replace(value))
	}
	return fmt.Sprintf(tmpl, expr, val)
}

// multiValCond applies a template to one or multiple values, using formatCondition
func multiValCond(expr string, values []string, tmpl string, isNumeric bool) string {
	if len(values) == 1 {
		return formatCondition(expr, tmpl, values[0], isNumeric)
	}
	parts := make([]string, len(values))
	for i, v := range values {
		parts[i] = formatCondition(expr, tmpl, v, isNumeric)
	}
	return "(" + strings.Join(parts, " OR ") + ")"
}

// inClause constructs IN/NOT IN clauses with proper quoting
func inClause(expr string, values []string, negate, isNumeric bool) string {
	op := "IN"
	if negate {
		op = "NOT IN"
	}

	if len(values) == 1 {
		return fmt.Sprintf("%s %s (%s)", expr, op, func() string {
			if isNumeric {
				return values[0]
			}
			return fmt.Sprintf("'%s'", sqlStringReplacer.Replace(values[0]))
		}())
	}
	quoted := make([]string, len(values))
	for i, v := range values {
		if isNumeric {
			quoted[i] = v
		} else {
			quoted[i] = fmt.Sprintf("'%s'", sqlStringReplacer.Replace(v))
		}
	}
	return fmt.Sprintf("%s %s (%s)", expr, op, strings.Join(quoted, ", "))
}

func buildInClause(values []string) string {
	var quoted []string
	for _, v := range values {
		quoted = append(quoted, fmt.Sprintf("'%s'", sqlStringReplacer.Replace(v)))
	}
	return strings.Join(quoted, ",")
}

func buildStaticEventWhere(p *Payload) string {
	return strings.Join([]string{
		fmt.Sprintf("main.project_id = %d", p.ProjectId),
		fmt.Sprintf("main.created_at >= toDateTime(%d / 1000)", p.StartTimestamp),
		fmt.Sprintf("main.created_at <= toDateTime(%d / 1000)", p.EndTimestamp),
	}, " AND ")
}

func BuildDefaultWhere(p *Payload, tableAlias string, timeColumn ...string) []string {
	col := "created_at"
	if len(timeColumn) > 0 && timeColumn[0] != "" {
		col = timeColumn[0]
	}
	return []string{
		fmt.Sprintf("%s.project_id = %d", tableAlias, p.ProjectId),
		fmt.Sprintf("%s.%s BETWEEN toDateTime(%d) AND toDateTime(%d)", tableAlias, col, p.StartTimestamp/1000, p.EndTimestamp/1000),
	}
}

func getStepSize(startTimestamp uint64, endTimestamp uint64, density int, factor int) uint64 {
	factorInt64 := int64(factor)
	stepSize := (int64(endTimestamp) / factorInt64) - (int64(startTimestamp) / factorInt64)

	if density <= 1 {
		return uint64(stepSize)
	}

	return uint64(stepSize) / uint64(density)
}

func isNegativeOperator(op string) bool {
	return op == "isNot" || op == "not" || op == "notIn" || op == "notContains"
}
func isNegativeEventFilter(f model.Filter) bool {
	// a negative event filter is one that has negative operators for all its properties
	var count int = 0
	for _, prop := range f.Filters {
		if isNegativeOperator(prop.Operator) {
			count++
		}
	}
	return count == len(f.Filters) && count > 0
}
func reverseOperator(op string) string {
	switch op {
	case "and":
		return "or"
	case "or":
		return "and"
	case "is":
		return "isNot"
	case "isNot":
		return "is"
	case "on":
		return "notOn"
	case "notOn":
		return "on"
	case "contains":
		return "notContains"
	case "notContains":
		return "contains"
	default:
		return op
	}
}
func reverseNegativeFilter(f model.Filter) model.Filter {
	// reverse the operators of all properties
	for i, prop := range f.Filters {
		f.Filters[i].Operator = reverseOperator(prop.Operator)
	}
	return f
}
func BuildWhere(filters []model.Filter, eventsOrder string, eventsAlias, sessionsAlias string, isSessionJoin ...bool) (events, eventFilters, negativeEventFilters, sessionFilters []string) {
	events = make([]string, 0)
	eventFilters = make([]string, 0)
	negativeEventFilters = make([]string, 0)
	sessionFilters = make([]string, 0)
	sessionFilters = append(sessionFilters, fmt.Sprintf("isNotNull(%s.duration)", sessionsAlias))
	//sessionColumns := GetSessionColumns(len(isSessionJoin) > 0 && isSessionJoin[0])

	var sessionFiltersList, eventFiltersList, negativeEvents []model.Filter
	for _, f := range filters {
		// Not all !f.IsEvent are from sessions, because UI can send a $properties filter without specifying an event (global properties filters)
		var isEvent bool = f.IsEvent
		if !f.IsEvent {
			filterName := f.Name
			if f.AutoCaptured {
				filterName = CamelToSnake(f.Name)
			}

			if _, ok := SessionColumns[filterName]; ok || f.AutoCaptured && strings.HasPrefix(filterName, "metadata_") {
				sessionFiltersList = append(sessionFiltersList, f)
			} else {
				isEvent = true
			}
		}
		if isEvent {
			if isNegativeEventFilter(f) {
				negativeEvents = append(negativeEvents, f)
			} else {
				eventFiltersList = append(eventFiltersList, f)
			}
		}
	}
	for i, f := range negativeEvents {
		negativeEvents[i] = reverseNegativeFilter(f)
	}
	evConds, _, misc := BuildEventConditions(eventFiltersList, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: eventsAlias,
		EventsOrder:    eventsOrder,
	})
	events = append(events, evConds...)
	eventFilters = append(eventFilters, misc...)

	nevConds, _, _ := BuildEventConditions(negativeEvents, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: eventsAlias,
		EventsOrder:    eventsOrder,
	})
	_, _, sConds := BuildEventConditions(sessionFiltersList, BuildConditionsOptions{
		DefinedColumns: SessionColumns,
		MainTableAlias: sessionsAlias,
	})
	durConds, _ := BuildDurationWhere(filters, sessionsAlias)
	sessionFilters = append(sessionFilters, durConds...)
	sessionFilters = append(sessionFilters, sConds...)
	negativeEventFilters = append(negativeEventFilters, nevConds...)

	return
}

func BuildJoinClause(order string, eventsWhere []string, tableAlias ...string) string {
	ta := "e"
	if len(tableAlias) > 0 && tableAlias[0] != "" {
		ta = tableAlias[0]
	}

	switch order {
	case "then":
		if len(eventsWhere) > 1 {
			var pat strings.Builder
			for i := range eventsWhere {
				pat.WriteString(fmt.Sprintf("(?%d)", i+1))
			}
			return fmt.Sprintf(
				"GROUP BY %s.session_id\nHAVING sequenceMatch('%s')(\n    toDateTime(%s.created_at),\n    %s\n)",
				ta,
				pat.String(),
				ta,
				strings.Join(eventsWhere, ",\n    "),
			)
		}
	case "and":
		if len(eventsWhere) > 1 {
			// Build each condition: countIf(col, 1) > 0
			parts := make([]string, len(eventsWhere))
			for i, col := range eventsWhere {
				parts[i] = fmt.Sprintf("countIf(%s) > 0", col)
			}
			// Concise join in one go
			return fmt.Sprintf(
				"GROUP BY %s.session_id\nHAVING %s",
				ta,
				strings.Join(parts, " AND "),
			)
		}
	case "or":
		if len(eventsWhere) > 1 {
			parts := make([]string, len(eventsWhere))
			for i, col := range eventsWhere {
				parts[i] = fmt.Sprintf("countIf(%s) > 0", col)
			}
			// Concise join in one go
			return fmt.Sprintf(
				"GROUP BY %s.session_id\nHAVING %s",
				ta,
				strings.Join(parts, " OR "),
			)
		}
	}
	return ""
}

func BuildDurationWhere(filters []model.Filter, tableAlias ...string) ([]string, []model.Filter) {
	alias := "sessions"
	if len(tableAlias) > 0 && tableAlias[0] != "" {
		alias = tableAlias[0]
	}

	var conds []string
	var rest []model.Filter
	for _, f := range filters {
		if string(f.Name) == "duration" && f.AutoCaptured {
			v := f.Value
			if len(v) == 1 {
				if v[0] != "" {
					if d, err := strconv.ParseInt(v[0], 10, 64); err == nil {
						conds = append(conds, fmt.Sprintf("%s.duration >= %d", alias, d))
					}
				}
			} else if len(v) >= 2 {
				if v[0] != "" {
					if d, err := strconv.ParseInt(v[0], 10, 64); err == nil {
						conds = append(conds, fmt.Sprintf("%s.duration >= %d", alias, d))
					}
				}
				if v[1] != "" {
					if d, err := strconv.ParseInt(v[1], 10, 64); err == nil {
						conds = append(conds, fmt.Sprintf("%s.duration <= %d", alias, d))
					}
				}
			}
		} else {
			rest = append(rest, f)
		}
	}
	return conds, rest
}

func FilterOutTypes(filters []model.Filter, typesToRemove []string) (kept []model.Filter, removed []model.Filter) {
	removeMap := make(map[string]struct{}, len(typesToRemove))
	for _, t := range typesToRemove {
		removeMap[t] = struct{}{}
	}
	for _, f := range filters {
		if _, ok := removeMap[f.Name]; ok {
			removed = append(removed, f)
		} else {
			kept = append(kept, f)
		}
	}
	return
}

func logQuery(query string, args ...interface{}) {
	if len(args) > 0 {
		query = fmt.Sprintf(query, args...)
	}
}
func isSlice(v interface{}) bool {
	return reflect.TypeOf(v).Kind() == reflect.Slice
}
func convertParams(params map[string]any) []interface{} {
	chParams := make([]interface{}, 0, len(params))
	for k, v := range params {
		//if isSlice(v) {
		//	stringSlice := v.([]string)
		//	if len(stringSlice) == 0 {
		//		v = 0
		//		continue
		//	}
		//	v = "['" + strings.Join(stringSlice, "', '") + "']"
		//} else {
		//	v = fmt.Sprintf("%v", v) // Convert non-slice values to string
		//}
		//chParams = append(chParams, clickhouse.Named(k, v.(string)))
		chParams = append(chParams, clickhouse.Named(k, v))
	}
	return chParams

}

func GetSessionColumns(join ...bool) map[string][]string {
	if len(join) > 0 && join[0] {
		keys := []string{"user_id", "user_anonymous_id", "user_device", "platform",
			"user_browser", "user_os", "user_os_version", "user_browser_version",
			"user_country", "user_state", "user_city", "referrer"}
		out := make(map[string][]string, len(keys))
		for _, k := range keys {
			out[k] = SessionColumns[k]
		}
		return out
	}
	return SessionColumns
}

func BuildEventsJoinClause(eventsOrder model.EventOrder, eventConditions []string, tableAlias string) (string, []string, error) {
	if len(eventConditions) == 0 && eventsOrder != "" {
		return "", nil, nil
	}

	switch eventsOrder {
	case EventOrderThen:
		havingClause, whereClause := BuildSequenceJoinClause(eventConditions, tableAlias)
		return havingClause, whereClause, nil
	case EventOrderAnd:
		havingClause, whereClause := BuildCountJoinClause(eventConditions, "AND", tableAlias)
		return havingClause, whereClause, nil
	case EventOrderOr:
		havingClause, whereClause := BuildCountJoinClause(eventConditions, "OR", tableAlias)
		return havingClause, whereClause, nil
	case "":
		return "", nil, nil
	default:
		return "", nil, fmt.Errorf("unknown events order: %s", eventsOrder)
	}
}

func BuildSequenceJoinClause(eventConditions []string, tableAlias string) (string, []string) {
	if len(eventConditions) == 0 {
		return "", nil
	}

	if len(eventConditions) == 1 {
		return "HAVING countIf(" + eventConditions[0] + ") > 0", nil
	}

	patterns := make([]string, len(eventConditions))
	for i := range eventConditions {
		patterns[i] = fmt.Sprintf("(?%d)", i+1)
	}

	havingClause := fmt.Sprintf(
		"HAVING sequenceMatch('%s')(\n    toDateTime(%s.created_at),\n    %s\n)",
		strings.Join(patterns, ""),
		tableAlias,
		strings.Join(eventConditions, ",\n    "),
	)

	return havingClause, nil
}

func BuildCountJoinClause(eventConditions []string, operator string, tableAlias string) (string, []string) {
	if len(eventConditions) == 0 {
		return "", nil
	}

	if operator == "OR" {
		whereClause := []string{strings.Join(eventConditions, " OR ")}
		return "", whereClause
	}

	countConds := make([]string, len(eventConditions))
	for i, condition := range eventConditions {
		countConds[i] = fmt.Sprintf("countIf(%s) > 0", condition)
	}

	havingClause := fmt.Sprintf("HAVING %s", strings.Join(countConds, fmt.Sprintf(" %s ", operator)))
	return havingClause, nil
}

var SessionColumns = map[string][]string{
	"user_browser":          {"user_browser", "singleColumn"},
	"user_browser_version":  {"user_browser_version", "singleColumn"},
	"user_device":           {"user_device", "singleColumn"},
	"platform":              {"platform", "singleColumn"},
	"user_id":               {"user_id", "singleColumn"},
	"user_anonymous_id":     {"user_anonymous_id", "singleColumn"},
	"referrer":              {"referrer", "singleColumn"},
	"userDeviceIos":         {"user_device", "singleColumn"},
	"user_id_ios":           {"user_id", "singleColumn"},
	"user_anonymous_id_ios": {"user_anonymous_id", "singleColumn"},
	"duration":              {"duration", "singleColumn"},
	"issue_type":            {"issue_types", "arrayColumn"},
	"user_country":          {"user_country", "singleColumn"},
	"user_city":             {"user_city", "singleColumn"},
	"user_state":            {"user_state", "singleColumn"},
	"user_os":               {"user_os", "singleColumn"},
	"user_os_version":       {"user_os_version", "singleColumn"},
	"metadata":              {"metadata", "singleColumn"},
	"utm_source":            {"utm_source", "singleColumn"},
	"utm_medium":            {"utm_medium", "singleColumn"},
	"utm_campaign":          {"utm_campaign", "singleColumn"},
	"rev_id":                {"rev_id", "singleColumn"},
	"issue":                 {"issue_types", "arrayColumn"},
	"screen_width":          {"screen_width", "singleColumn"},
	"screen_height":         {"screen_height", "singleColumn"},
}

func reverseSqlOperator(op string) string {
	switch op {
	case "=":
		return "!="
	case "!=":
		return "="
	case "ILIKE":
		return "NOT ILIKE"
	case "NOT ILIKE":
		return "ILIKE"
	default:
		return op
	}
}

func hasEventFilter(filters []model.Filter) bool {
	for _, f := range filters {
		if f.IsEvent {
			return true
		}
	}
	return false
}

func CamelToSnake(s string) string {
	re := regexp.MustCompile("([a-z0-9])([A-Z])")
	snake := re.ReplaceAllString(s, "${1}_${2}")
	return strings.ToLower(snake)
}
