package charts

import (
	"fmt"
	"github.com/ClickHouse/clickhouse-go/v2"
	"log"
	"reflect"
	"strconv"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
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
	DefinedColumns       map[string]string
	EventsOrder          string
}

var propertyKeyMap = map[string]filterConfig{
	"LOCATION":        {LogicalProperty: "url_path"},
	"FETCH":           {LogicalProperty: "url_path"},
	"REQUEST":         {LogicalProperty: "url_path"},
	"CLICK":           {LogicalProperty: "label"},
	"INPUT":           {LogicalProperty: "label"},
	"FETCHURL":        {LogicalProperty: "url_path"},
	"USERDEVICE":      {LogicalProperty: "user_device"},
	"FETCHSTATUSCODE": {LogicalProperty: "status", IsNumeric: true},
}

// filterConfig holds configuration for a filter type
type filterConfig struct {
	LogicalProperty string
	IsNumeric       bool
}

func getColumnAccessor(logical string, isNumeric bool, opts BuildConditionsOptions) string {
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
		col = quote(col)
		if opts.MainTableAlias != "" {
			if strings.Contains(col, ".") {
				return fmt.Sprintf("%s", col)
			}
			return fmt.Sprintf("%s.%s", opts.MainTableAlias, col)
		}
		return col
	}

	// determine property key
	propKey := logical
	if cfg, ok := propertyKeyMap[strings.ToUpper(logical)]; ok {
		propKey = cfg.LogicalProperty
	}

	// build properties column reference
	colName := opts.PropertiesColumnName
	if opts.MainTableAlias != "" {
		colName = fmt.Sprintf("%s.%s", opts.MainTableAlias, colName)
	}
	colName = quote(colName)

	// JSON extraction
	if isNumeric {
		return fmt.Sprintf("JSONExtractFloat(toString(%s), '%s')", colName, propKey)
	}
	return fmt.Sprintf("JSONExtractString(toString(%s), '%s')", colName, propKey)
}

func BuildEventConditions(filters []model.Filter, option BuildConditionsOptions) ([]string, []string) {
	opts := BuildConditionsOptions{
		MainTableAlias:       "e",
		PropertiesColumnName: "$properties",
		DefinedColumns:       make(map[string]string),
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
	// A map so it can be used to ensure unique conditions
	var eventConds map[string]any = make(map[string]any)
	var otherConds map[string]any = make(map[string]any)
	for _, f := range filters {
		// skip session table filters from BuildEventConditions
		// TODO: remove this and make sure to pass only valid events/filters when used
		if f.Type == FilterDuration || f.Type == FilterUserAnonymousId {
			continue
		}
		conds := addFilter(f, opts)
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
	return eventConditions, otherConditions
}

func addFilter(f model.Filter, opts BuildConditionsOptions) []string {
	alias := opts.MainTableAlias
	if alias != "" && !strings.HasSuffix(alias, ".") {
		alias += "."
	}
	// TODO: find why this is not returning sub-conditions anymore
	log.Printf(">>>>>>>>>>>>>>000000000")
	log.Printf(">> filters: %v", f.Filters)
	log.Printf(">>>>>>>>>>>>>>000000000")
	if f.IsEvent {
		var parts []string
		parts = append(parts, fmt.Sprintf("%s`$event_name` = '%s'", alias, f.Name))
		log.Printf(">>>>>>>>>>>>>>000000000>>> Is event")
		log.Printf(">> parts: %v", parts)
		log.Printf(">>>>>>>>>>>>>>000000000>>>")
		for _, sub := range f.Filters {

			subConds := addFilter(sub, opts)
			if len(subConds) > 0 {
				log.Printf(">>>>>>>>>>>>>>000000000>>>")
				log.Printf(">> subConds: %v", subConds)
				log.Printf(">>>>>>>>>>>>>>000000000>>>")
				parts = append(parts, "("+strings.Join(subConds, " AND ")+")")
			}
		}
		return []string{"(" + strings.Join(parts, " AND ") + ")"}
	}

	cfg, ok := propertyKeyMap[strings.ToUpper(f.Name)]
	isNumeric := cfg.IsNumeric || f.DataType == "float" || f.DataType == "number" || f.DataType == "integer"
	if !ok {
		cfg = filterConfig{LogicalProperty: f.Name, IsNumeric: isNumeric}
	}
	acc := getColumnAccessor(cfg.LogicalProperty, cfg.IsNumeric, opts)

	switch f.Operator {
	case "isAny", "onAny":
		if f.IsEvent {
			return []string{fmt.Sprintf("%s`$event_name` = '%s'", alias, f.Name)}
		}
	default:
		if c := buildCond(acc, f.Value, f.Operator, cfg.IsNumeric); c != "" {
			return []string{c}
		}
	}
	return []string{}
}

var compOps = map[string]string{
	"equals": "=", "is": "=", "on": "=",
	"notEquals": "<>", "not": "<>", "off": "<>",
	"greaterThan": ">", "gt": ">",
	"greaterThanOrEqual": ">=", "gte": ">=",
	"lessThan": "<", "lt": "<",
	"lessThanOrEqual": "<=", "lte": "<=",
}

// buildCond constructs a condition string based on operator and values
func buildCond(expr string, values []string, operator string, isNumeric bool) string {
	if len(values) == 0 {
		return ""
	}
	switch operator {
	case "isNot", "not":
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
		// build NOT IN clause
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
		// build match expressions
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
		if op, ok := compOps[operator]; ok {
			tmpl := "%s " + op + " %s"
			return multiValCond(expr, values, tmpl, isNumeric)
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

func contains(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}

func getStepSize(startTimestamp int64, endTimestamp int64, density int, factor int) uint64 {
	factorInt64 := int64(factor)
	stepSize := (endTimestamp / factorInt64) - (startTimestamp / factorInt64)

	if density <= 1 {
		return uint64(stepSize)
	}

	return uint64(stepSize) / uint64(density)
}

func FillMissingDataPoints(
	startTime, endTime int64,
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

func BuildWhere(filters []model.Filter, eventsOrder string, eventsAlias, sessionsAlias string, isSessionJoin ...bool) (events, eventFilters, sessionFilters []string) {
	events = make([]string, 0, len(filters))
	eventFilters = make([]string, 0, len(filters))
	sessionFilters = make([]string, 0, len(filters)+1)
	sessionFilters = append(sessionFilters, fmt.Sprintf("%s.duration IS NOT NULL", sessionsAlias))
	sessionColumns := GetSessionColumns(len(isSessionJoin) > 0 && isSessionJoin[0])

	var sessionFiltersList, eventFiltersList []model.Filter
	for _, f := range filters {
		if _, ok := sessionColumns[f.Name]; ok {
			sessionFiltersList = append(sessionFiltersList, f)
		} else {
			eventFiltersList = append(eventFiltersList, f)
		}
	}

	evConds, misc := BuildEventConditions(eventFiltersList, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: eventsAlias,
		EventsOrder:    eventsOrder,
	})
	events = append(events, evConds...)
	eventFilters = append(eventFilters, misc...)

	_, sConds := BuildEventConditions(sessionFiltersList, BuildConditionsOptions{
		DefinedColumns: SessionColumns,
		MainTableAlias: sessionsAlias,
	})
	durConds, _ := BuildDurationWhere(filters, sessionsAlias)
	sessionFilters = append(sessionFilters, durConds...)
	sessionFilters = append(sessionFilters, sConds...)

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
		if len(eventsWhere) > 0 {
			return fmt.Sprintf("HAVING %s", strings.Join(eventsWhere, " AND "))
		}
	case "or":
		if len(eventsWhere) > 0 {
			return fmt.Sprintf("HAVING %s", strings.Join(eventsWhere, " OR "))
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
	log.Printf(">>>>>>>>>>>>>>>>>>>>>>>>>>> Executing query:\n%s\n<<<<<<<<<<<<<<<<<<<<<<<<<<", query)
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

func GetSessionColumns(join ...bool) map[string]string {
	if len(join) > 0 && join[0] {
		keys := []string{"userId", "userAnonymousId", "userDevice", "platform"}
		out := make(map[string]string, len(keys))
		for _, k := range keys {
			out[k] = SessionColumns[k]
		}
		return out
	}
	return SessionColumns
}

var SessionColumns = map[string]string{
	"userBrowser":        "user_browser",
	"userDevice":         "user_device",
	"platform":           "user_device_type",
	"userId":             "user_id",
	"userAnonymousId":    "user_anonymous_id",
	"referrer":           "referrer",
	"userDeviceIos":      "user_device",
	"userIdIos":          "user_id",
	"userAnonymousIdIos": "user_anonymous_id",
	// TODO Add any missing session columns to be considered.
}
