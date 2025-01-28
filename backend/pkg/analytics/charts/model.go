package charts

import "openreplay/backend/pkg/analytics/cards"

type DataPoint struct {
	Timestamp int64            `json:"timestamp"`
	Series    map[string]int64 `json:"series"`
}

type GetCardChartDataRequest struct {
	StartTimestamp int64              `json:"startTimestamp" validate:"required"`
	EndTimestamp   int64              `json:"endTimestamp" validate:"required"`
	Density        int                `json:"density" validate:"required"`
	MetricType     string             `json:"metricType" validate:"required,oneof=timeseries table funnel errors performance resources webVitals pathAnalysis retention stickiness heatMap"`
	MetricOf       string             `json:"metricOf" validate:"required,oneof=sessionCount userCount"`
	ViewType       string             `json:"viewType" validate:"required,oneof=lineChart areaChart barChart pieChart progressChart table metric"`
	MetricFormat   string             `json:"metricFormat" validate:"required,oneof=default percentage"`
	SessionID      int64              `json:"sessionId"`
	Series         []cards.CardSeries `json:"series" validate:"required,dive"`
}

type GetCardChartDataResponse struct {
	Data []DataPoint `json:"data"`
}

type MetricType string
type MetricOfTimeseries string
type MetricOfTable string

const (
	MetricTypeTimeseries MetricType = "TIMESERIES"
	MetricTypeTable      MetricType = "TABLE"

	MetricOfTimeseriesSessionCount MetricOfTimeseries = "SESSION_COUNT"
	MetricOfTimeseriesUserCount    MetricOfTimeseries = "USER_COUNT"

	MetricOfTableVisitedURL  MetricOfTable = "VISITED_URL"
	MetricOfTableIssues      MetricOfTable = "ISSUES"
	MetricOfTableUserCountry MetricOfTable = "USER_COUNTRY"
	MetricOfTableUserDevice  MetricOfTable = "USER_DEVICE"
	MetricOfTableUserBrowser MetricOfTable = "USER_BROWSER"
)

type SessionsSearchPayload struct {
	StartTimestamp int64
	EndTimestamp   int64
	Filters        []SessionSearchFilter
}

type SessionSearchFilter struct {
	Type     FilterType
	Value    interface{}
	Operator SearchEventOperator
}

type SearchEventOperator string // Define constants as needed
type FilterType string          // Define constants as needed
