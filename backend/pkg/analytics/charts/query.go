package charts

import (
	"fmt"
	"log"
	"openreplay/backend/pkg/analytics/db"
	"strconv"
	"strings"
)

type Payload struct {
	*MetricPayload
	GroupByColumn string // TODO remove this field
	ProjectId     int
	UserId        uint64
}

type QueryBuilder interface {
	Execute(p Payload, conn db.Connector) (interface{}, error)
}

func NewQueryBuilder(p Payload) (QueryBuilder, error) {
	switch p.MetricType {
	case MetricTypeTimeseries:
		return TimeSeriesQueryBuilder{}, nil
	case MetricTypeFunnel:
		return FunnelQueryBuilder{}, nil
	case MetricTypeTable:
		if p.MetricOf == "jsException" {
			return TableErrorsQueryBuilder{}, nil
		}
		return TableQueryBuilder{}, nil
	case MetricTypeHeatmap:
		return HeatmapQueryBuilder{}, nil
	case MetricTypeSession:
		return HeatmapSessionQueryBuilder{}, nil
	case MetricUserJourney:
		return UserJourneyQueryBuilder{}, nil
	default:
		return nil, fmt.Errorf("unknown metric type: %s", p.MetricType)
	}
}

type BuildConditionsOptions struct {
	MainTableAlias       string
	PropertiesColumnName string
	DefinedColumns       map[string]string
}

var propertyKeyMap = map[string]filterConfig{
	"LOCATION":        {LogicalProperty: "url_path"},
	"FETCH":           {LogicalProperty: "url_path"},
	"CLICK":           {LogicalProperty: "label"},
	"INPUT":           {LogicalProperty: "label"},
	"fetchUrl":        {LogicalProperty: "url_path"},
	"fetchStatusCode": {LogicalProperty: "status", IsNumeric: true},
	// TODO add more mappings as needed
}

// filterConfig holds configuration for a filter type
type filterConfig struct {
	LogicalProperty string
	IsNumeric       bool
}

// getColumnAccessor returns the column name for a logical property
func getColumnAccessor(logical string, isNumeric bool, opts BuildConditionsOptions) string {
	// helper: wrap names starting with $ in quotes
	quote := func(name string) string {
		if strings.HasPrefix(name, "$") {
			return fmt.Sprintf("\"%s\"", name)
		}
		return name
	}

	// explicit column mapping
	if col, ok := opts.DefinedColumns[logical]; ok {
		col = quote(col)
		if opts.MainTableAlias != "" {
			return fmt.Sprintf("%s.%s", opts.MainTableAlias, col)
		}
		return col
	}

	// determine property key
	propKey := logical
	if cfg, ok := propertyKeyMap[logical]; ok {
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
		return fmt.Sprintf("toFloat64(JSONExtractString(toString(%s), '%s'))", colName, propKey)
	}
	return fmt.Sprintf("JSONExtractString(toString(%s), '%s')", colName, propKey)
}

// buildEventConditions builds SQL conditions and names from filters
func buildEventConditions(filters []Filter, options ...BuildConditionsOptions) (conds, names []string) {
	opts := BuildConditionsOptions{
		MainTableAlias:       "",
		PropertiesColumnName: "$properties",
		DefinedColumns:       make(map[string]string),
	}
	if len(options) > 0 {
		opt := options[0]
		if opt.MainTableAlias != "" {
			opts.MainTableAlias = opt.MainTableAlias
		}
		if opt.PropertiesColumnName != "" {
			opts.PropertiesColumnName = opt.PropertiesColumnName
		}
		if opt.DefinedColumns != nil {
			opts.DefinedColumns = opt.DefinedColumns
		}
	}
	for _, f := range filters {
		if f.Type == FilterDuration {
			continue
		}

		fConds, fNames := addFilter(f, opts)
		if len(fConds) > 0 {
			conds = append(conds, fConds...)
			names = append(names, fNames...)
		}
	}
	return
}

// addFilter processes a single Filter and returns its SQL conditions and associated event names
func addFilter(f Filter, opts BuildConditionsOptions) (conds []string, names []string) {
	var ftype = string(f.Type)
	// resolve filter configuration, default if missing
	cfg, ok := propertyKeyMap[ftype]
	if !ok {
		cfg = filterConfig{LogicalProperty: ftype, IsNumeric: false}
		log.Printf("using default config for type: %v", f.Type)
	}
	acc := getColumnAccessor(cfg.LogicalProperty, cfg.IsNumeric, opts)

	// operator-based conditions
	switch f.Operator {
	case "isAny", "onAny":
		if f.IsEvent {
			names = append(names, ftype)
		}
	default:
		if c := buildCond(acc, f.Value, f.Operator, cfg.IsNumeric); c != "" {
			conds = append(conds, c)
			if f.IsEvent {
				names = append(names, ftype)
			}
		}
	}

	// nested sub-filters
	if len(f.Filters) > 0 {
		subConds, subNames := buildEventConditions(f.Filters, opts)
		if len(subConds) > 0 {
			conds = append(conds, strings.Join(subConds, " AND "))
			names = append(names, subNames...)
		}
	}

	return
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
	case "contains":
		// wrap values with % on both sides
		wrapped := make([]string, len(values))
		for i, v := range values {
			wrapped[i] = fmt.Sprintf("%%%s%%", v)
		}
		return multiValCond(expr, wrapped, "%s ILIKE %s", false)
	case "notContains":
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

func buildSessionConditions(filters []Filter) []string {
	var conds []string

	return conds
}

func buildInClause(values []string) string {
	var quoted []string
	for _, v := range values {
		quoted = append(quoted, fmt.Sprintf("'%s'", v))
	}
	return strings.Join(quoted, ",")
}

func buildStaticEventWhere(p Payload) string {
	return strings.Join([]string{
		fmt.Sprintf("main.project_id = %d", p.ProjectId),
		fmt.Sprintf("main.created_at >= toDateTime(%d / 1000)", p.StartTimestamp),
		fmt.Sprintf("main.created_at <= toDateTime(%d / 1000)", p.EndTimestamp),
	}, " AND ")
}

func buildStaticSessionWhere(p Payload, sessionConds []string) (string, string) {
	static := []string{fmt.Sprintf("s.project_id = %d", p.ProjectId)}
	sessWhere := strings.Join(static, " AND ")
	if len(sessionConds) > 0 {
		sessWhere += " AND " + strings.Join(sessionConds, " AND ")
	}
	sessJoin := strings.Join(append(static, append(sessionConds,
		fmt.Sprintf("s.datetime >= toDateTime(%d / 1000)", p.StartTimestamp),
		fmt.Sprintf("s.datetime <= toDateTime(%d / 1000)", p.EndTimestamp))...), " AND ")
	return sessWhere, sessJoin
}

func buildHavingClause(conds []string) string {
	seqConds := append([]string{}, conds...)
	if len(seqConds) == 1 {
		seqConds = append(seqConds, "1")
	}
	if len(seqConds) == 0 {
		return ""
	}
	var parts []string
	for i := range seqConds {
		parts = append(parts, fmt.Sprintf("(?%d)", i+1))
	}
	pattern := strings.Join(parts, "")
	args := []string{"toDateTime(main.created_at)"}
	args = append(args, seqConds...)
	return fmt.Sprintf("HAVING sequenceMatch('%s')(%s)) AS f", pattern, strings.Join(args, ",\n         "))
}

func contains(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
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

	stepSize := uint64(getStepSize(startTime, endTime, density, false, 1000))
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

func partitionFilters(filters []Filter) (sessionFilters []Filter, eventFilters []Filter) {
	for _, f := range filters {
		if f.IsEvent {
			eventFilters = append(eventFilters, f)
		} else {
			sessionFilters = append(sessionFilters, f)
		}
	}
	return
}

// Returns a map: logical property -> CTE alias (e.g., "userBrowser" -> "userBrowser")
func cteColumnAliases() map[string]string {
	aliases := make(map[string]string)
	for logical := range mainColumns {
		aliases[logical] = logical
	}
	return aliases
}

// Returns a map: logical property -> source column (e.g., "userBrowser" -> "$browser")
func cteSourceColumns() map[string]string {
	cols := make(map[string]string)
	for logical, col := range mainColumns {
		cols[logical] = col
	}
	return cols
}

// Helper for reverse lookup (used for dynamic SELECT)
func reverseLookup(m map[string]string, value string) string {
	for k, v := range m {
		if v == value {
			return k
		}
	}
	return ""
}

func eventNameCondition(table, metricOf string) string {
	if table == "" {
		table = "main"
	}
	switch metricOf {
	case string(MetricOfTableFetch):
		return fmt.Sprintf("%s.`$event_name` = 'REQUEST'", table)
	case string(MetricOfTableLocation):
		return fmt.Sprintf("%s.`$event_name` = 'LOCATION'", table)
	default:
		return ""
	}
}

func buildDurationWhere(filters []Filter) ([]string, []Filter) {
	var conds []string
	var rest []Filter
	for _, f := range filters {
		if string(f.Type) == "duration" {
			v := f.Value
			if len(v) == 1 {
				if v[0] != "" {
					if d, err := strconv.ParseInt(v[0], 10, 64); err == nil {
						conds = append(conds, fmt.Sprintf("sessions.duration >= %d", d))
					}
				}
			} else if len(v) >= 2 {
				if v[0] != "" {
					if d, err := strconv.ParseInt(v[0], 10, 64); err == nil {
						conds = append(conds, fmt.Sprintf("sessions.duration >= %d", d))
					}
				}
				if v[1] != "" {
					if d, err := strconv.ParseInt(v[1], 10, 64); err == nil {
						conds = append(conds, fmt.Sprintf("sessions.duration <= %d", d))
					}
				}
			}
		} else {
			rest = append(rest, f)
		}
	}
	return conds, rest
}
