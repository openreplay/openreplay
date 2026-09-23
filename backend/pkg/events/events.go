package events

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"time"
	"unicode"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/logger"
)

type errorEvent struct {
	ErrorID   string    `ch:"error_id" json:"errorId"`
	Source    string    `ch:"source" json:"source"`
	Name      string    `ch:"name" json:"name"`
	Message   string    `ch:"message" json:"message"`
	CreatedAt time.Time `ch:"created_at" json:"-"`
	Timestamp int64     `json:"timestamp"`
}

func (e *errorEvent) IsNotJsException() bool {
	return e.Source != "js_exception"
}

type Events interface {
	GetSessionEvents(projID uint32, sessID uint64, lower, upper time.Time) ([]interface{}, error)
	GetMobileSessionEvents(projID uint32, sessID uint64, lower, upper time.Time) ([]interface{}, error)
	GroupClicksToClickRage(sessEvents []interface{}, clickRage []interface{}) []interface{}
	GetErrorsBySessionID(projectID uint32, sessID uint64, lower, upper time.Time) ([]errorEvent, error)
	GetCustomsBySessionID(projectID uint32, sessID uint64, lower, upper time.Time) ([]interface{}, error)
	GetIssueEventsBySessionID(projID uint32, sessID uint64, lower, upper time.Time) (issues []interface{}, incidents []interface{}, clickRage []interface{}, err error)
	GetMobileCrashesBySessionID(sessID uint64, lower, upper time.Time) ([]interface{}, error)
	GetMobileCustomsBySessionID(sessID uint64, lower, upper time.Time) ([]interface{}, error)
	GetClickMaps(projID uint32, sessID uint64, url string) ([]interface{}, error)
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

func parseInt64(s *string) *int64 {
	if s == nil {
		return nil
	}
	if i, err := strconv.ParseInt(*s, 10, 64); err == nil {
		return &i
	}
	if f, err := strconv.ParseFloat(*s, 64); err == nil {
		v := int64(f)
		return &v
	}
	return nil
}

type event struct {
	Type           string    `ch:"type"`
	Duration       *uint16   `ch:"duration"`
	Url            *string   `ch:"url"`
	Referrer       *string   `ch:"referrer"`
	Label          *string   `ch:"label"`
	Selector       *string   `ch:"selector"`
	HesitationTime *string   `ch:"hesitation_time"`
	Value          *string   `ch:"value"`
	InputDuration  *string   `ch:"input_duration"`
	WebVitals      *string   `ch:"web_vitals"`
	CreatedAt      time.Time `ch:"created_at" json:"-"`
}

type ClickEvent struct {
	Type       string  `json:"type"`
	Label      *string `json:"label,omitempty"`
	Hesitation *int64  `json:"hesitation,omitempty"`
	Selector   *string `json:"selector,omitempty"`
	Timestamp  int64   `json:"timestamp"`
}

func NewClickEvent(event *event) *ClickEvent {
	return &ClickEvent{
		Type:       event.Type,
		Label:      event.Label,
		Hesitation: parseInt64(event.HesitationTime),
		Selector:   event.Selector,
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
	Type       string  `json:"type"`
	Label      *string `json:"label,omitempty"`
	Duration   *int64  `json:"duration,omitempty"`
	Hesitation *int64  `json:"hesitation,omitempty"`
	Value      *string `json:"value,omitempty"`
	Timestamp  int64   `json:"timestamp"`
}

func NewInputEvent(event *event) *InputEvent {
	duration := parseInt64(event.InputDuration)
	if duration != nil {
		*duration *= 1000
	}
	return &InputEvent{
		Type:       event.Type,
		Label:      event.Label,
		Duration:   duration,
		Hesitation: parseInt64(event.HesitationTime),
		Value:      event.Value,
		Timestamp:  event.CreatedAt.UnixMilli(),
	}
}

type LocationEvent struct {
	Type      string  `json:"type"`
	Label     *string `json:"label,omitempty"`
	Url       *string `json:"url,omitempty"`
	Referrer  *string `json:"referrer,omitempty"`
	Host      *string `json:"host,omitempty"`
	WebVitals *string `json:"webVitals"`
	Timestamp int64   `json:"timestamp"`
}

func NewLocationEvent(event *event) *LocationEvent {
	return &LocationEvent{
		Type:      event.Type,
		Label:     event.Label,
		Url:       event.Url,
		Referrer:  event.Referrer,
		Host:      getHostFromUrl(*event.Url),
		WebVitals: event.WebVitals,
		Timestamp: event.CreatedAt.UnixMilli(),
	}
}

func getHostFromUrl(fullUrl string) *string {
	parsedURL, err := url.Parse(fullUrl)
	if err != nil {
		return nil
	}
	return &parsedURL.Host
}

const sessionEventsColumns = `nullIf(toString("$properties".label), '') AS label,
					nullIf(toString("$properties".selector), '') AS selector,
					nullIf(toString("$properties".hesitation_time), '') AS hesitation_time,
					nullIf(toString("$properties".value), '') AS value,
					nullIf(toString("$properties".duration), '') AS input_duration,
					nullIf(toString("$properties".web_vitals), '') AS web_vitals`

func (e *eventsImpl) GetSessionEvents(projID uint32, sessID uint64, lower, upper time.Time) ([]interface{}, error) {
	query := `SELECT created_at,
					"$event_name" AS type,
					"$duration_s" AS duration,
					"$current_url" AS url,
					"$referrer" AS referrer,
					` + sessionEventsColumns + `
			  FROM product_analytics.events
			  WHERE session_id = ? AND project_id = ?
				AND "$event_name" IN ('CLICK', 'INPUT', 'LOCATION')
				AND "$auto_captured"
				AND created_at BETWEEN ? AND ?
			  ORDER BY created_at;`
	sessEvents := make([]event, 0)
	if err := e.chConn.Select(context.Background(), &sessEvents, query, sessID, projID, lower, upper); err != nil {
		return nil, fmt.Errorf("query events: %s", err)
	}
	res := make([]interface{}, 0, len(sessEvents))
	for i := range sessEvents {
		res = append(res, &sessEvents[i])
	}
	return res, nil
}

func (e *eventsImpl) GroupClicksToClickRage(sessEvents []interface{}, clickRage []interface{}) []interface{} {
	crEvents := make([]issue, 0, len(clickRage))
	for _, cr := range clickRage {
		if is, ok := cr.(issue); ok {
			crEvents = append(crEvents, is)
		}
	}
	crPtr, toSkip := -1, 0 // pointer for issues and events lists
	if len(crEvents) > 0 {
		crPtr = 0
	}

	res := make([]interface{}, 0, len(sessEvents))
	for _, raw := range sessEvents {
		sessEvent, ok := raw.(*event)
		if !ok {
			continue
		}
		switch sessEvent.Type {
		case "CLICK", "TAP":
			if toSkip > 0 {
				toSkip--
				continue
			}
			if crPtr == -1 { // empty clickRageEvents list
				res = append(res, NewClickEvent(sessEvent))
				continue
			}
			if crEvents[crPtr].CreatedAt.Equal(sessEvent.CreatedAt) {
				toSkip = crEvents[crPtr].CountFromPayload()
				res = append(res, NewClickRageEvent(sessEvent, toSkip))
				toSkip--
				crPtr++
				if crPtr == len(crEvents) {
					crPtr = -1
				}
			} else {
				res = append(res, NewClickEvent(sessEvent))
			}
		default:
			if toSkip > 0 {
				toSkip = 0 // reset the current clickRage set
			}
			if sessEvent.Type == "INPUT" {
				res = append(res, NewInputEvent(sessEvent))
			} else if sessEvent.Type == "LOCATION" {
				res = append(res, NewLocationEvent(sessEvent))
			}
		}
	}
	return res
}

func (e *eventsImpl) GetErrorsBySessionID(projectID uint32, sessID uint64, lower, upper time.Time) ([]errorEvent, error) {
	query := `SELECT DISTINCT ON (event_id) error_id,
					'js_exception' AS source,
					'ERROR' AS name,
					"$properties".message AS message,
					created_at
			  FROM product_analytics.events
			  WHERE session_id = ? AND project_id = ?
				AND "$event_name"= 'ERROR'
			  	AND "$auto_captured"
				AND created_at BETWEEN ? AND ?
			  ORDER BY created_at;`
	errorEvents := make([]errorEvent, 0)
	if err := e.chConn.Select(context.Background(), &errorEvents, query, sessID, projectID, lower, upper); err != nil {
		return nil, fmt.Errorf("query error events: %s", err)
	}
	for i := range errorEvents {
		errorEvents[i].Timestamp = errorEvents[i].CreatedAt.UnixMilli()
	}
	return errorEvents, nil
}

type customEvent struct {
	Name                   string     `ch:"name" json:"name"`
	Type                   string     `ch:"type" json:"type"`
	AutoCapturedProperties chcol.JSON `ch:"auto_props" json:"autoCapturedProperties"`
	Properties             chcol.JSON `ch:"properties" json:"properties"`
	CreatedAt              time.Time  `ch:"created_at" json:"-"`
}

func (e *eventsImpl) GetCustomsBySessionID(projectID uint32, sessID uint64, lower, upper time.Time) ([]interface{}, error) {
	query := `SELECT "$properties" AS auto_props,
				properties,
				created_at,
				'CUSTOM' AS type,
				"$event_name" AS name
			  FROM product_analytics.events
			  WHERE session_id = ?
			    AND project_id = ?
				AND NOT "$auto_captured"
				AND created_at BETWEEN ? AND ?
			  ORDER BY created_at;`
	customEvents := make([]customEvent, 0)
	res := make([]interface{}, 0, len(customEvents))
	if err := e.chConn.Select(context.Background(), &customEvents, query, sessID, projectID, lower, upper); err != nil {
		return nil, fmt.Errorf("query custom events: %s", err)
	}
	if len(customEvents) == 0 {
		return res, nil
	}
	for _, cEvent := range customEvents {
		event := make(map[string]interface{})
		event["name"] = cEvent.Name
		event["type"] = cEvent.Type
		event["timestamp"] = cEvent.CreatedAt.UnixMilli()

		for key, value := range cEvent.AutoCapturedProperties.NestedMap() {
			event[toCamelCase(key)] = value
		}
		event["properties"] = cEvent.Properties.NestedMap()

		res = append(res, event)
	}
	return res, nil
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
	Type      string    `ch:"issue_type" json:"type"`
	Context   string    `ch:"context_string" json:"contextString"`
	CreatedAt time.Time `ch:"created_at" json:"-"`
	Timestamp int64     `json:"timestamp"`
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
	ID        string    `ch:"issue_id"`
	Type      string    `ch:"issue_type"`
	Context   string    `ch:"context_string"`
	Payload   string    `ch:"payload_string"`
	CreatedAt time.Time `ch:"created_at" json:"-"`
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

type incidentEvent struct {
	Type      string `json:"type"`
	Label     string `ch:"label" json:"label"`
	StartTime int64  `ch:"start_time" json:"startTime"`
	EndTime   int64  `ch:"end_time" json:"endTime"`
	Timestamp int64  `json:"timestamp"`
}

type issueEventRow struct {
	EventID       string    `ch:"event_id"`
	CreatedAt     time.Time `ch:"created_at" json:"-"`
	IssueID       string    `ch:"issue_id"`
	IssueType     string    `ch:"issue_type"`
	ContextString string    `ch:"context_string"`
	Payload       string    `ch:"payload_string"`
	Label         string    `ch:"label"`
	StartTime     int64     `ch:"start_time"`
	EndTime       int64     `ch:"end_time"`
}

func (e *eventsImpl) GetIssueEventsBySessionID(projID uint32, sessID uint64, lower, upper time.Time) ([]interface{}, []interface{}, []interface{}, error) {
	query := `SELECT DISTINCT ON (event_id) event_id,
					created_at,
					issue_id,
					issue_type,
					if(toString("$properties".context_string) = '', toString("$properties".url), toString("$properties".context_string)) AS context_string,
					toString("$properties".payload) AS payload_string,
					toString("$properties".label) AS label,
					toInt64OrZero(toString("$properties".start_time)) AS start_time,
					toInt64OrZero(toString("$properties".end_time)) AS end_time
			  FROM product_analytics.events
			  WHERE session_id = ? AND project_id = ?
				AND "$event_name" = 'ISSUE'
				AND issue_type != ''
				AND created_at BETWEEN ? AND ?
			  ORDER BY created_at;`
	rows := make([]issueEventRow, 0)
	if err := e.chConn.Select(context.Background(), &rows, query, sessID, projID, lower, upper); err != nil {
		return nil, nil, nil, fmt.Errorf("query issue events: %s", err)
	}

	issuesRaw := make([]issueEvent, 0, len(rows))
	clickRage := make([]interface{}, 0)
	incidents := make([]interface{}, 0)
	for _, row := range rows {
		if row.IssueType == "incident" {
			incidents = append(incidents, incidentEvent{
				Type:      row.IssueType,
				Label:     row.Label,
				StartTime: row.StartTime,
				EndTime:   row.EndTime,
				Timestamp: row.CreatedAt.UnixMilli(),
			})
			continue
		}
		issuesRaw = append(issuesRaw, issueEvent{
			ID:        row.IssueID,
			Type:      row.IssueType,
			Context:   row.ContextString,
			CreatedAt: row.CreatedAt,
		})
		if row.IssueType == "click_rage" {
			clickRage = append(clickRage, issue{
				ID:        row.IssueID,
				Type:      row.IssueType,
				Context:   row.ContextString,
				Payload:   row.Payload,
				CreatedAt: row.CreatedAt,
			})
		}
	}

	issuesRaw = reduceIssues(issuesRaw, defaultIssuesWindow)
	issues := make([]interface{}, 0, len(issuesRaw))
	for _, is := range issuesRaw {
		is.Timestamp = is.CreatedAt.UnixMilli()
		issues = append(issues, is)
	}
	return issues, incidents, clickRage, nil
}

func (e *eventsImpl) GetMobileSessionEvents(projID uint32, sessID uint64, lower, upper time.Time) ([]interface{}, error) {
	query := `SELECT created_at,
					"$event_name" AS type,
					"$duration_s" AS duration,
					"$current_url" AS url,
					"$referrer" AS referrer,
					` + sessionEventsColumns + `
              FROM product_analytics.events
              WHERE project_id = ? AND session_id = ?
              	AND "$event_name" IN ('INPUT', 'LOCATION', 'TAP')
				AND "$auto_captured"
				AND created_at BETWEEN ? AND ?
			  ORDER BY created_at;`
	sessEvents := make([]event, 0)
	if err := e.chConn.Select(context.Background(), &sessEvents, query, projID, sessID, lower, upper); err != nil {
		return nil, fmt.Errorf("query mobile events: %s", err)
	}
	res := make([]interface{}, 0, len(sessEvents))
	for i := range sessEvents {
		res = append(res, &sessEvents[i])
	}
	return res, nil
}

type mobileEvent struct {
	Type         string    `ch:"type" json:"type"`
	Name         string    `ch:"name" json:"name"`
	AutoCaptures string    `ch:"auto_captures" json:"autoCaptures"`
	Properties   string    `ch:"properties" json:"properties"`
	CreatedAt    time.Time `ch:"created_at" json:"-"`
	Timestamp    int64     `ch:"timestamp" json:"timestamp"`
}

func (e *eventsImpl) GetMobileCrashesBySessionID(sessID uint64, lower, upper time.Time) ([]interface{}, error) {
	query := `SELECT ` + "`$properties`" + `AS auto_captures,
				properties,
				created_at,
				'CRASH' AS type,
				` + "`$event_name`" + ` AS name
			  FROM product_analytics.events
			  WHERE session_id = ?
				AND NOT ` + "`$auto_captured`" + `
				AND ` + "`$event_name`" + ` = 'CRASH'
				AND created_at BETWEEN ? AND ?
			  ORDER BY created_at;`
	sessEvents := make([]mobileEvent, 0)
	if err := e.chConn.Select(context.Background(), &sessEvents, query, sessID, lower, upper); err != nil {
		return nil, fmt.Errorf("query mobile crashes: %s", err)
	}
	res := make([]interface{}, 0, len(sessEvents))
	for _, sessEvent := range sessEvents {
		sessEvent.Timestamp = sessEvent.CreatedAt.UnixMilli()
		res = append(res, sessEvent)
	}
	return res, nil
}

func (e *eventsImpl) GetMobileCustomsBySessionID(sessID uint64, lower, upper time.Time) ([]interface{}, error) {
	query := `SELECT ` + "`$properties`" + `AS auto_captures,
				properties,
				created_at,
				'CUSTOM' AS type,
				` + "`$event_name`" + `AS name
			  FROM product_analytics.events
			  WHERE session_id = ?
				AND NOT ` + "`$auto_captured`" + `
				AND created_at BETWEEN ? AND ?
			  ORDER BY created_at;`
	sessEvents := make([]mobileEvent, 0)
	res := make([]interface{}, 0, len(sessEvents))
	if err := e.chConn.Select(context.Background(), &sessEvents, query, sessID, lower, upper); err != nil {
		return nil, fmt.Errorf("query mobile customs: %s", err)
	}
	for _, sessEvent := range sessEvents {
		sessEvent.Timestamp = sessEvent.CreatedAt.UnixMilli()
		res = append(res, sessEvent)
	}
	return res, nil
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
