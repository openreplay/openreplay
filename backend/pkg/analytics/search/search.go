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
	GetAll(projectId int, req *model.SessionsSearchRequest) (*model.GetSessionsResponse, error)
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

func (s *searchImpl) scanCard(r rowScanner) (*model.Session, error) {
	c := &model.Session{}
	var rawInfo []byte
	err := r.Scan(
		&c.Duration,
		&c.ErrorsCount,
		&c.EventsCount,
		&c.IssueScore,
		&c.IssueTypes,
		&c.Metadata,
		&c.PagesCount,
		&c.Platform,
		&c.ProjectId,
		&c.SessionId,
		&c.StartTs,
		&c.Timezone,
		&c.UserAnonymousId,
		&c.UserBrowser,
		&c.UserCity,
		&c.UserCountry,
		&c.UserDevice,
		&c.UserDeviceType,
		&c.UserId,
		&c.UserOs,
		&c.UserState,
		&c.UserUuid,
		&c.Viewed,
		&rawInfo,
	)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (s *searchImpl) GetAll(projectId int, req *model.SessionsSearchRequest) (*model.GetSessionsResponse, error) {
	durConds, _ := charts.BuildDurationWhere(req.Filters)
	sessFilters, _ := charts.FilterOutTypes(req.Filters, []model.FilterType{charts.FilterDuration, charts.FilterUserAnonymousId})
	sessConds, _ := charts.BuildEventConditions(sessFilters, charts.BuildConditionsOptions{DefinedColumns: mainColumns, MainTableAlias: "e"})

	// event-level PREWHERE
	eventPrewhereConds := append(sessConds,
		fmt.Sprintf("e.project_id = %d", projectId),
		fmt.Sprintf("e.created_at BETWEEN toDateTime(%d) AND toDateTime(%d)", req.StartDate/1000, req.EndDate/1000),
	)
	prewhere := "PREWHERE " + strings.Join(eventPrewhereConds, " AND ")

	// session-level WHERE
	sessionWhereConds := append(durConds, "s.duration IS NOT NULL")
	where := ""
	if len(sessionWhereConds) > 0 {
		where = "WHERE " + strings.Join(sessionWhereConds, " AND ")
	}

	// total count
	var total uint64
	countQ := fmt.Sprintf(`
		SELECT count()
		  FROM experimental.sessions AS s
		  ANY INNER JOIN (
		    SELECT DISTINCT session_id
		      FROM product_analytics.events AS e
		      %s
		  ) AS fs USING (session_id)
		%s
	`, prewhere, where)

	log.Printf("Count Query: %s", countQ)
	if err := s.chConn.QueryRow(context.Background(), countQ).Scan(&total); err != nil {
		return nil, err
	}

	// sorting
	field, ok := sortOptions[req.Sort]
	if !ok {
		field = sortOptions["datetime"]
	}

	order := "DESC"
	if strings.ToUpper(req.Order) == "ASC" {
		order = "ASC"
	}

	sortClause := fmt.Sprintf("ORDER BY %s %s", field, order)

	// data query
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
		  s.events_count
		FROM experimental.sessions AS s
		ANY INNER JOIN (
		  SELECT DISTINCT session_id
		    FROM product_analytics.events AS e
		    %s
		) AS fs USING (session_id)
		%s
		%s
		LIMIT %d OFFSET %d
	`, prewhere, where, sortClause, req.Limit, req.Page)

	rows, err := s.chConn.Query(context.Background(), dataQ)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	resp := &model.GetSessionsResponse{Total: total, Sessions: make([]model.Session, 0, req.Limit)}
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
		); err != nil {
			return nil, err
		}
		resp.Sessions = append(resp.Sessions, sess)
	}

	return resp, nil
}
