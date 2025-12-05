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

var webVitalsRanges = map[string]struct{ good, medium, bad []int }{
	"dom_building_time":           {good: []int{0, 300}, medium: []int{301, 600}, bad: []int{601}},
	"ttfb":                        {good: []int{0, 200}, medium: []int{201, 600}, bad: []int{601}},
	"speed_index":                 {good: []int{0, 3400}, medium: []int{3401, 5800}, bad: []int{5801}},
	"first_contentful_paint_time": {good: []int{0, 1800}, medium: []int{1801, 3000}, bad: []int{3001}},
	"largest_contentful_paint":    {good: []int{0, 2500}, medium: []int{2501, 4000}, bad: []int{4001}},
	"cumulative_layout_shift":     {good: []int{0, 10}, medium: []int{11, 25}, bad: []int{26}},
}

type scannedValues struct {
	domMin, domMax                     *float64
	domAvg, domP50, domP75, domP90     *float64
	ttfbMin, ttfbMax                   *float64
	ttfbAvg, ttfbP50, ttfbP75, ttfbP90 *float64
	siMin, siMax                       *float64
	siAvg, siP50, siP75, siP90         *float64
	fcpMin, fcpMax                     *float64
	fcpAvg, fcpP50, fcpP75, fcpP90     *float64
	lcpMin, lcpMax                     *float64
	lcpAvg, lcpP50, lcpP75, lcpP90     *float64
	clsMin, clsMax                     *float64
	clsAvg, clsP50, clsP75, clsP90     *float64
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

	resp := WebVitalsResponse{
		DomBuildingTime:          buildDefaultMetric(webVitalsRanges["dom_building_time"]),
		Ttfb:                     buildDefaultMetric(webVitalsRanges["ttfb"]),
		SpeedIndex:               buildDefaultMetric(webVitalsRanges["speed_index"]),
		FirstContentfulPaintTime: buildDefaultMetric(webVitalsRanges["first_contentful_paint_time"]),
		Lcp:                      buildDefaultMetric(webVitalsRanges["largest_contentful_paint"]),
		Cls:                      buildDefaultMetric(webVitalsRanges["cumulative_layout_shift"]),
	}

	if rows.Next() {
		var vals scannedValues
		err = rows.Scan(
			&vals.domMin, &vals.domAvg, &vals.domMax, &vals.domP50, &vals.domP75, &vals.domP90,
			&vals.ttfbMin, &vals.ttfbAvg, &vals.ttfbMax, &vals.ttfbP50, &vals.ttfbP75, &vals.ttfbP90,
			&vals.siMin, &vals.siAvg, &vals.siMax, &vals.siP50, &vals.siP75, &vals.siP90,
			&vals.fcpMin, &vals.fcpAvg, &vals.fcpMax, &vals.fcpP50, &vals.fcpP75, &vals.fcpP90,
			&vals.lcpMin, &vals.lcpAvg, &vals.lcpMax, &vals.lcpP50, &vals.lcpP75, &vals.lcpP90,
			&vals.clsMin, &vals.clsAvg, &vals.clsMax, &vals.clsP50, &vals.clsP75, &vals.clsP90,
		)
		if err != nil {
			return nil, err
		}

		if vals.hasData() {
			resp.DomBuildingTime = buildMetricFromValues(
				vals.domMin, vals.domMax, vals.domAvg, vals.domP50, vals.domP75, vals.domP90,
				webVitalsRanges["dom_building_time"],
			)
			resp.Ttfb = buildMetricFromValues(
				vals.ttfbMin, vals.ttfbMax, vals.ttfbAvg, vals.ttfbP50, vals.ttfbP75, vals.ttfbP90,
				webVitalsRanges["ttfb"],
			)
			resp.SpeedIndex = buildMetricFromValues(
				vals.siMin, vals.siMax, vals.siAvg, vals.siP50, vals.siP75, vals.siP90,
				webVitalsRanges["speed_index"],
			)
			resp.FirstContentfulPaintTime = buildMetricFromValues(
				vals.fcpMin, vals.fcpMax, vals.fcpAvg, vals.fcpP50, vals.fcpP75, vals.fcpP90,
				webVitalsRanges["first_contentful_paint_time"],
			)
			resp.Lcp = buildMetricFromValues(
				vals.lcpMin, vals.lcpMax, vals.lcpAvg, vals.lcpP50, vals.lcpP75, vals.lcpP90,
				webVitalsRanges["largest_contentful_paint"],
			)
			resp.Cls = buildMetricFromValues(
				vals.clsMin, vals.clsMax, vals.clsAvg, vals.clsP50, vals.clsP75, vals.clsP90,
				webVitalsRanges["cumulative_layout_shift"],
			)
		}
	}

	return resp, nil
}

func (v *scannedValues) hasData() bool {
	return v.domMin != nil || v.ttfbMin != nil || v.siMin != nil ||
		v.fcpMin != nil || v.lcpMin != nil || v.clsMin != nil
}

func safeFloat64(val interface{}) float64 {
	switch v := val.(type) {
	case *float64:
		if v != nil && !math.IsNaN(*v) {
			return *v
		}
	}
	return 0
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

func buildMetricFromValues(min, max, avg, p50, p75, p90 interface{}, r struct{ good, medium, bad []int }) WebVitalsMetric {
	return buildMetric(
		safeFloat64(min), safeFloat64(avg), safeFloat64(max),
		safeFloat64(p50), safeFloat64(p75), safeFloat64(p90), r)
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
	innerEventsWhere, _, _, sessionsWhere := BuildWhere(p.MetricPayload.Series[0].Filter.Filters, string(p.MetricPayload.Series[0].Filter.EventsOrder), "main", "s", true)
	_, outerFiltersWhere, _, _ := BuildWhere(p.MetricPayload.Series[0].Filter.Filters, string(p.MetricPayload.Series[0].Filter.EventsOrder), "events", "s", true)

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
SELECT minIf(events.`+"`$properties`"+`.dom_building_time::Float64, isNotNull(events.`+"`$properties`"+`.dom_building_time)) AS dom_building_time_min,
       avgIf(events.`+"`$properties`"+`.dom_building_time::Float64, isNotNull(events.`+"`$properties`"+`.dom_building_time)) AS dom_building_time_avg,
       maxIf(events.`+"`$properties`"+`.dom_building_time::Float64, isNotNull(events.`+"`$properties`"+`.dom_building_time)) AS dom_building_time_max,
       quantileIf(0.5)(events.`+"`$properties`"+`.dom_building_time::Float64, isNotNull(events.`+"`$properties`"+`.dom_building_time)) AS dom_building_time_p50,
       quantileIf(0.75)(events.`+"`$properties`"+`.dom_building_time::Float64, isNotNull(events.`+"`$properties`"+`.dom_building_time)) AS dom_building_time_p75,
       quantileIf(0.90)(events.`+"`$properties`"+`.dom_building_time::Float64, isNotNull(events.`+"`$properties`"+`.dom_building_time)) AS dom_building_time_p90,
       minIf(events.`+"`$properties`"+`.ttfb::Float64, isNotNull(events.`+"`$properties`"+`.ttfb))              AS ttfb_min,
       avgIf(events.`+"`$properties`"+`.ttfb::Float64, isNotNull(events.`+"`$properties`"+`.ttfb))              AS ttfb_avg,
       maxIf(events.`+"`$properties`"+`.ttfb::Float64, isNotNull(events.`+"`$properties`"+`.ttfb))              AS ttfb_max,
       quantileIf(0.5)(events.`+"`$properties`"+`.ttfb::Float64, isNotNull(events.`+"`$properties`"+`.ttfb))              AS ttfb_p50,
       quantileIf(0.75)(events.`+"`$properties`"+`.ttfb::Float64, isNotNull(events.`+"`$properties`"+`.ttfb))              AS ttfb_p75,
       quantileIf(0.90)(events.`+"`$properties`"+`.ttfb::Float64, isNotNull(events.`+"`$properties`"+`.ttfb))              AS ttfb_p90,
       minIf(events.`+"`$properties`"+`.speed_index::Float64, isNotNull(events.`+"`$properties`"+`.speed_index))       AS speed_index_min,
       avgIf(events.`+"`$properties`"+`.speed_index::Float64, isNotNull(events.`+"`$properties`"+`.speed_index))       AS speed_index_avg,
       maxIf(events.`+"`$properties`"+`.speed_index::Float64, isNotNull(events.`+"`$properties`"+`.speed_index))       AS speed_index_max,
       quantileIf(0.5)(events.`+"`$properties`"+`.speed_index::Float64, isNotNull(events.`+"`$properties`"+`.speed_index))       AS speed_index_p50,
       quantileIf(0.75)(events.`+"`$properties`"+`.speed_index::Float64, isNotNull(events.`+"`$properties`"+`.speed_index))       AS speed_index_p75,
       quantileIf(0.90)(events.`+"`$properties`"+`.speed_index::Float64, isNotNull(events.`+"`$properties`"+`.speed_index))       AS speed_index_p90,
       minIf(events.`+"`$properties`"+`.first_contentful_paint_time::Float64, isNotNull(events.`+"`$properties`"+`.first_contentful_paint_time)) AS first_contentful_paint_time_min,
       avgIf(events.`+"`$properties`"+`.first_contentful_paint_time::Float64, isNotNull(events.`+"`$properties`"+`.first_contentful_paint_time)) AS first_contentful_paint_time_avg,
       maxIf(events.`+"`$properties`"+`.first_contentful_paint_time::Float64, isNotNull(events.`+"`$properties`"+`.first_contentful_paint_time)) AS first_contentful_paint_time_max,
       quantileIf(0.5)(events.`+"`$properties`"+`.first_contentful_paint_time::Float64, isNotNull(events.`+"`$properties`"+`.first_contentful_paint_time)) AS first_contentful_paint_time_p50,
       quantileIf(0.75)(events.`+"`$properties`"+`.first_contentful_paint_time::Float64, isNotNull(events.`+"`$properties`"+`.first_contentful_paint_time)) AS first_contentful_paint_time_p75,
       quantileIf(0.90)(events.`+"`$properties`"+`.first_contentful_paint_time::Float64, isNotNull(events.`+"`$properties`"+`.first_contentful_paint_time)) AS first_contentful_paint_time_p90,
       minIf(events.`+"`$properties`"+`.LCP::Float64, isNotNull(events.`+"`$properties`"+`.LCP)) AS largest_contentful_paint_min,
       avgIf(events.`+"`$properties`"+`.LCP::Float64, isNotNull(events.`+"`$properties`"+`.LCP)) AS largest_contentful_paint_avg,
       maxIf(events.`+"`$properties`"+`.LCP::Float64, isNotNull(events.`+"`$properties`"+`.LCP)) AS largest_contentful_paint_max,
       quantileIf(0.5)(events.`+"`$properties`"+`.LCP::Float64, isNotNull(events.`+"`$properties`"+`.LCP)) AS largest_contentful_paint_p50,
       quantileIf(0.75)(events.`+"`$properties`"+`.LCP::Float64, isNotNull(events.`+"`$properties`"+`.LCP)) AS largest_contentful_paint_p75,
       quantileIf(0.90)(events.`+"`$properties`"+`.LCP::Float64, isNotNull(events.`+"`$properties`"+`.LCP)) AS largest_contentful_paint_p90,
       minIf(events.`+"`$properties`"+`.CLS::Float64, isNotNull(events.`+"`$properties`"+`.CLS)) AS cumulative_layout_shift_min,
       avgIf(events.`+"`$properties`"+`.CLS::Float64, isNotNull(events.`+"`$properties`"+`.CLS)) AS cumulative_layout_shift_avg,
       maxIf(events.`+"`$properties`"+`.CLS::Float64, isNotNull(events.`+"`$properties`"+`.CLS)) AS cumulative_layout_shift_max,
       quantileIf(0.5)(events.`+"`$properties`"+`.CLS::Float64, isNotNull(events.`+"`$properties`"+`.CLS)) AS cumulative_layout_shift_p50,
       quantileIf(0.75)(events.`+"`$properties`"+`.CLS::Float64, isNotNull(events.`+"`$properties`"+`.CLS)) AS cumulative_layout_shift_p75,
       quantileIf(0.90)(events.`+"`$properties`"+`.CLS::Float64, isNotNull(events.`+"`$properties`"+`.CLS)) AS cumulative_layout_shift_p90
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

	return query, nil
}
