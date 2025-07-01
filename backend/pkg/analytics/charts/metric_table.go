package charts

import (
	"context"
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
	string(MetricOfTableLocation):   "JSONExtractString(toString(main.$properties), 'url_path') AS metric_value",
	string(MetricOfTableUserId):     "if(empty(sessions.user_id) OR sessions.user_id IS NULL, 'Anonymous', sessions.user_id) AS metric_value",
	string(MetricOfTableBrowser):    "main.$browser AS metric_value",
	string(MetricOfTableDevice):     "if(empty(sessions.user_device) OR sessions.user_device IS NULL, 'Undefined', sessions.user_device) AS metric_value",
	string(MetricOfTableCountry):    "toString(sessions.user_country) AS metric_value",
	string(MetricOfTableReferrer):   "main.$referrer AS metric_value",
	string(MetricOfTableFetch):      "JSONExtractString(toString(main.$properties), 'url_path') AS metric_value",
	string(MetricOfTableResolution): "if(sessions.screen_width = 0 AND sessions.screen_height = 0, 'Unknown', concat(toString(sessions.screen_width), 'x', toString(sessions.screen_height))) AS metric_value",
}

var mainColumns = map[string]string{
	"userBrowser":   "$browser",
	"userDevice":    "sessions.user_device",
	"referrer":      "$referrer",
	"fetchDuration": "$duration_s",
	"ISSUE":         "issue_type",
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
	if len(r.Series) == 0 {
		return "", fmt.Errorf("payload Series cannot be empty")
	}
	s := r.Series[0]

	// sessions_data WHERE conditions
	durConds, _ := buildDurationWhere(s.Filter.Filters)
	sessFilters, _ := filterOutTypes(s.Filter.Filters, []model.FilterType{FilterDuration, FilterUserAnonymousId})
	sessConds, evtNames := buildEventConditions(sessFilters, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "main"})
	sessionDataConds := append(durConds, sessConds...)
	// add project_id condition
	sessionDataConds = append(sessionDataConds, fmt.Sprintf("main.project_id = %d", r.ProjectId))
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
		// TODO - check if this is needed
	}

	// filtered_data WHERE conditions
	propSel, ok := propertySelectorMap[r.MetricOf]
	if !ok {
		propSel = fmt.Sprintf("JSONExtractString(toString(main.$properties), '%s') AS metric_value", r.MetricOf)
	}
	parts := strings.SplitN(propSel, " AS ", 2)
	propertyExpr := parts[0]

	tAgg := "main.session_id"
	var specConds []string
	if metricFormat == MetricFormatUserCount {
		tAgg = "if(empty(sessions.user_id), toString(sessions.user_uuid), sessions.user_id)"
		specConds = append(specConds,
			fmt.Sprintf("NOT (empty(sessions.user_id) AND (sessions.user_uuid IS NULL OR sessions.user_uuid = '%s'))", nilUUIDString),
		)
	}

	// metric-specific filter
	_, mFilt := filterOutTypes(s.Filter.Filters, []model.FilterType{model.FilterType(r.MetricOf)})
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
    SELECT countDistinct(name) AS overall_total_metric_values,
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
