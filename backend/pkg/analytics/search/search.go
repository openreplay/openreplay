package search

import (
	"context"
	"fmt"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"log"
	"openreplay/backend/pkg/analytics/charts"
	"openreplay/backend/pkg/analytics/model"
	"strings"
)

// TODO - check all attributes and map the columns to the correct names
var mainColumns = map[string]string{
	"eventId":        "event_id",
	"sessionId":      "session_id",
	"userDevice":     "$device",
	"userBrowser":    "$browser",
	"browserVersion": "$browser_version",
	"userCity":       "$city",
	"userState":      "$state",
	"userCountry":    "$country",
	"userOs":         "$os",
	"osVersion":      "$os_version",
	"referrer":       "$referrer",
	"fetchDuration":  "$duration_s",
	"ISSUE":          "issue_type",
	"utmSource":      "utm_source",
	"utmMedium":      "utm_medium",
	"utmCampaign":    "utm_campaign",
}

type Search interface {
	GetAll(projectId int, userId uint64, req *model.SessionsSearchRequest) (*model.GetSessionsResponse, error)
}

type searchImpl struct {
	chConn driver.Conn
}

func New(chConn driver.Conn) (Search, error) {
	return &searchImpl{
		chConn: chConn,
	}, nil
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

var sortOptions = map[string]string{
	"datetime":    "s.datetime",
	"startTs":     "s.datetime",
	"eventsCount": "s.events_count",
}

func (s *searchImpl) GetAll(projectId int, userId uint64, req *model.SessionsSearchRequest) (*model.GetSessionsResponse, error) {
	sessFilters, _ := charts.FilterOutTypes(req.Filters, []model.FilterType{
		charts.FilterDuration,
		charts.FilterUserAnonymousId,
	})
	eventConds, otherConds := charts.BuildEventConditions(sessFilters, charts.BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
		EventsOrder:    req.EventsOrder,
	})

	prewhereParts := []string{}
	if req.EventsOrder == "then" && len(eventConds) == 1 {
		prewhereParts = append(prewhereParts, eventConds[0])
	}
	prewhereParts = append(prewhereParts, otherConds...)
	prewhereParts = append(prewhereParts,
		fmt.Sprintf("e.project_id = %d", projectId),
		fmt.Sprintf("e.created_at BETWEEN toDateTime(%d) AND toDateTime(%d)", req.StartDate/1000, req.EndDate/1000),
	)
	prewhere := "PREWHERE " + strings.Join(prewhereParts, " AND ")

	joinClause := ""
	switch req.EventsOrder {
	case "then":
		if len(eventConds) > 1 {
			var pat strings.Builder
			for i := range eventConds {
				pat.WriteString(fmt.Sprintf("(?%d)", i+1))
			}
			joinClause = fmt.Sprintf(
				"GROUP BY e.session_id\nHAVING sequenceMatch('%s')(\n    toDateTime(e.created_at),\n    %s\n)",
				pat.String(),
				strings.Join(eventConds, ",\n    "),
			)
		}
	case "and":
		if len(eventConds) > 0 {
			joinClause = fmt.Sprintf(
				"GROUP BY e.session_id\nHAVING %s",
				strings.Join(eventConds, " AND "),
			)
		}
	case "or":
		if len(eventConds) > 0 {
			joinClause = fmt.Sprintf(
				"GROUP BY e.session_id\nHAVING %s",
				strings.Join(eventConds, " OR "),
			)
		}
	}

	countQ := fmt.Sprintf(`
SELECT count()
FROM experimental.sessions AS s
ANY INNER JOIN (
    SELECT DISTINCT session_id
    FROM product_analytics.events AS e
    %s
    %s
) AS fs USING (session_id)
WHERE s.duration IS NOT NULL
`, prewhere, joinClause)

	log.Printf("Count Query: %s\n", countQ)

	var total uint64
	if err := s.chConn.QueryRow(context.Background(), countQ).Scan(&total); err != nil {
		return nil, err
	}

	field, ok := sortOptions[req.Sort]
	if !ok {
		field = sortOptions["datetime"]
	}
	order := "DESC"
	if strings.EqualFold(req.Order, "ASC") {
		order = "ASC"
	}
	sortClause := fmt.Sprintf("ORDER BY %s %s", field, order)

	dataQ := fmt.Sprintf(`
SELECT
    toString(s.session_id)                    AS session_id,
    s.project_id,
    toUInt64(toUnixTimestamp(s.datetime)*1000) AS start_ts,
    s.duration,
    s.platform,
    s.timezone,
    s.user_id,
    s.user_uuid,
    s.user_anonymous_id,
    s.user_browser,
    s.user_city,
    s.user_country,
    s.user_device,
    s.user_device_type,
    s.user_os,
    s.user_state,
    s.events_count,
    toUInt8(viewed_sessions.session_id > 0)  AS viewed
FROM experimental.sessions AS s
ANY INNER JOIN (
    SELECT DISTINCT session_id
    FROM product_analytics.events AS e
    %s
    %s
) AS fs USING (session_id)
ANY LEFT JOIN (
    SELECT DISTINCT session_id
    FROM experimental.user_viewed_sessions
    WHERE user_id    = %d
      AND project_id = %d
      AND _timestamp >= toDateTime(%d)
) AS viewed_sessions USING (session_id)
WHERE s.duration IS NOT NULL
%s
LIMIT %d OFFSET %d
`, prewhere, joinClause, userId, projectId, req.StartDate/1000, sortClause, req.Limit, req.Page)

	log.Printf("Data Query: %s\n", dataQ)

	rows, err := s.chConn.Query(context.Background(), dataQ)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	resp := &model.GetSessionsResponse{
		Total:    total,
		Sessions: make([]model.Session, 0, req.Limit),
	}
	for rows.Next() {
		var sess model.Session
		if err := rows.Scan(
			&sess.SessionId,
			&sess.ProjectId,
			&sess.StartTs,
			&sess.Duration,
			&sess.Platform,
			&sess.Timezone,
			&sess.UserId,
			&sess.UserUuid,
			&sess.UserAnonymousId,
			&sess.UserBrowser,
			&sess.UserCity,
			&sess.UserCountry,
			&sess.UserDevice,
			&sess.UserDeviceType,
			&sess.UserOs,
			&sess.UserState,
			&sess.EventsCount,
			&sess.Viewed,
		); err != nil {
			return nil, err
		}
		resp.Sessions = append(resp.Sessions, sess)
	}

	return resp, nil
}
