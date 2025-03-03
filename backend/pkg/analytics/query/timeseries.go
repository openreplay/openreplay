package query

import "fmt"

type TimeSeriesQueryBuilder struct{}

func (t TimeSeriesQueryBuilder) Build(p MetricPayload) string {
	switch p.MetricOf {
	case "sessionCount":
		return t.buildSessionCountQuery(p)
	case "userCount":
		return t.buildUserCountQuery(p)
	default:
		return ""
	}
}

func (TimeSeriesQueryBuilder) buildSessionCountQuery(p MetricPayload) string {
	subquery := buildEventSubquery(p)
	return fmt.Sprintf(`SELECT toUnixTimestamp(
	toStartOfInterval(processed_sessions.datetime, INTERVAL 115199 second)
) * 1000 AS timestamp,
COUNT(processed_sessions.session_id) AS count
FROM (
	%s
) AS processed_sessions
GROUP BY timestamp
ORDER BY timestamp;`, subquery)
}

func (TimeSeriesQueryBuilder) buildUserCountQuery(p MetricPayload) string {
	subquery := buildEventSubquery(p)
	return fmt.Sprintf(`SELECT toUnixTimestamp(
	toStartOfInterval(processed_sessions.datetime, INTERVAL 115199 second)
) * 1000 AS timestamp,
COUNT(DISTINCT processed_sessions.user_id) AS count
FROM (
	%s
) AS processed_sessions
GROUP BY timestamp
ORDER BY timestamp;`, subquery)
}
