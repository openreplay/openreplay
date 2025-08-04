package charts

import (
	"context"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type HeatmapSessionResponse struct {
	SessionID      string `json:"sessionId"`
	StartTs        uint64 `json:"startTs"`
	Duration       uint32 `json:"duration"`
	EventTimestamp uint64 `json:"eventTimestamp"`
	UrlPath        string `json:"urlPath"`
}

type HeatmapSessionQueryBuilder struct{}

func (h *HeatmapSessionQueryBuilder) Execute(p *Payload, conn driver.Conn) (interface{}, error) {
	shortestQ, err := h.buildQuery(p)
	if err != nil {
		return nil, err
	}

	row := conn.QueryRow(context.Background(), shortestQ)
	if err = row.Err(); err != nil {
		return nil, err
	}

	var (
		sid      string
		startTs  uint64
		duration uint32
		eventTs  uint64
		urlPath  string
	)
	if err = row.Scan(&sid, &startTs, &duration, &eventTs, &urlPath); err != nil {
		return HeatmapSessionResponse{}, nil
	}

	return HeatmapSessionResponse{
		SessionID:      sid,
		StartTs:        startTs,
		Duration:       duration,
		EventTimestamp: eventTs,
		UrlPath:        urlPath,
	}, nil
}

func (h *HeatmapSessionQueryBuilder) buildQuery(p *Payload) (string, error) {
	s := p.MetricPayload.Series[0]

	startSec := p.MetricPayload.StartTimestamp / 1000
	endSec := (p.MetricPayload.EndTimestamp + 86400000) / 1000
	projectId := p.ProjectId

	// Build event conditions for CTE (alias: e2)
	_, cteEventConds := BuildEventConditions(s.Filter.Filters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e2",
	})

	cteBase := []string{
		fmt.Sprintf("e2.created_at >= toDateTime(%d)", startSec),
		fmt.Sprintf("e2.created_at < toDateTime(%d)", endSec),
		fmt.Sprintf("e2.project_id = %d", projectId),
		"e2.`$event_name` = 'CLICK'",
	}
	cteBase = append(cteBase, cteEventConds...)
	cteWhere := strings.Join(cteBase, " AND ")

	// Build event conditions for subquery (alias: e)
	_, subEventConds := BuildEventConditions(s.Filter.Filters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "ev",
	})

	subBase := []string{
		fmt.Sprintf("created_at >= toDateTime(%d)", startSec),
		fmt.Sprintf("created_at < toDateTime(%d)", endSec),
		fmt.Sprintf("project_id = %d", projectId),
		"`$event_name` = 'CLICK'",
	}
	subBase = append(subBase, subEventConds...)
	subBase = append(subBase, "JSONExtractString(toString(`$properties`), 'url_path') = (SELECT url_path FROM top_url_path)")
	subWhere := strings.Join(subBase, " AND ")

	q := fmt.Sprintf(`
WITH top_url_path AS (
    SELECT
        JSONExtractString(toString(e2."$properties"), 'url_path') AS url_path,
        COUNT(*) AS cnt
    FROM product_analytics.events AS e2
    WHERE %s
    GROUP BY url_path
    ORDER BY cnt DESC
    LIMIT 1
)

SELECT
    toString(s.session_id) AS session_id,
    toUnixTimestamp(s.datetime) * 1000 AS startTs,
    s.duration,
    toUnixTimestamp(e.created_at) * 1000 AS eventTs,
    e.url_path
FROM (
    SELECT
        *,
        JSONExtractString(toString(ev."$properties"), 'url_path') AS url_path
    FROM product_analytics.events ev
    WHERE %s
) AS e
INNER JOIN experimental.sessions AS s USING (session_id)
WHERE s.duration > 500
ORDER BY e.created_at ASC, s.duration ASC
LIMIT 1;`, cteWhere, subWhere)

	logQuery(fmt.Sprintf("HeatmapSessionQueryBuilder.buildQuery: %s", q))
	return q, nil
}
