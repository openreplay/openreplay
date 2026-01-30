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

const (
	StatusVisible = "visible"
	StatusHidden  = "hidden"
	StatusDropped = "dropped"

	SourceSessions = "sessions"
	SourceUsers    = "users"
	SourceEvents   = "events"
)

func isValidStatus(status string) bool {
	return status == StatusVisible || status == StatusHidden || status == StatusDropped
}

func isValidSource(source string) bool {
	return source == SourceSessions || source == SourceUsers || source == SourceEvents
}

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
	GetDistinctEvents(ctx context.Context, projID uint32, propertyName *string) ([]model.LexiconEvent, uint64, error)
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

func (e *lexiconImpl) GetDistinctEvents(ctx context.Context, projID uint32, propertyName *string) ([]model.LexiconEvent, uint64, error) {
	subquery := `SELECT ae.event_name AS name,
	                 if(aec.display_name != '', aec.display_name, or_event_display_name(ae.event_name)) AS display_name,
	                 if(aec.description != '', aec.description, or_event_description(ae.event_name)) AS description,
	                 aec.status AS status,
	                 ae.auto_captured,
	                 sumMerge(aeg.data_count) AS data_count,
	                 ae.query_count_l30days,
	                 ae.created_at
	          FROM product_analytics.all_events ae
	          LEFT JOIN product_analytics.autocomplete_events_grouped aeg
	              ON ae.project_id = aeg.project_id
	              AND ae.event_name = aeg.value
	          LEFT JOIN (
	              SELECT project_id, event_name, auto_captured, display_name, description, status
	              FROM product_analytics.all_events_customized
	              WHERE _is_deleted = false
	              ORDER BY _timestamp DESC
	              LIMIT 1 BY project_id, event_name, auto_captured
	          ) aec
	              ON aec.project_id = ae.project_id
	              AND aec.event_name = ae.event_name
	              AND aec.auto_captured = ae.auto_captured`

	args := []interface{}{projID}

	if propertyName != nil {
		subquery += `
	          LEFT JOIN product_analytics.event_properties ep
	              ON ae.project_id = ep.project_id
	              AND ae.event_name = ep.event_name
	              AND ae.auto_captured = ep.auto_captured_event`
	}

	subquery += `
	          WHERE ae.project_id = ?`

	if propertyName != nil {
		subquery += ` AND ep.property_name = ?`
		args = append(args, *propertyName)
	}

	subquery += `
	          GROUP BY ae.project_id, ae.event_name, display_name, description, status, 
	                   ae.auto_captured, ae.query_count_l30days, ae.created_at, ae._timestamp
	          ORDER BY ae._timestamp DESC, display_name
	          LIMIT 1 BY ae.project_id, ae.auto_captured, ae.event_name`

	query := `SELECT COUNT(1) OVER () AS total, * FROM (` + subquery + `)`

	rows, err := e.chConn.Query(ctx, query, args...)
	if err != nil {
		e.log.Error(ctx, "failed to query distinct events for project %d: %v", projID, err)
		return nil, 0, fmt.Errorf("failed to query distinct events for project %d: %w", projID, err)
	}
	defer rows.Close()

	var events []model.LexiconEvent
	var total uint64
	for rows.Next() {
		var event model.LexiconEvent
		var createdAt time.Time
		var count *uint64
		var queryCount uint32
		if err := rows.Scan(&total, &event.Name, &event.DisplayName, &event.Description, &event.Status, &event.AutoCaptured, &count, &queryCount, &createdAt); err != nil {
			e.log.Error(ctx, "failed to scan distinct event for project %d, error: %v, query: %s", projID, err, query)
			return nil, 0, fmt.Errorf("failed to scan event row: %w", err)
		}
		if count != nil {
			event.Count = *count
		} else {
			event.Count = 0
		}
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
	usersCountColumn := "CAST(0 AS UInt64) AS users_count"
	userJoin := ""
	valueTypeJoin := `
	          LEFT JOIN product_analytics.event_properties ep 
	              ON ap.project_id = ep.project_id 
	              AND ap.property_name = ep.property_name
	              AND ap.auto_captured = ep.auto_captured_property`
	valueTypeColumn := "ep.value_type"

	if source != nil && *source == SourceUsers {
		usersCountColumn = "uniqIf(aupg.user_id, aupg.user_id IS NOT NULL AND aupg.user_id != '') AS users_count"
		userJoin = `
	          LEFT JOIN product_analytics.autocomplete_user_properties_grouped aupg
	              ON ap.project_id = aupg.project_id
	              AND ap.property_name = aupg.property_name`
		valueTypeJoin = `
	          LEFT JOIN product_analytics.user_properties up 
	              ON ap.project_id = up.project_id 
	              AND ap.property_name = up.property_name
	              AND ap.auto_captured = up.auto_captured_property`
		valueTypeColumn = "up.value_type"
	}

	subquery := `SELECT ap.property_name AS name,
	                 if(apc.display_name != '', apc.display_name, or_property_display_name(ap.property_name)) AS display_name,
	                 apc.description AS description,
	                 ap.source,
	                 ` + valueTypeColumn + ` AS value_type,
	                 ap.is_event_property,
	                 ap.auto_captured,
	                 apc.status AS status,
	                 sumMerge(aepg.data_count) AS data_count,
	                 ap.query_count,
	                 ap.created_at,
	                 ` + usersCountColumn + `
	          FROM product_analytics.all_properties ap` + valueTypeJoin + `
	          LEFT JOIN product_analytics.autocomplete_event_properties_grouped aepg
	              ON ap.project_id = aepg.project_id
	              AND ap.property_name = aepg.property_name` + userJoin + `
	          LEFT JOIN (
	              SELECT project_id, source, property_name, auto_captured, display_name, description, status
	              FROM product_analytics.all_properties_customized
	              WHERE _is_deleted = false
	              ORDER BY _timestamp DESC
	              LIMIT 1 BY project_id, source, property_name, auto_captured
	          ) apc
	              ON apc.project_id = ap.project_id
	              AND apc.source = ap.source
	              AND apc.property_name = ap.property_name
	              AND apc.auto_captured = ap.auto_captured
	          WHERE ap.project_id = ?`

	args := []interface{}{projID}
	if source != nil {
		subquery += ` AND ap.source = ?`
		args = append(args, *source)
	}
	if eventName != nil {
		if source != nil && *source == SourceUsers {
			subquery += ` AND up.event_name = ?`
		} else {
			subquery += ` AND ep.event_name = ?`
		}
		args = append(args, *eventName)
	}

	subquery += `
	          GROUP BY ap.project_id, ap.property_name, display_name, description, ap.source,
	                   value_type, ap.is_event_property, ap.auto_captured, status,
	                   ap.query_count, ap.created_at, ap._timestamp
	          ORDER BY ap._timestamp DESC, display_name
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
		var isEventProperty bool
		var status string
		var dataCount *uint64
		var queryCount uint32
		var usersCount uint64
		if err := rows.Scan(&total, &property.Name, &property.DisplayName, &property.Description, &source, &valueType, &isEventProperty, &property.AutoCaptured, &status, &dataCount, &queryCount, &createdAt, &usersCount); err != nil {
			e.log.Error(ctx, "failed to scan distinct property for project %d, error: %v, query: %s", projID, err, query)
			return nil, 0, fmt.Errorf("failed to scan property row: %w", err)
		}
		property.Type = source
		property.DataType = valueType
		if dataCount != nil {
			property.Count = *dataCount
		} else {
			property.Count = 0
		}
		property.UsersCount = usersCount
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
		WHERE project_id = ? AND status = ?
		ORDER BY _timestamp DESC
		LIMIT 1 BY project_id, auto_captured, event_name
	`

	rows, err := e.chConn.Query(ctx, query, projID, StatusHidden)
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
		WHERE project_id = ? AND status = ? AND source = ?
		ORDER BY _timestamp DESC
		LIMIT 1 BY project_id, source, property_name, is_event_property, auto_captured
	`

	rows, err := e.chConn.Query(ctx, query, projID, StatusHidden, SourceEvents)
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
	if req.Status != nil && !isValidStatus(*req.Status) {
		return fmt.Errorf("status must be one of: %s, %s, %s", StatusVisible, StatusHidden, StatusDropped)
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

	fetchQuery := `SELECT display_name, description, status, created_at
	               FROM product_analytics.all_events_customized
	               WHERE project_id = ?
	                 AND event_name = ?
	                 AND auto_captured = ?
	                 AND _is_deleted = false
	               ORDER BY _timestamp DESC
	               LIMIT 1`

	var existingDisplayName, existingDescription, existingStatus string
	var existingCreatedAt time.Time
	err = e.chConn.QueryRow(ctx, fetchQuery, projID, req.Name, *req.AutoCaptured).Scan(&existingDisplayName, &existingDescription, &existingStatus, &existingCreatedAt)

	var displayName, description, status string
	var createdAt time.Time

	if err != nil {
		createdAt = time.Now()
		displayName = ""
		description = ""
		status = StatusVisible
	} else {
		createdAt = existingCreatedAt
		displayName = existingDisplayName
		description = existingDescription
		status = existingStatus
	}

	if req.DisplayName != nil {
		displayName = *req.DisplayName
	}
	if req.Description != nil {
		description = *req.Description
	}
	if req.Status != nil {
		status = *req.Status
	}

	query := `INSERT INTO product_analytics.all_events_customized (
		project_id,
		event_name,
		auto_captured,
		display_name,
		description,
		status,
		created_at
	) VALUES (?, ?, ?, ?, ?, ?, ?)`

	err = e.chConn.Exec(ctx, query, projID, req.Name, *req.AutoCaptured, displayName, description, status, createdAt)
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
	if req.Status != nil && !isValidStatus(*req.Status) {
		return fmt.Errorf("status must be one of: %s, %s, %s", StatusVisible, StatusHidden, StatusDropped)
	}
	if !isValidSource(req.Source) {
		return fmt.Errorf("source must be one of: %s, %s, %s", SourceSessions, SourceUsers, SourceEvents)
	}

	checkQuery := `SELECT COUNT(*)
	               FROM (
	                   SELECT 1
	                   FROM product_analytics.all_properties
	                   WHERE project_id = ?
	                     AND property_name = ?
	                     AND source = ?
	                     AND auto_captured = ?
	                   ORDER BY _timestamp DESC
	                   LIMIT 1 BY project_id, source, property_name, is_event_property, auto_captured
	               )`

	var count uint64
	err := e.chConn.QueryRow(ctx, checkQuery, projID, req.Name, req.Source, *req.AutoCaptured).Scan(&count)
	if err != nil {
		e.log.Error(ctx, "failed to check property existence %s for project %d: %v", req.Name, projID, err)
		return fmt.Errorf("failed to check property existence: %w", err)
	}

	if count == 0 {
		return fmt.Errorf("property %s with source=%s, autoCaptured=%v not found for project %d",
			req.Name, req.Source, *req.AutoCaptured, projID)
	}

	fetchQuery := `SELECT display_name, description, status, created_at
	               FROM product_analytics.all_properties_customized
	               WHERE project_id = ?
	                 AND source = ?
	                 AND property_name = ?
	                 AND auto_captured = ?
	                 AND _is_deleted = false
	               ORDER BY _timestamp DESC
	               LIMIT 1`

	var existingDisplayName, existingDescription, existingStatus string
	var existingCreatedAt time.Time
	err = e.chConn.QueryRow(ctx, fetchQuery, projID, req.Source, req.Name, *req.AutoCaptured).Scan(&existingDisplayName, &existingDescription, &existingStatus, &existingCreatedAt)

	var displayName, description, status string
	var createdAt time.Time

	if err != nil {
		createdAt = time.Now()
		displayName = ""
		description = ""
		status = StatusVisible
	} else {
		createdAt = existingCreatedAt
		displayName = existingDisplayName
		description = existingDescription
		status = existingStatus
	}

	if req.DisplayName != nil {
		displayName = *req.DisplayName
	}
	if req.Description != nil {
		description = *req.Description
	}
	if req.Status != nil {
		status = *req.Status
	}

	query := `INSERT INTO product_analytics.all_properties_customized (
		project_id,
		source,
		property_name,
		auto_captured,
		display_name,
		description,
		status,
		created_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	err = e.chConn.Exec(ctx, query, projID, req.Source, req.Name, *req.AutoCaptured, displayName, description, status, createdAt)
	if err != nil {
		e.log.Error(ctx, "failed to update property %s for project %d: %v", req.Name, projID, err)
		return fmt.Errorf("failed to update property: %w", err)
	}

	e.InvalidateCache(projID)
	return nil
}
