package charts

import (
	"fmt"
	"log"
	"strings"

	"openreplay/backend/pkg/analytics/db"
)

type TableErrorsQueryBuilder struct{}

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

func (t *TableErrorsQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
	query, err := t.buildQuery(p)
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(query)
	if err != nil {
		log.Printf("Error executing query: %s\nQuery: %s", err, query)
		return nil, err
	}
	defer rows.Close()

	var resp TableErrorsResponse
	for rows.Next() {
		var e ErrorItem
		var ts []int64
		var cs []uint64
		if err := rows.Scan(
			&e.ErrorID, &e.Name, &e.Message,
			&e.Users, &e.Total, &e.Sessions,
			&e.FirstOccurrence, &e.LastOccurrence,
			&ts, &cs,
		); err != nil {
			return nil, err
		}
		for i := range ts {
			e.Chart = append(e.Chart, ErrorChartPoint{Timestamp: ts[i], Count: cs[i]})
		}
		resp.Errors = append(resp.Errors, e)
	}
	resp.Total = uint64(len(resp.Errors))
	return resp, nil
}

func (t *TableErrorsQueryBuilder) buildQuery(p Payload) (string, error) {
	if len(p.Series) == 0 {
		return "", fmt.Errorf("payload Series cannot be empty")
	}

	density := p.Density
	if density < 2 {
		density = 7
	}
	durMs := p.EndTimestamp - p.StartTimestamp
	stepMs := durMs / int64(density-1)
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

	ef, en := buildEventConditions(
		p.Series[0].Filter.Filters,
		BuildConditionsOptions{DefinedColumns: mainColumns},
	)
	conds := []string{
		"`$event_name` = 'ERROR'",
		fmt.Sprintf("project_id = %d", p.ProjectId),
		fmt.Sprintf("created_at >= toDateTime(%d/1000)", startMs),
		fmt.Sprintf("created_at <= toDateTime(%d/1000)", endMs),
	}
	if len(ef) > 0 {
		conds = append(conds, ef...)
	}
	if len(en) > 0 {
		conds = append(conds, "`$event_name` IN ("+buildInClause(en)+")")
	}
	whereClause := strings.Join(conds, " AND ")

	sql := fmt.Sprintf(`WITH
    events AS (
        SELECT
            error_id,
            JSONExtractString(toString("$properties"), 'name') AS name,
            JSONExtractString(toString("$properties"), 'message') AS message,
            distinct_id,
            session_id,
            created_at
        FROM product_analytics.events
        WHERE %s
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
            name,
            message,
            countDistinct(distinct_id) AS users,
            count() AS total,
            countDistinct(session_id) AS sessions,
            min(created_at) AS first_occurrence,
            max(created_at) AS last_occurrence
        FROM events
        GROUP BY error_id, name, message
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
    ec.counts
FROM error_meta AS m
LEFT JOIN error_chart AS ec
    ON m.error_id = ec.error_id
ORDER BY m.last_occurrence DESC
LIMIT %d OFFSET %d;`,
		whereClause,
		startMs, startMs, stepMs, stepMs, // New formula parameters
		startMs, endMs, stepMs,
		limit, offset,
	)

	return sql, nil
}
