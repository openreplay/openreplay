package charts

import (
	"context"
	"fmt"
	"log"
	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/logger"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/google/uuid"

	chdb "openreplay/backend/pkg/db/clickhouse"
)

type TableErrorsQueryBuilder struct {
	Logger      logger.Logger
	SessionConn chdb.SessionFactory
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

func (t *TableErrorsQueryBuilder) Execute(ctx context.Context, p *Payload, _ driver.Conn) (interface{}, error) {
	queries, params, err := t.buildQuery(p)
	if err != nil {
		return nil, err
	}
	chParams := convertParams(params)

	// Q1 creates a CLICKHOUSE TEMPORARY TABLE that Q2 reads from. Temp-table
	// lifetime is bound to a single TCP session, so we acquire a dedicated
	// 1-conn handle here instead of using the shared pool.
	if t.SessionConn == nil {
		return nil, fmt.Errorf("errors table requires a clickhouse session factory")
	}
	conn, err := t.SessionConn()
	if err != nil {
		return nil, fmt.Errorf("failed to acquire pinned clickhouse connection: %w", err)
	}
	defer func() {
		if cerr := conn.Close(); cerr != nil {
			if t.Logger != nil {
				t.Logger.Warn(ctx, "failed to close errors table clickhouse session: %s", cerr)
			} else {
				log.Printf("failed to close errors table clickhouse session: %s", cerr)
			}
		}
	}()

	chCtx := clickhouse.Context(context.Background(), clickhouse.WithQueryID(uuid.NewString()))

	if err := conn.Exec(chCtx, queries[0], chParams...); err != nil {
		if t.Logger != nil {
			t.Logger.Error(ctx, "Error executing tmp table query: %v, query: %s", err, queries[0])
		} else {
			log.Printf("Error executing tmp table query: %s\nQuery: %s", err, queries[0])
		}
		return nil, err
	}

	rows, err := conn.Query(chCtx, queries[1], chParams...)
	if err != nil {
		if t.Logger != nil {
			t.Logger.Error(ctx, "Error executing query: %v, query: %s", err, queries[1])
		} else {
			log.Printf("Error executing query: %s\nQuery: %s", err, queries[1])
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

func (t *TableErrorsQueryBuilder) buildQuery(p *Payload) ([]string, map[string]any, error) {
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

	// Use BuildWhere for proper separation of events, session and duration
	// filters. Session filters with an events-table equivalent are rendered
	// on the events alias (filtersWhere); the sessions table is only joined
	// when a session-only filter remains in sessionsWhere.
	qp := NewParams()
	qp.Set("projectId", p.ProjectId)
	qp.Set("startMs", startMs)
	qp.Set("endMs", endMs)
	eventsWhere, filtersWhere, _, sessionsWhere := BuildWhere(regularFilters, string(p.Series[0].Filter.EventsOrder), "e", "s", qp, true)
	needsSessionJoin := len(sessionsWhere) > 0

	// Build ERROR event conditions
	var errorEventConds []string
	if len(errorEventFilters) > 0 {
		errorEventConds, _, _ = BuildEventConditions(
			errorEventFilters,
			BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "e"},
			qp,
		)
	}

	// Build conditions for session-level event filtering (e.g., sessions that had LOCATION events)
	var sessionEventConds []string
	if len(sessionEventFilters) > 0 {
		sessionEventFilterConds, _, _ := BuildEventConditions(
			sessionEventFilters,
			BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "se"},
			qp,
		)
		if len(sessionEventFilterConds) > 0 {
			subqueryConds := []string{
				"se.project_id = @projectId",
				"se.created_at >= toDateTime(@startMs/1000)",
				"se.created_at <= toDateTime(@endMs/1000)",
			}
			if p.SampleRate > 0 && p.SampleRate < 100 {
				qp.Set("sampleRate", p.SampleRate)
				subqueryConds = append(subqueryConds, "se.sample_key < @sampleRate")
			}
			subqueryConds = append(subqueryConds, sessionEventFilterConds...)
			sessionEventConds = []string{fmt.Sprintf(`e.session_id IN (
				SELECT DISTINCT se.session_id
				FROM product_analytics.events se
				WHERE %s
			)`, strings.Join(subqueryConds, " AND "))}
		}
	}

	// Base conditions that always apply
	conds := []string{
		"e.project_id = @projectId",
		"e.created_at >= toDateTime(@startMs/1000)",
		"e.created_at <= toDateTime(@endMs/1000)",
	}
	if p.SampleRate > 0 && p.SampleRate < 100 {
		qp.Set("sampleRate", p.SampleRate)
		conds = append(conds, "e.sample_key < @sampleRate")
	}

	// If no specific ERROR event filter is provided, add the default ERROR event conditions
	if !hasErrorEventFilter {
		conds = append(conds, "`$event_name` = 'ERROR'")
		conds = append(conds, fmt.Sprintf("e.`$properties`.'source' = '%s'", "js_exception"))
		// Enable this if the Kafka worker is still processing Script errors.
		//conds = append(conds, fmt.Sprintf("e.`$properties`.'message' != '%s'", "Script error."))
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

	eventsTable := fmt.Sprintf("errors_events_%s", strings.ReplaceAll(uuid.NewString(), "-", ""))
	// "$user_id" is carried into the temporary table so error_meta can count
	// users without joining experimental.sessions ('' marks an anonymous
	// user, where sessions.user_id would be NULL).
	createSQL := fmt.Sprintf(`
CREATE TEMPORARY TABLE %s ENGINE = MergeTree ORDER BY (error_id,session_id,created_at) AS (
    SELECT
        e.error_id AS error_id,
        COALESCE(e."$properties".'name', 'ERROR') AS name,
        COALESCE(e."$properties".'message', 'Unknown error') AS message,
        e.session_id AS session_id,
        e."$user_id" AS user_id,
        e.created_at AS created_at
    FROM %s
    WHERE %s
);`,
		eventsTable,
		fromClause,
		whereClause,
	)

	qp.Set("stepMs", stepMs)
	qp.Set("limit", limit)
	qp.Set("offset", offset)
	mainSQL := fmt.Sprintf(`
WITH
    sessions_per_interval AS (
        SELECT
            error_id,
            toUInt64(@startMs + (toUInt64((toUnixTimestamp64Milli(created_at) - @startMs) / @stepMs) * @stepMs)) AS bucket_ts,
            countDistinct(session_id) AS session_count
        FROM %s
        GROUP BY error_id, bucket_ts
    ),
    buckets AS (
        SELECT
            toUInt64(generate_series) AS bucket_ts
        FROM generate_series(@startMs,@endMs,@stepMs)
    ),
    error_meta AS (
        SELECT
            error_id,
            any(name) AS name,
            any(message) AS message,
            countDistinct(nullIf(e.user_id, '')) AS users,
            count() AS total,
            countDistinct(e.session_id) AS sessions,
            min(e.created_at) AS first_occurrence,
            max(e.created_at) AS last_occurrence
        FROM %s e
        WHERE e.error_id != ''
        GROUP BY e.error_id
    ),
    error_chart AS (
        SELECT
            e.error_id AS error_id,
            groupArray(b.bucket_ts) AS timestamps,
            groupArray(coalesce(s.session_count, 0)) AS counts
        FROM (SELECT DISTINCT error_id FROM %s) AS e
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
LIMIT @limit OFFSET @offset;`,
		eventsTable,
		eventsTable,
		eventsTable,
		orderColumn, orderDirection,
	)

	return []string{createSQL, mainSQL}, qp.Values(), nil
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
