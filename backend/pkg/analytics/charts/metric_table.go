package charts

import (
	"context"
	"errors"
	"fmt"
	"log"
	"slices"
	"strings"
	"time"

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
	Name       string `json:"name" ch:"name"`
	MainCount  uint64 `json:"-" ch:"main_count" default:"0"`
	TotalCount uint64 `json:"-" ch:"total_count" default:"0"`
	Total      uint64 `json:"total" ch:"total" default:"0"`
}
type ResolutionTableValue struct {
	NumberOfRows uint64 `json:"-" ch:"number_of_rows" default:"0"`
	CenterWidth  uint64 `json:"centerWidth" ch:"center_width"`
	CenterHeight uint64 `json:"centerHeight" ch:"center_height"`
	MaxWidth     uint64 `json:"maxWidth" ch:"max_width"`
	MaxHeight    uint64 `json:"maxHeight" ch:"max_height"`
	MinWidth     uint64 `json:"minWidth" ch:"min_width"`
	MinHeight    uint64 `json:"minHeight" ch:"min_height"`
	TotalInGroup uint64 `json:"totalInGroup" ch:"total_in_group" default:"0"`
	FullCount    uint64 `json:"-" ch:"full_count" default:"0"`
}

type TableResponse struct {
	Total  uint64      `json:"total"`
	Count  uint64      `json:"count"`
	Values interface{} `json:"values"`
}

const (
	MetricFormatSessionCount = "sessionCount"
	MetricFormatUserCount    = "userCount"
	MetricFormatEventCount   = "eventCount"
	nilUUIDString            = "00000000-0000-0000-0000-000000000000"

	// Pagination constants
	DefaultLimit = 10
	MaxLimit     = 1000
)

var eventsProperties []string = []string{string(MetricOfTableLocation)}

var propertySelectorMap = map[string]string{
	string(MetricOfTableLocation):   "`$current_path`",
	string(MetricOfTableUserId):     "user_id",
	string(MetricOfTableBrowser):    "main.`$browser`",
	string(MetricOfTableDevice):     "if(notEmpty(user_device), user_device, 'Undefined')",
	string(MetricOfTableCountry):    "toString(user_country)",
	string(MetricOfTableReferrer):   "main.`$referrer`",
	string(MetricOfTableFetch):      "`$current_path`",
	string(MetricOfTableResolution): "if(screen_width = 0 AND screen_height = 0, 'Unknown', concat(toString(screen_width), 'x', toString(screen_height)))",
}
var sessionsPorpertySelectorMap = map[string]string{
	string(MetricOfTableUserId):     "if(notEmpty(user_id), user_id, 'Anonymous')",
	string(MetricOfTableBrowser):    "user_browser",
	string(MetricOfTableDevice):     "if(notEmpty(user_device), user_device, 'Undefined')",
	string(MetricOfTableCountry):    "toString(user_country)",
	string(MetricOfTableReferrer):   "main.`$referrer`",
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
	if p.MetricOf == "screenResolution" {
		return t.executeForTableOfResolutions(p, conn)
	}

	query, err := t.buildQuery(p, metricFormat)
	if err != nil {
		return nil, fmt.Errorf("error building query: %w", err)
	}
	var rawValues []TableValue = make([]TableValue, 0)
	if err = conn.Select(context.Background(), &rawValues, query); err != nil {
		log.Printf("Error executing query: %s\nQuery: %s", err, query)
		return nil, err
	}

	var valuesCount uint64
	var overallCount uint64
	if len(rawValues) > 0 {
		overallCount = rawValues[0].TotalCount
		valuesCount = rawValues[0].MainCount
	}

	return &TableResponse{Total: valuesCount, Count: overallCount, Values: rawValues}, nil
}
func (t *TableQueryBuilder) executeForTableOfResolutions(p *Payload, conn driver.Conn) (interface{}, error) {
	metricFormat := p.MetricFormat
	if metricFormat != MetricFormatSessionCount && metricFormat != MetricFormatUserCount {
		metricFormat = MetricFormatSessionCount
	}

	tmpQuery, query, params, err := t.buildTableOfResolutionsQuery(p, metricFormat)
	if err != nil {
		return nil, fmt.Errorf("error building screenResolution queries: %w", err)
	}
	queryParams := convertParams(params)
	err = conn.Exec(context.Background(), tmpQuery, queryParams...)
	if err != nil {
		return nil, fmt.Errorf("error executing tmp query for screenResolution: %w", err)
	}
	var rawValues []ResolutionTableValue = make([]ResolutionTableValue, 0)
	if err = conn.Select(context.Background(), &rawValues, query, queryParams...); err != nil {
		log.Printf("Error executing Table Of Resolutions query: %s\nQuery: %s", err, query)
		return nil, err
	}

	var overallTotal uint64
	var overallCount uint64
	i := 1
	for i < len(rawValues) && overallCount == 0 {
		overallCount = rawValues[i].NumberOfRows
		overallTotal = rawValues[i].FullCount
		i++
	}
	return &TableResponse{Total: overallTotal, Count: overallCount, Values: rawValues}, nil
}

func (t *TableQueryBuilder) buildQuery(r *Payload, metricFormat string) (string, error) {
	if r == nil {
		return "", errors.New("payload is nil")
	}

	s := r.Series[0]
	log.Printf("MetricOf: %s, MetricFormat: %s", r.MetricOf, metricFormat)
	if r.MetricOf == "screenResolution" {
		return "", fmt.Errorf("Should call buildTableOfResolutionsQuery instead of buildQuery for screenResolution metric")
	}
	// Build event filter conditions with error handling
	durConds, _ := BuildDurationWhere(s.Filter.Filters)

	eventConditions, otherConds := BuildEventConditions(s.Filter.Filters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "main",
		EventsOrder:    string(s.Filter.EventsOrder),
	})

	// Check if we should skip events table
	skipEventsTable := slices.Contains([]string{
		string(MetricOfTableUserId), string(MetricOfTableCountry),
		string(MetricOfTableDevice), string(MetricOfTableBrowser),
	}, r.MetricOf) && len(eventConditions) == 0 && len(otherConds) == 0
	if skipEventsTable {
		return t.buildSimplifiedQuery(r, metricFormat, durConds)
	}

	prewhereParts := t.buildPrewhereConditions(r, s.Filter.EventsOrder, eventConditions, otherConds)
	prewhereParts = append(prewhereParts, "notEmpty(metric_value)")
	sessionConditions := t.buildSessionConditions(r, metricFormat, durConds)
	joinClause, _, err := t.buildJoinClause(s.Filter.EventsOrder, eventConditions)
	if err != nil {
		return "", err
	}

	// Get property selector and determine if it's from events or sessions
	propSel, ok := propertySelectorMap[r.MetricOf]
	if !ok {
		// Sanitize property name to prevent injection
		safePropName := strings.ReplaceAll(r.MetricOf, "'", "\\'")
		propSel = fmt.Sprintf("JSONExtractString(toString(main.`$properties`), '%s')", safePropName)
	}

	// Determine if property comes from events table (main) or sessions table (s)
	//isFromEvents := strings.Contains(propSel, "main.")
	isFromEvents := slices.Contains(eventsProperties, r.MetricOf)
	var eventsSelect string = "main.session_id"

	// Build final join clause
	var finalJoinClause string = "GROUP BY ALL\n"
	if joinClause != "" {
		finalJoinClause = fmt.Sprintf("%s%s\n", finalJoinClause, joinClause)
	}

	// Determine aggregation column
	distinctColumn := "session_id"
	if metricFormat == MetricFormatUserCount {
		distinctColumn = "user_id"
	}

	pagination := t.calculatePagination(r.Page, r.Limit)

	// Build the final query with proper string formatting
	var query string
	baseSelectParts := []string{
		"COUNT(DISTINCT metric_value) OVER () AS main_count",
		"metric_value AS name",
		fmt.Sprintf("count(DISTINCT %s) AS total", distinctColumn),
		"any(total_count) AS total_count",
	}

	subquerySelectParts := t.subquerySelects(r)
	subquerySelectParts = append(subquerySelectParts, "metric_value")
	subquerySelectParts = append(subquerySelectParts, fmt.Sprintf("count(DISTINCT %s) OVER () AS total_count", distinctColumn))
	var innerSelectParts []string

	if isFromEvents {
		// Property from events table
		subquerySelectParts = append([]string{"f.metric_value AS metric_value"}, subquerySelectParts...)

	}
	innerSelectParts = []string{
		eventsSelect,
		fmt.Sprintf("%s AS metric_value", propSel),
		"MIN(main.created_at) AS first_event_ts",
		"MAX(main.created_at) AS last_event_ts",
	}

	var mainEventsTable = getMainEventsTable(r.StartTimestamp)
	var mainSessionsTable = getMainSessionsTable(r.StartTimestamp)
	// Construct the complete query
	query = fmt.Sprintf(`
SELECT %s
FROM (SELECT %s
      FROM (SELECT DISTINCT session_id, user_id
                  FROM %s AS s
                  WHERE %s
                  ) AS s
      INNER JOIN (SELECT %s
            FROM %s AS main
            WHERE %s 
			%s) AS f ON(s.session_id=f.session_id)
      ) AS filtred_sessions
GROUP BY metric_value
ORDER BY total DESC
LIMIT %d OFFSET %d`,
		strings.Join(baseSelectParts, ","),     // Main SELECT
		strings.Join(subquerySelectParts, ","), // Subquery SELECT
		mainSessionsTable,
		strings.Join(sessionConditions, " AND "), // Sessions WHERE
		strings.Join(innerSelectParts, ","),      // Inner SELECT
		mainEventsTable,
		strings.Join(prewhereParts, " AND "), // WHERE conditions
		finalJoinClause,
		pagination.Limit,
		pagination.Offset,
	)
	logQuery(fmt.Sprintf("TableQueryBuilder.buildQuery: %s", query))

	return query, nil
}

func (t *TableQueryBuilder) buildSimplifiedQuery(r *Payload, metricFormat string, durConds []string) (string, error) {
	// Get property selector for sessions
	propSel, ok := sessionsPorpertySelectorMap[r.MetricOf]
	if !ok {
		// Fallback for MetricOfTableUserId - should typically be available in propertySelectorMap
		propSel = "user_id"
	}

	// Remove "main." prefix if present since we're querying sessions table directly
	propSel = strings.ReplaceAll(propSel, "main.", "")

	// Build session conditions without duration conditions for now (you may need to adapt this)
	sessionConditions := t.buildSessionConditions(r, metricFormat, durConds)

	// Determine aggregation column
	distinctColumn := "session_id"
	if metricFormat == MetricFormatUserCount {
		distinctColumn = "user_id"
	}

	pagination := t.calculatePagination(r.Page, r.Limit)

	// Build simplified query that only uses sessions table
	baseSelectParts := []string{
		"COUNT(DISTINCT metric_name) OVER () AS main_count",
		"metric_name AS name",
		"count(DISTINCT metric_name) AS total",
		"any(total_count) AS total_count",
	}
	sessionProjections := []string{
		fmt.Sprintf("%s AS metric_name", propSel),
		"COUNT(DISTINCT metric_name) OVER () AS total_count"}
	mainSessionsTable := getMainSessionsTable(r.StartTimestamp)
	query := fmt.Sprintf(`
SELECT %s
FROM (SELECT DISTINCT ON (%s) %s
      FROM %s AS s
      WHERE %s
      ORDER BY _timestamp DESC) AS sessions
GROUP BY metric_name
ORDER BY total DESC
LIMIT %d OFFSET %d`,
		strings.Join(baseSelectParts, ",\n       "),
		distinctColumn,
		strings.Join(sessionProjections, ","),
		mainSessionsTable,
		strings.Join(sessionConditions, " AND "),
		pagination.Limit,
		pagination.Offset,
	)

	logQuery(fmt.Sprintf("TableQueryBuilder.buildSimplifiedQuery: %s", query))

	return query, nil
}

func (t *TableQueryBuilder) buildTableOfResolutionsQuery(r *Payload, metricFormat string) (string, string, map[string]any, error) {
	s := r.Series[0]
	// Build event filter conditions with error handling
	durConds, _ := BuildDurationWhere(s.Filter.Filters)
	sessFilters, _ := FilterOutTypes(s.Filter.Filters, []model.FilterType{FilterDuration, FilterUserAnonymousId})
	eventConditions, otherConds := BuildEventConditions(sessFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "main",
		EventsOrder:    string(s.Filter.EventsOrder),
	})
	prewhereParts := t.buildPrewhereConditions(r, s.Filter.EventsOrder, eventConditions, otherConds)
	queryConditions := t.buildSessionConditions(r, metricFormat, durConds)
	joinClause, extraWhere, err := t.buildJoinClause(s.Filter.EventsOrder, eventConditions)
	if err != nil {
		return "", "", nil, err
	}
	queryConditions = append(queryConditions, extraWhere...)

	//Determine aggregation column
	main_column := "session_id"
	if metricFormat == MetricFormatUserCount {
		main_column = "user_id"
	}

	joinEvents := ""
	if len(joinClause) > 0 || len(extraWhere) > 0 {
		joinEvents = "INNER JOIN product_analytics.events AS main ON (main.session_id = s.session_id) "
		queryConditions = append(queryConditions, prewhereParts...)
	}
	// Surround each condition-group with parentheses
	for i, condition := range queryConditions {
		queryConditions[i] = fmt.Sprintf("(%s)", condition)
	}

	pagination := t.calculatePagination(r.Page, r.Limit)
	tableKey := fmt.Sprintf("%d", time.Now().UnixMilli())
	return fmt.Sprintf(`
CREATE TEMPORARY TABLE base_%[1]v AS (
			SELECT screen_width,
				   screen_height,
				   pixels,
				   count(DISTINCT %[2]v) AS freq,
				   any(full_count) AS full_count
			FROM (SELECT screen_width,
						 screen_height,
						 screen_width * screen_height       AS pixels,
						 %[2]v,
						 count(DISTINCT %[2]v) OVER () AS full_count
				  FROM experimental.sessions AS s
       					%[5]v
				  WHERE %[3]v
				  GROUP BY screen_width, screen_height, %[2]v
       			  %[4]v) AS raw
			GROUP BY ALL);`,
			tableKey, main_column, strings.Join(queryConditions, " AND "), joinClause, joinEvents),
		fmt.Sprintf(`
SELECT CAST(full_count AS UInt64) AS full_count,
       CAST(number_of_rows AS UInt64)       AS number_of_rows,
       CAST(center_width AS UInt64)         AS center_width,
       CAST(center_height AS UInt64)        AS center_height,
       CAST(max_width AS UInt64)            AS max_width,
       CAST(max_height AS UInt64)           AS max_height,
       CAST(min_width AS UInt64)            AS min_width,
       CAST(min_height AS UInt64)           AS min_height,
       CAST(total_in_group AS UInt64)       AS total_in_group
FROM (SELECT any(full_count)               AS full_count,
             COUNT(1) OVER ()               AS number_of_rows,
             base_center.screen_width       AS center_width,
             base_center.screen_height      AS center_height,
             max(base_center.screen_width)  AS max_width,
             max(base_center.screen_height) AS max_height,
             min(base_center.screen_width)  AS min_width,
             min(base_center.screen_height) AS min_height,
             sum(base_match.freq)           AS total_in_group
      FROM base_%[1]v AS base_center
               JOIN base_%[1]v AS base_match
                    ON base_match.pixels BETWEEN base_center.pixels * 0.95 AND base_center.pixels * 1.05
      GROUP BY center_width, center_height
      LIMIT @limit OFFSET @offset) AS raw
	  ORDER BY total_in_group DESC;`, tableKey),
		map[string]any{
			"startTimestamp": r.StartTimestamp,
			"endTimestamp":   r.EndTimestamp,
			"projectId":      r.ProjectId,
			"limit":          pagination.Limit - 1,
			"offset":         max(0, pagination.Offset-1),
		}, nil
}

func (t *TableQueryBuilder) buildJoinClause(eventsOrder model.EventOrder, eventConditions []string) (string, []string, error) {
	var havingClause string
	var whereClause []string
	switch eventsOrder {
	case "then":
		havingClause, whereClause = t.buildSequenceJoinClause(eventConditions)
	case "and":
		havingClause, whereClause = t.buildCountJoinClause(eventConditions, "AND")
	case "or":
		havingClause, whereClause = t.buildCountJoinClause(eventConditions, "OR")
	case "":
		return "", make([]string, 0), nil
	default:
		return "", make([]string, 0), fmt.Errorf("unknown events order: %s", eventsOrder)
	}
	return havingClause, whereClause, nil
}

func (t *TableQueryBuilder) buildSequenceJoinClause(eventConditions []string) (string, []string) {
	if len(eventConditions) <= 1 {
		return "", make([]string, 0)
	}

	var patBuilder strings.Builder
	patBuilder.Grow(len(eventConditions) * 6) // Pre-allocate capacity
	for i := range eventConditions {
		patBuilder.WriteString(fmt.Sprintf("(?%d)", i+1))
	}

	return fmt.Sprintf(
		"HAVING sequenceMatch('%s')(\n    toDateTime(main.created_at),\n    %s\n)",
		patBuilder.String(),
		strings.Join(eventConditions, ",\n    "),
	), make([]string, 0)
}

func (t *TableQueryBuilder) buildCountJoinClause(eventConditions []string, operator string) (string, []string) {
	if len(eventConditions) == 0 {
		return "", make([]string, 0)
	}
	var havingClause string
	var whereClause []string
	if operator == "OR" {
		whereClause = append(whereClause, strings.Join(eventConditions, " OR "))
	} else {
		countConds := make([]string, len(eventConditions))
		for i, condition := range eventConditions {
			countConds[i] = fmt.Sprintf("countIf(%s) > 0", condition)
		}
		havingClause = fmt.Sprintf("HAVING %s", strings.Join(countConds, fmt.Sprintf(" %s ", operator)))
	}
	return havingClause, whereClause
}

// buildPrewhereConditions constructs the prewhere conditions for the main events query
func (t *TableQueryBuilder) buildPrewhereConditions(r *Payload, eventsOrder model.EventOrder, eventConditions, otherConds []string) []string {
	prewhereParts := make([]string, 0, 5+len(otherConds))

	// Add single event condition for 'then' order
	if eventsOrder == "then" && len(eventConditions) == 1 {
		prewhereParts = append(prewhereParts, eventConditions[0])
	}

	// Add core conditions
	prewhereParts = append(prewhereParts, t.buildTimeRangeConditions("main", r.ProjectId, r.StartTimestamp, r.EndTimestamp)...)

	// Add additional conditions
	if len(otherConds) > 0 {
		prewhereParts = append(prewhereParts, otherConds...)
	}

	return prewhereParts
}

// The list of session properties and its column names
var sessionProperties = map[string]string{
	"userOs":          "user_os",
	"userBrowser":     "user_browser",
	"userDevice":      "user_device",
	"userCountry":     "user_country",
	"userCity":        "user_city",
	"userState":       "user_state",
	"userId":          "user_id",
	"userAnonymousId": "user_anonymous_id",
	"referrer":        "referrer",
	"revId":           "rev_id",
	"duration":        "duration",
	"platform":        "platform",
	"metadata":        "metadata",
	"issue":           "issues",
	"eventsCount":     "events_count",
	"utmSource":       "utm_source",
	"utmMedium":       "utm_medium",
	"utmCampaign":     "utm_campaign",
	//	IOS
	"userOsIos":          "user_os",
	"userDeviceIos":      "user_device",
	"userCountryIos":     "user_country",
	"userIdIos":          "user_id",
	"userAnonymousIdIos": "user_anonymous_id",
	"revIdIos":           "rev_id",
}

// buildSessionConditions constructs the session conditions for the sessions query
func (t *TableQueryBuilder) buildSessionConditions(r *Payload, metricFormat string, durConds []string) []string {
	var sessionConditions []string = make([]string, 0)

	// Add core session conditions
	sessionConditions = append(sessionConditions, t.buildTimeRangeConditions("s", r.ProjectId, r.StartTimestamp, r.EndTimestamp)...)
	sessionConditions = append(sessionConditions, "isNotNull(s.duration)")

	// Add duration conditions
	for _, durCond := range durConds {
		if durCond != "" { // Avoid empty conditions
			sessionDurCond := strings.ReplaceAll(durCond, "main.duration", "s.duration")
			sessionConditions = append(sessionConditions, sessionDurCond)
		}
	}

	//// Handle user count specific conditions
	//if metricFormat == MetricFormatUserCount {
	//	sessionConditions = append(sessionConditions,
	//		fmt.Sprintf("NOT (empty(s.user_id) AND (s.user_uuid IS NULL OR s.user_uuid = '%s'))", nilUUIDString))
	//}

	// To add session's specific filters (like user_os, user_browser, etc...)
	for _, f := range r.Series[0].Filter.Filters {
		if !f.IsEvent && f.AutoCaptured {
			if column, ok := sessionProperties[f.Name]; ok {
				var subCondition []string
				for _, value := range f.Value {
					subCondition = append(subCondition, fmt.Sprintf("%s='%s'", column, value))
				}
				if len(subCondition) > 0 {
					sessionConditions = append(sessionConditions, fmt.Sprintf("(%s)", strings.Join(subCondition, " OR ")))
				}
			}
		}
	}
	return sessionConditions
}

func (t *TableQueryBuilder) buildTimeRangeConditions(tableAlias string, projectId int, startTimestamp, endTimestamp uint64) []string {
	conditions := []string{
		fmt.Sprintf("%s.project_id = %d", tableAlias, projectId),
	}

	timestampColumn := "created_at"
	if tableAlias == "s" {
		timestampColumn = "datetime"
	}

	conditions = append(conditions,
		fmt.Sprintf("%s.%s >= toDateTime(%d/1000)", tableAlias, timestampColumn, startTimestamp),
		fmt.Sprintf("%s.%s <= toDateTime(%d/1000)", tableAlias, timestampColumn, endTimestamp),
	)

	return conditions
}

func (t *TableQueryBuilder) calculatePagination(page, limit int) model.PaginationParams {
	if limit <= 0 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}

	offset := 0
	if page > 1 {
		offset = (page - 1) * limit
	}

	return model.PaginationParams{
		Limit:  limit,
		Offset: offset,
	}
}

func (*TableQueryBuilder) subquerySelects(r *Payload) []string {
	subquerySelectParts := []string{
		"f.session_id AS session_id",
	}

	if r.MetricOf == string(MetricOfTableUserId) || r.MetricFormat == MetricFormatUserCount {
		subquerySelectParts = append([]string{"s.user_id AS user_id"}, subquerySelectParts...)
	}

	if r.MetricOf == string(MetricOfTableResolution) {
		subquerySelectParts = append([]string{"s.screen_width AS screen_width", "s.screen_height AS screen_height"}, subquerySelectParts...)
	}

	if r.MetricOf == string(MetricOfTableDevice) {
		subquerySelectParts = append([]string{"s.user_device AS user_device"}, subquerySelectParts...)
	}

	if r.MetricOf == string(MetricOfTableCountry) {
		subquerySelectParts = append([]string{"s.user_country AS user_country"}, subquerySelectParts...)
	}
	return subquerySelectParts
}
