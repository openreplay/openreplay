package search

import (
	"context"
	"errors"
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
	GetAll(projectId int, userId uint64, req *model.SessionsSearchRequest) (interface{}, error)
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

const (
	sessionsQuery = `
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
	toUInt8(viewed_sessions.session_id>0)      AS viewed,
	count() OVER()                            AS total
-- TODO: add metadata
FROM experimental.sessions AS s
	%s
	%s
	%s
WHERE %s
ORDER BY %s %s
LIMIT %d OFFSET %d
`
	viewedSessionsJoinTemplate = `ANY LEFT JOIN (
	SELECT DISTINCT session_id
	FROM experimental.user_viewed_sessions
	WHERE user_id    = %d
	  AND project_id = %d
	  AND _timestamp >= toDateTime(%d)
) AS viewed_sessions USING (session_id)`
)

// GetAll retrieves sessions based on the request parameters.
// Returns different response types based on whether series are requested:
//
// Regular request (req.Series is empty):
//   - Returns *model.GetSessionsResponse with total count and sessions array
//   - Uses req.Filters and req.EventsOrder for filtering
//
// Series request (req.Series has elements):
//   - Returns *model.SeriesSessionsResponse with grouped sessions by series
//   - Each series uses its own filters from req.Series[i].Filters
//   - Each series uses its own events order from req.Series[i].EventsOrder
//   - Pagination is applied to each series individually
//   - Response includes series index, total count, and sessions for each series
func (s *searchImpl) GetAll(projectId int, userId uint64, req *model.SessionsSearchRequest) (interface{}, error) {
	if req == nil {
		return nil, errors.New("nil request")
	}
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit <= 0 || req.Limit > 1000 {
		req.Limit = 100
	}

	// Handle series requests
	if len(req.Series) > 0 {
		return s.getSeriesSessions(projectId, userId, req)
	}

	// Regular single response logic
	return s.getSingleSessions(projectId, userId, req)
}

func (s *searchImpl) getSingleSessions(projectId int, userId uint64, req *model.SessionsSearchRequest) (*model.GetSessionsResponse, error) {
	startSec := req.StartDate / 1000
	endSec := req.EndDate / 1000
	offset := (req.Page - 1) * req.Limit

	eventsWhere, filtersWhere, negativeEventsWhere, sessionsWhere := charts.BuildWhere(req.Filters, req.EventsOrder, "e", "s")
	sessionsWhere = append([]string{fmt.Sprintf("s.project_id = %d", projectId),
		fmt.Sprintf("s.datetime BETWEEN toDateTime(%d) AND toDateTime(%d)", startSec, endSec),
	}, sessionsWhere...)

	var eventsInnerJoin string
	var leftAntiJoin string

	conds := make([]string, 0, len(req.Filters)+2)

	if len(eventsWhere) > 0 || len(filtersWhere) > 0 {
		conds = append([]string{
			fmt.Sprintf("e.project_id = %d", projectId),
			fmt.Sprintf("e.created_at BETWEEN toDateTime(%d) AND toDateTime(%d)", startSec, endSec),
		}, conds...)
		conds = append(conds, filtersWhere...)

		if len(eventsWhere) == 1 {
			conds = append(conds, eventsWhere[0])
		}

		joinClause := charts.BuildJoinClause(req.EventsOrder, eventsWhere)
		eventsInnerJoin = fmt.Sprintf(`ANY INNER JOIN (
		SELECT DISTINCT session_id
		FROM product_analytics.events AS e
		WHERE %s
		%s
	) AS fs USING (session_id)`,
			strings.Join(conds, " AND \n"), joinClause)
	}

	if len(negativeEventsWhere) > 0 {
		conds = append([]string{
			fmt.Sprintf("e.project_id = %d", projectId),
			fmt.Sprintf("e.created_at BETWEEN toDateTime(%d) AND toDateTime(%d)", startSec, endSec),
		}, conds...)
		conds = append(conds, negativeEventsWhere...)

		leftAntiJoin = fmt.Sprintf(`LEFT ANTI JOIN (
		SELECT DISTINCT session_id
		FROM product_analytics.events AS e
		WHERE %s
	) AS negative_sessions USING (session_id)`,
			strings.Join(conds, " AND \n"))
	}

	sortField := sortOptions[req.Sort]
	if sortField == "" {
		sortField = sortOptions["datetime"]
	}
	sortOrder := "DESC"
	if strings.EqualFold(req.Order, "ASC") {
		sortOrder = "ASC"
	}

	viewedJoin := fmt.Sprintf(viewedSessionsJoinTemplate, userId, projectId, startSec)

	query := fmt.Sprintf(sessionsQuery,
		eventsInnerJoin,
		leftAntiJoin,
		viewedJoin,
		strings.Join(sessionsWhere, " AND "),
		sortField,
		sortOrder,
		req.Limit,
		offset,
	)

	log.Printf("Sessions Search Query: %s", query)

	rows, err := s.chConn.Query(context.Background(), query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	resp := &model.GetSessionsResponse{Sessions: make([]model.Session, 0)}
	if err := s.chConn.Select(context.Background(), &resp.Sessions, query); err != nil {
		log.Printf("Error executing query: %s\nQuery: %s", err, query)
		return nil, err
	}
	if len(resp.Sessions) > 0 {
		resp.Total = resp.Sessions[0].Total
	}

	return resp, nil
}

func (s *searchImpl) getSeriesSessions(projectId int, userId uint64, req *model.SessionsSearchRequest) (*model.SeriesSessionsResponse, error) {
	startSec := req.StartDate / 1000
	endSec := req.EndDate / 1000
	offset := (req.Page - 1) * req.Limit

	response := &model.SeriesSessionsResponse{
		Series: make([]model.SeriesSessionData, 0, len(req.Series)),
	}

	for i, series := range req.Series {
		// Create a copy of the request with series-specific filters
		seriesReq := &model.SessionsSearchRequest{
			Filters:     series.Filter.Filters,
			Sort:        req.Sort,
			Order:       req.Order,
			EventsOrder: string(series.Filter.EventsOrder),
			Limit:       req.Limit,
		}

		eventsWhere, filtersWhere, _, sessionsWhere := charts.BuildWhere(seriesReq.Filters, seriesReq.EventsOrder, "e", "s")
		sessionsWhere = append([]string{fmt.Sprintf("s.project_id = %d", projectId),
			fmt.Sprintf("s.datetime BETWEEN toDateTime(%d) AND toDateTime(%d)", startSec, endSec),
		}, sessionsWhere...)

		var eventsInnerJoin string

		conds := make([]string, 0, len(seriesReq.Filters)+2)

		if len(eventsWhere) > 0 || len(filtersWhere) > 0 {
			conds = append([]string{
				fmt.Sprintf("e.project_id = %d", projectId),
				fmt.Sprintf("e.created_at BETWEEN toDateTime(%d) AND toDateTime(%d)", startSec, endSec),
			}, conds...)
			conds = append(conds, filtersWhere...)

			if len(eventsWhere) == 1 {
				conds = append(conds, eventsWhere[0])
			}

			joinClause := charts.BuildJoinClause(seriesReq.EventsOrder, eventsWhere)
			eventsInnerJoin = fmt.Sprintf(`ANY INNER JOIN (
			SELECT DISTINCT session_id
			FROM product_analytics.events AS e
			WHERE %s
			%s
		) AS fs USING (session_id)`,
				strings.Join(conds, " AND \n"), joinClause)
		}

		sortField := sortOptions[seriesReq.Sort]
		if sortField == "" {
			sortField = sortOptions["datetime"]
		}
		sortOrder := "DESC"
		if strings.EqualFold(seriesReq.Order, "ASC") {
			sortOrder = "ASC"
		}

		viewedJoin := fmt.Sprintf(viewedSessionsJoinTemplate, userId, projectId, startSec)

		query := fmt.Sprintf(sessionsQuery,
			eventsInnerJoin,
			viewedJoin,
			strings.Join(sessionsWhere, " AND "),
			sortField,
			sortOrder,
			seriesReq.Limit,
			offset,
		)

		log.Printf("Series %d Sessions Search Query: %s", i, query)

		seriesData := model.SeriesSessionData{
			SeriesId:   series.SeriesID,
			SeriesName: series.Name,
			Sessions:   make([]model.Session, 0, seriesReq.Limit),
		}

		if err := s.chConn.Select(context.Background(), &seriesData.Sessions, query); err != nil {
			log.Printf("Error executing query: %s\nQuery: %s", err, query)
			return nil, err
		}

		response.Series = append(response.Series, seriesData)
	}

	return response, nil
}
