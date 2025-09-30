package events

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"time"
	"unicode"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/logger"
)

const GroupClickRage bool = true

type errorEvent struct {
	ErrorID            string          `ch:"error_id" json:"errorID"`
	ProjectID          uint16          `ch:"project_id" json:"projectID"`
	Source             string          `ch:"source" json:"source"`
	Name               string          `ch:"name" json:"name"`
	Message            string          `ch:"message" json:"message"`
	Payload            json.RawMessage `ch:"payload" json:"stack"`
	Stacktrace         string          `ch:"stacktrace" json:"stacktrace"`
	StacktraceParsedAt *time.Time      `ch:"stacktrace_parsed_at" json:"stacktraceParsedAt"`
}

func (e *errorEvent) IsNotJsException() bool {
	return e.Source != "js_exception"
}

type Events interface {
	GetBySessionID(projID uint32, sessID uint64, doGroupClickRage bool) []interface{}
	GetErrorsBySessionID(projID uint32, sessID uint64) []errorEvent
	GetCustomsBySessionID(projID uint32, sessID uint64) []interface{}
	GetIssuesBySessionID(projID uint32, sessID uint64) []interface{}
	GetIncidentsBySessionID(projID uint32, sessID uint64) []interface{}
	GetMobileBySessionID(projID uint32, sessID uint64) []interface{}
	GetMobileCrashesBySessionID(sessID uint64) []interface{}
	GetMobileCustomsBySessionID(projID uint32, sessID uint64) []interface{}
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
		Timestamp:  event.CreatedAt.Unix(),
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
		Timestamp:  event.CreatedAt.Unix(),
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
		Timestamp:                event.CreatedAt.Unix(),
	}
}

func getHostFromUrl(fullUrl string) *string {
	if parsedURL, err := url.Parse(fullUrl); err != nil {
		fmt.Printf("failed to parse url: %v", err)
		return nil
	} else {
		return &parsedURL.Host
	}
}

func (e *eventsImpl) GetBySessionID(projID uint32, sessID uint64, doGroupClickRage bool) []interface{} {
	query := `SELECT created_at,
			` + "`$properties`" + ` AS props,
			` + "`$event_name`" + ` AS type,
			` + "`$duration_s`" + ` AS duration,
			` + "`$current_url`" + ` AS url,
			` + "`$referrer`" + ` AS referrer
			FROM product_analytics.events
			WHERE session_id = ?
				AND ` + "`$event_name`" + ` IN ('CLICK', 'INPUT', 'LOCATION')
				AND ` + "`$auto_captured`" + `
			ORDER BY created_at;`
	sessEvents := make([]event, 0)
	if err := e.chConn.Select(context.Background(), &sessEvents, query, sessID); err != nil {
		fmt.Println("Error querying events:", err)
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
				crPtr++
				if crPtr == len(clickRageEvents) {
					crPtr = -1
				}
				toSkip = clickRageEvents[crPtr].CountFromPayload()
				res = append(res, NewClickRageEvent(&sessEvent, toSkip))
				toSkip-- // skip the current element
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

func (e *eventsImpl) GetErrorsBySessionID(projID uint32, sessID uint64) []errorEvent {
	query := `SELECT error_id,
					project_id,
					` + "`$properties`" + `.source AS source,
					'ERROR' AS name,
					` + "`$properties`" + `.message AS message,
					` + "`$properties`" + `.payload AS payload,
					stacktrace,
					stacktrace_parsed_at
			  FROM product_analytics.events
			  LEFT JOIN experimental.parsed_errors USING (error_id)
			  WHERE session_id = ?
				AND ` + "`$event_name`" + ` = 'ERROR'
			  ORDER BY created_at;`
	errorEvents := make([]errorEvent, 0)
	if err := e.chConn.Select(context.Background(), &errorEvents, query, sessID); err != nil {
		fmt.Println("Error querying error events:", err)
		return nil
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

func (e *eventsImpl) GetCustomsBySessionID(projID uint32, sessID uint64) []interface{} {
	query := `SELECT toString(` + "`$properties`" + `) AS auto_props,
				toString(properties) AS properties,
				created_at,
				'CUSTOM' AS type,
				` + "`$event_name`" + ` AS name
			  FROM product_analytics.events
			  WHERE session_id = ?
				AND NOT ` + "`$auto_captured`" + `
				AND ` + "`$event_name`" + `!='INCIDENT'
			  ORDER BY created_at;`
	customEvents := make([]customEvent, 0)
	if err := e.chConn.Select(context.Background(), &customEvents, query, sessID); err != nil {
		fmt.Println("Error querying events:", err)
		return nil
	}
	if len(customEvents) == 0 {
		return nil
	}
	res := make([]interface{}, 0, len(customEvents))
	for _, cEvent := range customEvents {
		event := make(map[string]interface{})
		event["name"] = cEvent.Name
		event["type"] = cEvent.Type
		event["createdAt"] = cEvent.CreatedAt
		event["timestamp"] = cEvent.CreatedAt.Unix()

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
                FROM product_analytics.events
				INNER JOIN experimental.issues ON (events.issue_id = issues.issue_id)
				WHERE session_id = ?
					AND events.project_id = ?
					AND issues.project_id = ?
					AND ` + "`$event_name`" + ` = 'ISSUE'
				ORDER BY created_at;`
	issues := make([]issueEvent, 0)
	if err := e.chConn.Select(context.Background(), &issues, query, sessID, projID, projID); err != nil {
		fmt.Println("Error querying events:", err)
	}
	issues = reduceIssues(issues, defaultIssuesWindow)
	res := make([]interface{}, 0, len(issues))
	for _, issue := range issues {
		issue.Timestamp = issue.CreatedAt.Unix()
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
		fmt.Println("Error unmarshaling payload:", err)
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
		cond = "AND events.issue_type = '" + issueType + "' AND issues.type = '" + issueType + "'"
	}
	query := `SELECT DISTINCT ON (events.created_at, issue_id) events.created_at,
				issue_id,
                issue_type,
                context_string,
                ` + "`$properties`.payload" + ` AS payload_string
            FROM product_analytics.events
            INNER JOIN experimental.issues ON (events.issue_id = issues.issue_id)
            WHERE session_id = ?
                AND events.project_id = ?
                AND issues.project_id = ?
                AND ` + "`$event_name`" + ` = 'ISSUE'
                ` + cond + `
			ORDER BY created_at;`
	sessIssues := make([]issue, 0)
	if err := e.chConn.Select(context.Background(), &sessIssues, query, sessID, projID, projID); err != nil {
		fmt.Println("Error querying events:", err)
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

func (e *eventsImpl) GetIncidentsBySessionID(projID uint32, sessID uint64) []interface{} {
	query := `SELECT created_at,
			` + "`$properties`.end_time" + ` AS end_time,
			` + "`$properties`.label" + ` AS label,
			` + "`$properties`.start_time" + ` AS start_time,
			` + "`$event_name`" + ` AS type
			FROM product_analytics.events
			WHERE session_id = ?
				AND ` + "`$event_name`" + ` = 'INCIDENT'
				AND ` + "`$auto_captured`" + `
			ORDER BY created_at;`
	incidents := make([]incidentEvent, 0)
	if err := e.chConn.Select(context.Background(), &incidents, query, sessID); err != nil {
		fmt.Println("Error querying events:", err)
		return nil
	}
	res := make([]interface{}, 0, len(incidents))
	for _, incident := range incidents {
		incident.Timestamp = incident.CreatedAt.Unix()
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
		fmt.Println("Error querying events:", err)
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
		fmt.Println("Error querying events:", err)
		return nil
	}
	res := make([]interface{}, 0, len(sessEvents))
	for _, sessEvent := range sessEvents {
		sessEvent.Timestamp = sessEvent.CreatedAt.Unix()
		res = append(res, sessEvent)
	}
	return res
}

func (e *eventsImpl) GetMobileCustomsBySessionID(projID uint32, sessID uint64) []interface{} {
	query := `SELECT ` + "`$properties`" + `AS auto_captures,
				properties,
				created_at,
				'CUSTOM' AS type,
				` + "`$event_name`" + `AS name
			  FROM product_analytics.events
			  WHERE session_id = ?
				AND NOT ` + "`$auto_captured`" + `
				AND ` + "`$event_name`" + ` != 'INCIDENT'
			  ORDER BY created_at;`
	sessEvents := make([]mobileEvent, 0)
	if err := e.chConn.Select(context.Background(), &sessEvents, query, sessID); err != nil {
		fmt.Println("Error querying events:", err)
		return nil
	}
	res := make([]interface{}, 0, len(sessEvents))
	for _, sessEvent := range sessEvents {
		sessEvent.Timestamp = sessEvent.CreatedAt.Unix()
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
	return nil, nil
}
