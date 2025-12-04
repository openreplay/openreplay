package events

import (
	"context"
	"fmt"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/events/model"
	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/logger"
)

type Events interface {
	SearchEvents(projID uint32, req *model.EventsSearchRequest) (*model.EventsSearchResponse, error)
	GetEventByID(projID uint32, eventID string) (*model.EventEntry, error)
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

func (e *eventsImpl) buildSearchQueryParams(projID uint32, req *model.EventsSearchRequest) (whereClause string, params []interface{}) {
	baseConditions := []string{
		"e.project_id = ?",
		"e.created_at >= toDateTime64(?/1000, 3)",
		"e.created_at <= toDateTime64(?/1000, 3)",
	}
	params = []interface{}{projID, req.StartDate, req.EndDate}

	filterConditions, filterParams := BuildEventSearchQuery("e", req.Filters)
	whereClause = filters.BuildWhereClause(baseConditions, filterConditions)
	params = append(params, filterParams...)

	return whereClause, params
}

func (e *eventsImpl) buildSearchQueryWithCount(whereClause string, selectColumns []string, sortBy, sortOrder string) string {
	var sb strings.Builder
	sb.WriteString("SELECT COUNT(*) OVER() as total_count, ")
	sb.WriteString(strings.Join(selectColumns, ", "))
	sb.WriteString(" FROM product_analytics.events AS e WHERE ")
	sb.WriteString(whereClause)
	sb.WriteString(" ORDER BY ")
	sb.WriteString(sortBy)
	sb.WriteString(" ")
	sb.WriteString(sortOrder)
	sb.WriteString(" LIMIT ? OFFSET ?")

	return sb.String()
}

func (e *eventsImpl) buildScanPointers(entry *model.EventEntry, columns []string) []interface{} {
	valuePtrs := []interface{}{
		&entry.ProjectId,
		&entry.EventId,
		&entry.EventName,
		&entry.CreatedAt,
		&entry.DistinctId,
		&entry.SessionId,
	}

	for _, col := range columns {
		if col == "session_id" || col == "event_id" {
			continue
		}
		if ptr := model.GetFieldPointer(entry, col); ptr != nil {
			valuePtrs = append(valuePtrs, ptr)
		}
	}

	return valuePtrs
}

func (e *eventsImpl) SearchEvents(projID uint32, req *model.EventsSearchRequest) (*model.EventsSearchResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("search events request cannot be nil")
	}

	ctx := context.Background()
	offset := (req.Page - 1) * req.Limit

	whereClause, queryParams := e.buildSearchQueryParams(projID, req)

	selectColumns := BuildSelectColumns("e", req.Columns)
	sortBy := "e." + ValidateSortColumn(req.SortBy)
	sortOrder := filters.ValidateSortOrder(req.SortOrder)

	query := e.buildSearchQueryWithCount(whereClause, selectColumns, sortBy, sortOrder)
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
		valuePtrs := e.buildScanPointers(&entry, req.Columns)
		
		scanPtrs := append([]interface{}{&total}, valuePtrs...)
		if err := rows.Scan(scanPtrs...); err != nil {
			e.log.Error(ctx, "failed to scan event row for project %d: %v", projID, err)
			continue
		}

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

func (e *eventsImpl) GetEventByID(projID uint32, eventID string) (*model.EventEntry, error) {
	if eventID == "" {
		return nil, fmt.Errorf("event ID cannot be empty")
	}

	ctx := context.Background()
	allColumns := model.GetAllEventColumns()
	selectColumns := BuildSelectColumns("", allColumns)
	query := e.buildGetEventQuery(selectColumns)

	entry := model.EventEntry{}
	scanPtrs := e.buildScanPointers(&entry, allColumns)

	err := e.chConn.QueryRow(ctx, query, projID, eventID).Scan(scanPtrs...)
	if err != nil {
		e.log.Error(ctx, "failed to get event %s for project %d: %v", eventID, projID, err)
		return nil, fmt.Errorf("failed to get event %s for project %d: %w", eventID, projID, err)
	}

	if err := entry.UnmarshalProperties(); err != nil {
		e.log.Error(ctx, "failed to unmarshal properties for event %s in project %d: %v", eventID, projID, err)
		return nil, fmt.Errorf("failed to unmarshal properties for event %s: %w", eventID, err)
	}

	return &entry, nil
}