package charts

import (
	"fmt"
	"log"
	"openreplay/backend/pkg/analytics/db"
)

type TimeSeriesQueryBuilder struct{}

func (t TimeSeriesQueryBuilder) Execute(p *Payload, conn db.Connector) (interface{}, error) {
	query, err := t.buildQuery(p)
	if err != nil {
		log.Fatalf("Error building query: %v", err)
		return nil, err
	}

	rows, err := conn.Query(query)
	if err != nil {
		log.Fatalf("Error executing query: %v", err)
		return nil, err
	}
	defer rows.Close()

	var results []DataPoint

	for rows.Next() {
		var res DataPoint
		if err := rows.Scan(&res.Timestamp, &res.Count); err != nil {
			return nil, err
		}
		//sum += res.Count
		results = append(results, res)
	}

	filled := FillMissingDataPoints(p.StartTimestamp, p.EndTimestamp, p.Density, DataPoint{}, results, 1000)
	return filled, nil
}

func (t TimeSeriesQueryBuilder) buildQuery(p *Payload) (string, error) {
	query := ""
	switch p.MetricOf {
	case "sessionCount":
		query = t.buildSessionCountQuery(p)
	case "userCount":
		query = t.buildUserCountQuery(p)
	default:
		query = ""
	}
	return query, nil
}

func (TimeSeriesQueryBuilder) buildSessionCountQuery(p *Payload) string {
	stepSize := int(getStepSize(p.StartTimestamp, p.EndTimestamp, p.Density, false, 1000))
	subquery := buildEventSubquery(p)
	return fmt.Sprintf(`SELECT toUnixTimestamp(
	toStartOfInterval(processed_sessions.datetime, INTERVAL %d second)
) * 1000 AS timestamp,
COUNT(processed_sessions.session_id) AS count
FROM (
	%s
) AS processed_sessions
GROUP BY timestamp
ORDER BY timestamp;`, stepSize, subquery)
}

func (TimeSeriesQueryBuilder) buildUserCountQuery(p *Payload) string {
	stepSize := int(getStepSize(p.StartTimestamp, p.EndTimestamp, p.Density, false, 1000))
	subquery := buildEventSubquery(p)
	return fmt.Sprintf(`SELECT toUnixTimestamp(
	toStartOfInterval(processed_sessions.datetime, INTERVAL %d second)
) * 1000 AS timestamp,
COUNT(DISTINCT processed_sessions.user_id) AS count
FROM (
	%s
) AS processed_sessions
GROUP BY timestamp
ORDER BY timestamp;`, stepSize, subquery)
}

func FillMissingDataPoints(
	startTime, endTime int64,
	density int,
	neutral DataPoint,
	rows []DataPoint,
	timeCoefficient int64,
) []DataPoint {
	if density <= 1 {
		return rows
	}

	stepSize := uint64(getStepSize(startTime, endTime, density, false, 1000))
	bucketSize := stepSize * uint64(timeCoefficient)

	lookup := make(map[uint64]DataPoint)
	for _, dp := range rows {
		if dp.Timestamp < uint64(startTime) {
			continue
		}
		bucket := uint64(startTime) + (((dp.Timestamp - uint64(startTime)) / bucketSize) * bucketSize)
		lookup[bucket] = dp
	}

	results := make([]DataPoint, 0, density)
	for i := 0; i < density; i++ {
		ts := uint64(startTime) + uint64(i)*bucketSize
		if dp, ok := lookup[ts]; ok {
			results = append(results, dp)
		} else {
			nd := neutral
			nd.Timestamp = ts
			results = append(results, nd)
		}
	}
	return results
}
