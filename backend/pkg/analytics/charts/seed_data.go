package charts

import (
	"fmt"
	"time"

	"openreplay/backend/pkg/analytics/model"
)

// generateTimeseriesSeedData returns fake timeseries data in the new format:
//
//	{
//	  "series": {
//	    "<SeriesName>": {
//	      "$overall": { "<date>": count, ... },
//	      "<breakdown1>": { "<date>": count, ... },
//	      ...
//	    }
//	  }
//	}
func generateTimeseriesSeedData(req *model.MetricPayload) map[string]interface{} {
	dates := generateDateRange(req.StartTimestamp, req.EndTimestamp, req.Density)

	seriesMap := make(map[string]interface{})
	for _, s := range req.Series {
		name := s.Name
		if name == "" {
			name = "Series"
		}

		overallData := make(map[string]int)
		russiaData := make(map[string]int)
		switzerlandData := make(map[string]int)
		turkeyData := make(map[string]int)

		for i, d := range dates {
			overallBase := 260 + i*1200
			overallData[d] = overallBase + (i*i*50)%3000
			russiaData[d] = 10 + i*40 + (i*i*3)%200
			switzerlandData[d] = 1 + i*8 + (i*i*2)%50
			turkeyData[d] = 1 + i*10 + (i*i)%60
		}

		seriesMap[name] = map[string]interface{}{
			"$overall":    overallData,
			"Russia":      russiaData,
			"Switzerland": switzerlandData,
			"Turkey":      turkeyData,
		}
	}

	if len(seriesMap) == 0 {
		// Fallback if no series provided
		dates := generateDateRange(req.StartTimestamp, req.EndTimestamp, req.Density)
		overallData := make(map[string]int)
		for i, d := range dates {
			overallData[d] = 260 + i*1200
		}
		seriesMap["Sessions"] = map[string]interface{}{
			"$overall": overallData,
		}
	}

	return map[string]interface{}{
		"data": map[string]interface{}{
			"series": seriesMap,
		},
	}
}

// generateFunnelSeedData returns fake funnel data in the new format with
// steps, conversion ratios, avg_time, p_value, etc.
func generateFunnelSeedData(req *model.MetricPayload) map[string]interface{} {
	// Extract step names from event filters
	var stepNames []string
	if len(req.Series) > 0 {
		for _, f := range req.Series[0].Filter.Filters {
			if f.IsEvent {
				stepNames = append(stepNames, f.Name)
			}
		}
	}
	if len(stepNames) == 0 {
		stepNames = []string{"Step 1", "Step 2", "Step 3"}
	}

	// Number steps
	numberedSteps := make([]string, len(stepNames))
	for i, name := range stepNames {
		numberedSteps[i] = fmt.Sprintf("%d. %s", i+1, name)
	}

	cardName := req.Name
	if cardName == "" {
		cardName = "Conversion Rate"
	}
	seriesKey := fmt.Sprintf("Conversion Rate of %s - All Steps", cardName)

	// Build overall breakdown
	overall := buildFunnelBreakdown(numberedSteps, 39658, 0.35, 113922)

	// Build country breakdowns
	us := buildFunnelBreakdown(numberedSteps, 36855, 0.32, 141385)
	germany := buildFunnelBreakdown(numberedSteps, 1580, 0.41, 98500)
	uk := buildFunnelBreakdown(numberedSteps, 890, 0.38, 105200)

	seriesMap := map[string]interface{}{
		seriesKey: map[string]interface{}{
			"$overall":       overall,
			"United States":  us,
			"Germany":        germany,
			"United Kingdom": uk,
		},
	}

	return map[string]interface{}{
		"data": map[string]interface{}{
			"series": seriesMap,
		},
	}
}

func buildFunnelBreakdown(steps []string, initialCount int, convRate float64, avgTime int) map[string]interface{} {
	propertySumMap := make(map[string]interface{})
	stepConvRatioMap := make(map[string]interface{})
	avgTimeFromStartMap := make(map[string]interface{})
	overallConvRatioMap := make(map[string]interface{})
	countMap := make(map[string]interface{})
	avgTimeMap := make(map[string]interface{})
	pValueMap := make(map[string]interface{})

	currentCount := initialCount
	for i, step := range steps {
		propertySumMap[step] = map[string]interface{}{"all": nil}

		if i == 0 {
			stepConvRatioMap[step] = map[string]interface{}{"all": 1.0}
			overallConvRatioMap[step] = map[string]interface{}{"all": 1.0}
			avgTimeFromStartMap[step] = map[string]interface{}{"all": nil}
			avgTimeMap[step] = map[string]interface{}{"all": nil}
			countMap[step] = map[string]interface{}{"all": currentCount}
		} else {
			prevCount := currentCount
			// Apply a decreasing conversion at each step
			stepRate := convRate + float64(i-1)*(-0.05)
			if stepRate < 0.1 {
				stepRate = 0.1
			}
			currentCount = int(float64(prevCount) * stepRate)

			stepConvRatio := float64(currentCount) / float64(prevCount)
			overallConvRatio := float64(currentCount) / float64(initialCount)
			stepAvgTime := avgTime * (i + 1) / len(steps)

			stepConvRatioMap[step] = map[string]interface{}{"all": roundTo6(stepConvRatio)}
			overallConvRatioMap[step] = map[string]interface{}{"all": roundTo6(overallConvRatio)}
			avgTimeFromStartMap[step] = map[string]interface{}{"all": stepAvgTime}
			avgTimeMap[step] = map[string]interface{}{"all": stepAvgTime}
			countMap[step] = map[string]interface{}{"all": currentCount}

			pValueMap[step] = map[string]interface{}{
				"all": map[string]interface{}{
					"insufficient_samples": false,
					"p":                    1.0,
					"confidence":           0.0,
					"is_interesting":       false,
				},
			}
		}
	}

	return map[string]interface{}{
		"property_sum":        propertySumMap,
		"step_conv_ratio":     stepConvRatioMap,
		"avg_time_from_start": avgTimeFromStartMap,
		"overall_conv_ratio":  overallConvRatioMap,
		"count":               countMap,
		"avg_time":            avgTimeMap,
		"p_value":             pValueMap,
	}
}

// generateTableSeedData returns fake table data in the existing format
func generateTableSeedData(req *model.MetricPayload) map[string]interface{} {
	var values interface{}

	switch req.MetricOf {
	case "screenResolution":
		values = []ResolutionTableValue{
			{CenterWidth: 1920, CenterHeight: 1080, MaxWidth: 2016, MaxHeight: 1134, MinWidth: 1824, MinHeight: 1026, TotalInGroup: 4520},
			{CenterWidth: 1366, CenterHeight: 768, MaxWidth: 1434, MaxHeight: 806, MinWidth: 1297, MinHeight: 729, TotalInGroup: 3210},
			{CenterWidth: 1536, CenterHeight: 864, MaxWidth: 1612, MaxHeight: 907, MinWidth: 1459, MinHeight: 820, TotalInGroup: 1890},
			{CenterWidth: 2560, CenterHeight: 1440, MaxWidth: 2688, MaxHeight: 1512, MinWidth: 2432, MinHeight: 1368, TotalInGroup: 1150},
			{CenterWidth: 3840, CenterHeight: 2160, MaxWidth: 4032, MaxHeight: 2268, MinWidth: 3648, MinHeight: 2052, TotalInGroup: 430},
		}
	case "userBrowser":
		values = []TableValue{
			{MetricName: "Chrome", MetricCount: 15420},
			{MetricName: "Safari", MetricCount: 8930},
			{MetricName: "Firefox", MetricCount: 4210},
			{MetricName: "Edge", MetricCount: 2850},
			{MetricName: "Opera", MetricCount: 890},
		}
	case "userDevice":
		values = []TableValue{
			{MetricName: "Desktop", MetricCount: 18500},
			{MetricName: "Mobile", MetricCount: 9200},
			{MetricName: "Tablet", MetricCount: 3100},
		}
	case "userCountry":
		values = []TableValue{
			{MetricName: "United States", MetricCount: 12300},
			{MetricName: "Germany", MetricCount: 4500},
			{MetricName: "United Kingdom", MetricCount: 3800},
			{MetricName: "France", MetricCount: 2900},
			{MetricName: "India", MetricCount: 2100},
			{MetricName: "Brazil", MetricCount: 1800},
			{MetricName: "Canada", MetricCount: 1500},
		}
	case "LOCATION":
		values = []TableValue{
			{MetricName: "/home", MetricCount: 22100},
			{MetricName: "/dashboard", MetricCount: 15800},
			{MetricName: "/settings", MetricCount: 8400},
			{MetricName: "/profile", MetricCount: 6200},
			{MetricName: "/login", MetricCount: 5100},
			{MetricName: "/signup", MetricCount: 3400},
		}
	case "referrer":
		values = []TableValue{
			{MetricName: "google.com", MetricCount: 9800},
			{MetricName: "(direct)", MetricCount: 7200},
			{MetricName: "twitter.com", MetricCount: 3100},
			{MetricName: "github.com", MetricCount: 2400},
			{MetricName: "linkedin.com", MetricCount: 1800},
		}
	case "userId":
		values = []TableValue{
			{MetricName: "user_abc123", MetricCount: 340},
			{MetricName: "user_def456", MetricCount: 280},
			{MetricName: "user_ghi789", MetricCount: 215},
			{MetricName: "user_jkl012", MetricCount: 190},
			{MetricName: "user_mno345", MetricCount: 165},
		}
	case "REQUEST":
		values = []TableValue{
			{MetricName: "/api/v1/sessions", MetricCount: 18200},
			{MetricName: "/api/v1/users", MetricCount: 12500},
			{MetricName: "/api/v1/events", MetricCount: 9800},
			{MetricName: "/api/v1/metrics", MetricCount: 6400},
			{MetricName: "/api/v1/auth", MetricCount: 4100},
		}
	default:
		values = []TableValue{
			{MetricName: "Item 1", MetricCount: 5000},
			{MetricName: "Item 2", MetricCount: 3200},
			{MetricName: "Item 3", MetricCount: 1800},
		}
	}

	var total uint64 = 0
	var count uint64 = 0
	switch v := values.(type) {
	case []TableValue:
		count = uint64(len(v))
		for _, item := range v {
			total += item.MetricCount
		}
	case []ResolutionTableValue:
		count = uint64(len(v))
		for _, item := range v {
			total += item.TotalInGroup
		}
	}

	return map[string]interface{}{
		"data": &TableResponse{
			Total:  count,
			Count:  total,
			Values: values,
		},
	}
}

// generateTableErrorsSeedData returns fake JS errors data in the existing format
func generateTableErrorsSeedData(req *model.MetricPayload) map[string]interface{} {
	now := time.Now()
	dayAgo := now.Add(-24 * time.Hour)
	weekAgo := now.Add(-7 * 24 * time.Hour)

	chartPoints := func(base int) []ErrorChartPoint {
		var points []ErrorChartPoint
		density := req.Density
		if density < 2 {
			density = 7
		}
		step := (req.EndTimestamp - req.StartTimestamp) / uint64(density)
		for i := 0; i < density; i++ {
			ts := int64(req.StartTimestamp + uint64(i)*step)
			count := uint64(base + (i*17)%50)
			points = append(points, ErrorChartPoint{Timestamp: ts, Count: count})
		}
		return points
	}

	errors := []ErrorItem{
		{
			ErrorID:         "err_001_seed",
			Name:            "TypeError",
			Message:         "Cannot read properties of undefined (reading 'map')",
			Users:           245,
			Total:           1820,
			Sessions:        890,
			FirstOccurrence: weekAgo.UnixMilli(),
			LastOccurrence:  now.UnixMilli(),
			Chart:           chartPoints(30),
		},
		{
			ErrorID:         "err_002_seed",
			Name:            "ReferenceError",
			Message:         "sessionData is not defined",
			Users:           180,
			Total:           950,
			Sessions:        620,
			FirstOccurrence: weekAgo.Add(2 * 24 * time.Hour).UnixMilli(),
			LastOccurrence:  now.Add(-1 * time.Hour).UnixMilli(),
			Chart:           chartPoints(15),
		},
		{
			ErrorID:         "err_003_seed",
			Name:            "SyntaxError",
			Message:         "Unexpected token '<' in JSON at position 0",
			Users:           95,
			Total:           420,
			Sessions:        310,
			FirstOccurrence: dayAgo.UnixMilli(),
			LastOccurrence:  now.Add(-30 * time.Minute).UnixMilli(),
			Chart:           chartPoints(8),
		},
		{
			ErrorID:         "err_004_seed",
			Name:            "NetworkError",
			Message:         "Failed to fetch: /api/v1/analytics",
			Users:           67,
			Total:           280,
			Sessions:        190,
			FirstOccurrence: weekAgo.Add(3 * 24 * time.Hour).UnixMilli(),
			LastOccurrence:  now.Add(-2 * time.Hour).UnixMilli(),
			Chart:           chartPoints(5),
		},
	}

	return map[string]interface{}{
		"data": TableErrorsResponse{
			Total:  uint64(len(errors)),
			Errors: errors,
		},
	}
}

// generateWebVitalsSeedData returns fake web vitals data in the existing format
func generateWebVitalsSeedData() map[string]interface{} {
	resp := WebVitalsResponse{
		DomBuildingTime: WebVitalsMetric{
			Min: 85, MinStatus: "good",
			Avg: 210, AvgStatus: "good",
			Max: 890, MaxStatus: "bad",
			P50: 180, P50Status: "good",
			P75: 280, P75Status: "good",
			P90: 520, P90Status: "medium",
			Good: []int{0, 300}, Medium: []int{301, 600}, Bad: []int{601},
		},
		Ttfb: WebVitalsMetric{
			Min: 45, MinStatus: "good",
			Avg: 150, AvgStatus: "good",
			Max: 780, MaxStatus: "bad",
			P50: 120, P50Status: "good",
			P75: 190, P75Status: "good",
			P90: 380, P90Status: "medium",
			Good: []int{0, 200}, Medium: []int{201, 600}, Bad: []int{601},
		},
		SpeedIndex: WebVitalsMetric{
			Min: 1200, MinStatus: "good",
			Avg: 2800, AvgStatus: "good",
			Max: 8500, MaxStatus: "bad",
			P50: 2400, P50Status: "good",
			P75: 3600, P75Status: "medium",
			P90: 5200, P90Status: "medium",
			Good: []int{0, 3400}, Medium: []int{3401, 5800}, Bad: []int{5801},
		},
		FirstContentfulPaintTime: WebVitalsMetric{
			Min: 320, MinStatus: "good",
			Avg: 1400, AvgStatus: "good",
			Max: 4800, MaxStatus: "bad",
			P50: 1100, P50Status: "good",
			P75: 1900, P75Status: "medium",
			P90: 2800, P90Status: "medium",
			Good: []int{0, 1800}, Medium: []int{1801, 3000}, Bad: []int{3001},
		},
		Lcp: WebVitalsMetric{
			Min: 600, MinStatus: "good",
			Avg: 2100, AvgStatus: "good",
			Max: 6200, MaxStatus: "bad",
			P50: 1800, P50Status: "good",
			P75: 2800, P75Status: "medium",
			P90: 3800, P90Status: "medium",
			Good: []int{0, 2500}, Medium: []int{2501, 4000}, Bad: []int{4001},
		},
		Cls: WebVitalsMetric{
			Min: 2, MinStatus: "good",
			Avg: 8, AvgStatus: "good",
			Max: 42, MaxStatus: "bad",
			P50: 6, P50Status: "good",
			P75: 14, P75Status: "medium",
			P90: 22, P90Status: "medium",
			Good: []int{0, 10}, Medium: []int{11, 25}, Bad: []int{26},
		},
	}
	return map[string]interface{}{"data": resp}
}

// generateUserJourneySeedData returns fake path analysis data in the existing format
func generateUserJourneySeedData(req *model.MetricPayload) map[string]interface{} {
	if req.ViewType == "sunburst" {
		children1 := []SunburstData{
			{Name: "/dashboard", Type: "LOCATION", Depth: 2, Value: 3200, Children: &[]SunburstData{}},
			{Name: "/settings", Type: "LOCATION", Depth: 2, Value: 1800, Children: &[]SunburstData{}},
			{Name: "DROP", Type: "DROP", Depth: 2, Value: 500, Children: &[]SunburstData{}},
		}
		children2 := []SunburstData{
			{Name: "/home", Type: "LOCATION", Depth: 2, Value: 1200, Children: &[]SunburstData{}},
			{Name: "/profile", Type: "LOCATION", Depth: 2, Value: 800, Children: &[]SunburstData{}},
			{Name: "DROP", Type: "DROP", Depth: 2, Value: 400, Children: &[]SunburstData{}},
		}
		data := []SunburstData{
			{Name: "/home", Type: "LOCATION", Depth: 1, Value: 5500, Children: &children1},
			{Name: "/login", Type: "LOCATION", Depth: 1, Value: 2400, Children: &children2},
		}
		return map[string]interface{}{"data": data}
	}

	nodes := []Node{
		{Depth: 0, Name: "/home", EventType: "LOCATION", ID: 0, StartingNode: true},
		{Depth: 0, Name: "/login", EventType: "LOCATION", ID: 1, StartingNode: true},
		{Depth: 1, Name: "/dashboard", EventType: "LOCATION", ID: 2, StartingNode: false},
		{Depth: 1, Name: "/settings", EventType: "LOCATION", ID: 3, StartingNode: false},
		{Depth: 1, Name: "/profile", EventType: "LOCATION", ID: 4, StartingNode: false},
		{Depth: 1, Name: "OTHER", EventType: "OTHER", ID: 5, StartingNode: false},
		{Depth: 1, Name: "None", EventType: "DROP", ID: 6, StartingNode: false},
		{Depth: 2, Name: "/analytics", EventType: "LOCATION", ID: 7, StartingNode: false},
		{Depth: 2, Name: "/settings", EventType: "LOCATION", ID: 8, StartingNode: false},
		{Depth: 2, Name: "None", EventType: "DROP", ID: 9, StartingNode: false},
	}

	links := []Link{
		{EventType: "LOCATION", SessionsCount: 3200, Value: 40.0, Source: 0, Target: 2},
		{EventType: "LOCATION", SessionsCount: 1800, Value: 22.5, Source: 0, Target: 3},
		{EventType: "LOCATION", SessionsCount: 800, Value: 10.0, Source: 0, Target: 5},
		{EventType: "DROP", SessionsCount: 500, Value: 6.25, Source: 0, Target: 6},
		{EventType: "LOCATION", SessionsCount: 1200, Value: 15.0, Source: 1, Target: 4},
		{EventType: "LOCATION", SessionsCount: 600, Value: 7.5, Source: 1, Target: 2},
		{EventType: "DROP", SessionsCount: 400, Value: 5.0, Source: 1, Target: 6},
		{EventType: "LOCATION", SessionsCount: 2100, Value: 26.25, Source: 2, Target: 7},
		{EventType: "LOCATION", SessionsCount: 1400, Value: 17.5, Source: 2, Target: 8},
		{EventType: "DROP", SessionsCount: 900, Value: 11.25, Source: 2, Target: 9},
	}

	return map[string]interface{}{
		"data": JourneyData{Nodes: nodes, Links: links},
	}
}

// generateHeatmapSessionSeedData returns fake heatmap session data in the existing format
func generateHeatmapSessionSeedData() map[string]interface{} {
	now := time.Now()
	return map[string]interface{}{
		"data": HeatmapSessionResponse{
			SessionID:      "seed_session_001",
			StartTs:        uint64(now.Add(-30 * time.Minute).UnixMilli()),
			Duration:       1800,
			EventTimestamp: uint64(now.Add(-25 * time.Minute).UnixMilli()),
			UrlPath:        "/home",
		},
	}
}

// GetSeedData dispatches to the appropriate seed data generator based on MetricType
func GetSeedData(req *model.MetricPayload) map[string]interface{} {
	switch model.MetricType(req.MetricType) {
	case MetricTypeTimeseries:
		return generateTimeseriesSeedData(req)
	case MetricTypeFunnel:
		return generateFunnelSeedData(req)
	case MetricTypeTable:
		if req.MetricOf == "jsException" {
			return generateTableErrorsSeedData(req)
		}
		return generateTableSeedData(req)
	case MetricTypeHeatmap:
		return generateHeatmapSessionSeedData()
	case MetricWebVitals:
		return generateWebVitalsSeedData()
	case MetricUserJourney:
		return generateUserJourneySeedData(req)
	default:
		return map[string]interface{}{
			"error": fmt.Sprintf("unsupported metric type for seed data: %s", req.MetricType),
		}
	}
}

// --- helpers ---

func generateDateRange(startTs, endTs uint64, density int) []string {
	if density <= 0 {
		density = 12
	}
	start := time.UnixMilli(int64(startTs))
	end := time.UnixMilli(int64(endTs))

	totalDuration := end.Sub(start)
	step := totalDuration / time.Duration(density)
	if step < time.Hour {
		step = time.Hour
	}

	var dates []string
	current := start
	for i := 0; i < density && current.Before(end); i++ {
		dates = append(dates, current.Format(time.RFC3339))
		current = current.Add(step)
	}
	if len(dates) == 0 {
		dates = append(dates, start.Format(time.RFC3339))
	}
	return dates
}

func roundTo6(f float64) float64 {
	return float64(int(f*1000000)) / 1000000
}
