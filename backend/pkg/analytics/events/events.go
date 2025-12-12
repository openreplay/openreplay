package events

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/events/model"
	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/logger"
)

type Events interface {
	SearchEvents(ctx context.Context, projID uint32, req *model.EventsSearchRequest) (*model.EventsSearchResponse, error)
	GetEventByID(ctx context.Context, projID uint32, eventID string) (*model.EventEntry, error)
}

type eventsImpl struct {
	log    logger.Logger
	chConn driver.Conn
}

func New(log logger.Logger, conn driver.Conn) (Events, error) {
	return &eventsImpl{
		log:    log,
		chConn: conn,
	}, nil
}

func (e *eventsImpl) buildSearchQueryParams(projID uint32, req *model.EventsSearchRequest) (whereClause string, params []interface{}, needsUserJoin bool) {
	startTime := filters.ConvertMillisToTime(req.StartDate)
	endTime := filters.ConvertMillisToTime(req.EndDate)

	baseConditions := []string{
		"e.project_id = ?",
		"e.created_at >= ?",
		"e.created_at <= ?",
	}
	params = []interface{}{projID, startTime, endTime}

	filterConditions, filterParams, needsUserJoin := BuildEventSearchQuery("e", req.Filters)
	whereClause = filters.BuildWhereClause(baseConditions, filterConditions)
	params = append(params, filterParams...)

	return whereClause, params, needsUserJoin
}

func (e *eventsImpl) buildSearchQueryWithCount(whereClause string, selectColumns []string, sortBy, sortOrder string, needsUserJoin bool, projID uint32) string {
	var sb strings.Builder
	sb.WriteString("SELECT COUNT(*) OVER() as total_count, ")
	sb.WriteString(strings.Join(selectColumns, ", "))
	sb.WriteString(" FROM product_analytics.events AS e")
	
	if needsUserJoin {
		sb.WriteString(" LEFT JOIN (")
		sb.WriteString("SELECT * FROM product_analytics.users WHERE project_id = ")
		sb.WriteString(fmt.Sprintf("%d", projID))
		sb.WriteString(" ORDER BY _timestamp DESC LIMIT 1 BY project_id, \"$user_id\"")
		sb.WriteString(") AS u ON e.project_id = u.project_id AND e.\"$user_id\" = u.\"$user_id\"")
	}
	
	sb.WriteString(" WHERE ")
	sb.WriteString(whereClause)
	sb.WriteString(" ORDER BY ")
	sb.WriteString(sortBy)
	sb.WriteString(" ")
	sb.WriteString(sortOrder)
	sb.WriteString(" LIMIT ? OFFSET ?")

	return sb.String()
}

func (e *eventsImpl) buildScanPointers(entry *model.EventEntry, columns []string, createdAt *time.Time) []interface{} {
	valuePtrs := []interface{}{
		&entry.ProjectId,
		&entry.EventId,
		&entry.EventName,
		createdAt,
		&entry.DistinctId,
		&entry.SessionId,
	}

	for _, col := range columns {
		if col == string(filters.EventColumnSessionID) || col == string(filters.EventColumnEventID) {
			continue
		}
		if ptr := model.GetFieldPointer(entry, col); ptr != nil {
			valuePtrs = append(valuePtrs, ptr)
		}
	}

	return valuePtrs
}

func (e *eventsImpl) SearchEvents(ctx context.Context, projID uint32, req *model.EventsSearchRequest) (*model.EventsSearchResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("search events request cannot be nil")
	}

	offset := filters.CalculateOffset(req.Page, req.Limit)

	whereClause, queryParams, needsUserJoin := e.buildSearchQueryParams(projID, req)

	columnsStr := filters.ConvertColumnsToStrings(req.Columns)
	
	selectColumns := BuildSelectColumns("e", columnsStr)
	sortBy := "e." + ValidateSortColumn(string(req.SortBy))
	sortOrder := filters.ValidateSortOrder(string(req.SortOrder))

	query := e.buildSearchQueryWithCount(whereClause, selectColumns, sortBy, sortOrder, needsUserJoin, projID)
	queryParams = append(queryParams, req.Limit, offset)

	rows, err := e.chConn.Query(ctx, query, queryParams...)
	if err != nil {
		e.log.Error(ctx, "failed to execute search query for project %d: %v", projID, err)
		return nil, fmt.Errorf("failed to query events for project %d: %w", projID, err)
	}
	defer rows.Close()

	var total uint64
	events := make([]model.EventEntry, 0, req.Limit)
	for rows.Next() {
		entry := model.EventEntry{}
		var createdAt time.Time
		valuePtrs := e.buildScanPointers(&entry, columnsStr, &createdAt)
		
		scanPtrs := append([]interface{}{&total}, valuePtrs...)
		if err := rows.Scan(scanPtrs...); err != nil {
			e.log.Error(ctx, "failed to scan event row for project %d: %v", projID, err)
			continue
		}

		entry.CreatedAt = filters.ConvertTimeToMillis(createdAt)

		if err := entry.UnmarshalProperties(); err != nil {
			e.log.Error(ctx, "failed to unmarshal properties for event in project %d: %v", projID, err)
			continue
		}

		events = append(events, entry)
	}

	if err := rows.Err(); err != nil {
		e.log.Error(ctx, "error iterating event rows for project %d: %v", projID, err)
		return nil, fmt.Errorf("error processing event results: %w", err)
	}

	return &model.EventsSearchResponse{
		Total:  total,
		Events: events,
	}, nil
}

func (e *eventsImpl) buildGetEventQuery(selectColumns []string) string {
	var sb strings.Builder
	sb.WriteString("SELECT ")
	sb.WriteString(strings.Join(selectColumns, ", "))
	sb.WriteString(" FROM product_analytics.events WHERE project_id = ? AND event_id = ? LIMIT 1")
	return sb.String()
}

func (e *eventsImpl) GetEventByID(ctx context.Context, projID uint32, eventID string) (*model.EventEntry, error) {
	if eventID == "" {
		return nil, fmt.Errorf("event ID cannot be empty")
	}

	allColumns := filters.EventColumns
	selectColumns := BuildSelectColumns("", allColumns)
	query := e.buildGetEventQuery(selectColumns)

	entry := model.EventEntry{}
	var createdAt time.Time
	scanPtrs := e.buildScanPointers(&entry, allColumns, &createdAt)

	err := e.chConn.QueryRow(ctx, query, projID, eventID).Scan(scanPtrs...)
	if err != nil {
		e.log.Error(ctx, "failed to get event %s for project %d: %v", eventID, projID, err)
		return nil, fmt.Errorf("failed to get event %s for project %d: %w", eventID, projID, err)
	}

	entry.CreatedAt = filters.ConvertTimeToMillis(createdAt)

	if err := entry.UnmarshalProperties(); err != nil {
		e.log.Error(ctx, "failed to unmarshal properties for event %s in project %d: %v", eventID, projID, err)
		return nil, fmt.Errorf("failed to unmarshal properties for event %s: %w", eventID, err)
	}

	return &entry, nil
}