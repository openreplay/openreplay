package charts

import (
	"fmt"
	"openreplay/backend/pkg/analytics/db"
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
		return TableQueryBuilder{}, nil
	case MetricTypeHeatmap:
		return HeatmapQueryBuilder{}, nil
	default:
		return nil, fmt.Errorf("unknown metric type: %s", p.MetricType)
	}
}

var validFilterTypes = map[FilterType]struct{}{
	"LOCATION":            {},
	"CLICK":               {},
	FilterClick:           {},
	FilterInput:           {},
	FilterLocation:        {},
	FilterCustom:          {},
	FilterFetch:           {},
	FilterTag:             {},
	FilterUserCountry:     {},
	FilterUserCity:        {},
	FilterUserState:       {},
	FilterUserId:          {},
	FilterUserAnonymousId: {},
	FilterUserOs:          {},
	FilterUserBrowser:     {},
	FilterUserDevice:      {},
	FilterPlatform:        {},
	FilterRevId:           {},
	FilterReferrer:        {},
	FilterUtmSource:       {},
	FilterUtmMedium:       {},
	FilterUtmCampaign:     {},
	FilterDuration:        {},
	FilterMetadata:        {},
}

type BuildConditionsOptions struct {
	MainTableAlias       string
	PropertiesColumnName string
	DefinedColumns       map[string]string
}

type filterConfig struct {
	LogicalProperty string
	EventName       string
	IsNumeric       bool
}

var propertyKeyMap = map[string]filterConfig{
	"LOCATION":        {LogicalProperty: "url_path"},
	"CLICK":           {LogicalProperty: "label"},
	"INPUT":           {LogicalProperty: "label"},
	"fetchUrl":        {LogicalProperty: "url_path"},
	"fetchStatusCode": {LogicalProperty: "status", IsNumeric: true},
	// TODO add more mappings as needed
}

func getColumnAccessor(logicalProp string, isNumeric bool, opts BuildConditionsOptions) string {
	// Use CTE alias if present in DefinedColumns
	if actualCol, ok := opts.DefinedColumns[logicalProp]; ok && actualCol != "" {
		return actualCol
	}
	// Otherwise, extract from $properties JSON
	jsonFunc := "JSONExtractString"
	if isNumeric {
		jsonFunc = "JSONExtractFloat"
	}
	return fmt.Sprintf("%s(toString(%s), '%s')", jsonFunc, opts.PropertiesColumnName, logicalProp)
}

func buildEventConditions(filters []Filter, options ...BuildConditionsOptions) (conds, names []string) {
	opts := BuildConditionsOptions{
		MainTableAlias:       "main",
		PropertiesColumnName: "$properties",
		DefinedColumns:       make(map[string]string),
	}
	if len(options) > 0 {
		if options[0].MainTableAlias != "" {
			opts.MainTableAlias = options[0].MainTableAlias
		}
		if options[0].PropertiesColumnName != "" {
			opts.PropertiesColumnName = options[0].PropertiesColumnName
		}
		if options[0].DefinedColumns != nil {
			opts.DefinedColumns = options[0].DefinedColumns
		}
	}
	for _, f := range filters {
		_, okType := validFilterTypes[f.Type]
		if !okType {
			continue
		}
		// process main filter
		if f.Type == FilterFetch {
			var fetchConds []string
			for _, nf := range f.Filters {
				cfg, ok := propertyKeyMap[string(nf.Type)]
				if !ok {
					continue
				}
				acc := getColumnAccessor(cfg.LogicalProperty, cfg.IsNumeric, opts)
				if c := buildCond(acc, nf.Value, f.Operator); c != "" {
					fetchConds = append(fetchConds, c)
				}
			}
			if len(fetchConds) > 0 {
				conds = append(conds, strings.Join(fetchConds, " AND "))
				names = append(names, "REQUEST")
			}
		} else {
			cfg, ok := propertyKeyMap[string(f.Type)]
			if !ok {
				cfg = filterConfig{LogicalProperty: string(f.Type)}
			}
			acc := getColumnAccessor(cfg.LogicalProperty, cfg.IsNumeric, opts)

			// when the Operator isAny or onAny just add the event name to the list
			if f.Operator == "isAny" || f.Operator == "onAny" {
				if f.IsEvent {
					names = append(names, string(f.Type))
				}
				continue
			}

			if c := buildCond(acc, f.Value, f.Operator); c != "" {
				conds = append(conds, c)
				if f.IsEvent {
					names = append(names, string(f.Type))
				}
			}
		}

		// process sub-filters
		if len(f.Filters) > 0 && f.Type != FilterFetch {
			subOpts := opts // Inherit parent's options
			subConds, subNames := buildEventConditions(f.Filters, subOpts)
			if len(subConds) > 0 {
				conds = append(conds, strings.Join(subConds, " AND "))
				names = append(names, subNames...)
			}
		}
	}
	return
}

func buildSessionConditions(filters []Filter) []string {
	var conds []string
	for _, f := range filters {
		if !f.IsEvent {
			switch f.Type {
			case FilterUserCountry:
				conds = append(conds, buildCond("s.user_country", f.Value, f.Operator))
			case FilterUserCity:
				conds = append(conds, buildCond("s.user_city", f.Value, f.Operator))
			case FilterUserState:
				conds = append(conds, buildCond("s.user_state", f.Value, f.Operator))
			case FilterUserId:
				conds = append(conds, buildCond("s.user_id", f.Value, f.Operator))
			case FilterUserAnonymousId:
				conds = append(conds, buildCond("s.user_anonymous_id", f.Value, f.Operator))
			case FilterUserOs:
				conds = append(conds, buildCond("s.user_os", f.Value, f.Operator))
			case FilterUserBrowser:
				conds = append(conds, buildCond("s.user_browser", f.Value, f.Operator))
			case FilterUserDevice:
				conds = append(conds, buildCond("s.user_device", f.Value, f.Operator))
			case FilterPlatform:
				conds = append(conds, buildCond("s.user_device_type", f.Value, f.Operator))
			case FilterRevId:
				conds = append(conds, buildCond("s.rev_id", f.Value, f.Operator))
			case FilterReferrer:
				conds = append(conds, buildCond("s.base_referrer", f.Value, f.Operator))
			case FilterUtmSource:
				conds = append(conds, buildCond("s.utm_source", f.Value, f.Operator))
			case FilterUtmMedium:
				conds = append(conds, buildCond("s.utm_medium", f.Value, f.Operator))
			case FilterUtmCampaign:
				conds = append(conds, buildCond("s.utm_campaign", f.Value, f.Operator))
			case FilterDuration:
				if len(f.Value) == 2 {
					conds = append(conds, fmt.Sprintf("s.duration >= '%s'", f.Value[0]))
					conds = append(conds, fmt.Sprintf("s.duration <= '%s'", f.Value[1]))
				}
			case FilterMetadata:
				if f.Source != "" {
					conds = append(conds, buildCond(fmt.Sprintf("s.%s", f.Source), f.Value, f.Operator))
				}
			}
		}
	}
	return conds
}

func buildCond(expr string, values []string, operator string) string {
	if len(values) == 0 {
		return ""
	}
	switch operator {
	case "contains":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s ILIKE '%%%s%%'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "regex":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("match(%s, '%s')", expr, v))
		}

		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "notContains":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("NOT (%s ILIKE '%%%s%%')", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "startsWith":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s ILIKE '%s%%'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "endsWith":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s ILIKE '%%%s'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "notEquals", "not", "off":
		if len(values) > 1 {
			return fmt.Sprintf("%s NOT IN (%s)", expr, buildInClause(values))
		}
		return fmt.Sprintf("%s <> '%s'", expr, values[0])
	case "greaterThan", "gt":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s > '%s'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "greaterThanOrEqual", "gte":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s >= '%s'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "lessThan", "lt":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s < '%s'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "lessThanOrEqual", "lte":
		var conds []string
		for _, v := range values {
			conds = append(conds, fmt.Sprintf("%s <= '%s'", expr, v))
		}
		if len(conds) > 1 {
			return "(" + strings.Join(conds, " OR ") + ")"
		}
		return conds[0]
	case "in":
		if len(values) > 1 {
			return fmt.Sprintf("%s IN (%s)", expr, buildInClause(values))
		}
		return fmt.Sprintf("%s = '%s'", expr, values[0])
	case "notIn":
		if len(values) > 1 {
			return fmt.Sprintf("%s NOT IN (%s)", expr, buildInClause(values))
		}
		return fmt.Sprintf("%s <> '%s'", expr, values[0])
	case "equals", "is", "on":
		if len(values) > 1 {
			return fmt.Sprintf("%s IN (%s)", expr, buildInClause(values))
		}
		return fmt.Sprintf("%s = '%s'", expr, values[0])
	default:
		if len(values) > 1 {
			return fmt.Sprintf("%s IN (%s)", expr, buildInClause(values))
		}
		return fmt.Sprintf("%s = '%s'", expr, values[0])
	}
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
