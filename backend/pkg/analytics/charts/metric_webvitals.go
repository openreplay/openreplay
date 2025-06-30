package charts

import (
	"fmt"
	"openreplay/backend/pkg/analytics/db"
	"openreplay/backend/pkg/analytics/model"
	"strings"
)

type WebVitalsMetric struct {
	Min    float64 `json:"Min"`
	Avg    float64 `json:"Avg"`
	Max    float64 `json:"Max"`
	P50    float64 `json:"P50"`
	P75    float64 `json:"P75"`
	P90    float64 `json:"P90"`
	Good   []int   `json:"good"`
	Medium []int   `json:"medium"`
	Bad    []int   `json:"bad"`
	Status string  `json:"Status"`
}

type WebVitalsResponse struct {
	DomBuildingTime          WebVitalsMetric `json:"domBuildingTime"`
	Ttfb                     WebVitalsMetric `json:"ttfb"`
	SpeedIndex               WebVitalsMetric `json:"speedIndex"`
	FirstContentfulPaintTime WebVitalsMetric `json:"firstContentfulPaintTime"`
}

type WebVitalsQueryBuilder struct{}

func (h WebVitalsQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
	query, err := h.buildQuery(p)
	if err != nil {
		return nil, err
	}
	rows, err := conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var resp WebVitalsResponse
	if rows.Next() {
		// scan aggregates: min/max Int64, avg/quantiles Float64
		var domMinInt, domMaxInt int64
		var domAvg, domP50, domP75, domP90 float64
		var ttfbMinInt, ttfbMaxInt int64
		var ttfbAvg, ttfbP50, ttfbP75, ttfbP90 float64
		var siMinInt, siMaxInt int64
		var siAvg, siP50, siP75, siP90 float64
		var fcpMinInt, fcpMaxInt int64
		var fcpAvg, fcpP50, fcpP75, fcpP90 float64

		err = rows.Scan(
			&domMinInt, &domAvg, &domMaxInt, &domP50, &domP75, &domP90,
			&ttfbMinInt, &ttfbAvg, &ttfbMaxInt, &ttfbP50, &ttfbP75, &ttfbP90,
			&siMinInt, &siAvg, &siMaxInt, &siP50, &siP75, &siP90,
			&fcpMinInt, &fcpAvg, &fcpMaxInt, &fcpP50, &fcpP75, &fcpP90,
		)
		if err != nil {
			return nil, err
		}

		ranges := map[string]struct{ good, medium, bad []int }{
			"dom_building_time":           {good: []int{0, 300}, medium: []int{301, 600}, bad: []int{601}},
			"ttfb":                        {good: []int{0, 200}, medium: []int{201, 600}, bad: []int{601}},
			"speed_index":                 {good: []int{0, 3400}, medium: []int{3401, 5800}, bad: []int{5801}},
			"first_contentful_paint_time": {good: []int{0, 1800}, medium: []int{1801, 3000}, bad: []int{3001}},
		}

		// build metrics with proper float conversion
		dom := ranges["dom_building_time"]
		resp.DomBuildingTime = buildMetric(
			float64(domMinInt), domAvg, float64(domMaxInt), domP50, domP75, domP90, dom,
		)

		ttfb := ranges["ttfb"]
		resp.Ttfb = buildMetric(
			float64(ttfbMinInt), ttfbAvg, float64(ttfbMaxInt), ttfbP50, ttfbP75, ttfbP90, ttfb,
		)

		si := ranges["speed_index"]
		resp.SpeedIndex = buildMetric(
			float64(siMinInt), siAvg, float64(siMaxInt), siP50, siP75, siP90, si,
		)

		fcp := ranges["first_contentful_paint_time"]
		resp.FirstContentfulPaintTime = buildMetric(
			float64(fcpMinInt), fcpAvg, float64(fcpMaxInt), fcpP50, fcpP75, fcpP90, fcp,
		)
	}
	return resp, nil
}

func buildMetric(min, avg, max, p50, p75, p90 float64, r struct{ good, medium, bad []int }) WebVitalsMetric {
	status := "bad"
	switch {
	case avg >= float64(r.good[0]) && avg <= float64(r.good[1]):
		status = "good"
	case avg >= float64(r.medium[0]) && avg <= float64(r.medium[1]):
		status = "medium"
	}
	return WebVitalsMetric{Min: min, Avg: avg, Max: max, P50: p50, P75: p75, P90: p90, Good: r.good, Medium: r.medium, Bad: r.bad, Status: status}
}

func (h WebVitalsQueryBuilder) buildQuery(p Payload) (string, error) {
	if len(p.MetricPayload.Series) == 0 {
		return "", fmt.Errorf("series empty")
	}
	// split filters
	s := p.MetricPayload.Series[0]
	var globalFilters, eventFilters []model.Filter
	for _, flt := range s.Filter.Filters {
		if flt.IsEvent {
			eventFilters = append(eventFilters, flt)
		} else {
			globalFilters = append(globalFilters, flt)
		}
	}
	globalConds, _ := buildEventConditions(globalFilters, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "events"})
	eventConds, _ := buildEventConditions(eventFilters, BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "events"})

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

	// final ClickHouse query
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
    quantile(0.90)(events."$properties".first_contentful_paint_time::Int64) AS first_contentful_paint_time_p90
FROM product_analytics.events AS events
WHERE %s
  AND (
    isNotNull(events."$properties".dom_building_time)
    OR isNotNull(events."$properties".ttfb)
    OR isNotNull(events."$properties".speed_index)
    OR isNotNull(events."$properties".first_contentful_paint_time)
  )
`, where)
	return query, nil
}
