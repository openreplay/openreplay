package charts

import (
	"fmt"
	"openreplay/backend/pkg/analytics/db"
	"strings"
)

type TableQueryBuilder struct{}

func (t TableQueryBuilder) Execute(p Payload, conn db.Connector) (interface{}, error) {
	return t.buildQuery(p)
}

func (t TableQueryBuilder) buildQuery(r Payload) (string, error) {
	s := r.Series[0]
	sessionFilters, eventFilters := partitionFilters(s.Filter.Filters)
	sessionWhere := buildSessionWhere(sessionFilters)
	eventWhere, seqHaving := buildEventsWhere(eventFilters, s.Filter.EventsOrder)

	subQuery := fmt.Sprintf(
		"SELECT %s,\n"+
			"       MIN(%s) AS first_event_ts,\n"+
			"       MAX(%s) AS last_event_ts\n"+
			"FROM %s AS main\n"+
			"WHERE main.project_id = %%(project_id)s\n"+
			"  AND %s >= toDateTime(%%(start_time)s/1000)\n"+
			"  AND %s <= toDateTime(%%(end_time)s/1000)\n"+
			"  AND (%s)\n"+
			"GROUP BY %s\n"+
			"HAVING %s",
		ColEventSessionID,
		ColEventTime,
		ColEventTime,
		TableEvents,
		ColEventTime,
		ColEventTime,
		strings.Join(eventWhere, " OR "),
		ColEventSessionID,
		seqHaving,
	)

	joinQuery := fmt.Sprintf(
		"SELECT *\n"+
			"FROM %s AS s\n"+
			"INNER JOIN (\n"+
			"    SELECT DISTINCT ev.session_id, ev.`$current_url` AS url_path\n"+
			"    FROM %s AS ev\n"+
			"    WHERE ev.created_at >= toDateTime(%%(start_time)s/1000)\n"+
			"      AND ev.created_at <= toDateTime(%%(end_time)s/1000)\n"+
			"      AND ev.project_id = %%(project_id)s\n"+
			"      AND ev.`$event_name` = 'LOCATION'\n"+
			") AS extra_event USING (session_id)\n"+
			"WHERE s.project_id = %%(project_id)s\n"+
			"  AND isNotNull(s.duration)\n"+
			"  AND s.datetime >= toDateTime(%%(start_time)s/1000)\n"+
			"  AND s.datetime <= toDateTime(%%(end_time)s/1000)\n",
		TableSessions,
		TableEvents,
	)

	if len(sessionWhere) > 0 {
		joinQuery += "  AND " + strings.Join(sessionWhere, " AND ") + "\n"
	}

	main := fmt.Sprintf(
		"SELECT s.session_id AS session_id, s.url_path\n"+
			"FROM (\n%s\n) AS f\n"+
			"INNER JOIN (\n%s) AS s\n"+
			"  ON (s.session_id = f.session_id)\n",
		subQuery,
		joinQuery,
	)

	final := fmt.Sprintf(
		"SELECT COUNT(DISTINCT url_path) OVER () AS main_count,\n"+
			"       url_path AS name,\n"+
			"       COUNT(DISTINCT session_id) AS total,\n"+
			"       COALESCE(SUM(COUNT(DISTINCT session_id)) OVER (), 0) AS total_count\n"+
			"FROM (\n%s) AS filtered_sessions\n"+
			"GROUP BY url_path\n"+
			"ORDER BY total DESC\n"+
			"LIMIT 200 OFFSET 0;",
		main,
	)

	return final, nil
}
