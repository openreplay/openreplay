package charts

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"sort"
	"strconv"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
)

var validMetricOfValues = map[MetricOfTable]struct{}{
	MetricOfTableBrowser:    {},
	MetricOfTableDevice:     {},
	MetricOfTableCountry:    {},
	MetricOfTableUserId:     {},
	MetricOfTableLocation:   {},
	MetricOfTableReferrer:   {},
	MetricOfTableFetch:      {},
	MetricOfTableResolution: {},
}

type TableQueryBuilder struct{}

type TableValue struct {
	Name  string `json:"name"`
	Total uint64 `json:"total"`
}

type TableResponse struct {
	Total  uint64       `json:"total"`
	Count  uint64       `json:"count"`
	Values []TableValue `json:"values"`
}

const (
	MetricFormatSessionCount = "sessionCount"
	MetricFormatUserCount    = "userCount"
	nilUUIDString            = "00000000-0000-0000-0000-000000000000"
)

var propertySelectorMap = map[string]string{
	string(MetricOfTableLocation):   "JSONExtractString(toString(main.`$properties`), 'url_path')",
	string(MetricOfTableUserId):     "if(empty(user_id) OR user_id IS NULL, 'Anonymous', user_id)",
	string(MetricOfTableBrowser):    "main.`$browser`",
	string(MetricOfTableDevice):     "if(empty(user_device) OR user_device IS NULL, 'Undefined', user_device)",
	string(MetricOfTableCountry):    "toString(user_country)",
	string(MetricOfTableReferrer):   "main.`$referrer`",
	string(MetricOfTableFetch):      "JSONExtractString(toString(main.`$properties`), 'url_path')",
	string(MetricOfTableResolution): "if(screen_width = 0 AND screen_height = 0, 'Unknown', concat(toString(screen_width), 'x', toString(screen_height)))",
}

func (t *TableQueryBuilder) Execute(p *Payload, conn driver.Conn) (interface{}, error) {
	if p.MetricOf == "" {
		return nil, fmt.Errorf("MetricOf is empty")
	}
	if _, ok := validMetricOfValues[MetricOfTable(p.MetricOf)]; !ok {
		return nil, fmt.Errorf("invalid MetricOf value: %s", p.MetricOf)
	}
	metricFormat := p.MetricFormat
	if metricFormat != MetricFormatSessionCount && metricFormat != MetricFormatUserCount {
		metricFormat = MetricFormatSessionCount
	}
	query, err := t.buildQuery(p, metricFormat)
	if err != nil {
		return nil, fmt.Errorf("error building query: %w", err)
	}
	rows, err := conn.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error executing query: %s\nQuery: %s", err, query)
		return nil, fmt.Errorf("error executing query: %w", err)
	}
	defer rows.Close()

	var overallTotal uint64
	var overallCount uint64
	var rawValues []TableValue
	first := true
	for rows.Next() {
		var name string
		var count uint64
		var total uint64
		var countAll uint64
		if err := rows.Scan(&total, &name, &count, &countAll); err != nil {
			return nil, fmt.Errorf("error scanning row: %w", err)
		}
		if first {
			overallCount = countAll
			first = false
		}
		rawValues = append(rawValues, TableValue{Name: name, Total: count})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	var grouped []TableValue
	if p.MetricOf == string(MetricOfTableResolution) {
		grouped, overallTotal = t.groupResolutionClusters(rawValues, p.Page, p.Limit)
	} else {
		overallTotal = uint64(len(rawValues))
		grouped = rawValues
	}

	if grouped == nil {
		grouped = []TableValue{}
	}

	return &TableResponse{Total: overallTotal, Count: overallCount, Values: grouped}, nil
}

func (t *TableQueryBuilder) buildQuery(r *Payload, metricFormat string) (string, error) {
	if r == nil {
		return "", errors.New("payload is nil")
	}
	if len(r.Series) == 0 {
		return "", errors.New("no series provided")
	}
	if r.ProjectId <= 0 {
		return "", errors.New("invalid project ID")
	}
	if r.StartTimestamp <= 0 || r.EndTimestamp <= 0 {
		return "", errors.New("invalid timestamps")
	}
	if r.StartTimestamp >= r.EndTimestamp {
		return "", errors.New("start timestamp must be before end timestamp")
	}
	if r.Page <= 0 {
		return "", errors.New("page must be positive")
	}

	s := r.Series[0]

	// Build event filter conditions with error handling
	durConds, _ := BuildDurationWhere(s.Filter.Filters)
	sessFilters, _ := FilterOutTypes(s.Filter.Filters, []model.FilterType{FilterDuration, FilterUserAnonymousId})

	eventConditions, otherConds := BuildEventConditions(sessFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "main",
		EventsOrder:    string(s.Filter.EventsOrder),
	})

	prewhereParts := make([]string, 0, 5+len(otherConds))

	// Add single event condition for 'then' order
	if s.Filter.EventsOrder == "then" && len(eventConditions) == 1 {
		prewhereParts = append(prewhereParts, eventConditions[0])
	}

	// Add safe parameterized conditions - sanitize integers to prevent injection
	prewhereParts = append(prewhereParts, fmt.Sprintf("main.project_id = %d", r.ProjectId))
	prewhereParts = append(prewhereParts, fmt.Sprintf("main.created_at >= toDateTime(%d/1000)", r.StartTimestamp))
	prewhereParts = append(prewhereParts, fmt.Sprintf("main.created_at <= toDateTime(%d/1000)", r.EndTimestamp))

	if len(otherConds) > 0 {
		prewhereParts = append(prewhereParts, otherConds...)
	}

	// Build join clause based on events order with proper error handling
	joinClause := ""
	switch s.Filter.EventsOrder {
	case "then":
		if len(eventConditions) > 1 {
			var patBuilder strings.Builder
			patBuilder.Grow(len(eventConditions) * 6) // Pre-allocate capacity
			for i := range eventConditions {
				patBuilder.WriteString(fmt.Sprintf("(?%d)", i+1))
			}
			joinClause = fmt.Sprintf(
				"HAVING sequenceMatch('%s')(\n    toDateTime(main.created_at),\n    %s\n)",
				patBuilder.String(),
				strings.Join(eventConditions, ",\n    "),
			)
		}
	case "and":
		if len(eventConditions) > 0 {
			countConds := make([]string, len(eventConditions))
			for i, c := range eventConditions {
				countConds[i] = fmt.Sprintf("countIf(%s) > 0", c)
			}
			joinClause = fmt.Sprintf("HAVING %s", strings.Join(countConds, " AND "))
		}
	case "or":
		if len(eventConditions) > 0 {
			countConds := make([]string, len(eventConditions))
			for i, c := range eventConditions {
				countConds[i] = fmt.Sprintf("countIf(%s) > 0", c)
			}
			joinClause = fmt.Sprintf("HAVING %s", strings.Join(countConds, " OR "))
		}
	case "":
		break
	default:
		return "", fmt.Errorf("unknown events order: %s", s.Filter.EventsOrder)
	}

	// Build sessions conditions with pre-allocated slice
	sessionConditions := make([]string, 0, 6+len(durConds))
	sessionConditions = append(sessionConditions, fmt.Sprintf("s.project_id = %d", r.ProjectId))
	sessionConditions = append(sessionConditions, "isNotNull(s.duration)")
	sessionConditions = append(sessionConditions, fmt.Sprintf("s.datetime >= toDateTime(%d/1000)", r.StartTimestamp))
	sessionConditions = append(sessionConditions, fmt.Sprintf("s.datetime <= toDateTime(%d/1000)", r.EndTimestamp))

	// Add duration conditions to sessions
	for _, durCond := range durConds {
		if durCond != "" { // Avoid empty conditions
			sessionDurCond := strings.ReplaceAll(durCond, "main.duration", "s.duration")
			sessionConditions = append(sessionConditions, sessionDurCond)
		}
	}

	// Handle user count specific conditions
	if metricFormat == MetricFormatUserCount {
		sessionConditions = append(sessionConditions,
			fmt.Sprintf("NOT (empty(s.user_id) AND (s.user_uuid IS NULL OR s.user_uuid = '%s'))", nilUUIDString))
	}

	// Get property selector and determine if it's from events or sessions
	propSel, ok := propertySelectorMap[r.MetricOf]
	if !ok {
		// Sanitize property name to prevent injection
		safePropName := strings.ReplaceAll(r.MetricOf, "'", "\\'")
		propSel = fmt.Sprintf("JSONExtractString(toString(main.`$properties`), '%s')", safePropName)
	}

	// Determine if property comes from events table (main) or sessions table (s)
	isFromEvents := strings.Contains(propSel, "main.")
	var eventsSelect, groupByClause string

	if isFromEvents {
		// Property comes from events table, select it in the events subquery
		eventsSelect = fmt.Sprintf("main.session_id, %s AS metric_value", propSel)
		groupByClause = "main.session_id, metric_value"
	} else {
		// Property comes from sessions table, select session_id only in events subquery
		eventsSelect = "main.session_id"
		groupByClause = "main.session_id"
	}

	// Build final join clause
	var finalJoinClause string
	if joinClause != "" {
		finalJoinClause = fmt.Sprintf("GROUP BY %s\n%s\n", groupByClause, joinClause)
	} else {
		finalJoinClause = fmt.Sprintf("GROUP BY %s\n", groupByClause)
	}

	// Determine aggregation column
	distinctColumn := "session_id"
	if metricFormat == MetricFormatUserCount {
		distinctColumn = "if(empty(user_id), toString(user_uuid), user_id)"
	}

	// Final property selector for outer query
	var finalPropertySelector string
	if isFromEvents {
		finalPropertySelector = "filtred_sessions.metric_value"
	} else {
		finalPropertySelector = propSel
	}

	// Calculate limit and offset with bounds checking
	const DefaultLimit = 10
	const MaxLimit = 1000

	limit := r.Limit
	if limit <= 0 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}

	offset := 0
	if r.Page > 1 {
		offset = (r.Page - 1) * limit
	}

	// Build the final query with proper string formatting
	var query string
	baseSelectParts := []string{
		fmt.Sprintf("COUNT(DISTINCT %s) OVER () AS main_count", finalPropertySelector),
		fmt.Sprintf("%s AS name", finalPropertySelector),
		fmt.Sprintf("count(DISTINCT %s) AS total", distinctColumn),
		fmt.Sprintf("COALESCE(SUM(count(DISTINCT %s)) OVER (), 0) AS total_count", distinctColumn),
	}

	// Build subquery select parts
	subquerySelectParts := []string{
		"f.session_id AS session_id",
		"s.user_id AS user_id",
		"s.user_uuid AS user_uuid",
		"s.screen_width AS screen_width",
		"s.screen_height AS screen_height",
		"s.user_device AS user_device",
		"s.user_country AS user_country",
	}

	var innerSelectParts []string
	var groupByField string

	if isFromEvents {
		// Property from events table
		subquerySelectParts = append([]string{"f.session_id AS session_id", "f.metric_value AS metric_value"}, subquerySelectParts[1:]...)
		innerSelectParts = []string{
			eventsSelect,
			"MIN(main.created_at) AS first_event_ts",
			"MAX(main.created_at) AS last_event_ts",
		}
		groupByField = finalPropertySelector
	} else {
		// Property from sessions table
		innerSelectParts = []string{
			eventsSelect,
			"MIN(main.created_at) AS first_event_ts",
			"MAX(main.created_at) AS last_event_ts",
		}
		groupByField = propSel
	}

	// Construct the complete query
	query = fmt.Sprintf(`
SELECT %s
FROM (SELECT %s
      FROM (SELECT %s
            FROM product_analytics.events AS main
            WHERE %s %s) AS f
      INNER JOIN (SELECT DISTINCT ON (session_id) *
                  FROM experimental.sessions AS s
                  WHERE %s
                  ORDER BY _timestamp DESC) AS s ON(s.session_id=f.session_id)
      ) AS filtred_sessions
GROUP BY %s
ORDER BY total DESC
LIMIT %d OFFSET %d`,
		strings.Join(baseSelectParts, ",\n       "),              // Main SELECT
		strings.Join(subquerySelectParts, ",\n             "),    // Subquery SELECT
		strings.Join(innerSelectParts, ",\n                   "), // Inner SELECT
		strings.Join(prewhereParts, " AND "),                     // WHERE conditions
		finalJoinClause,                                          // GROUP BY + HAVING
		strings.Join(sessionConditions, " AND "),                 // Sessions WHERE
		groupByField,                                             // Final GROUP BY
		limit,
		offset,
	)

	logQuery(fmt.Sprintf("TableQueryBuilder.buildQuery: %s", query))

	return query, nil
}

func (t *TableQueryBuilder) groupResolutionClusters(raw []TableValue, page, limit int) ([]TableValue, uint64) {
	type cluster struct {
		minW, minH, maxW, maxH int
		total                  uint64
	}
	var clusters []cluster
	var rangePercent = 0.10 // 10% range for width and height

	for _, v := range raw {
		if v.Name == "Unknown" {
			hit := false
			for i := range clusters {
				c := &clusters[i]
				if c.minW == 0 && c.minH == 0 && c.maxW == 0 && c.maxH == 0 {
					c.total += v.Total
					hit = true
					break
				}
			}
			if !hit {
				clusters = append(clusters, cluster{0, 0, 0, 0, v.Total})
			}
			continue
		}
		parts := strings.Split(v.Name, "x")
		if len(parts) != 2 {
			continue
		}
		w, err1 := strconv.Atoi(parts[0])
		h, err2 := strconv.Atoi(parts[1])
		if err1 != nil || err2 != nil {
			continue
		}
		switched := false
		for i := range clusters {
			c := &clusters[i]
			if !(c.minW == 0 && c.minH == 0 && c.maxW == 0 && c.maxH == 0) {
				if math.Abs(float64(w-c.minW))/float64(c.minW) <= rangePercent && math.Abs(float64(h-c.minH))/float64(c.minH) <= rangePercent {
					if w < c.minW {
						c.minW = w
					}
					if h < c.minH {
						c.minH = h
					}
					if w > c.maxW {
						c.maxW = w
					}
					if h > c.maxH {
						c.maxH = h
					}
					c.total += v.Total
					switched = true
					break
				}
			}
		}
		if !switched {
			clusters = append(clusters, cluster{w, h, w, h, v.Total})
		}
	}

	sort.Slice(clusters, func(i, j int) bool { return clusters[i].total > clusters[j].total })
	var result []TableValue
	for _, c := range clusters {
		var name string
		if c.minW == 0 && c.minH == 0 && c.maxW == 0 && c.maxH == 0 {
			name = "Unknown"
		} else {
			name = fmt.Sprintf("%dx%d", c.maxW, c.maxH)
		}
		result = append(result, TableValue{Name: name, Total: c.total})
	}

	overall := uint64(len(clusters))
	// apply pagination
	offset := (page - 1) * limit
	tEnd := offset + limit
	if offset >= len(result) {
		return []TableValue{}, overall
	}
	if tEnd > len(result) {
		tEnd = len(result)
	}
	return result[offset:tEnd], overall
}
