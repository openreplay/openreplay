package lexicon

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/lexicon/model"
	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/logger"
)

type HiddenEvent struct {
	EventName    string
	AutoCaptured bool
}

type HiddenProperty struct {
	PropertyName string
	AutoCaptured bool
	IsEventProp  bool
}

type Lexicon interface {
	GetDistinctEvents(ctx context.Context, projID uint32) ([]model.LexiconEvent, uint64, error)
	GetProperties(ctx context.Context, projID uint32, source *string, eventName *string) ([]model.LexiconProperty, uint64, error)
	UpdateEvent(ctx context.Context, projID uint32, req model.UpdateEventRequest, userID string) error
	UpdateProperty(ctx context.Context, projID uint32, req model.UpdatePropertyRequest, userID string) error
	GetHiddenEvents(ctx context.Context, projID uint32) ([]HiddenEvent, error)
	GetHiddenProperties(ctx context.Context, projID uint32) ([]HiddenProperty, error)
	InvalidateCache(projID uint32)
}

type lexiconImpl struct {
	log    logger.Logger
	chConn driver.Conn
	cache  cache.Cache
}

func New(log logger.Logger, chConn driver.Conn) Lexicon {
	return &lexiconImpl{
		log:    log,
		chConn: chConn,
		cache:  cache.New(5*time.Minute, 10*time.Minute),
	}
}

func (e *lexiconImpl) GetDistinctEvents(ctx context.Context, projID uint32) ([]model.LexiconEvent, uint64, error) {
	subquery := `SELECT ae.event_name AS name,
	                 ae.display_name,
	                 ae.description,
	                 ae.status,
	                 ae.auto_captured,
	                 COALESCE(sumMerge(aeg.data_count), 0) AS data_count,
	                 ae.query_count_l30days,
	                 ae.created_at,
	                 ae._edited_by_user
	          FROM product_analytics.all_events ae
	          LEFT JOIN product_analytics.autocomplete_events_grouped aeg
	              ON ae.project_id = aeg.project_id
	              AND ae.event_name = aeg.value
	          WHERE ae.project_id = ?
	          GROUP BY ae.project_id, ae.event_name, ae.display_name, ae.description, ae.status, 
	                   ae.auto_captured, ae.query_count_l30days, ae.created_at, ae._edited_by_user, ae._timestamp
	          ORDER BY ae._timestamp DESC, ae.display_name
	          LIMIT 1 BY ae.project_id, ae.auto_captured, ae.event_name`

	query := `SELECT COUNT(1) OVER () AS total, * FROM (` + subquery + `)`

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
		var count uint64
		var queryCount uint32
		if err := rows.Scan(&total, &event.Name, &event.DisplayName, &event.Description, &event.Status, &event.AutoCaptured, &count, &queryCount, &createdAt, &editedByUser); err != nil {
			e.log.Error(ctx, "failed to scan distinct event for project %d, error: %v, query: %s", projID, err, query)
			return nil, 0, fmt.Errorf("failed to scan event row: %w", err)
		}
		event.Count = count
		event.QueryCount = uint64(queryCount)
		event.CreatedAt = createdAt.UnixMilli()
		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		e.log.Error(ctx, "error iterating distinct event rows for project %d: %v", projID, err)
		return nil, 0, fmt.Errorf("error processing distinct event results: %w", err)
	}

	return events, total, nil
}

func (e *lexiconImpl) GetProperties(ctx context.Context, projID uint32, source *string, eventName *string) ([]model.LexiconProperty, uint64, error) {
	subquery := `SELECT ap.property_name AS name,
	                 ap.display_name,
	                 ap.description,
	                 ap.source,
	                 ep.value_type,
	                 ap.is_event_property,
	                 ap.auto_captured,
	                 ap.status,
	                 COALESCE(sumMerge(aepg.data_count), 0) AS data_count,
	                 ap.query_count,
	                 ap.created_at,
	                 ap._edited_by_user
	          FROM product_analytics.all_properties ap
	          LEFT JOIN product_analytics.event_properties ep 
	              ON ap.project_id = ep.project_id 
	              AND ap.property_name = ep.property_name
	              AND ap.auto_captured = ep.auto_captured_property
	          LEFT JOIN product_analytics.autocomplete_event_properties_grouped aepg
	              ON ap.project_id = aepg.project_id
	              AND ap.property_name = aepg.property_name
	          WHERE ap.project_id = ?`

	args := []interface{}{projID}
	if source != nil {
		subquery += ` AND ap.source = ?`
		args = append(args, *source)
	}
	if eventName != nil {
		subquery += ` AND ep.event_name = ?`
		args = append(args, *eventName)
	}

	subquery += `
	          GROUP BY ap.project_id, ap.property_name, ap.display_name, ap.description, ap.source,
	                   ep.value_type, ap.is_event_property, ap.auto_captured, ap.status,
	                   ap.query_count, ap.created_at, ap._edited_by_user, ap._timestamp
	          ORDER BY ap._timestamp DESC, ap.display_name
	          LIMIT 1 BY ap.project_id, ap.source, ap.property_name, ap.is_event_property, ap.auto_captured`

	query := `SELECT COUNT(1) OVER () AS total, * FROM (` + subquery + `)`

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
		var dataCount uint64
		var queryCount uint32
		if err := rows.Scan(&total, &property.Name, &property.DisplayName, &property.Description, &source, &valueType, &isEventProperty, &property.AutoCaptured, &status, &dataCount, &queryCount, &createdAt, &editedByUser); err != nil {
			e.log.Error(ctx, "failed to scan distinct property for project %d, error: %v, query: %s", projID, err, query)
			return nil, 0, fmt.Errorf("failed to scan property row: %w", err)
		}
		property.Type = source
		property.DataType = valueType
		property.Count = dataCount
		property.QueryCount = uint64(queryCount)
		property.Status = status
		property.CreatedAt = createdAt.UnixMilli()
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

func (e *lexiconImpl) GetHiddenEvents(ctx context.Context, projID uint32) ([]HiddenEvent, error) {
	cacheKey := fmt.Sprintf("hidden_events:%d", projID)

	if cached, ok := e.cache.Get(cacheKey); ok {
		if events, ok := cached.([]HiddenEvent); ok {
			return events, nil
		}
	}

	query := `
		SELECT event_name, auto_captured
		FROM product_analytics.all_events
		WHERE project_id = ? AND status = 'hidden'
		ORDER BY _timestamp DESC
		LIMIT 1 BY project_id, auto_captured, event_name
	`

	rows, err := e.chConn.Query(ctx, query, projID)
	if err != nil {
		e.log.Error(ctx, "failed to query hidden events for project %d: %v", projID, err)
		return nil, fmt.Errorf("failed to query hidden events: %w", err)
	}
	defer rows.Close()

	hiddenEvents := make([]HiddenEvent, 0)
	for rows.Next() {
		var he HiddenEvent
		if err := rows.Scan(&he.EventName, &he.AutoCaptured); err != nil {
			e.log.Error(ctx, "failed to scan hidden event row: %v", err)
			continue
		}
		hiddenEvents = append(hiddenEvents, he)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	e.cache.Set(cacheKey, hiddenEvents)
	return hiddenEvents, nil
}

func (e *lexiconImpl) GetHiddenProperties(ctx context.Context, projID uint32) ([]HiddenProperty, error) {
	cacheKey := fmt.Sprintf("hidden_properties:%d", projID)

	if cached, ok := e.cache.Get(cacheKey); ok {
		if props, ok := cached.([]HiddenProperty); ok {
			return props, nil
		}
	}

	query := `
		SELECT property_name, auto_captured, is_event_property
		FROM product_analytics.all_properties
		WHERE project_id = ? AND status = 'hidden' AND source = 'events'
		ORDER BY _timestamp DESC
		LIMIT 1 BY project_id, source, property_name, is_event_property, auto_captured
	`

	rows, err := e.chConn.Query(ctx, query, projID)
	if err != nil {
		e.log.Error(ctx, "failed to query hidden properties for project %d: %v", projID, err)
		return nil, fmt.Errorf("failed to query hidden properties: %w", err)
	}
	defer rows.Close()

	hiddenProps := make([]HiddenProperty, 0)
	for rows.Next() {
		var hp HiddenProperty
		if err := rows.Scan(&hp.PropertyName, &hp.AutoCaptured, &hp.IsEventProp); err != nil {
			e.log.Error(ctx, "failed to scan hidden property row: %v", err)
			continue
		}
		hiddenProps = append(hiddenProps, hp)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	e.cache.Set(cacheKey, hiddenProps)
	return hiddenProps, nil
}

func (e *lexiconImpl) InvalidateCache(projID uint32) {
	e.cache.Set(fmt.Sprintf("hidden_events:%d", projID), nil)
	e.cache.Set(fmt.Sprintf("hidden_properties:%d", projID), nil)
}

func (e *lexiconImpl) UpdateEvent(ctx context.Context, projID uint32, req model.UpdateEventRequest, userID string) error {
	if req.AutoCaptured == nil {
		return fmt.Errorf("autoCaptured is required")
	}
	if req.DisplayName != nil && *req.DisplayName == "" {
		return fmt.Errorf("displayName cannot be empty")
	}
	if req.Status != nil && (*req.Status != "visible" && *req.Status != "hidden" && *req.Status != "dropped") {
		return fmt.Errorf("status must be one of: visible, hidden, dropped")
	}

	checkQuery := `SELECT COUNT(*) 
	               FROM (
	                   SELECT 1
	                   FROM product_analytics.all_events
	                   WHERE project_id = ?
	                     AND event_name = ?
	                     AND auto_captured = ?
	                   ORDER BY _timestamp DESC
	                   LIMIT 1 BY project_id, auto_captured, event_name
	               )`

	var count uint64
	err := e.chConn.QueryRow(ctx, checkQuery, projID, req.Name, *req.AutoCaptured).Scan(&count)
	if err != nil {
		e.log.Error(ctx, "failed to check event existence %s for project %d: %v", req.Name, projID, err)
		return fmt.Errorf("failed to check event existence: %w", err)
	}

	if count == 0 {
		return fmt.Errorf("event %s with autoCaptured=%v not found for project %d", req.Name, *req.AutoCaptured, projID)
	}

	query := `INSERT INTO product_analytics.all_events (
		project_id,
		auto_captured,
		event_name,
		display_name,
		description,
		status,
		event_count_l30days,
		query_count_l30days,
		created_at,
		_edited_by_user,
		_timestamp
	)
	SELECT 
		project_id,
		auto_captured,
		event_name,
		COALESCE(?, display_name) as display_name,
		COALESCE(?, description) as description,
		COALESCE(?, status) as status,
		event_count_l30days,
		query_count_l30days,
		created_at,
		true as _edited_by_user,
		now() as _timestamp
	FROM product_analytics.all_events
	WHERE project_id = ?
	  AND event_name = ?
	  AND auto_captured = ?
	ORDER BY _timestamp DESC
	LIMIT 1`

	var displayName, description, status interface{}
	if req.DisplayName != nil {
		displayName = *req.DisplayName
	}
	if req.Description != nil {
		description = *req.Description
	}
	if req.Status != nil {
		status = *req.Status
	}

	err = e.chConn.Exec(ctx, query, displayName, description, status, projID, req.Name, *req.AutoCaptured)
	if err != nil {
		e.log.Error(ctx, "failed to update event %s for project %d: %v", req.Name, projID, err)
		return fmt.Errorf("failed to update event: %w", err)
	}

	e.InvalidateCache(projID)
	return nil
}

func (e *lexiconImpl) UpdateProperty(ctx context.Context, projID uint32, req model.UpdatePropertyRequest, userID string) error {
	if req.AutoCaptured == nil {
		return fmt.Errorf("autoCaptured is required")
	}
	if req.DisplayName != nil && *req.DisplayName == "" {
		return fmt.Errorf("displayName cannot be empty")
	}
	if req.Status != nil && (*req.Status != "visible" && *req.Status != "hidden" && *req.Status != "dropped") {
		return fmt.Errorf("status must be one of: visible, hidden, dropped")
	}
	if req.Source != "sessions" && req.Source != "users" && req.Source != "events" {
		return fmt.Errorf("source must be one of: sessions, users, events")
	}

	fetchQuery := `SELECT is_event_property
	               FROM product_analytics.all_properties
	               WHERE project_id = ?
	                 AND property_name = ?
	                 AND source = ?
	                 AND auto_captured = ?
	               ORDER BY _timestamp DESC
	               LIMIT 1 BY project_id, source, property_name, is_event_property, auto_captured`

	var isEventProperty bool
	err := e.chConn.QueryRow(ctx, fetchQuery, projID, req.Name, req.Source, *req.AutoCaptured).Scan(&isEventProperty)
	if err != nil {
		e.log.Error(ctx, "failed to fetch property %s for project %d: %v", req.Name, projID, err)
		return fmt.Errorf("property %s with source=%s, autoCaptured=%v not found for project %d: %w",
			req.Name, req.Source, *req.AutoCaptured, projID, err)
	}

	query := `INSERT INTO product_analytics.all_properties (
		project_id,
		source,
		property_name,
		is_event_property,
		auto_captured,
		display_name,
		description,
		status,
		data_count,
		query_count,
		created_at,
		_edited_by_user,
		_timestamp
	)
	SELECT 
		project_id,
		source,
		property_name,
		is_event_property,
		auto_captured,
		COALESCE(?, display_name) as display_name,
		COALESCE(?, description) as description,
		COALESCE(?, status) as status,
		data_count,
		query_count,
		created_at,
		true as _edited_by_user,
		now() as _timestamp
	FROM product_analytics.all_properties
	WHERE project_id = ?
	  AND property_name = ?
	  AND source = ?
	  AND is_event_property = ?
	  AND auto_captured = ?
	ORDER BY _timestamp DESC
	LIMIT 1`

	var displayName, description, status interface{}
	if req.DisplayName != nil {
		displayName = *req.DisplayName
	}
	if req.Description != nil {
		description = *req.Description
	}
	if req.Status != nil {
		status = *req.Status
	}

	err = e.chConn.Exec(ctx, query, displayName, description, status, projID, req.Name, req.Source, isEventProperty, *req.AutoCaptured)
	if err != nil {
		e.log.Error(ctx, "failed to update property %s for project %d: %v", req.Name, projID, err)
		return fmt.Errorf("failed to update property: %w", err)
	}

	e.InvalidateCache(projID)
	return nil
}
