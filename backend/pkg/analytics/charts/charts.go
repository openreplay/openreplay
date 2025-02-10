package charts

import (
	"encoding/json"
	"fmt"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"openreplay/backend/pkg/analytics/cards"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Charts interface {
	GetData(projectId int, userId uint64, req *GetCardChartDataRequest) ([]DataPoint, error)
}

type chartsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
	chConn driver.Conn
}

func New(log logger.Logger, conn pool.Pool) (Charts, error) {
	return &chartsImpl{
		log:    log,
		pgconn: conn,
	}, nil
}

// GetData def get_chart()
func (s *chartsImpl) GetData(projectId int, userID uint64, req *GetCardChartDataRequest) ([]DataPoint, error) {
	if req == nil {
		return nil, fmt.Errorf("request is empty")
	}
	switch {
	case req.MetricType == "funnel":
		return nil, fmt.Errorf("funnel metric type is not supported yet")
	case req.MetricType == "heatMap":
		return nil, fmt.Errorf("heatMap metric type is not supported yet")
	case req.MetricType == "pathAnalysis":
		return nil, fmt.Errorf("pathAnalysis metric type is not supported yet")

	case req.MetricType == "timeseries":
		return s.getTimeseriesCharts(projectId, userID, req)
	case req.MetricType == "table":
		return nil, fmt.Errorf("table metric type is not supported yet")

	case req.MetricType == "errors":
		fallthrough
	case req.MetricType == "performance":
		fallthrough
	case req.MetricType == "resources":
		fallthrough
	case req.MetricType == "webVitals":
		return s.getMetric(projectId, userID, req)

	case req.MetricType == "retention":
		return nil, fmt.Errorf("retention metric type is not supported yet")
	case req.MetricType == "stickiness":
		return nil, fmt.Errorf("stickiness metric type is not supported yet")

	}
	jsonInput := `
    {
        "data": [
            {
                "timestamp": 1733934939000,
                "Series A": 100,
                "Series B": 200
            },
            {
                "timestamp": 1733935939000,
                "Series A": 150,
                "Series B": 250
            }
        ]
    }`

	var resp GetCardChartDataResponse
	if err := json.Unmarshal([]byte(jsonInput), &resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return resp.Data, nil
}

func (s *chartsImpl) getMetric(projectID int, userID uint64, req *GetCardChartDataRequest) ([]DataPoint, error) {
	switch req.MetricOf {
	case "countSessions": // metrics.get_processed_sessions
		return nil, fmt.Errorf("countSessions metric type is not supported yet")
	case "avgVisitedPages": // metrics.get_user_activity_avg_visited_pages
		return nil, fmt.Errorf("avgVisitedPages metric type is not supported yet")
	case "countRequests": // metrics.get_top_metrics_count_requests
		return nil, fmt.Errorf("countRequests metric type is not supported yet")
	case "impactedSessionsByJsErrors": // metrics.get_impacted_sessions_by_js_errors
		return nil, fmt.Errorf("impactedSessionsByJsErrors metric type is not supported yet")
	case "domainsErrors4xx": // metrics.get_domains_errors_4xx
		return nil, fmt.Errorf("domainsErrors4xx metric type is not supported yet")
	case "domainsErrors5xx": // metrics.get_domains_errors_5xx
		return nil, fmt.Errorf("domainsErrors5xx metric type is not supported yet")
	case "errorsPerDomains": // metrics.get_errors_per_domains
		return nil, fmt.Errorf("errorsPerDomains metric type is not supported yet")
	case "errorsPerType": // metrics.get_errors_per_type
		return nil, fmt.Errorf("errorsPerType metric type is not supported yet")

	}
	return nil, fmt.Errorf("metric type is not supported yet")

}

func (s *chartsImpl) getTimeseriesCharts(projectID int, userID uint64, req *GetCardChartDataRequest) ([]DataPoint, error) {
	var dataPoints []DataPoint
	var stepSize = getStepSize(req.StartTimestamp, req.EndTimestamp, req.Density, true, 1000)
	var query string

	switch req.MetricOf {
	case "sessionCount":
		query = fmt.Sprintf(`
			SELECT 
				toUnixTimestamp(toStartOfInterval(processed_sessions.datetime, INTERVAL %d second)) * 1000 AS timestamp,
				COUNT(processed_sessions.session_id) AS count
			FROM (
				SELECT 
					s.session_id AS session_id,
					s.datetime AS datetime
				%s
			) AS processed_sessions
			GROUP BY timestamp
			ORDER BY timestamp;
		`, stepSize, "query_part") // Replace "query_part" with the actual query part
	default:
		return nil, fmt.Errorf("unsupported metric: %s", req.MetricOf)
	}

	fmt.Printf("stepSize: %v\n", stepSize)

	for _, series := range req.Series {
		res, err := s.searchSeries(projectID, series)
		if err != nil {
			return nil, fmt.Errorf("failed to search series: %w", err)
		}
		if seriesData, ok := res.([]DataPoint); ok {
			dataPoints = append(dataPoints, seriesData...)
		} else {
			return nil, fmt.Errorf("unexpected data format from searchSeries")
		}
	}
	return dataPoints, nil
}

func (s *chartsImpl) searchSeries(projectID int, series cards.CardSeries) (interface{}, error) {

	// Placeholder implementation
	return []DataPoint{}, nil
}
