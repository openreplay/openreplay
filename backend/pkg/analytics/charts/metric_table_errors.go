package charts

import (
	"context"
	"fmt"
	"log"
	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/logger"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type TableErrorsQueryBuilder struct {
	Logger logger.Logger
}

type ErrorChartPoint struct {
	Timestamp int64  `json:"timestamp"`
	Count     uint64 `json:"count"`
}

type ErrorItem struct {
	ErrorID         string            `json:"errorId"`
	Name            string            `json:"name"`
	Message         string            `json:"message"`
	Users           uint64            `json:"users"`
	Total           uint64            `json:"total"`
	Sessions        uint64            `json:"sessions"`
	FirstOccurrence int64             `json:"firstOccurrence"`
	LastOccurrence  int64             `json:"lastOccurrence"`
	Chart           []ErrorChartPoint `json:"chart"`
}

type TableErrorsResponse struct {
	Total  uint64      `json:"total"`
	Errors []ErrorItem `json:"errors"`
}

func (t *TableErrorsQueryBuilder) Execute(ctx context.Context, p *Payload, conn driver.Conn) (interface{}, error) {
	query, err := t.buildQuery(p)
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(ctx, query)
	if err != nil {
		if t.Logger != nil {
			t.Logger.Error(ctx, "Error executing query: %v, query: %s", err, query)
		} else {
			log.Printf("Error executing query: %s\nQuery: %s", err, query)
		}
		return nil, err
	}
	defer rows.Close()

	var resp TableErrorsResponse
	for rows.Next() {
		var e ErrorItem
		var ts []int64
		var cs []uint64
		var totalCount uint64
		if err := rows.Scan(
			&e.ErrorID, &e.Name, &e.Message,
			&e.Users, &e.Total, &e.Sessions,
			&e.FirstOccurrence, &e.LastOccurrence,
			&ts, &cs,
			&totalCount,
		); err != nil {
			return nil, err
		}
		for i := range ts {
			e.Chart = append(e.Chart, ErrorChartPoint{Timestamp: ts[i], Count: cs[i]})
		}
		resp.Errors = append(resp.Errors, e)
		if resp.Total == 0 {
			resp.Total = totalCount
		}
	}
	return resp, nil
}

func (t *TableErrorsQueryBuilder) buildQuery(p *Payload) (string, error) {
	density := p.Density
	if density < 2 {
		density = 7
	}
	durMs := p.EndTimestamp - p.StartTimestamp
	stepMs := int64(durMs) / int64(density-1)
	startMs := (p.StartTimestamp / 1000) * 1000
	endMs := (p.EndTimestamp / 1000) * 1000

	limit := p.Limit
	if limit <= 0 {
		limit = 10
	}
	page := p.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	var hasErrorEventFilter bool
	var errorEventFilters []model.Filter
	var sessionEventFilters []model.Filter
	var regularFilters []model.Filter

	// Separate ERROR event filters from other filters
	for _, filter := range p.Series[0].Filter.Filters {
		if filter.IsEvent && filter.Name == "ERROR" {
			errorEventFilters = append(errorEventFilters, filter)
			hasErrorEventFilter = true
		} else if filter.IsEvent {
			sessionEventFilters = append(sessionEventFilters, filter)
		} else {
			regularFilters = append(regularFilters, filter)
		}
	}

	// Check if we need to join with sessions table
	sessionColumns := GetSessionColumns()
	needsSessionJoin := false
	for _, filter := range regularFilters {
		if filter.AutoCaptured && !filter.IsEvent {
			filter.Name = CamelToSnake(filter.Name)
		}
		if _, exists := sessionColumns[filter.Name]; exists {
			needsSessionJoin = true
			break
		}
	}

	// Use BuildWhere for proper separation of events, session and duration filters
	eventsWhere, filtersWhere, _, sessionsWhere := BuildWhere(regularFilters, string(p.Series[0].Filter.EventsOrder), "e", "s", needsSessionJoin)

	// Build ERROR event conditions
	var errorEventConds []string
	if len(errorEventFilters) > 0 {
		errorEventConds, _, _ = BuildEventConditions(
			errorEventFilters,
			BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "e"},
		)
	}

	// Build conditions for session-level event filtering (e.g., sessions that had LOCATION events)
	var sessionEventConds []string
	if len(sessionEventFilters) > 0 {
		sessionEventFilterConds, _, _ := BuildEventConditions(
			sessionEventFilters,
			BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "se"},
		)
		if len(sessionEventFilterConds) > 0 {
			sessionEventConds = []string{fmt.Sprintf(`e.session_id IN (
				SELECT DISTINCT se.session_id
				FROM product_analytics.events se
				WHERE se.project_id = %d
				AND se.created_at >= toDateTime(%d/1000)
				AND se.created_at <= toDateTime(%d/1000)
				AND %s
			)`, p.ProjectId, (p.StartTimestamp/1000)*1000, (p.EndTimestamp/1000)*1000, strings.Join(sessionEventFilterConds, " AND "))}
		}
	}

	// Base conditions that always apply
	conds := []string{
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
		fmt.Sprintf("e.created_at >= toDateTime(%d/1000)", startMs),
		fmt.Sprintf("e.created_at <= toDateTime(%d/1000)", endMs),
	}

	// If no specific ERROR event filter is provided, add the default ERROR event conditions
	if !hasErrorEventFilter {
		conds = append(conds, "`$event_name` = 'ERROR'")
		conds = append(conds, fmt.Sprintf("JSONExtractString(toString(e.`$properties`), 'source') = '%s'", "js_exception"))
		conds = append(conds, fmt.Sprintf("JSONExtractString(toString(e.`$properties`), 'message') != '%s'", "Script error."))
	}

	// Apply ERROR event filters
	if len(errorEventConds) > 0 {
		conds = append(conds, errorEventConds...)
	}

	// Apply events where conditions
	if len(eventsWhere) > 0 {
		conds = append(conds, eventsWhere...)
	}

	// Apply event filters where conditions
	if len(filtersWhere) > 0 {
		conds = append(conds, filtersWhere...)
	}

	// Apply session filters when session join is needed
	if needsSessionJoin && len(sessionsWhere) > 0 {
		conds = append(conds, sessionsWhere...)
	}

	// Apply session event filters (sessions that had specific events)
	if len(sessionEventConds) > 0 {
		conds = append(conds, sessionEventConds...)
	}

	whereClause := strings.Join(conds, " AND ")

	orderColumn, orderDirection := t.getSortDetails(p.SortBy)

	// Build the FROM clause with optional session join
	var fromClause string
	if needsSessionJoin {
		fromClause = `product_analytics.events as e
        INNER JOIN experimental.sessions as s ON e.session_id = s.session_id AND s.project_id = e.project_id`
	} else {
		fromClause = `product_analytics.events as e`
	}

	sql := fmt.Sprintf(`WITH
    events AS (
        SELECT
            error_id,
            COALESCE(JSONExtractString(toString("$properties"), 'name'), 'ERROR') AS name,
            COALESCE(JSONExtractString(toString("$properties"), 'message'),
                    JSONExtractString(toString("$properties"), 'error'), 'Unknown error') AS message,
            distinct_id,
            session_id,
            project_id,
            created_at
        FROM %s
        WHERE %s
        AND created_at IS NOT NULL
    ),
    sessions_per_interval AS (
        SELECT
            error_id,
            toUInt64(%d + (toUInt64((toUnixTimestamp64Milli(created_at) - %d) / %d) * %d)) AS bucket_ts,
            countDistinct(session_id) AS session_count
        FROM events
        GROUP BY error_id, bucket_ts
    ),
    buckets AS (
        SELECT
            toUInt64(generate_series) AS bucket_ts
        FROM generate_series(
            %d,
            %d,
            %d
        )
    ),
    error_meta AS (
        SELECT
            error_id,
            any(name) AS name,
            any(message) AS message,
            countDistinct(CASE WHEN s.user_id IS NOT NULL AND s.user_id != '' THEN s.user_id END) AS users,
            count() AS total,
            countDistinct(e.session_id) AS sessions,
            min(e.created_at) AS first_occurrence,
            max(e.created_at) AS last_occurrence
        FROM events e
        LEFT JOIN experimental.sessions s ON e.session_id = s.session_id AND e.project_id = s.project_id
        WHERE e.error_id IS NOT NULL AND e.error_id != ''
        GROUP BY e.error_id
    ),
    error_chart AS (
        SELECT
            e.error_id AS error_id,
            groupArray(b.bucket_ts) AS timestamps,
            groupArray(coalesce(s.session_count, 0)) AS counts
        FROM (SELECT DISTINCT error_id FROM events) AS e
        CROSS JOIN buckets AS b
        LEFT JOIN sessions_per_interval AS s
            ON s.error_id = e.error_id
            AND s.bucket_ts = b.bucket_ts
        GROUP BY e.error_id
    ),
    total_count AS (
        SELECT COUNT(*) AS total_errors
        FROM error_meta
        WHERE sessions > 0
    )
SELECT
    m.error_id,
    m.name,
    m.message,
    m.users,
    m.total,
    m.sessions,
    toUnixTimestamp64Milli(toDateTime64(m.first_occurrence, 3)) AS first_occurrence,
    toUnixTimestamp64Milli(toDateTime64(m.last_occurrence, 3)) AS last_occurrence,
    ec.timestamps,
    ec.counts,
    tc.total_errors AS total_count
FROM error_meta AS m
LEFT JOIN error_chart AS ec
    ON m.error_id = ec.error_id
CROSS JOIN total_count AS tc
WHERE m.sessions > 0
ORDER BY %s %s
LIMIT %d OFFSET %d;`,
		fromClause,
		whereClause,
		startMs, startMs, stepMs, stepMs, // New formula parameters
		startMs, endMs, stepMs,
		orderColumn, orderDirection,
		limit, offset,
	)

	logQuery(fmt.Sprintf("TableErrorsQueryBuilder.buildQuery: %s", sql))
	return sql, nil
}

func (t *TableErrorsQueryBuilder) getSortDetails(sortBy string) (column string, direction string) {
	column = "m.last_occurrence"
	direction = "DESC"

	switch strings.ToLower(sortBy) {
	case "time":
		column = "m.last_occurrence"
		direction = "DESC"
	case "sessions":
		column = "m.sessions"
		direction = "DESC"
	case "users":
		column = "m.users"
		direction = "DESC"
	default:
		column = "m.last_occurrence"
		direction = "DESC"
	}

	return
}
