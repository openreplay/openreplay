package charts

import (
	"context"
	"fmt"
	"math"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type WebVitalsMetric struct {
	Min       float64 `json:"Min"`
	MinStatus string  `json:"MinStatus"`
	Avg       float64 `json:"Avg"`
	AvgStatus string  `json:"AvgStatus"`
	Max       float64 `json:"Max"`
	MaxStatus string  `json:"MaxStatus"`
	P50       float64 `json:"P50"`
	P50Status string  `json:"P50Status"`
	P75       float64 `json:"P75"`
	P75Status string  `json:"P75Status"`
	P90       float64 `json:"P90"`
	P90Status string  `json:"P90Status"`
	Good      []int   `json:"good"`
	Medium    []int   `json:"medium"`
	Bad       []int   `json:"bad"`
}

type WebVitalsResponse struct {
	DomBuildingTime          WebVitalsMetric `json:"domBuildingTime"`
	Ttfb                     WebVitalsMetric `json:"ttfb"`
	SpeedIndex               WebVitalsMetric `json:"speedIndex"`
	FirstContentfulPaintTime WebVitalsMetric `json:"firstContentfulPaintTime"`
	Lcp                      WebVitalsMetric `json:"lcp"`
	Cls                      WebVitalsMetric `json:"cls"`
}

type WebVitalsQueryBuilder struct{}

func (h WebVitalsQueryBuilder) Execute(p *Payload, conn driver.Conn) (interface{}, error) {
	query, err := h.buildQuery(p)
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(context.Background(), query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ranges := map[string]struct{ good, medium, bad []int }{
		"dom_building_time":           {good: []int{0, 300}, medium: []int{301, 600}, bad: []int{601}},
		"ttfb":                        {good: []int{0, 200}, medium: []int{201, 600}, bad: []int{601}},
		"speed_index":                 {good: []int{0, 3400}, medium: []int{3401, 5800}, bad: []int{5801}},
		"first_contentful_paint_time": {good: []int{0, 1800}, medium: []int{1801, 3000}, bad: []int{3001}},
		"largest_contentful_paint":    {good: []int{0, 2500}, medium: []int{2501, 4000}, bad: []int{4001}},
		"cumulative_layout_shift":     {good: []int{0, 10}, medium: []int{11, 25}, bad: []int{26}},
	}

	resp := WebVitalsResponse{
		DomBuildingTime:          buildDefaultMetric(ranges["dom_building_time"]),
		Ttfb:                     buildDefaultMetric(ranges["ttfb"]),
		SpeedIndex:               buildDefaultMetric(ranges["speed_index"]),
		FirstContentfulPaintTime: buildDefaultMetric(ranges["first_contentful_paint_time"]),
		Lcp:                      buildDefaultMetric(ranges["largest_contentful_paint"]),
		Cls:                      buildDefaultMetric(ranges["cumulative_layout_shift"]),
	}

	if rows.Next() {
		var (
			domMinInt, domMaxInt           *int64
			domAvg, domP50, domP75, domP90 *float64

			ttfbMinInt, ttfbMaxInt             *int64
			ttfbAvg, ttfbP50, ttfbP75, ttfbP90 *float64

			siMinInt, siMaxInt         *int64
			siAvg, siP50, siP75, siP90 *float64

			fcpMinInt, fcpMaxInt           *int64
			fcpAvg, fcpP50, fcpP75, fcpP90 *float64

			lcpMinInt, lcpMaxInt           *float64
			lcpAvg, lcpP50, lcpP75, lcpP90 *float64

			clsMin, clsMax                 *float64
			clsAvg, clsP50, clsP75, clsP90 *float64
		)

		err = rows.Scan(
			&domMinInt, &domAvg, &domMaxInt, &domP50, &domP75, &domP90,
			&ttfbMinInt, &ttfbAvg, &ttfbMaxInt, &ttfbP50, &ttfbP75, &ttfbP90,
			&siMinInt, &siAvg, &siMaxInt, &siP50, &siP75, &siP90,
			&fcpMinInt, &fcpAvg, &fcpMaxInt, &fcpP50, &fcpP75, &fcpP90,
			&lcpMinInt, &lcpAvg, &lcpMaxInt, &lcpP50, &lcpP75, &lcpP90,
			&clsMin, &clsAvg, &clsMax, &clsP50, &clsP75, &clsP90,
		)
		if err != nil {
			return nil, err
		}

		// Check if we have any non-NULL values (indicating real data)
		if domMinInt != nil || ttfbMinInt != nil || siMinInt != nil || fcpMinInt != nil || lcpMinInt != nil || clsMin != nil {
			resp.DomBuildingTime = buildMetricFromNullable(
				domMinInt, domMaxInt, domAvg, domP50, domP75, domP90,
				ranges["dom_building_time"],
			)
			resp.Ttfb = buildMetricFromNullable(
				ttfbMinInt, ttfbMaxInt, ttfbAvg, ttfbP50, ttfbP75, ttfbP90,
				ranges["ttfb"],
			)
			resp.SpeedIndex = buildMetricFromNullable(
				siMinInt, siMaxInt, siAvg, siP50, siP75, siP90,
				ranges["speed_index"],
			)
			resp.FirstContentfulPaintTime = buildMetricFromNullable(
				fcpMinInt, fcpMaxInt, fcpAvg, fcpP50, fcpP75, fcpP90,
				ranges["first_contentful_paint_time"],
			)
			resp.Lcp = buildMetricFromNullableFloat(
				lcpMinInt, lcpAvg, lcpMaxInt, lcpP50, lcpP75, lcpP90,
				ranges["largest_contentful_paint"],
			)
			resp.Cls = buildMetricFromNullableFloat(
				clsMin, clsAvg, clsMax, clsP50, clsP75, clsP90,
				ranges["cumulative_layout_shift"],
			)
		}
	}

	return resp, nil
}

func buildDefaultMetric(r struct{ good, medium, bad []int }) WebVitalsMetric {
	return WebVitalsMetric{
		Min:       0,
		MinStatus: "good",
		Avg:       0,
		AvgStatus: "good",
		Max:       0,
		MaxStatus: "good",
		P50:       0,
		P50Status: "good",
		P75:       0,
		P75Status: "good",
		P90:       0,
		P90Status: "good",
		Good:      r.good,
		Medium:    r.medium,
		Bad:       r.bad,
	}
}

func buildMetricFromNullable(minInt, maxInt *int64, avg, p50, p75, p90 *float64, r struct{ good, medium, bad []int }) WebVitalsMetric {
	var min, max, avgVal, p50Val, p75Val, p90Val float64

	if minInt != nil && !math.IsNaN(float64(*minInt)) {
		min = float64(*minInt)
	}
	if maxInt != nil && !math.IsNaN(float64(*maxInt)) {
		max = float64(*maxInt)
	}
	if avg != nil && !math.IsNaN(*avg) {
		avgVal = *avg
	}
	if p50 != nil && !math.IsNaN(*p50) {
		p50Val = *p50
	}
	if p75 != nil && !math.IsNaN(*p75) {
		p75Val = *p75
	}
	if p90 != nil && !math.IsNaN(*p90) {
		p90Val = *p90
	}

	return buildMetric(min, avgVal, max, p50Val, p75Val, p90Val, r)
}

func buildMetricFromNullableFloat(min, avg, max, p50, p75, p90 *float64, r struct{ good, medium, bad []int }) WebVitalsMetric {
	var minVal, avgVal, maxVal, p50Val, p75Val, p90Val float64

	if min != nil && !math.IsNaN(*min) {
		minVal = *min
	}
	if avg != nil && !math.IsNaN(*avg) {
		avgVal = *avg
	}
	if max != nil && !math.IsNaN(*max) {
		maxVal = *max
	}
	if p50 != nil && !math.IsNaN(*p50) {
		p50Val = *p50
	}
	if p75 != nil && !math.IsNaN(*p75) {
		p75Val = *p75
	}
	if p90 != nil && !math.IsNaN(*p90) {
		p90Val = *p90
	}

	return buildMetric(minVal, avgVal, maxVal, p50Val, p75Val, p90Val, r)
}

func statusFor(v float64, r struct{ good, medium, bad []int }) string {
	switch {
	case v >= float64(r.good[0]) && v <= float64(r.good[1]):
		return "good"
	case v >= float64(r.medium[0]) && v <= float64(r.medium[1]):
		return "medium"
	default:
		return "bad"
	}
}

func buildMetric(min, avg, max, p50, p75, p90 float64, r struct{ good, medium, bad []int }) WebVitalsMetric {
	return WebVitalsMetric{
		Min:       min,
		MinStatus: statusFor(min, r),
		Avg:       avg,
		AvgStatus: statusFor(avg, r),
		Max:       max,
		MaxStatus: statusFor(max, r),
		P50:       p50,
		P50Status: statusFor(p50, r),
		P75:       p75,
		P75Status: statusFor(p75, r),
		P90:       p90,
		P90Status: statusFor(p90, r),
		Good:      r.good,
		Medium:    r.medium,
		Bad:       r.bad,
	}
}

func (h WebVitalsQueryBuilder) buildQuery(p *Payload) (string, error) {
	innerEventsWhere, _, sessionsWhere := BuildWhere(p.MetricPayload.Series[0].Filter.Filters, string(p.MetricPayload.Series[0].Filter.EventsOrder), "main", "s", true)
	_, outerFiltersWhere, _ := BuildWhere(p.MetricPayload.Series[0].Filter.Filters, string(p.MetricPayload.Series[0].Filter.EventsOrder), "events", "s", true)

	innerEventsWhereStr := ""
	if len(innerEventsWhere) > 0 {
		innerEventsWhereStr = " AND " + strings.Join(innerEventsWhere, " AND ")
	}

	outerFiltersWhereStr := ""
	if len(outerFiltersWhere) > 0 {
		outerFiltersWhereStr = " AND " + strings.Join(outerFiltersWhere, " AND ")
	}

	sessionsWhereStr := ""
	if len(sessionsWhere) > 0 {
		sessionsWhereStr = " AND " + strings.Join(sessionsWhere, " AND ")
	}

	query := fmt.Sprintf(`
SELECT min(events.`+"`$properties`"+`.dom_building_time::Int64) AS dom_building_time_min,
       avg(events.`+"`$properties`"+`.dom_building_time::Int64) AS dom_building_time_avg,
       max(events.`+"`$properties`"+`.dom_building_time::Int64) AS dom_building_time_max,
       median(events.`+"`$properties`"+`.dom_building_time::Int64) AS dom_building_time_p50,
       quantile(0.75)(events.`+"`$properties`"+`.dom_building_time::Int64) AS dom_building_time_p75,
       quantile(0.90)(events.`+"`$properties`"+`.dom_building_time::Int64) AS dom_building_time_p90,
       min(events.`+"`$properties`"+`.ttfb::Int64)              AS ttfb_min,
       avg(events.`+"`$properties`"+`.ttfb::Int64)              AS ttfb_avg,
       max(events.`+"`$properties`"+`.ttfb::Int64)              AS ttfb_max,
       median(events.`+"`$properties`"+`.ttfb::Int64)              AS ttfb_p50,
       quantile(0.75)(events.`+"`$properties`"+`.ttfb::Int64)              AS ttfb_p75,
       quantile(0.90)(events.`+"`$properties`"+`.ttfb::Int64)              AS ttfb_p90,
       min(events.`+"`$properties`"+`.speed_index::Int64)       AS speed_index_min,
       avg(events.`+"`$properties`"+`.speed_index::Int64)       AS speed_index_avg,
       max(events.`+"`$properties`"+`.speed_index::Int64)       AS speed_index_max,
       median(events.`+"`$properties`"+`.speed_index::Int64)       AS speed_index_p50,
       quantile(0.75)(events.`+"`$properties`"+`.speed_index::Int64)       AS speed_index_p75,
       quantile(0.90)(events.`+"`$properties`"+`.speed_index::Int64)       AS speed_index_p90,
       min(events.`+"`$properties`"+`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_min,
       avg(events.`+"`$properties`"+`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_avg,
       max(events.`+"`$properties`"+`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_max,
       median(events.`+"`$properties`"+`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_p50,
       quantile(0.75)(events.`+"`$properties`"+`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_p75,
       quantile(0.90)(events.`+"`$properties`"+`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_p90,
       min(events.`+"`$properties`"+`.LCP::Float64) AS largest_contentful_paint_min,
       avg(events.`+"`$properties`"+`.LCP::Float64) AS largest_contentful_paint_avg,
       max(events.`+"`$properties`"+`.LCP::Float64) AS largest_contentful_paint_max,
       median(events.`+"`$properties`"+`.LCP::Float64) AS largest_contentful_paint_p50,
       quantile(0.75)(events.`+"`$properties`"+`.LCP::Float64) AS largest_contentful_paint_p75,
       quantile(0.90)(events.`+"`$properties`"+`.LCP::Float64) AS largest_contentful_paint_p90,
       min(events.`+"`$properties`"+`.CLS::Float64) AS cumulative_layout_shift_min,
       avg(events.`+"`$properties`"+`.CLS::Float64) AS cumulative_layout_shift_avg,
       max(events.`+"`$properties`"+`.CLS::Float64) AS cumulative_layout_shift_max,
       median(events.`+"`$properties`"+`.CLS::Float64) AS cumulative_layout_shift_p50,
       quantile(0.75)(events.`+"`$properties`"+`.CLS::Float64) AS cumulative_layout_shift_p75,
       quantile(0.90)(events.`+"`$properties`"+`.CLS::Float64) AS cumulative_layout_shift_p90
FROM (SELECT session_id
      FROM (SELECT main.session_id,
                   MIN(main.created_at) AS first_event_ts,
                   MAX(main.created_at) AS last_event_ts
            FROM product_analytics.events AS main
            WHERE main.project_id = %d AND main.created_at >= toDateTime(%d/1000) AND main.created_at <= toDateTime(%d/1000)%s
            GROUP BY session_id) AS f
            INNER JOIN (SELECT DISTINCT ON (session_id) *
                    FROM experimental.sessions AS s
                    WHERE s.project_id = %d AND isNotNull(s.duration)%s AND s.datetime >= toDateTime(%d/1000) AND s.datetime <= toDateTime(%d/1000)
                    ORDER BY _timestamp DESC) AS s ON(s.session_id=f.session_id)
      ) AS raw
       INNER JOIN product_analytics.events USING (session_id)
WHERE events.project_id = %d
  AND events.created_at >= toDateTime(%d / 1000)
  AND events.created_at <= toDateTime(%d / 1000)
  AND events.`+"`$event_name`"+` = 'LOCATION'
  AND events.`+"`$auto_captured`"+`%s
  AND (
    isNotNull(events.`+"`$properties`"+`.dom_building_time)
        OR isNotNull(events.`+"`$properties`"+`.ttfb)
        OR isNotNull(events.`+"`$properties`"+`.speed_index)
        OR isNotNull(events.`+"`$properties`"+`.first_contentful_paint_time)
        OR isNotNull(events.`+"`$properties`"+`.LCP)
        OR isNotNull(events.`+"`$properties`"+`.CLS)
    )`,
		p.ProjectId, p.MetricPayload.StartTimestamp, p.MetricPayload.EndTimestamp, innerEventsWhereStr,
		p.ProjectId, sessionsWhereStr, p.MetricPayload.StartTimestamp, p.MetricPayload.EndTimestamp,
		p.ProjectId, p.MetricPayload.StartTimestamp, p.MetricPayload.EndTimestamp, outerFiltersWhereStr)

	logQuery(fmt.Sprintf("WebVitalsQueryBuilder.buildQuery: %s", query))
	return query, nil
}
