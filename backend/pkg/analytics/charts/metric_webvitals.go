package charts

import (
	"context"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
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

	var resp WebVitalsResponse
	if rows.Next() {
		var (
			domMinInt, domMaxInt           int64
			domAvg, domP50, domP75, domP90 float64

			ttfbMinInt, ttfbMaxInt             int64
			ttfbAvg, ttfbP50, ttfbP75, ttfbP90 float64

			siMinInt, siMaxInt         int64
			siAvg, siP50, siP75, siP90 float64

			fcpMinInt, fcpMaxInt           int64
			fcpAvg, fcpP50, fcpP75, fcpP90 float64

			lcpMinInt, lcpMaxInt           float64
			lcpAvg, lcpP50, lcpP75, lcpP90 float64

			clsMin, clsMax                 float64
			clsAvg, clsP50, clsP75, clsP90 float64
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

		ranges := map[string]struct{ good, medium, bad []int }{
			"dom_building_time":           {good: []int{0, 300}, medium: []int{301, 600}, bad: []int{601}},
			"ttfb":                        {good: []int{0, 200}, medium: []int{201, 600}, bad: []int{601}},
			"speed_index":                 {good: []int{0, 3400}, medium: []int{3401, 5800}, bad: []int{5801}},
			"first_contentful_paint_time": {good: []int{0, 1800}, medium: []int{1801, 3000}, bad: []int{3001}},
			"largest_contentful_paint":    {good: []int{0, 2500}, medium: []int{2501, 4000}, bad: []int{4001}},
			"cumulative_layout_shift":     {good: []int{0, 10}, medium: []int{11, 25}, bad: []int{26}},
		}

		resp.DomBuildingTime = buildMetric(
			float64(domMinInt), domAvg, float64(domMaxInt), domP50, domP75, domP90,
			ranges["dom_building_time"],
		)
		resp.Ttfb = buildMetric(
			float64(ttfbMinInt), ttfbAvg, float64(ttfbMaxInt), ttfbP50, ttfbP75, ttfbP90,
			ranges["ttfb"],
		)
		resp.SpeedIndex = buildMetric(
			float64(siMinInt), siAvg, float64(siMaxInt), siP50, siP75, siP90,
			ranges["speed_index"],
		)
		resp.FirstContentfulPaintTime = buildMetric(
			float64(fcpMinInt), fcpAvg, float64(fcpMaxInt), fcpP50, fcpP75, fcpP90,
			ranges["first_contentful_paint_time"],
		)
		resp.Lcp = buildMetric(
			lcpMinInt, lcpAvg, lcpMaxInt, lcpP50, lcpP75, lcpP90,
			ranges["largest_contentful_paint"],
		)
		resp.Cls = buildMetric(
			clsMin, clsAvg, clsMax, clsP50, clsP75, clsP90,
			ranges["cumulative_layout_shift"],
		)
	}
	return resp, nil
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
	var globalFilters, eventFilters []model.Filter
	for _, flt := range p.MetricPayload.Series[0].Filter.Filters {
		if flt.IsEvent {
			eventFilters = append(eventFilters, flt)
		} else {
			globalFilters = append(globalFilters, flt)
		}
	}
	globalConds, _ := BuildEventConditions(globalFilters, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "events"})
	eventConds, _ := BuildEventConditions(eventFilters, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "events"})

	conds := []string{
		fmt.Sprintf("events.project_id = %d", p.ProjectId),
		fmt.Sprintf("events.created_at >= toDateTime(%d/1000)", p.MetricPayload.StartTimestamp),
		fmt.Sprintf("events.created_at <= toDateTime(%d/1000)", p.MetricPayload.EndTimestamp),
		"events.`$event_name` = 'LOCATION'",
		"events.`$auto_captured`",
	}
	conds = append(conds, globalConds...)
	conds = append(conds, eventConds...)
	where := strings.Join(conds, " AND ")

	query := fmt.Sprintf(`
SELECT
    min(events."$properties".dom_building_time::Int64) AS dom_building_time_min,
    avg(events."$properties".dom_building_time::Int64) AS dom_building_time_avg,
    max(events."$properties".dom_building_time::Int64) AS dom_building_time_max,
    median(events."$properties".dom_building_time::Int64) AS dom_building_time_p50,
    quantile(0.75)(events."$properties".dom_building_time::Int64) AS dom_building_time_p75,
    quantile(0.90)(events."$properties".dom_building_time::Int64) AS dom_building_time_p90,
    min(events."$properties".ttfb::Int64) AS ttfb_min,
    avg(events."$properties".ttfb::Int64) AS ttfb_avg,
    max(events."$properties".ttfb::Int64) AS ttfb_max,
    median(events."$properties".ttfb::Int64) AS ttfb_p50,
    quantile(0.75)(events."$properties".ttfb::Int64) AS ttfb_p75,
    quantile(0.90)(events."$properties".ttfb::Int64) AS ttfb_p90,
    min(events."$properties".speed_index::Int64) AS speed_index_min,
    avg(events."$properties".speed_index::Int64) AS speed_index_avg,
    max(events."$properties".speed_index::Int64) AS speed_index_max,
    median(events."$properties".speed_index::Int64) AS speed_index_p50,
    quantile(0.75)(events."$properties".speed_index::Int64) AS speed_index_p75,
    quantile(0.90)(events."$properties".speed_index::Int64) AS speed_index_p90,
    min(events."$properties".first_contentful_paint_time::Int64) AS first_contentful_paint_time_min,
    avg(events."$properties".first_contentful_paint_time::Int64) AS first_contentful_paint_time_avg,
    max(events."$properties".first_contentful_paint_time::Int64) AS first_contentful_paint_time_max,
    median(events."$properties".first_contentful_paint_time::Int64) AS first_contentful_paint_time_p50,
    quantile(0.75)(events."$properties".first_contentful_paint_time::Int64) AS first_contentful_paint_time_p75,
    quantile(0.90)(events."$properties".first_contentful_paint_time::Int64) AS first_contentful_paint_time_p90,
    min(events."$properties".LCP::Float64) AS largest_contentful_paint_min,
    avg(events."$properties".LCP::Float64) AS largest_contentful_paint_avg,
    max(events."$properties".LCP::Float64) AS largest_contentful_paint_max,
    median(events."$properties".LCP::Float64) AS largest_contentful_paint_p50,
    quantile(0.75)(events."$properties".LCP::Float64) AS largest_contentful_paint_p75,
    quantile(0.90)(events."$properties".LCP::Float64) AS largest_contentful_paint_p90,
    min(events."$properties".CLS::Float64) AS cumulative_layout_shift_min,
    avg(events."$properties".CLS::Float64) AS cumulative_layout_shift_avg,
    max(events."$properties".CLS::Float64) AS cumulative_layout_shift_max,
    median(events."$properties".CLS::Float64) AS cumulative_layout_shift_p50,
    quantile(0.75)(events."$properties".CLS::Float64) AS cumulative_layout_shift_p75,
    quantile(0.90)(events."$properties".CLS::Float64) AS cumulative_layout_shift_p90
FROM product_analytics.events AS events
WHERE %s
  AND (
    isNotNull(events."$properties".dom_building_time)
    OR isNotNull(events."$properties".ttfb)
    OR isNotNull(events."$properties".speed_index)
    OR isNotNull(events."$properties".first_contentful_paint_time)
    OR isNotNull(events."$properties".LCP)
    OR isNotNull(events."$properties".CLS)
  )
`, where)

	logQuery(fmt.Sprintf("WebVitalsQueryBuilder.buildQuery: %s", query))
	return query, nil
}
