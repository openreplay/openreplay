package events

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"
	"unicode"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/events/model"
	"openreplay/backend/pkg/logger"
)

const GroupClickRage bool = true

type errorEvent struct {
	ErrorID   string    `ch:"error_id" json:"errorId"`
	Source    string    `ch:"source" json:"source"`
	Name      string    `ch:"name" json:"name"`
	Message   string    `ch:"message" json:"message"`
	CreatedAt time.Time `ch:"created_at" json:"createdAt"`
	Timestamp int64     `json:"timestamp"`
}

func (e *errorEvent) IsNotJsException() bool {
	return e.Source != "js_exception"
}

type Events interface {
	GetBySessionID(projID uint32, sessID uint64, doGroupClickRage bool) []interface{}
	GetErrorsBySessionID(projectID uint32, sessID uint64) []errorEvent
	GetCustomsBySessionID(projectID uint32, sessID uint64) []interface{}
	GetIssuesBySessionID(projID uint32, sessID uint64) []interface{}
	GetIncidentsBySessionID(projectID uint32, sessID uint64) []interface{}
	GetMobileBySessionID(projID uint32, sessID uint64) []interface{}
	GetMobileCrashesBySessionID(sessID uint64) []interface{}
	GetMobileCustomsBySessionID(sessID uint64) []interface{}
	GetClickMaps(projID uint32, sessID uint64, url string) ([]interface{}, error)
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

func getString(event *event, name string) *string {
	if event == nil || event.Properties == nil || event.Properties[name] == nil {
		return nil
	}
	val := event.Properties[name].(string)
	return &val
}

func getInt64(event *event, name string) *int64 {
	if event == nil || event.Properties == nil || event.Properties[name] == nil {
		return nil
	}
	val := event.Properties[name].(int64)
	return &val
}

func getDiffInt64(event *event, start, end string) *int64 {
	startVal, endVal := getInt64(event, start), getInt64(event, end)
	if startVal != nil && endVal != nil {
		res := *endVal - *startVal
		return &res
	}
	return nil
}

type event struct {
	Type       string                 `ch:"type" json:"type"`
	Duration   *uint16                `ch:"duration" json:"duration"`
	Url        *string                `ch:"url" json:"url"`
	Referrer   *string                `ch:"referrer" json:"referrer"`
	Properties map[string]interface{} `ch:"props" json:"properties"`
	CreatedAt  time.Time              `ch:"created_at" json:"createdAt"`
}

type ClickEvent struct {
	Type       string    `json:"type"`
	Label      *string   `json:"label"`
	Hesitation *int64    `json:"hesitation"`
	Selector   *string   `json:"selector"`
	CreatedAt  time.Time `json:"createdAt"`
	Timestamp  int64     `json:"timestamp"`
}

func NewClickEvent(event *event) *ClickEvent {
	return &ClickEvent{
		Type:       event.Type,
		Label:      getString(event, "label"),
		Hesitation: getInt64(event, "hesitation_time"),
		Selector:   getString(event, "selector"),
		CreatedAt:  event.CreatedAt,
		Timestamp:  event.CreatedAt.UnixMilli(),
	}
}

type ClickRageEvent struct {
	ClickEvent
	Count int64 `json:"count"`
}

func NewClickRageEvent(event *event, count int) *ClickRageEvent {
	evt := &ClickRageEvent{
		ClickEvent: *NewClickEvent(event),
		Count:      int64(count),
	}
	evt.Type = "CLICKRAGE"
	return evt
}

type InputEvent struct {
	Type       string    `json:"type"`
	Label      *string   `json:"label"`
	Duration   *int64    `json:"duration"`
	Hesitation *int64    `json:"hesitation"`
	Value      *string   `json:"value"`
	CreatedAt  time.Time `json:"createdAt"`
	Timestamp  int64     `json:"timestamp"`
}

func NewInputEvent(event *event) *InputEvent {
	duration := getInt64(event, "duration")
	if duration != nil {
		*duration *= 1000
	}
	return &InputEvent{
		Type:       event.Type,
		Label:      getString(event, "label"),
		Duration:   duration,
		Hesitation: getInt64(event, "hesitation_time"),
		Value:      getString(event, "value"),
		CreatedAt:  event.CreatedAt,
		Timestamp:  event.CreatedAt.UnixMilli(),
	}
}

type LocationEvent struct {
	Type                     string    `json:"type"`
	Label                    *string   `json:"label"`
	Url                      *string   `json:"url"`
	Referrer                 *string   `json:"referrer"`
	Host                     *string   `json:"host"`
	PageLoad                 *int64    `json:"pageLoad"`
	FcpTime                  *int64    `json:"fcpTime"`
	LoadTime                 *int64    `json:"loadTime"`
	DomContentLoadedTime     *int64    `json:"domContentLoadedTime"`
	DomBuildingTime          *int64    `json:"domBuildingTime"`
	SpeedIndex               *int64    `json:"speedIndex"`
	VisuallyComplete         *int64    `json:"visuallyComplete"`
	TimeToInteractive        *int64    `json:"timeToInteractive"`
	FirstContentfulPaintTime *int64    `json:"firstContentfulPaintTime"`
	FirstPaintTime           *int64    `json:"firstPaintTime"`
	CreatedAt                time.Time `json:"createdAt"`
	Timestamp                int64     `json:"timestamp"`
}

func NewLocationEvent(event *event) *LocationEvent {
	return &LocationEvent{
		Type:                     event.Type,
		Label:                    getString(event, "label"),
		Url:                      event.Url,
		Referrer:                 event.Referrer,
		Host:                     getHostFromUrl(*event.Url),
		FcpTime:                  getInt64(event, "first_contentful_paint_time"),
		LoadTime:                 getDiffInt64(event, "load_event_start", "load_event_end"),
		DomContentLoadedTime:     getDiffInt64(event, "dom_content_loaded_event_start", "dom_content_loaded_event_end"),
		DomBuildingTime:          getInt64(event, "dom_building_time"),
		SpeedIndex:               getInt64(event, "speed_index"),
		VisuallyComplete:         getInt64(event, "visually_complete"),
		TimeToInteractive:        getInt64(event, "time_to_interactive"),
		FirstContentfulPaintTime: getInt64(event, "first_contentful_paint_time"),
		FirstPaintTime:           getInt64(event, "first_paint"),
		CreatedAt:                event.CreatedAt,
		Timestamp:                event.CreatedAt.UnixMilli(),
	}
}

func getHostFromUrl(fullUrl string) *string {
	parsedURL, err := url.Parse(fullUrl)
	if err != nil {
		return nil
	}
	return &parsedURL.Host
}

func (e *eventsImpl) GetBySessionID(projID uint32, sessID uint64, doGroupClickRage bool) []interface{} {
	query := `SELECT created_at,
					"$properties" AS props,
					"$event_name" AS type,
					"$duration_s" AS duration,
					"$current_url" AS url,
					"$referrer" AS referrer
			  FROM product_analytics.events
			  WHERE session_id = ? AND project_id = ?
				AND "$event_name" IN ('CLICK', 'INPUT', 'LOCATION')
				AND "$auto_captured"
			  ORDER BY created_at;`
	sessEvents := make([]event, 0)
	if err := e.chConn.Select(context.Background(), &sessEvents, query, sessID, projID); err != nil {
		e.log.Error(context.Background(), "Error querying events: %v", err)
		return nil
	}

	return e.groupClicksToClickRage(projID, sessID, sessEvents)
}

func (e *eventsImpl) groupClicksToClickRage(projID uint32, sessID uint64, sessEvents []event) []interface{} {
	// Get issues by sessID
	clickRageEvents := e.getIssues(projID, sessID, "click_rage")
	crPtr, toSkip := -1, 0 // pointer for issues and events lists
	if len(clickRageEvents) > 0 {
		crPtr = 0
	}

	res := make([]interface{}, 0, len(sessEvents))
	for _, sessEvent := range sessEvents {
		switch sessEvent.Type {
		case "CLICK":
			if toSkip > 0 {
				toSkip--
				continue
			}
			if crPtr == -1 { // empty clickRageEvents list
				res = append(res, NewClickEvent(&sessEvent))
				continue
			}
			if clickRageEvents[crPtr].CreatedAt.Equal(sessEvent.CreatedAt) {
				toSkip = clickRageEvents[crPtr].CountFromPayload()
				res = append(res, NewClickRageEvent(&sessEvent, toSkip))
				toSkip--
				crPtr++
				if crPtr == len(clickRageEvents) {
					crPtr = -1
				}
			} else {
				res = append(res, NewClickEvent(&sessEvent))
			}
		default:
			if toSkip > 0 {
				toSkip = 0 // reset the current clickRage set
			}
			if sessEvent.Type == "INPUT" {
				res = append(res, NewInputEvent(&sessEvent))
			} else if sessEvent.Type == "LOCATION" {
				res = append(res, NewLocationEvent(&sessEvent))
			}
		}
	}
	return res
}

func (e *eventsImpl) GetErrorsBySessionID(projectID uint32, sessID uint64) []errorEvent {
	query := `SELECT DISTINCT ON (event_id) error_id,
					'js_exception' AS source,
					'ERROR' AS name,
					"$properties".message AS message,
					created_at
			  FROM product_analytics.events
			  WHERE session_id = ? AND project_id = ?
				AND "$event_name"= 'ERROR'
			  	AND "$auto_captured"
			  ORDER BY created_at;`
	errorEvents := make([]errorEvent, 0)
	if err := e.chConn.Select(context.Background(), &errorEvents, query, sessID, projectID); err != nil {
		e.log.Error(context.Background(), "Error querying error events: %v", err)
		return nil
	}
	for i := range errorEvents {
		errorEvents[i].Timestamp = errorEvents[i].CreatedAt.UnixMilli()
	}
	return errorEvents
}

type customEvent struct {
	Name                   string    `ch:"name" json:"name"`
	Type                   string    `ch:"type" json:"type"`
	AutoCapturedProperties string    `ch:"auto_props" json:"autoCapturedProperties"`
	Properties             string    `ch:"properties" json:"properties"`
	CreatedAt              time.Time `ch:"created_at" json:"createdAt"`
}

func (e *eventsImpl) GetCustomsBySessionID(projectID uint32, sessID uint64) []interface{} {
	query := `SELECT toString("$properties") AS auto_props,
				toString(properties) AS properties,
				created_at,
				'CUSTOM' AS type,
				"$event_name" AS name
			  FROM product_analytics.events
			  WHERE session_id = ?
			    AND project_id = ?
				AND NOT "$auto_captured"
			  ORDER BY created_at;`
	customEvents := make([]customEvent, 0)
	res := make([]interface{}, 0, len(customEvents))
	if err := e.chConn.Select(context.Background(), &customEvents, query, sessID, projectID); err != nil {
		e.log.Error(context.Background(), "Error querying custom events: %v", err)
		return res
	}
	if len(customEvents) == 0 {
		return res
	}
	for _, cEvent := range customEvents {
		event := make(map[string]interface{})
		event["name"] = cEvent.Name
		event["type"] = cEvent.Type
		event["createdAt"] = cEvent.CreatedAt
		event["timestamp"] = cEvent.CreatedAt.UnixMilli()

		if cEvent.AutoCapturedProperties != "" && cEvent.AutoCapturedProperties != "null" {
			var autoProps map[string]interface{}
			if err := json.Unmarshal([]byte(cEvent.AutoCapturedProperties), &autoProps); err == nil {
				for key, value := range autoProps {
					event[toCamelCase(key)] = value
				}
			}
		}

		var props map[string]interface{}
		if cEvent.Properties != "" && cEvent.Properties != "null" {
			if err := json.Unmarshal([]byte(cEvent.Properties), &props); err != nil {
				props = make(map[string]interface{})
			}
		} else {
			props = make(map[string]interface{})
		}
		event["properties"] = props

		res = append(res, event)
	}
	return res
}

func toCamelCase(s string) string {
	if s == "" {
		return s
	}
	var result []rune
	capitalize := false
	for i, r := range s {
		if r == '_' {
			capitalize = true
			continue
		}
		if capitalize && i > 0 {
			result = append(result, unicode.ToUpper(r))
			capitalize = false
		} else {
			result = append(result, r)
		}
	}
	return string(result)
}

type issueEvent struct {
	ID        string    `ch:"issue_id" json:"issueId"`
	Type      string    `ch:"issue_type" json:"issueType"`
	Context   string    `ch:"context_string" json:"contextString"`
	CreatedAt time.Time `ch:"created_at" json:"createdAt"`
	Timestamp int64     `json:"timestamp"`
}

func (e *eventsImpl) GetIssuesBySessionID(projID uint32, sessID uint64) []interface{} {
	query := `SELECT DISTINCT ON (events.created_at, issue_id) events.created_at AS created_at,
					issue_id,
					issue_type,
				 	context_string
                FROM experimental.issues
				INNER JOIN product_analytics.events ON (events.issue_id = issues.issue_id)
				WHERE session_id = ?
					AND events.project_id = ?
					AND issues.project_id = ?
					AND "$event_name" = 'ISSUE' AND issue_type != 'incident'
				ORDER BY created_at;`
	issues := make([]issueEvent, 0)
	if err := e.chConn.Select(context.Background(), &issues, query, sessID, projID, projID); err != nil {
		e.log.Error(context.Background(), "Error querying issues: %v", err)
	}
	issues = reduceIssues(issues, defaultIssuesWindow)
	res := make([]interface{}, 0, len(issues))
	for _, issue := range issues {
		issue.Timestamp = issue.CreatedAt.UnixMilli()
		res = append(res, issue)
	}
	return res
}

const (
	defaultIssuesWindow = 2 * time.Second
)

func reduceIssues(issues []issueEvent, window time.Duration) []issueEvent {
	if len(issues) == 0 {
		return issues
	}

	lastKept := make(map[string]time.Time, 4)
	res := make([]issueEvent, 0, len(issues))

	for _, issue := range issues {
		last, ok := lastKept[issue.Type]
		if !ok || issue.CreatedAt.Sub(last) >= window {
			res = append(res, issue)
			lastKept[issue.Type] = issue.CreatedAt
		}
	}
	return res
}

type issue struct {
	ID        string    `ch:"issue_id" json:"issueId"`
	Type      string    `ch:"issue_type" json:"issueType"`
	Context   string    `ch:"context_string" json:"contextString"`
	Payload   string    `ch:"payload_string" json:"payload"`
	CreatedAt time.Time `ch:"created_at" json:"createdAt"`
}

func (i *issue) CountFromPayload() int {
	count := 3 // default
	if i.Payload == "" {
		return count
	}
	type issuePayload struct {
		Count int `json:"count"`
	}
	payload := &issuePayload{}
	if err := json.Unmarshal([]byte(i.Payload), payload); err != nil {
		return count
	}
	if payload.Count > count {
		return payload.Count
	}
	return count
}

func (e *eventsImpl) getIssues(projID uint32, sessID uint64, issueType string) []issue {
	cond := ""
	if issueType != "" {
		cond = "AND events.issue_type = '" + issueType + "'"
	}
	query := `SELECT DISTINCT ON (event_id) events.created_at,
				issue_id,
                issue_type,
                "$properties".payload AS payload_string
            FROM product_analytics.events
            WHERE session_id = ?
                AND events.project_id = ?
                AND "$event_name"= 'ISSUE'
                ` + cond + `
			ORDER BY created_at;`
	sessIssues := make([]issue, 0)
	if err := e.chConn.Select(context.Background(), &sessIssues, query, sessID, projID); err != nil {
		e.log.Error(context.Background(), "Error querying issues: %v", err)
		return nil
	}
	return sessIssues
}

type incidentEvent struct {
	Type      string    `ch:"type" json:"type"`
	Label     string    `ch:"label" json:"label"`
	StartTime int64     `ch:"start_time" json:"startTime"`
	EndTime   int64     `ch:"end_time" json:"endTime"`
	CreatedAt time.Time `ch:"created_at" json:"createdAt"`
	Timestamp int64     `ch:"timestamp" json:"timestamp"`
}

func (e *eventsImpl) GetIncidentsBySessionID(projectID uint32, sessID uint64) []interface{} {
	query := `SELECT created_at,
			 		"$properties".end_time  AS end_time,
					"$properties".label AS label,
					"$properties".start_time AS start_time
			FROM product_analytics.events
			WHERE session_id = ? AND project_id = ?
			  	AND issue_type = 'incident' 
			  	AND "$event_name" = 'ISSUE'
				AND "$auto_captured"
			ORDER BY created_at;`
	incidents := make([]incidentEvent, 0)
	if err := e.chConn.Select(context.Background(), &incidents, query, sessID, projectID); err != nil {
		e.log.Error(context.Background(), "Error querying incidents: %v", err)
		return nil
	}
	res := make([]interface{}, 0, len(incidents))
	for _, incident := range incidents {
		incident.Timestamp = incident.CreatedAt.UnixMilli()
		res = append(res, incident)
	}
	return res
}

func (e *eventsImpl) GetMobileBySessionID(projID uint32, sessID uint64) []interface{} {
	query := `SELECT created_at,
              	toString(` + "`$properties`" + `) AS p_properties,
              	` + "`$event_name`" + ` AS type,
              	` + "`$duration_s`" + ` AS duration,
              	` + "`$current_url`" + ` AS url,
              	` + "`$referrer`" + ` AS referrer
              FROM product_analytics.events
              WHERE session_id = ?
              	AND ` + "`$event_name`" + ` IN ('CLICK', 'INPUT', 'LOCATION', 'TAP')
				AND ` + "`$auto_captured`" + `
			  ORDER BY created_at;`
	sessEvents := make([]event, 0)
	if err := e.chConn.Select(context.Background(), &sessEvents, query, sessID); err != nil {
		e.log.Error(context.Background(), "Error querying mobile events: %v", err)
		return nil
	}
	return e.groupClicksToClickRage(projID, sessID, sessEvents)
}

type mobileEvent struct {
	Type         string    `ch:"type" json:"type"`
	Name         string    `ch:"name" json:"name"`
	AutoCaptures string    `ch:"auto_captures" json:"autoCaptures"`
	Properties   string    `ch:"properties" json:"properties"`
	CreatedAt    time.Time `ch:"created_at" json:"createdAt"`
	Timestamp    int64     `ch:"timestamp" json:"timestamp"`
}

func (e *eventsImpl) GetMobileCrashesBySessionID(sessID uint64) []interface{} {
	query := `SELECT ` + "`$properties`" + `AS auto_captures,
				properties,
				created_at,
				'CRASH' AS type,
				` + "`$event_name`" + ` AS name
			  FROM product_analytics.events
			  WHERE session_id = ?
				AND NOT ` + "`$auto_captured`" + `
				AND ` + "`$event_name`" + ` = 'CRASH'
			  ORDER BY created_at;`
	sessEvents := make([]mobileEvent, 0)
	if err := e.chConn.Select(context.Background(), &sessEvents, query, sessID); err != nil {
		e.log.Error(context.Background(), "Error querying mobile crashes: %v", err)
		return nil
	}
	res := make([]interface{}, 0, len(sessEvents))
	for _, sessEvent := range sessEvents {
		sessEvent.Timestamp = sessEvent.CreatedAt.UnixMilli()
		res = append(res, sessEvent)
	}
	return res
}

func (e *eventsImpl) GetMobileCustomsBySessionID(sessID uint64) []interface{} {
	query := `SELECT ` + "`$properties`" + `AS auto_captures,
				properties,
				created_at,
				'CUSTOM' AS type,
				` + "`$event_name`" + `AS name
			  FROM product_analytics.events
			  WHERE session_id = ?
				AND NOT ` + "`$auto_captured`" + `
			  ORDER BY created_at;`
	sessEvents := make([]mobileEvent, 0)
	res := make([]interface{}, 0, len(sessEvents))
	if err := e.chConn.Select(context.Background(), &sessEvents, query, sessID); err != nil {
		e.log.Error(context.Background(), "Error querying mobile customs: %v", err)
		return res
	}
	for _, sessEvent := range sessEvents {
		sessEvent.Timestamp = sessEvent.CreatedAt.UnixMilli()
		res = append(res, sessEvent)
	}
	return res
}

func (e *eventsImpl) GetClickMaps(projID uint32, sessID uint64, url string) ([]interface{}, error) {
	query := `
    SELECT
        CAST(` + "`$properties`" + `.selector AS String) AS selector,
        COUNT(1) as count
    FROM product_analytics.events AS me
    WHERE
        me.project_id = ? AND
        me.session_id = ? AND
        me.` + "`$event_name`" + ` = 'CLICK' AND
        me.` + "`$current_url`" + ` ILIKE ?
    GROUP BY 1
    ORDER BY count DESC;`

	rows, err := e.chConn.Query(context.Background(), query, projID, sessID, url+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	response := make([]interface{}, 0, 2)
	for rows.Next() {
		var (
			selector string
			count    uint64
		)
		if err := rows.Scan(&selector, &count); err != nil {
			return nil, err
		}
		response = append(response, map[string]interface{}{"selector": selector, "count": count})
	}
	return response, nil
}

func (e *eventsImpl) SearchEvents(projID uint32, req *model.EventsSearchRequest) (*model.EventsSearchResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("request is nil")
	}

	offset := (req.Page - 1) * req.Limit

	baseConditions := []string{
		"e.project_id = ?",
		"e.created_at >= toDateTime64(?/1000, 3)",
		"e.created_at <= toDateTime64(?/1000, 3)",
	}
	queryParams := []interface{}{projID, req.StartDate, req.EndDate}

	filterConditions, filterParams := BuildEventSearchQuery("e", req.Filters)
	whereClause := BuildWhereClause(baseConditions, filterConditions)
	queryParams = append(queryParams, filterParams...)

	selectColumns := BuildSelectColumns("e", req.Columns)

	sortBy := "e." + ValidateSortColumn(req.SortBy)
	sortOrder := ValidateSortOrder(req.SortOrder)

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM product_analytics.events AS e
		WHERE %s`, whereClause)

	var total uint64
	if err := e.chConn.QueryRow(context.Background(), countQuery, queryParams...).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM product_analytics.events AS e
		WHERE %s
		ORDER BY %s %s
		LIMIT ? OFFSET ?`, strings.Join(selectColumns, ", "), whereClause, sortBy, sortOrder)

	queryParams = append(queryParams, req.Limit, offset)
	rows, err := e.chConn.Query(context.Background(), query, queryParams...)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()

	events := make([]model.EventEntry, 0, req.Limit)
	for rows.Next() {
		entry := model.EventEntry{}

		valuePtrs := []interface{}{
			&entry.ProjectId,
			&entry.EventId,
			&entry.EventName,
			&entry.CreatedAt,
			&entry.DistinctId,
			&entry.SessionId,
		}

		for _, col := range req.Columns {
			if col == "session_id" {
				continue
			}
			if ptr := model.GetFieldPointer(&entry, col); ptr != nil {
				valuePtrs = append(valuePtrs, ptr)
			}
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			e.log.Error(context.Background(), "failed to scan event row: %v", err)
			continue
		}

		events = append(events, entry)
	}

	return &model.EventsSearchResponse{
		Total:  total,
		Events: events,
	}, nil
}

func (e *eventsImpl) GetEventByID(projID uint32, eventID string) (*model.EventEntry, error) {
	allColumns := model.GetAllEventColumns()
	selectColumns := BuildSelectColumns("", allColumns)

	query := fmt.Sprintf(`
		SELECT %s
		FROM product_analytics.events
		WHERE project_id = ? AND event_id = ?
		LIMIT 1`, strings.Join(selectColumns, ", "))

	entry := model.EventEntry{}
	basePtrs := []interface{}{
		&entry.ProjectId,
		&entry.EventId,
		&entry.EventName,
		&entry.CreatedAt,
		&entry.DistinctId,
		&entry.SessionId,
	}

	columnPtrs := model.GetScanPointers(&entry, allColumns)
	allPtrs := append(basePtrs, columnPtrs...)

	err := e.chConn.QueryRow(context.Background(), query, projID, eventID).Scan(allPtrs...)
	if err != nil {
		return nil, fmt.Errorf("failed to get event: %w", err)
	}

	return &entry, nil
}
