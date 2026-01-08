package lexicon

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/lexicon/model"
	"openreplay/backend/pkg/logger"
)

type Lexicon interface {
	GetDistinctEvents(ctx context.Context, projID uint32) ([]model.LexiconEvent, uint64, error)
	GetProperties(ctx context.Context, projID uint32, source *string) ([]model.LexiconProperty, uint64, error)
}

type lexiconImpl struct {
	log    logger.Logger
	chConn driver.Conn
}

func New(log logger.Logger, chConn driver.Conn) Lexicon {
	return &lexiconImpl{
		log:    log,
		chConn: chConn,
	}
}

func (e *lexiconImpl) GetDistinctEvents(ctx context.Context, projID uint32) ([]model.LexiconEvent, uint64, error) {
	query := `SELECT COUNT(1) OVER () AS total,
	                 event_name AS name,
	                 display_name,
	                 description,
	                 auto_captured,
	                 event_count_l30days,
	                 query_count_l30days,
	                 created_at,
	                 _edited_by_user
	          FROM product_analytics.all_events
	          WHERE project_id = ?
	          ORDER BY _timestamp DESC, display_name
	          LIMIT 1 BY project_id, auto_captured, event_name`

	rows, err := e.chConn.Query(ctx, query, projID)
	if err != nil {
		e.log.Error(ctx, "failed to query distinct events for project %d: %v", projID, err)
		return nil, 0, fmt.Errorf("failed to query distinct events for project %d: %w", projID, err)
	}
	defer rows.Close()

	var events []model.LexiconEvent
	var total uint64
	for rows.Next() {
		var event model.LexiconEvent
		var editedByUser bool
		var createdAt time.Time
		var count, queryCount uint32
		if err := rows.Scan(&total, &event.Name, &event.DisplayName, &event.Description, &event.IsAutoCaptured, &count, &queryCount, &createdAt, &editedByUser); err != nil {
			e.log.Error(ctx, "failed to scan distinct event for project %d, error: %v, query: %s", projID, err, query)
			return nil, 0, fmt.Errorf("failed to scan event row: %w", err)
		}
		event.Count = uint64(count)
		event.QueryCount = uint64(queryCount)
		event.IsHidden = false
		event.CreatedAt = createdAt.UnixMilli()
		event.ModifiedAt = event.CreatedAt
		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		e.log.Error(ctx, "error iterating distinct event rows for project %d: %v", projID, err)
		return nil, 0, fmt.Errorf("error processing distinct event results: %w", err)
	}

	return events, total, nil
}

func (e *lexiconImpl) GetProperties(ctx context.Context, projID uint32, source *string) ([]model.LexiconProperty, uint64, error) {
	query := `SELECT COUNT(1) OVER () AS total,
	                 ap.property_name AS name,
	                 ap.display_name,
	                 ap.description,
	                 ap.source,
	                 ep.value_type,
	                 ap.is_event_property,
	                 ap.auto_captured,
	                 ap.status,
	                 ap.data_count,
	                 ap.query_count,
	                 ap.created_at,
	                 ap._edited_by_user
	          FROM product_analytics.all_properties ap
	          LEFT JOIN product_analytics.event_properties ep 
	              ON ap.project_id = ep.project_id 
	              AND ap.property_name = ep.property_name
	              AND ap.auto_captured = ep.auto_captured_property
	          WHERE ap.project_id = ?`

	args := []interface{}{projID}
	if source != nil {
		query += ` AND ap.source = ?`
		args = append(args, *source)
	}

	query += `
	          ORDER BY ap._timestamp DESC, ap.display_name
	          LIMIT 1 BY ap.project_id, ap.source, ap.property_name, ap.is_event_property, ap.auto_captured`

	rows, err := e.chConn.Query(ctx, query, args...)
	if err != nil {
		e.log.Error(ctx, "failed to query distinct properties for project %d: %v", projID, err)
		return nil, 0, fmt.Errorf("failed to query distinct properties for project %d: %w", projID, err)
	}
	defer rows.Close()

	var properties []model.LexiconProperty
	var total uint64
	for rows.Next() {
		var property model.LexiconProperty
		var createdAt time.Time
		var source, valueType string
		var isEventProperty, editedByUser bool
		var status string
		var dataCount, queryCount uint32
		if err := rows.Scan(&total, &property.Name, &property.DisplayName, &property.Description, &source, &valueType, &isEventProperty, &property.IsAutoCaptured, &status, &dataCount, &queryCount, &createdAt, &editedByUser); err != nil {
			e.log.Error(ctx, "failed to scan distinct property for project %d, error: %v, query: %s", projID, err, query)
			return nil, 0, fmt.Errorf("failed to scan property row: %w", err)
		}
		property.Type = source
		property.DataType = valueType
		property.Count = uint64(dataCount)
		property.QueryCount = uint64(queryCount)
		property.IsHidden = (status == "hidden" || status == "dropped")
		property.CreatedAt = createdAt.UnixMilli()
		property.ModifiedAt = createdAt.UnixMilli()
		property.PossibleTypes = []string{}
		property.SampleValues = []string{}
		properties = append(properties, property)
	}

	if err := rows.Err(); err != nil {
		e.log.Error(ctx, "error iterating distinct property rows for project %d: %v", projID, err)
		return nil, 0, fmt.Errorf("error processing distinct property results: %w", err)
	}

	return properties, total, nil
}
