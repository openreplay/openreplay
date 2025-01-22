package charts

import "openreplay/backend/pkg/analytics/cards"

type DataPoint struct {
	Timestamp int64            `json:"timestamp"`
	Series    map[string]int64 `json:"series"`
}

type GetCardChartDataRequest struct {
	MetricType   string             `json:"metricType" validate:"required,oneof=timeseries table funnel errors performance resources webVitals pathAnalysis retention stickiness heatMap"`
	MetricOf     string             `json:"metricOf" validate:"required,oneof=sessionCount userCount"`
	ViewType     string             `json:"viewType" validate:"required,oneof=lineChart areaChart barChart pieChart progressChart table metric"`
	MetricFormat string             `json:"metricFormat" validate:"required,oneof=default percentage"`
	SessionID    int64              `json:"sessionId"`
	Series       []cards.CardSeries `json:"series" validate:"required,dive"`
}

type GetCardChartDataResponse struct {
	Data []DataPoint `json:"data"`
}
