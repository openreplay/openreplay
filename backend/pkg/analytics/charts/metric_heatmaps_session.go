package charts

import (
	"context"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
)

type HeatmapSessionResponse struct {
	SessionID      string `json:"sessionId"`
	StartTs        uint64 `json:"startTs"`
	Duration       uint32 `json:"duration"`
	EventTimestamp uint64 `json:"eventTimestamp"`
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
	)
	if err = row.Scan(&sid, &startTs, &duration, &eventTs); err != nil {
		return nil, err
	}

	return HeatmapSessionResponse{
		SessionID:      sid,
		StartTs:        startTs,
		Duration:       duration,
		EventTimestamp: eventTs,
	}, nil
}

func (h *HeatmapSessionQueryBuilder) buildQuery(p *Payload) (string, error) {
	s := p.MetricPayload.Series[0]

	var globalFilters, eventFilters []model.Filter
	for _, flt := range s.Filter.Filters {
		if flt.IsEvent {
			eventFilters = append(eventFilters, flt)
		} else {
			globalFilters = append(globalFilters, flt)
		}
	}

	globalConds, _ := buildEventConditions(globalFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
	})

	eventConds, _ := buildEventConditions(eventFilters, BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
	})

	base := []string{
		fmt.Sprintf("e.created_at >= toDateTime(%d)", p.MetricPayload.StartTimestamp/1000),
		fmt.Sprintf("e.created_at < toDateTime(%d)", (p.MetricPayload.EndTimestamp+86400000)/1000),
		fmt.Sprintf("e.project_id = %d", p.ProjectId),
		"s.duration > 500",
		"e.`$event_name` = 'LOCATION'",
	}
	base = append(base, eventConds...)
	base = append(base, globalConds...)

	where := strings.Join(base, " AND ")

	q := fmt.Sprintf(`
		SELECT
			toString(s.session_id) AS session_id,
			toUnixTimestamp(s.datetime) * 1000 as startTs,
			s.duration,
			toUnixTimestamp(e.created_at) * 1000 as eventTs
		FROM product_analytics.events AS e
		JOIN experimental.sessions AS s USING(session_id)
		WHERE %s
		ORDER BY e.created_at ASC, s.duration ASC
		LIMIT 1;`, where)

	logQuery(fmt.Sprintf("HeatmapSessionQueryBuilder.buildQuery: %s", q))
	return q, nil
}
