package search

import (
	"context"
	"errors"
	"fmt"
	"log"
	"maps"
	"openreplay/backend/pkg/db/postgres/pool"
	"slices"
	"strings"

	"openreplay/backend/pkg/analytics/charts"
	"openreplay/backend/pkg/analytics/model"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
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
	"ISSUE":          "issue_types",
	"utmSource":      "utm_source",
	"utmMedium":      "utm_medium",
	"utmCampaign":    "utm_campaign",
}

type Search interface {
	GetAll(projectId int, userId uint64, req *model.SessionsSearchRequest) (interface{}, error)
}

type searchImpl struct {
	chConn driver.Conn
	pgConn pool.Pool
}

func New(chConn driver.Conn, pgConn pool.Pool) (Search, error) {
	return &searchImpl{
		chConn: chConn,
		pgConn: pgConn,
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
	viewed_sessions.session_id>0 AS viewed,
	count(1) OVER() AS total_number_of_sessions
	%s
FROM experimental.sessions AS s
	%s
	%s
	%s
WHERE %s
ORDER BY %s %s
LIMIT %d OFFSET %d;`
	viewedSessionsJoinTemplate = `ANY LEFT JOIN (
	SELECT DISTINCT session_id
	FROM experimental.user_viewed_sessions
	WHERE user_id    = %d
	  AND project_id = %d
	  AND _timestamp >= toDateTime(%d)
) AS viewed_sessions ON (viewed_sessions.session_id=s.session_id)`
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

	conds := make([]string, 0)

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
	var metasMap map[string]string = s.getMetadataColumns(projectId)
	var metas string = ""
	if metasMap != nil {
		metas = "," + strings.Join(slices.Collect(maps.Keys(metasMap)), ",")
	}
	query := fmt.Sprintf(sessionsQuery,
		metas,
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
		resp.Total = resp.Sessions[0].TotalNumberOfSessions
	}
	processSessionsMetadata(resp.Sessions, metasMap)
	return resp, nil
}

func (s *searchImpl) getSeriesSessions(projectId int, userId uint64, req *model.SessionsSearchRequest) (*model.SeriesSessionsResponse, error) {
	startSec := req.StartDate / 1000
	endSec := req.EndDate / 1000
	offset := (req.Page - 1) * req.Limit

	response := &model.SeriesSessionsResponse{
		Series: make([]model.SeriesSessionData, 0, len(req.Series)),
	}
	var metasMap map[string]string
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
		metasMap = s.getMetadataColumns(projectId)
		var metas string = ""
		if metasMap != nil {
			metas = "," + strings.Join(slices.Collect(maps.Keys(metasMap)), ",")
		}
		query := fmt.Sprintf(sessionsQuery,
			metas,
			eventsInnerJoin,
			"", //LEFT ANTI JOIN not supported in series context yet
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
			Sessions:   make([]model.Session, 0),
		}

		if err := s.chConn.Select(context.Background(), &seriesData.Sessions, query); err != nil {
			log.Printf("Error executing query: %s\nQuery: %s", err, query)
			return nil, err
		}
		if len(seriesData.Sessions) > 0 {
			seriesData.Total = seriesData.Sessions[0].TotalNumberOfSessions
		}
		response.Series = append(response.Series, seriesData)
	}
	processSessionsMetadata(response.Series[0].Sessions, metasMap)
	return response, nil
}
func (s *searchImpl) getMetadataColumns(projectId int) map[string]string {
	row, err := s.pgConn.Query(`
SELECT metadata_1, metadata_2, metadata_3, metadata_4, metadata_5,
metadata_6, metadata_7, metadata_8, metadata_9, metadata_10
FROM projects
WHERE project_id = $1;`, projectId)
	if err != nil {
		return nil
	}
	defer row.Close()
	// Move to first row
	if !row.Next() {
		log.Fatal("No rows found")
	}
	// Get values
	values, err := row.Values()
	if err != nil {
		log.Panic(err)
		return nil
	}
	// Get column names
	fields := row.FieldDescriptions()
	var result map[string]string = make(map[string]string)
	for i, field := range fields {
		if values[i] != nil {
			result[string(field.Name)] = values[i].(string)
		}
	}
	return result
}
func processSessionsMetadata(rows []model.Session, metasMap map[string]string) {
	if metasMap == nil {
		return
	}
	for i := range len(rows) {
		rows[i].Metadata = make(map[string]*string)
		for metaKey, columnName := range metasMap {
			var value *string
			switch metaKey {
			case "metadata_1":
				value = rows[i].Metadata1
			case "metadata_2":
				value = rows[i].Metadata2
			case "metadata_3":
				value = rows[i].Metadata3
			case "metadata_4":
				value = rows[i].Metadata4
			case "metadata_5":
				value = rows[i].Metadata5
			case "metadata_6":
				value = rows[i].Metadata6
			case "metadata_7":
				value = rows[i].Metadata7
			case "metadata_8":
				value = rows[i].Metadata8
			case "metadata_9":
				value = rows[i].Metadata9
			case "metadata_10":
				value = rows[i].Metadata10
			}
			rows[i].Metadata[columnName] = value
		}
	}
}
