package charts

import (
	"fmt"
	"openreplay/backend/pkg/analytics/db"
	"strings"
)

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

func (t TableQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
	// validate metricOf with MetricOfTable return error if empty or not supported
	if p.MetricOf == "" {
		return nil, fmt.Errorf("MetricOf is empty")
	}

	// Validate that p.MetricOf is one of the supported MetricOfTable types
	isValidMetricOf := false
	switch MetricOfTable(p.MetricOf) {
	case MetricOfTableBrowser, MetricOfTableDevice, MetricOfTableCountry,
		MetricOfTableUserId, MetricOfTableIssues, MetricOfTableLocation,
		MetricOfTableSessions, MetricOfTableErrors, MetricOfTableReferrer,
		MetricOfTableFetch:
		isValidMetricOf = true
	}

	if !isValidMetricOf {
		return nil, fmt.Errorf("unsupported MetricOf type: %s", p.MetricOf)
	}

	query, err := t.buildQuery(p)
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var (
		totalCount uint64
		rowsCount  uint64
		values     []TableValue
	)

	for rows.Next() {
		var (
			total uint64
			name  string
		)
		if err := rows.Scan(&totalCount, &name, &total, &rowsCount); err != nil {
			return nil, err
		}
		values = append(values, TableValue{Name: name, Total: total})
	}

	return &TableResponse{
		Total:  totalCount,
		Count:  rowsCount,
		Values: values,
	}, nil
}

func (t TableQueryBuilder) buildQuery(r Payload) (string, error) {
	s := r.Series[0]

	groupByColumn := r.MetricOf
	if groupByColumn == "" {
		return "", fmt.Errorf("MetricOf is empty")
	}

	sessionFilters, eventFilters := partitionFilters(s.Filter.Filters)
	eventConds, eventNames := buildEventConditions(eventFilters)
	eventWhere := buildStaticEventWhere(r)
	if len(eventConds) > 0 {
		eventWhere += " AND " + strings.Join(eventConds, " AND ")
	}
	if len(eventNames) > 0 {
		eventWhere += " AND main.`$event_name` IN (" + buildInClause(eventNames) + ")"
	}

	sessionConds := buildSessionConditions(sessionFilters)
	sessWhere, _ := buildStaticSessionWhere(r, sessionConds)

	// Build event subquery
	var eventSubQuery string
	if len(eventConds) > 0 {
		// With HAVING clause
		var pattern strings.Builder
		for i := 0; i < len(eventConds); i++ {
			fmt.Fprintf(&pattern, "(?%d)", i+1)
		}

		var args strings.Builder
		args.WriteString("toDateTime(main.created_at)")
		for _, cond := range eventConds {
			args.WriteString(",\n         ")
			args.WriteString(cond)
		}

		eventSubQuery = fmt.Sprintf(
			"SELECT main.session_id, MIN(main.created_at) AS first_event_ts, MAX(main.created_at) AS last_event_ts "+
				"FROM %s AS main "+
				"WHERE %s "+
				"AND main.session_id IN (SELECT s.session_id FROM %s AS s WHERE %s) "+
				"GROUP BY main.session_id "+
				"HAVING sequenceMatch('%s')(%s)",
			TableEvents,
			eventWhere,
			TableSessions,
			sessWhere,
			pattern.String(),
			args.String(),
		)
	} else {
		// No HAVING clause needed
		eventSubQuery = fmt.Sprintf(
			"SELECT main.session_id, MIN(main.created_at) AS first_event_ts, MAX(main.created_at) AS last_event_ts "+
				"FROM %s AS main "+
				"WHERE %s "+
				"AND main.session_id IN (SELECT s.session_id FROM %s AS s WHERE %s) "+
				"GROUP BY main.session_id",
			TableEvents,
			eventWhere,
			TableSessions,
			sessWhere,
		)
	}

	sessionsQuery := fmt.Sprintf(
		"SELECT * FROM %s AS s WHERE s.project_id = %d AND isNotNull(s.duration)%s AND s.datetime >= toDateTime(%d/1000) AND s.datetime <= toDateTime(%d/1000)",
		TableSessions,
		r.ProjectId,
		func() string {
			if sessWhere != "" {
				return " AND " + sessWhere
			}
			return ""
		}(),
		r.StartTimestamp,
		r.EndTimestamp,
	)

	mainQuery := fmt.Sprintf(
		"SELECT s.session_id AS session_id, s.%s AS %s FROM (%s) AS f INNER JOIN (%s) AS s ON s.session_id = f.session_id",
		groupByColumn, groupByColumn,
		eventSubQuery,
		sessionsQuery,
	)

	finalQuery := fmt.Sprintf(
		"SELECT COUNT(DISTINCT filtered_sessions.%s) OVER () AS main_count, "+
			"filtered_sessions.%s AS name, "+
			"COUNT(DISTINCT filtered_sessions.session_id) AS total, "+
			"(SELECT COUNT(DISTINCT session_id) FROM (%s) AS all_sessions) AS total_count "+
			"FROM (%s) AS filtered_sessions "+
			"GROUP BY filtered_sessions.%s "+
			"ORDER BY total DESC "+
			"LIMIT 0, 200;",
		groupByColumn,
		groupByColumn,
		mainQuery,
		mainQuery,
		groupByColumn,
	)

	return finalQuery, nil
}
