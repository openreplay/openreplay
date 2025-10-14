package charts

import (
	"fmt"
	"reflect"
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

type Payload struct {
	*model.MetricPayload
	ProjectId int    `validate:"required,min=1"`
	UserId    uint64 `validate:"required,min=1"`
}

type QueryBuilder interface {
	Execute(p *Payload, conn driver.Conn) (interface{}, error)
}

func NewQueryBuilder(p *Payload) (QueryBuilder, error) {
	switch p.MetricType {
	case MetricTypeTimeseries:
		return &TimeSeriesQueryBuilder{}, nil
	case MetricTypeFunnel:
		return &FunnelQueryBuilder{}, nil
	case MetricTypeTable:
		if p.MetricOf == "jsException" {
			return &TableErrorsQueryBuilder{}, nil
		}
		return &TableQueryBuilder{}, nil
	case MetricTypeHeatmap:
		return &HeatmapSessionQueryBuilder{}, nil
	case MetricTypeSession:
		return &HeatmapQueryBuilder{}, nil
	case MetricUserJourney:
		return &UserJourneyQueryBuilder{}, nil
	case MetricWebVitals:
		return WebVitalsQueryBuilder{}, nil
	default:
		return nil, fmt.Errorf("unknown metric type: %s", p.MetricType)
	}
}

type BuildConditionsOptions struct {
	MainTableAlias       string
	PropertiesColumnName string
	DefinedColumns       map[string][]string
	EventsOrder          string
}

var propertyKeyMap = map[string]filterConfig{
	"LOCATION":        {LogicalProperty: "$current_path", InDProperties: false},
	"FETCH":           {LogicalProperty: "$current_path", InDProperties: false},
	"REQUEST":         {LogicalProperty: "$current_path", InDProperties: false},
	"CLICK":           {LogicalProperty: "label", InDProperties: true},
	"INPUT":           {LogicalProperty: "label", InDProperties: true},
	"FETCHURL":        {LogicalProperty: "$current_path", InDProperties: false},
	"USERDEVICE":      {LogicalProperty: "user_device", InDProperties: true},
	"FETCHSTATUSCODE": {LogicalProperty: "status", IsNumeric: true, InDProperties: true},
	//	For some reason, the code is looking for property-name 'url_path' like event name
	"URL_PATH": {LogicalProperty: "$current_path", InDProperties: false},
}

// filterConfig holds configuration for a filter type
type filterConfig struct {
	LogicalProperty string
	IsNumeric       bool
	InDProperties   bool // in $properties or not
}

func getColumnAccessor(logical string, isNumeric bool, inDProperties bool, opts BuildConditionsOptions) (string, string) {
	//output: column accessor ; column nature (singleColumn/arrayColumn)
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
	var propKey filterConfig = filterConfig{logical, isNumeric, inDProperties}
	if cfg, ok := propertyKeyMap[strings.ToUpper(logical)]; ok {
		propKey = cfg
	}

	// build properties column reference
	colName := opts.PropertiesColumnName
	if opts.MainTableAlias != "" {
		colName = fmt.Sprintf("%s.%s", opts.MainTableAlias, colName)
	}
	colName = quote(colName)

	if propKey.InDProperties {
		// JSON extraction
		if isNumeric {
			return fmt.Sprintf("JSONExtractFloat(toString(%s), '%s')", colName, propKey.LogicalProperty), "singleColumn"
		}
		return fmt.Sprintf("JSONExtractString(toString(%s), '%s')", colName, propKey.LogicalProperty), "singleColumn"
	} else {
		return fmt.Sprintf("%s.\"%s\"", opts.MainTableAlias, propKey.LogicalProperty), "singleColumn"
	}
}

func BuildEventConditions(filters []model.Filter, option BuildConditionsOptions) ([]string, []string, []string) {
	//output: []eventConditions, []eventNameConditions, []otherConditions
	opts := BuildConditionsOptions{
		MainTableAlias:       "e",
		PropertiesColumnName: "`$properties`",
		DefinedColumns:       make(map[string][]string),
		EventsOrder:          "then",
	}

	if option.MainTableAlias != "" {
		opts.MainTableAlias = option.MainTableAlias
	}
	if option.PropertiesColumnName != "" {
		opts.PropertiesColumnName = option.PropertiesColumnName
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
		if f.Type == FilterDuration || f.Type == FilterUserAnonymousId {
			continue
		}
		conds, nameCondition := addFilter(f, opts)
		if !slices.Contains(eventNames, nameCondition) && nameCondition != "" {
			eventNames = append(eventNames, nameCondition)
		}
		if f.IsEvent {
			//eventConds = append(eventConds, conds...)
			for _, c := range conds {
				eventConds[c] = 0
			}
		} else {
			//otherConds = append(otherConds, conds...)
			for _, c := range conds {
				otherConds[c] = 0
			}
		}
	}
	var eventConditions, otherConditions []string
	for k := range eventConds {
		eventConditions = append(eventConditions, k)
	}

	for k := range otherConds {
		otherConditions = append(otherConditions, k)
	}
	return eventConditions, eventNames, otherConditions
}

func addFilter(f model.Filter, opts BuildConditionsOptions) ([]string, string) {
	//output: []conditions, nameCondition
	alias := opts.MainTableAlias
	if alias != "" && !strings.HasSuffix(alias, ".") {
		alias += "."
	}
	var nameCondition string = ""
	if f.IsEvent {
		nameCondition = fmt.Sprintf("%s\"$event_name\" = '%s'", alias, f.Name)
		var parts []string
		parts = append(parts, nameCondition)

		if f.AutoCaptured {
			parts = append(parts, fmt.Sprintf("%s\"$auto_captured\"", alias))
		}

		for _, sub := range f.Filters {
			subConds, _ := addFilter(sub, opts)
			if len(subConds) > 0 {
				parts = append(parts, "("+strings.Join(subConds, " AND ")+")")
			}
		}
		return []string{"(" + strings.Join(parts, " AND ") + ")"}, nameCondition
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
		cfg = filterConfig{LogicalProperty: f.Name, IsNumeric: isNumeric, InDProperties: true}
	}
	acc, nature := getColumnAccessor(cfg.LogicalProperty, cfg.IsNumeric, cfg.InDProperties, opts)
	switch f.Operator {
	case "isAny", "onAny":
		//This part is unreachable, because you already have if f.IsEvent&return above
		if f.IsEvent {
			return []string{fmt.Sprintf("%s\"$event_name\" = '%s'", alias, f.Name)}, ""
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
			return formatCondition(expr, "%s <> %s", values[0], isNumeric)
		}
		wrapped := make([]string, len(values))
		for i, v := range values {
			if isNumeric {
				wrapped[i] = v
			} else {
				wrapped[i] = fmt.Sprintf("'%s'", v)
			}
		}
		return fmt.Sprintf("%s NOT IN (%s)", expr, strings.Join(wrapped, ", "))
	case "contains":
		// wrap values with % on both sides
		wrapped := make([]string, len(values))
		for i, v := range values {
			wrapped[i] = fmt.Sprintf("%%%s%%", v)
		}
		return multiValCond(expr, wrapped, "%s ILIKE %s", false)
	case "notContains", "doesNotContain":
		wrapped := make([]string, len(values))
		for i, v := range values {
			wrapped[i] = fmt.Sprintf("%%%s%%", v)
		}
		cond := multiValCond(expr, wrapped, "%s ILIKE %s", false)
		return "NOT (" + cond + ")"
	case "startsWith":
		wrapped := make([]string, len(values))
		for i, v := range values {
			wrapped[i] = v + "%"
		}
		return multiValCond(expr, wrapped, "%s ILIKE %s", false)
	case "endsWith":
		wrapped := make([]string, len(values))
		for i, v := range values {
			wrapped[i] = "%" + v
		}
		return multiValCond(expr, wrapped, "%s ILIKE %s", false)
	case "regex":
		var parts []string
		for _, v := range values {
			parts = append(parts, fmt.Sprintf("match(%s, '%s')", expr, v))
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
					values[i] = fmt.Sprintf("'%s'", values[i])
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

// formatCondition applies a template to a single value, handling quoting
func formatCondition(expr, tmpl, value string, isNumeric bool) string {
	val := value
	if !isNumeric {
		val = fmt.Sprintf("'%s'", value)
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
			return fmt.Sprintf("'%s'", values[0])
		}())
	}
	quoted := make([]string, len(values))
	for i, v := range values {
		if isNumeric {
			quoted[i] = v
		} else {
			quoted[i] = fmt.Sprintf("'%s'", v)
		}
	}
	return fmt.Sprintf("%s %s (%s)", expr, op, strings.Join(quoted, ", "))
}

func buildInClause(values []string) string {
	var quoted []string
	for _, v := range values {
		quoted = append(quoted, fmt.Sprintf("'%s'", v))
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

func FillMissingDataPoints(
	startTime, endTime uint64,
	density int,
	neutral DataPoint,
	rows []DataPoint,
	timeCoefficient int64,
) []DataPoint {
	if density <= 1 {
		return rows
	}

	stepSize := getStepSize(startTime, endTime, density, 1000)
	bucketSize := stepSize * uint64(timeCoefficient)

	lookup := make(map[uint64]DataPoint)
	for _, dp := range rows {
		if dp.Timestamp < uint64(startTime) {
			continue
		}
		bucket := uint64(startTime) + (((dp.Timestamp - uint64(startTime)) / bucketSize) * bucketSize)
		lookup[bucket] = dp
	}

	results := make([]DataPoint, 0, density)
	for i := 0; i < density; i++ {
		ts := uint64(startTime) + uint64(i)*bucketSize
		if dp, ok := lookup[ts]; ok {
			results = append(results, dp)
		} else {
			nd := neutral
			nd.Timestamp = ts
			results = append(results, nd)
		}
	}
	return results
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
		if !f.IsEvent {
			sessionFiltersList = append(sessionFiltersList, f)
		} else {
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
		if string(f.Name) == "duration" {
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

func FilterOutTypes(filters []model.Filter, typesToRemove []model.FilterType) (kept []model.Filter, removed []model.Filter) {
	removeMap := make(map[model.FilterType]struct{}, len(typesToRemove))
	for _, t := range typesToRemove {
		removeMap[t] = struct{}{}
	}
	for _, f := range filters {
		if _, ok := removeMap[f.Type]; ok {
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
		keys := []string{"userId", "userAnonymousId", "userDevice", "platform"}
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
	"userBrowser":        {"user_browser", "singleColumn"},
	"userDevice":         {"user_device", "singleColumn"},
	"platform":           {"user_device_type", "singleColumn"},
	"userId":             {"user_id", "singleColumn"},
	"userAnonymousId":    {"user_anonymous_id", "singleColumn"},
	"referrer":           {"referrer", "singleColumn"},
	"userDeviceIos":      {"user_device", "singleColumn"},
	"userIdIos":          {"user_id", "singleColumn"},
	"userAnonymousIdIos": {"user_anonymous_id", "singleColumn"},
	"duration":           {"duration", "singleColumn"},
	"issue_type":         {"issue_types", "arrayColumn"},
	// TODO Add any missing session columns to be considered.
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
