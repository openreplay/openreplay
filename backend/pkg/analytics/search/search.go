package search

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/charts"
	"openreplay/backend/pkg/analytics/model"
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
	offset := (req.Page - 1) * req.Limit
	conds := []string{}
	eventsWhere, filtersWhere, sessionsWhere := buildWhere(req)
	eventsInnerJoin := ""

	if req.EventsOrder == "then" && len(eventsWhere) == 1 {
		conds = append(conds, eventsWhere[0])
	}

	if len(eventsWhere) == 0 && len(filtersWhere) == 0 {
		sessionsWhere = append([]string{
			fmt.Sprintf("s.project_id = %d", projectId),
			fmt.Sprintf("s.datetime BETWEEN toDateTime(%d) AND toDateTime(%d)", req.StartDate/1000, req.EndDate/1000),
		}, sessionsWhere...)
	} else {
		conds = append([]string{
			fmt.Sprintf("e.project_id = %d", projectId),
			fmt.Sprintf("e.created_at BETWEEN toDateTime(%d) AND toDateTime(%d)", req.StartDate/1000, req.EndDate/1000),
		}, conds...)
		conds = append(conds, filtersWhere...)

		joinClause := buildJoinClause(req.EventsOrder, eventsWhere)
		eventsInnerJoin = fmt.Sprintf(`ANY INNER JOIN (
		    SELECT DISTINCT session_id
		    FROM product_analytics.events AS e
		    %s
		    %s
		) AS fs USING (session_id)`, joinClause, "PREWHERE "+strings.Join(conds, " AND "))
	}

	sortField, ok := sortOptions[req.Sort]
	if !ok {
		sortField = sortOptions["datetime"]
	}
	sortOrder := "DESC"
	if strings.EqualFold(req.Order, "ASC") {
		sortOrder = "ASC"
	}

	viewedSessionsJoin := fmt.Sprintf(`ANY LEFT JOIN (
    SELECT DISTINCT session_id
    FROM experimental.user_viewed_sessions
    WHERE user_id    = %d
      AND project_id = %d
      AND _timestamp >= toDateTime(%d)
) AS viewed_sessions USING (session_id)`, userId, projectId, req.StartDate/1000)

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
    toUInt8(viewed_sessions.session_id > 0)  AS viewed,
    count() OVER ()                          AS total
FROM experimental.sessions AS s
	%s
	%s
WHERE
    %s
ORDER BY %s %s
LIMIT %d OFFSET %d
`,
		eventsInnerJoin,
		viewedSessionsJoin,
		strings.Join(sessionsWhere, " AND "),
		sortField, sortOrder,
		req.Limit,
		offset,
	)

	log.Printf("Sessions Search Query: %s\n", dataQ)

	rows, err := s.chConn.Query(context.Background(), dataQ)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	resp := &model.GetSessionsResponse{
		Sessions: make([]model.Session, 0, req.Limit),
	}
	first := true
	for rows.Next() {
		var sess model.Session
		var total uint64
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
			&total,
		); err != nil {
			return nil, err
		}
		if first {
			resp.Total = total
			first = false
		}
		resp.Sessions = append(resp.Sessions, sess)
	}

	return resp, nil
}

func buildWhere(req *model.SessionsSearchRequest) (events, eventFilters, sessionFilters []string) {
	events = make([]string, 0, len(req.Filters))
	eventFilters = make([]string, 0, len(req.Filters))
	sessionFilters = make([]string, 0, len(req.Filters)+1)
	sessionFilters = append(sessionFilters, "s.duration IS NOT NULL")

	var sessionFiltersList, eventFiltersList []model.Filter
	for _, f := range req.Filters {
		if _, ok := charts.SessionColumns[f.Name]; ok {
			sessionFiltersList = append(sessionFiltersList, f)
		} else {
			eventFiltersList = append(eventFiltersList, f)
		}
	}

	evConds, misc := charts.BuildEventConditions(eventFiltersList, charts.BuildConditionsOptions{
		DefinedColumns: mainColumns,
		MainTableAlias: "e",
		EventsOrder:    req.EventsOrder,
	})
	events = append(events, evConds...)
	eventFilters = append(eventFilters, misc...)

	_, sConds := charts.BuildEventConditions(sessionFiltersList, charts.BuildConditionsOptions{
		DefinedColumns: charts.SessionColumns,
		MainTableAlias: "s",
	})
	durConds, _ := charts.BuildDurationWhere(req.Filters, "s")
	sessionFilters = append(sessionFilters, durConds...)
	sessionFilters = append(sessionFilters, sConds...)

	return
}

func buildJoinClause(order string, eventsWhere []string) string {
	switch order {
	case "then":
		if len(eventsWhere) > 1 {
			var pat strings.Builder
			for i := range eventsWhere {
				pat.WriteString(fmt.Sprintf("(?%d)", i+1))
			}
			return fmt.Sprintf(
				"GROUP BY e.session_id\nHAVING sequenceMatch('%s')(\n    toDateTime(e.created_at),\n    %s\n)",
				pat.String(),
				strings.Join(eventsWhere, ",\n    "),
			)
		}
	case "and":
		if len(eventsWhere) > 0 {
			return fmt.Sprintf("GROUP BY e.session_id\nHAVING %s", strings.Join(eventsWhere, " AND "))
		}
	case "or":
		if len(eventsWhere) > 0 {
			return fmt.Sprintf("GROUP BY e.session_id\nHAVING %s", strings.Join(eventsWhere, " OR "))
		}
	}
	return ""
}
