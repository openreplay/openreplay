package charts

import (
	"fmt"
	"log"
	"openreplay/backend/pkg/analytics/db"
	"strings"
)

var validMetricOfValues = map[MetricOfTable]struct{}{
	MetricOfTableBrowser:  {},
	MetricOfTableDevice:   {},
	MetricOfTableCountry:  {},
	MetricOfTableUserId:   {},
	MetricOfTableLocation: {},
	MetricOfTableReferrer: {},
	MetricOfTableFetch:    {},
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
	string(MetricOfTableLocation): "JSONExtractString(toString(main.$properties), 'url_path') AS metric_value",
	//string(MetricOfTableUserId):   "if(empty(sessions.user_id), 'Anonymous', sessions.user_id) AS metric_value",
	string(MetricOfTableUserId):  "if(empty(sessions.user_id) OR sessions.user_id IS NULL, 'Anonymous', sessions.user_id) AS metric_value",
	string(MetricOfTableBrowser): "main.$browser AS metric_value",
	//string(MetricOfTableDevice):  "sessions.user_device AS metric_value",
	string(MetricOfTableDevice):   "if(empty(sessions.user_device) OR sessions.user_device IS NULL, 'Undefined', sessions.user_device) AS metric_value",
	string(MetricOfTableCountry):  "toString(sessions.user_country) AS metric_value",
	string(MetricOfTableReferrer): "main.$referrer AS metric_value",
	string(MetricOfTableFetch):    "JSONExtractString(toString(main.$properties), 'url_path') AS metric_value",
}

var mainColumns = map[string]string{
	"userBrowser": "$browser",
	"userDevice":  "sessions.user_device",
	"referrer":    "$referrer",
	"ISSUE":       "issue_type",
}

func (t TableQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
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

	rows, err := conn.Query(query)
	if err != nil {
		log.Printf("Error executing query: %s\nQuery: %s", err, query)
		return nil, fmt.Errorf("error executing query: %w", err)
	}
	defer rows.Close()

	var overallTotalMetricValues uint64
	var overallCount uint64
	values := make([]TableValue, 0)
	firstRow := true

	for rows.Next() {
		var (
			name                         string
			valueSpecificCount           uint64
			tempOverallTotalMetricValues uint64
			tempOverallCount             uint64
		)

		if err := rows.Scan(&tempOverallTotalMetricValues, &name, &valueSpecificCount, &tempOverallCount); err != nil {
			return nil, fmt.Errorf("error scanning row: %w", err)
		}

		if firstRow {
			overallTotalMetricValues = tempOverallTotalMetricValues
			overallCount = tempOverallCount
			firstRow = false
		}
		values = append(values, TableValue{Name: name, Total: valueSpecificCount})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return &TableResponse{
		Total:  overallTotalMetricValues,
		Count:  overallCount,
		Values: values,
	}, nil
}

func (t TableQueryBuilder) buildQuery(r Payload, metricFormat string) (string, error) {
	if len(r.Series) == 0 {
		return "", fmt.Errorf("payload Series cannot be empty")
	}
	s := r.Series[0]

	// sessions_data WHERE conditions
	durConds, _ := buildDurationWhere(s.Filter.Filters)
	sessFilters, _ := filterOutTypes(s.Filter.Filters, []FilterType{FilterDuration, FilterUserAnonymousId})
	sessConds, evtNames := buildEventConditions(sessFilters, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "main"})
	sessionDataConds := append(durConds, sessConds...)
	// date range for sessions_data
	sessionDataConds = append(sessionDataConds,
		fmt.Sprintf("main.created_at BETWEEN toDateTime(%d/1000) AND toDateTime(%d/1000)", r.StartTimestamp, r.EndTimestamp),
	)
	// clean empty
	var sdClean []string
	for _, c := range sessionDataConds {
		if strings.TrimSpace(c) != "" {
			sdClean = append(sdClean, c)
		}
	}
	sessionDataWhere := ""
	if len(sdClean) > 0 {
		sessionDataWhere = "WHERE " + strings.Join(sdClean, " AND ")
	}
	if len(evtNames) > 0 {
		sessionDataWhere += fmt.Sprintf(" AND main.$event_name IN ('%s')", strings.Join(evtNames, "','"))
	}

	// filtered_data WHERE conditions
	propSel, ok := propertySelectorMap[r.MetricOf]
	if !ok {
		propSel = fmt.Sprintf("JSONExtractString(toString(main.$properties), '%s') AS metric_value", r.MetricOf)
	}
	parts := strings.SplitN(propSel, " AS ", 2)
	propertyExpr := parts[0]

	tAgg := "main.session_id"
	specConds := []string{}
	if metricFormat == MetricFormatUserCount {
		tAgg = "if(empty(sessions.user_id), toString(sessions.user_uuid), sessions.user_id)"
		specConds = append(specConds,
			fmt.Sprintf("NOT (empty(sessions.user_id) AND (sessions.user_uuid IS NULL OR sessions.user_uuid = '%s'))", nilUUIDString),
		)
	}

	// metric-specific filter
	_, mFilt := filterOutTypes(s.Filter.Filters, []FilterType{FilterType(r.MetricOf)})
	metricCond := eventNameCondition("", r.MetricOf)
	if len(mFilt) > 0 {
		//conds, _ := buildEventConditions(mFilt, BuildConditionsOptions{DefinedColumns: map[string]string{"userId": "user_id"}, MainTableAlias: "main"})
		//metricCond = strings.Join(conds, " AND ")
	}

	filteredConds := []string{
		fmt.Sprintf("main.project_id = %d", r.ProjectId),
		metricCond,
		fmt.Sprintf("main.created_at BETWEEN toDateTime(%d/1000) AND toDateTime(%d/1000)", r.StartTimestamp, r.EndTimestamp),
	}
	filteredConds = append(filteredConds, specConds...)
	// clean empty
	var fClean []string
	for _, c := range filteredConds {
		if strings.TrimSpace(c) != "" {
			fClean = append(fClean, c)
		}
	}
	filteredWhere := ""
	if len(fClean) > 0 {
		filteredWhere = "WHERE " + strings.Join(fClean, " AND ")
	}

	limit := r.Limit
	if limit <= 0 {
		limit = 10
	}
	offset := (r.Page - 1) * limit

	query := fmt.Sprintf(`
WITH sessions_data AS (
    SELECT session_id
    FROM product_analytics.events AS main
	JOIN experimental.sessions AS sessions USING (session_id)
    %s
    GROUP BY session_id
),
filtered_data AS (
    SELECT %s AS name, %s AS session_id
    FROM product_analytics.events AS main
    JOIN sessions_data USING (session_id)
	JOIN experimental.sessions AS sessions USING (session_id)
    %s
),
totals AS (
    SELECT count() AS overall_total_metric_values,
           countDistinct(session_id) AS overall_total_count
    FROM filtered_data
),
grouped_values AS (
    SELECT name,
           countDistinct(session_id) AS value_count
    FROM filtered_data
    GROUP BY name
)
SELECT t.overall_total_metric_values,
       g.name,
       g.value_count,
       t.overall_total_count
FROM grouped_values AS g
CROSS JOIN totals AS t
ORDER BY g.value_count DESC
LIMIT %d OFFSET %d;`,
		sessionDataWhere,
		propertyExpr,
		tAgg,
		filteredWhere,
		limit,
		offset,
	)
	return query, nil
}
