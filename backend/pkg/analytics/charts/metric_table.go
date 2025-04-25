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
	string(MetricOfTableBrowser):  "main.$browser AS metric_value",
	string(MetricOfTableDevice):   "main.$device AS metric_value",
	string(MetricOfTableCountry):  "main.$country AS metric_value",
	string(MetricOfTableReferrer): "main.$referrer AS metric_value",
}

var mainColumns = map[string]string{
	"userBrowser": "$browser",
	"userDevice":  "$device_type",
	"userCountry": "$country",
	"referrer":    "$referrer",
	// TODO add more columns if needed
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

	var (
		overallTotalMetricValues uint64
		overallCount             uint64
		values                   []TableValue
		firstRow                 = true
	)

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

	var propertyName string
	if r.MetricOf == "" {
		return "", fmt.Errorf("MetricOf is empty")
	}
	originalMetricOf := r.MetricOf
	propertyName = originalMetricOf

	eventFilters := s.Filter.Filters
	eventConds, eventNames := buildEventConditions(eventFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
	})

	baseWhereConditions := []string{
		fmt.Sprintf("main.created_at >= toDateTime(%d/1000)", r.StartTimestamp),
		fmt.Sprintf("main.created_at <= toDateTime(%d/1000)", r.EndTimestamp),
		"sessions.duration > 0",
	}

	if r.ProjectId > 0 {
		baseWhereConditions = append(baseWhereConditions, fmt.Sprintf("main.project_id = %d", r.ProjectId))
	}

	var aggregationExpression string
	var aggregationAlias = "aggregation_id"
	var specificWhereConditions []string

	if metricFormat == MetricFormatUserCount {
		aggregationExpression = fmt.Sprintf("if(empty(sessions.user_id), toString(sessions.user_uuid), sessions.user_id)")
		userExclusionCondition := fmt.Sprintf("NOT (empty(sessions.user_id) AND (sessions.user_uuid IS NULL OR sessions.user_uuid = '%s'))", nilUUIDString)
		specificWhereConditions = append(specificWhereConditions, userExclusionCondition)
	} else {
		aggregationExpression = "main.session_id"
	}

	var propertySelector string
	var ok bool
	propertySelector, ok = propertySelectorMap[originalMetricOf]
	if !ok {
		propertySelector = fmt.Sprintf("JSONExtractString(toString(main.$properties), '%s') AS metric_value", propertyName)
	}

	allWhereConditions := baseWhereConditions
	if len(eventConds) > 0 {
		allWhereConditions = append(allWhereConditions, eventConds...)
	}
	if len(eventNames) > 0 {
		allWhereConditions = append(allWhereConditions, "main.`$event_name` IN ("+buildInClause(eventNames)+")")
	}
	allWhereConditions = append(allWhereConditions, specificWhereConditions...)
	whereClause := strings.Join(allWhereConditions, " AND ")

	limit := r.Limit
	if limit <= 0 {
		limit = 10
	}
	page := r.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit
	limitClause := fmt.Sprintf("LIMIT %d OFFSET %d", limit, offset)

	query := fmt.Sprintf(`
		WITH filtered_data AS (
			SELECT DISTINCT
				%s,
				%s AS %s
			FROM product_analytics.events AS main
			INNER JOIN experimental.sessions AS sessions ON main.session_id = sessions.session_id
			WHERE %s
		),
		grouped_values AS (
			SELECT
				metric_value AS name,
				countDistinct(%s) AS value_count
			FROM filtered_data
			WHERE name IS NOT NULL AND name != ''
			GROUP BY name
		)
		SELECT
			(SELECT count() FROM grouped_values) AS overall_total_metric_values,
			name,
			value_count,
			(SELECT countDistinct(%s) FROM filtered_data) AS overall_total_count
		FROM grouped_values
		ORDER BY value_count DESC
		%s
		`,
		propertySelector,
		aggregationExpression,
		aggregationAlias,
		whereClause,
		aggregationAlias,
		aggregationAlias,
		limitClause)

	return query, nil
}
