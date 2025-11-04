package charts

import (
	"context"
	"errors"
	"fmt"
	"log"
	analyticsConfig "openreplay/backend/internal/config/api"
	orClickhouse "openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/logger"
	"slices"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

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
	MetricName      string `json:"name" ch:"metric_name"`
	MetricCount     uint64 `json:"total" ch:"metric_count" default:"0"`
	NumberOfMetrics uint64 `json:"-" ch:"number_of_metrics" default:"0"`
	AllCount        uint64 `json:"-" ch:"all_count" default:"0"`
}
type ResolutionTableValue struct {
	NumberOfRows uint64 `json:"-" ch:"number_of_rows" db:"number_of_rows" default:"0"`
	CenterWidth  uint64 `json:"centerWidth" ch:"center_width" db:"center_width"`
	CenterHeight uint64 `json:"centerHeight" ch:"center_height" db:"center_height"`
	MaxWidth     uint64 `json:"maxWidth" ch:"max_width" db:"max_width"`
	MaxHeight    uint64 `json:"maxHeight" ch:"max_height" db:"max_height"`
	MinWidth     uint64 `json:"minWidth" ch:"min_width" db:"min_width"`
	MinHeight    uint64 `json:"minHeight" ch:"min_height" db:"min_height"`
	TotalInGroup uint64 `json:"totalInGroup" ch:"total_in_group" db:"total_in_group" default:"0"`
	FullCount    uint64 `json:"-" ch:"full_count" db:"full_count" default:"0"`
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
)

var eventsProperties []string = []string{string(MetricOfTableLocation), string(MetricOfTableFetch)}

var propertySelectorMap = map[string]string{
	string(MetricOfTableLocation): "`$current_path`",
	string(MetricOfTableFetch):    "`$current_path`",
}
var sessionsPorpertySelectorMap = map[string]string{
	string(MetricOfTableUserId):     "user_id",
	string(MetricOfTableBrowser):    "user_browser",
	string(MetricOfTableDevice):     "user_device",
	string(MetricOfTableCountry):    "toString(user_country)",
	string(MetricOfTableReferrer):   "referrer",
	string(MetricOfTableResolution): "if(screen_width = 0 AND screen_height = 0, 'Unknown', concat(toString(screen_width), 'x', toString(screen_height)))",
}

func (t *TableQueryBuilder) Execute(p *Payload, conn driver.Conn) (interface{}, error) {
	if p.MetricOf == "" {
		return nil, fmt.Errorf("MetricOf is empty")
	}
	if _, ok := validMetricOfValues[MetricOfTable(p.MetricOf)]; !ok {
		return nil, fmt.Errorf("invalid MetricOf value: %s", p.MetricOf)
	}

	if p.MetricOf == "screenResolution" {
		return t.executeForTableOfResolutions(p)
	}

	query, err := t.buildQuery(p)
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
		overallCount = rawValues[0].AllCount
		valuesCount = rawValues[0].NumberOfMetrics
	}

	return &TableResponse{Total: valuesCount, Count: overallCount, Values: rawValues}, nil
}
func (t *TableQueryBuilder) executeForTableOfResolutions(p *Payload) (interface{}, error) {
	queries, params, err := t.buildTableOfResolutionsQuery(p)
	if err != nil {
		return nil, fmt.Errorf("error building screenResolution queries: %w", err)
	}
	if len(queries) == 0 {
		return nil, fmt.Errorf("No queries to execute for table of resolutions")
	}
	logr := logger.New()
	cfg := analyticsConfig.New(logr)

	var conn *sqlx.DB = orClickhouse.NewSqlDBConnection(cfg.Clickhouse)

	// Trying to use clickhouseContext in order to keep same session for tmp tables,
	// otherwise we need to use clickhouse.openDB instead of clickhouse.open in the connexion code
	ctx := clickhouse.Context(context.Background(),
		clickhouse.WithSettings(clickhouse.Settings{
			"session_id":      uuid.NewString(),
			"session_timeout": 60, // seconds
		}))

	queryParams := convertParams(params)
	_, err = conn.ExecContext(ctx, queries[0], queryParams...)
	if err != nil {
		log.Println("---------------------------------")
		log.Println(queries[0])
		log.Println("---------------------------------")
		return nil, fmt.Errorf("error executing tmp query for screenResolution: %w", err)
	}
	var rawValues []ResolutionTableValue = make([]ResolutionTableValue, 0)
	if err = conn.SelectContext(ctx, &rawValues, queries[1], queryParams...); err != nil {
		log.Println("---------------------------------")
		log.Println(queries[0])
		log.Println("---------------------------------")
		log.Println("---------------------------------")
		log.Println(queries[1])
		log.Println("---------------------------------")
		log.Printf("Error executing Table Of Resolutions query: %s\nQuery: %s", err, queries[1])
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

var extraConditions map[string]model.Filter = map[string]model.Filter{
	string(MetricOfTableLocation): model.Filter{Name: "LOCATION", AutoCaptured: true, Operator: "isAny", IsEvent: true},
	string(MetricOfTableFetch):    model.Filter{Name: "REQUEST", AutoCaptured: true, Operator: "isAny", IsEvent: true},
}

func uniqueSliceOfStrings(slice []string) []string {
	keys := make(map[string]bool)
	list := []string{}
	for _, entry := range slice {
		if _, value := keys[entry]; !value {
			keys[entry] = true
			list = append(list, entry)
		}
	}
	return list
}

func (t *TableQueryBuilder) buildQuery(r *Payload) (string, error) {
	if r == nil {
		return "", errors.New("payload is nil")
	}

	s := r.Series[0]
	log.Printf("MetricOf: %s, MetricFormat: %s", r.MetricOf, r.MetricFormat)
	if r.MetricOf == "screenResolution" {
		return "", fmt.Errorf("Should call buildTableOfResolutionsQuery instead of buildQuery for screenResolution metric")
	}
	var eventsTable = getMainEventsTable(r.StartTimestamp)
	var sessionsTable = getMainSessionsTable(r.StartTimestamp)
	var extraCondition, hasExtraCondition = extraConditions[r.MetricOf]
	var emptyEventFilters bool = len(s.Filter.Filters) == 0 || !hasEventFilter(s.Filter.Filters)

	// Determine if property comes from events table (e) or sessions table (s)
	isFromEvents := slices.Contains(eventsProperties, r.MetricOf)

	// Build event filter conditions with error handling
	durConds, _ := BuildDurationWhere(s.Filter.Filters)

	eventConditions, nameConditions, _ := BuildEventConditions(s.Filter.Filters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "main",
		EventsOrder:    string(s.Filter.EventsOrder),
	})

	// Check if we should skip events table
	skipEventsTable := slices.Contains([]string{
		string(MetricOfTableUserId), string(MetricOfTableCountry),
		string(MetricOfTableDevice), string(MetricOfTableBrowser),
		string(MetricOfTableReferrer),
	}, r.MetricOf) && len(eventConditions) == 0

	eventsConditions := t.buildPrewhereConditions(r, s.Filter.EventsOrder, eventConditions, []string{})
	sessionConditions := t.buildSessionConditions(r, r.MetricFormat, durConds)
	eventsHaving, whereClause, err := t.buildJoinClause(s.Filter.EventsOrder, eventConditions)
	if err != nil {
		return "", err
	}
	eventsConditions = append(eventsConditions, whereClause...)
	if len(nameConditions) > 0 {
		eventsConditions = append(eventsConditions, fmt.Sprintf("(%s)", strings.Join(nameConditions, " OR ")))
	}

	propSel, ok := sessionsPorpertySelectorMap[r.MetricOf]
	if !ok {
		propSel, ok = propertySelectorMap[r.MetricOf]
		if !ok {
			// Fallback for MetricOfTableUserId
			propSel = "user_id"
		}
	}

	// Determine aggregation column
	distinctColumn := "session_id"
	if r.MetricFormat == MetricFormatUserCount {
		distinctColumn = "user_id"
	}
	pagination := t.calculatePagination(r.Page, r.Limit)

	// Build the final query with proper string formatting
	var query string

	var sessionsSelect []string = []string{"session_id", "user_id", "events_count"}

	var eventsSelect []string = []string{
		"main.session_id",
	}

	var fromExtra string
	if isFromEvents {
		distinctColumn = "e." + distinctColumn
		eventsSelect = append(eventsSelect, fmt.Sprintf("%s AS metric_value", propSel))
		eventsConditions = append(eventsConditions, "notEmpty(metric_value)", "isNotNull(metric_value)")
		//Property from events table
		if hasExtraCondition {
			var extraWhere, _, _ = BuildEventConditions([]model.Filter{extraCondition}, BuildConditionsOptions{
				MainTableAlias: "main",
			})

			if emptyEventFilters {
				extraWhere = append(extraWhere, t.buildPrewhereConditions(r, s.Filter.EventsOrder, extraWhere, []string{})...)
				eventsConditions = append(eventsConditions, extraWhere...)
				eventsConditions = uniqueSliceOfStrings(eventsConditions)
			} else {
				//Check if the extra condition is already in the filters
				found := false
				for _, f := range s.Filter.Filters {
					if f.Name == extraCondition.Name && f.IsEvent == extraCondition.IsEvent {
						found = true
						break
					}
				}
				if !found {
					extraWhere = append(extraWhere, t.buildPrewhereConditions(r, s.Filter.EventsOrder, extraWhere, []string{})...)
					fromExtra = fmt.Sprintf(`
(SELECT DISTINCT session_id 
FROM %s AS main 
WHERE %s) AS extra`,
						eventsTable,
						strings.Join(extraWhere, " AND "))
				}
			}
		}
	} else {
		distinctColumn = "s." + distinctColumn
		sessionsSelect = append(sessionsSelect, fmt.Sprintf("%s AS metric_value", propSel))
		//	No need to think about extra conditions here as they are all relater to events
	}

	var fromEvents string
	if !skipEventsTable || hasExtraCondition {
		var eventsGroupping string = "GROUP BY ALL"
		if r.MetricFormat == MetricFormatEventCount {
			eventsGroupping = ""
		}
		fromEvents = fmt.Sprintf(`
(
	SELECT %s
	FROM %s AS main
	WHERE %s
	%s
	%s
) AS e`,
			strings.Join(eventsSelect, ","),
			eventsTable,
			strings.Join(eventsConditions, " AND "),
			eventsGroupping,
			eventsHaving,
		)
	}

	var fromSessions string
	if !isFromEvents || len(sessionConditions) > 4 || r.MetricFormat == MetricFormatUserCount {
		var limitBy []string = []string{"session_id"}
		if !isFromEvents {
			limitBy = append(limitBy, "metric_value")
		}
		fromSessions = fmt.Sprintf(`
(SELECT %s
 FROM %s AS s
 WHERE %s
 ORDER BY _timestamp DESC
 LIMIT 1 BY %s
) AS s`,
			strings.Join(sessionsSelect, ","),
			sessionsTable,
			strings.Join(sessionConditions, " AND "),
			strings.Join(limitBy, ","),
		)
	}
	if r.MetricFormat == MetricFormatUserCount {
		distinctColumn = "s.user_id"
	} else if r.MetricFormat == MetricFormatEventCount && !isFromEvents {
		distinctColumn = "s.events_count"
	}

	if fromSessions != "" {
		if fromEvents != "" {
			fromEvents = fmt.Sprintf("INNER JOIN %s ON (e.session_id = s.session_id)", fromEvents)
		}
		if fromExtra != "" {
			fromExtra = fmt.Sprintf("INNER JOIN %s ON (extra.session_id = s.session_id)", fromExtra)
		}
	} else if fromEvents != "" {
		if fromExtra != "" {
			fromExtra = fmt.Sprintf("INNER JOIN %s ON (extra.session_id = e.session_id)", fromExtra)
		}
	}

	var countFunction string = "count"
	if r.MetricFormat != MetricFormatEventCount {
		distinctColumn = "DISTINCT " + distinctColumn
	} else if !isFromEvents {
		countFunction = "sum"
	}

	// Construct the complete query
	query = fmt.Sprintf(`
SELECT metric_value AS metric_name,
       %s(%s) AS metric_count,
       count(DISTINCT metric_value) OVER () AS number_of_metrics,
       sum(metric_count) OVER () AS all_count
FROM %s %s %s
GROUP BY metric_value
ORDER BY metric_count DESC
LIMIT %d OFFSET %d;`,
		countFunction,
		distinctColumn,
		fromSessions,
		fromEvents,
		fromExtra,
		pagination.Limit,
		pagination.Offset,
	)

	logQuery(fmt.Sprintf("TableQueryBuilder.buildQuery: %s", query))

	return query, nil
}

func (t *TableQueryBuilder) buildTableOfResolutionsQuery(r *Payload) ([]string, map[string]any, error) {
	s := r.Series[0]
	// Build event filter conditions with error handling
	durConds, _ := BuildDurationWhere(s.Filter.Filters)
	sessFilters, _ := FilterOutTypes(s.Filter.Filters, []model.FilterType{FilterDuration, FilterUserAnonymousId})
	eventConditions, _, otherConds := BuildEventConditions(sessFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "main",
		EventsOrder:    string(s.Filter.EventsOrder),
	})
	prewhereParts := t.buildPrewhereConditions(r, s.Filter.EventsOrder, eventConditions, otherConds)
	queryConditions := t.buildSessionConditions(r, r.MetricFormat, durConds)
	joinClause, extraWhere, err := t.buildJoinClause(s.Filter.EventsOrder, eventConditions)
	if err != nil {
		return []string{}, nil, err
	}
	queryConditions = append(queryConditions, extraWhere...)

	//Determine aggregation column&function
	main_column := "session_id"
	countFunction := "count(DISTINCT %s)"
	if r.MetricFormat == MetricFormatUserCount {
		main_column = "user_id"
	} else if r.MetricFormat == MetricFormatEventCount {
		main_column = "events_count"
		countFunction = "sum(%s)"
	}
	countFunction = fmt.Sprintf(countFunction, main_column)

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
	return []string{fmt.Sprintf(`
CREATE TEMPORARY TABLE base_%[1]v AS (
			SELECT screen_width,
				   screen_height,
				   pixels,
				   %[6]v AS freq,
				   any(full_count) AS full_count
			FROM (SELECT screen_width,
						 screen_height,
						 screen_width * screen_height       AS pixels,
						 %[2]v,
						 %[6]v OVER () AS full_count
				  FROM experimental.sessions AS s
       					%[5]v
				  WHERE %[3]v
				  ORDER BY _timestamp DESC
       			  LIMIT 1 BY session_id
       			  %[4]v) AS raw
			GROUP BY ALL);`,
			tableKey, main_column, strings.Join(queryConditions, " AND "), joinClause, joinEvents, countFunction),
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
	  ORDER BY total_in_group DESC;`, tableKey)},
		map[string]any{
			"startTimestamp": r.StartTimestamp,
			"endTimestamp":   r.EndTimestamp,
			"projectId":      r.ProjectId,
			"limit":          pagination.Limit - 1,
			"offset":         max(0, pagination.Offset-1),
		}, nil
}

// out: having (for THEN|AND operator),where,error
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
		"HAVING sequenceMatch('%s')(toDateTime(main.created_at),\n    %s)",
		patBuilder.String(),
		strings.Join(eventConditions, ",\n    "),
	), make([]string, 0)
}

// out: having,where
func (t *TableQueryBuilder) buildCountJoinClause(eventConditions []string, operator string) (string, []string) {
	if len(eventConditions) == 0 {
		return "", make([]string, 0)
	}
	var havingClause string
	var whereClause []string
	if operator == "OR" || len(eventConditions) == 1 {
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
		if !f.IsEvent {
			var subCondition []string
			if column, ok := sessionProperties[f.Name]; ok {
				for _, value := range f.Value {
					subCondition = append(subCondition, fmt.Sprintf("%s='%s'", column, value))
				}
			} else if strings.HasPrefix(f.Name, "metadata_") {
				subCondition = append(subCondition, buildCond(f.Name, f.Value, f.Operator, false, "singleColumn"))
			}
			if len(subCondition) > 0 {
				sessionConditions = append(sessionConditions, fmt.Sprintf("(%s)", strings.Join(subCondition, " OR ")))
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
	return model.PaginationParams{
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
}
