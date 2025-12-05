package clickhouse

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"log"
	"reflect"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/google/uuid"

	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/url"
)

type Connector interface {
	InsertDefaultAutocompleteValues(session *sessions.Session, msg *messages.SessionStart) error
	InsertWebSession(session *sessions.Session) error
	InsertWebPageEvent(session *sessions.Session, msg *messages.PageEvent) error
	InsertWebClickEvent(session *sessions.Session, msg *messages.MouseClick) error
	InsertWebJSException(session *sessions.Session, msg *messages.JSException) error
	InsertWebPerformanceTrackAggr(session *sessions.Session, msg *messages.PerformanceTrackAggr) error
	InsertAutocomplete(session *sessions.Session, msgType, msgValue string) error
	InsertRequest(session *sessions.Session, msg *messages.NetworkRequest, savePayload bool) error
	InsertCustom(session *sessions.Session, msg *messages.CustomEvent) error
	InsertGraphQL(session *sessions.Session, msg *messages.GraphQL) error
	InsertIssue(session *sessions.Session, msg *messages.IssueEvent) error
	InsertWebInputDuration(session *sessions.Session, msg *messages.InputChange) error
	InsertMouseThrashing(session *sessions.Session, msg *messages.MouseThrashing) error
	InsertIncident(session *sessions.Session, msg *messages.Incident) error
	InsertTagTrigger(session *sessions.Session, msg *messages.TagTrigger) error
	InsertMobileSession(session *sessions.Session) error
	InsertMobileCustom(session *sessions.Session, msg *messages.MobileEvent) error
	InsertMobileClick(session *sessions.Session, msg *messages.MobileClickEvent) error
	InsertMobileSwipe(session *sessions.Session, msg *messages.MobileSwipeEvent) error
	InsertMobileInput(session *sessions.Session, msg *messages.MobileInputEvent) error
	InsertMobileRequest(session *sessions.Session, msg *messages.MobileNetworkCall, savePayload bool) error
	InsertMobileCrash(session *sessions.Session, msg *messages.MobileCrash) error
	InsertMobileIssue(session *sessions.Session, msg *messages.MobileIssueEvent) error
	Commit() error
	Stop() error
}

type task struct {
	bulks []Bulk
}

func NewTask() *task {
	return &task{bulks: make([]Bulk, 0, 20)}
}

type connectorImpl struct {
	conn       driver.Conn
	metrics    database.Database
	batches    map[string]Bulk //driver.Batch
	workerTask chan *task
	done       chan struct{}
	finished   chan struct{}
}

func NewConnector(conn driver.Conn, metrics database.Database) (Connector, error) {
	switch {
	case conn == nil:
		return nil, errors.New("CH connection is required")
	case metrics == nil:
		return nil, errors.New("metrics is required")
	}

	c := &connectorImpl{
		conn:       conn,
		metrics:    metrics,
		batches:    make(map[string]Bulk, 21),
		workerTask: make(chan *task, 1),
		done:       make(chan struct{}),
		finished:   make(chan struct{}),
	}
	if err := c.prepare(); err != nil {
		return nil, err
	}
	go c.worker()
	return c, nil
}

var batches = map[string]string{
	"sessions":        "INSERT INTO experimental.sessions (session_id, project_id, user_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, user_state, user_city, datetime, duration, pages_count, events_count, errors_count, referrer, issue_types, tracker_version, user_browser, user_browser_version, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10, platform, timezone, utm_source, utm_medium, utm_campaign, screen_width, screen_height) VALUES (?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?)",
	"autocompletes":   "INSERT INTO experimental.autocomplete (project_id, type, value) VALUES (?, ?, SUBSTR(?, 1, 8000))",
	"pages":           `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"clicks":          `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"inputs":          `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", "$duration_s", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"errors":          `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", error_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"performance":     `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"requests":        `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", "$duration_s", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"custom":          `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", "$properties", properties) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"graphql":         `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"issuesEvents":    `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", issue_type, issue_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"issues":          "INSERT INTO experimental.issues (project_id, issue_id, type, context_string) VALUES (?, ?, ?, ?)",
	"tagTriggers":     `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$os", "$browser", "$referrer", "$country", "$state", "$city", "$current_url", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"mobile_sessions": "INSERT INTO experimental.sessions (session_id, project_id, user_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, user_state, user_city, datetime, duration, pages_count, events_count, errors_count, referrer, issue_types, tracker_version, user_browser, user_browser_version, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10, platform, timezone) VALUES (?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), ?, ?)",
	"mobile_custom":   `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"mobile_clicks":   `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"mobile_swipes":   `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"mobile_inputs":   `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"mobile_requests": `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"mobile_crashes":  `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"mobile_issues":   `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, "$time", distinct_id, "$auto_captured", "$device", "$os_version", "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
}

func (c *connectorImpl) newBatch(name, query string) error {
	batch, err := NewBulk(c.conn, c.metrics, name, query)
	if err != nil {
		return fmt.Errorf("can't create new batch: %s", err)
	}
	c.batches[name] = batch
	return nil
}

func (c *connectorImpl) prepare() error {
	for table, query := range batches {
		if err := c.newBatch(table, query); err != nil {
			return fmt.Errorf("can't create %s batch: %s", table, err)
		}
	}
	return nil
}

func (c *connectorImpl) Commit() error {
	newTask := NewTask()
	for _, b := range c.batches {
		newTask.bulks = append(newTask.bulks, b)
	}
	c.batches = make(map[string]Bulk, 21)
	if err := c.prepare(); err != nil {
		log.Printf("can't prepare new CH batch set: %s", err)
	}
	c.workerTask <- newTask
	return nil
}

func (c *connectorImpl) Stop() error {
	c.done <- struct{}{}
	<-c.finished
	return c.conn.Close()
}

func (c *connectorImpl) sendBulks(t *task) {
	for _, b := range t.bulks {
		if err := b.Send(); err != nil {
			log.Printf("can't send batch: %s", err)
		}
	}
}

func (c *connectorImpl) worker() {
	for {
		select {
		case t := <-c.workerTask:
			c.sendBulks(t)
		case <-c.done:
			for t := range c.workerTask {
				c.sendBulks(t)
			}
			c.finished <- struct{}{}
			return
		}
	}
}

func getAutocompleteType(baseType string, platform string) string {
	if platform == "web" {
		return baseType
	}
	return baseType + "_" + strings.ToUpper(platform)
}

func (c *connectorImpl) InsertDefaultAutocompleteValues(session *sessions.Session, msg *messages.SessionStart) error {
	platform := "web"
	geoInfo := geoip.UnpackGeoRecord(msg.UserCountry)
	c.InsertAutocomplete(session, getAutocompleteType("USEROS", platform), msg.UserOS)
	c.InsertAutocomplete(session, getAutocompleteType("USERDEVICE", platform), msg.UserDevice)
	c.InsertAutocomplete(session, getAutocompleteType("USERCOUNTRY", platform), geoInfo.Country)
	c.InsertAutocomplete(session, getAutocompleteType("USERSTATE", platform), geoInfo.State)
	c.InsertAutocomplete(session, getAutocompleteType("USERCITY", platform), geoInfo.City)
	c.InsertAutocomplete(session, getAutocompleteType("REVID", platform), msg.RevID)
	c.InsertAutocomplete(session, "USERBROWSER", msg.UserBrowser)
	return nil
}

func (c *connectorImpl) InsertWebSession(session *sessions.Session) (err error) {
	if session.Duration == nil {
		return errors.New("trying to insert session with nil duration")
	}
	if session.UserID != nil && *session.UserID == "" {
		session.UserID = nil
	}
	if session.UserAnonymousID != nil && *session.UserAnonymousID == "" {
		session.UserAnonymousID = nil
	}
	if err := c.batches["sessions"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		session.UserID,
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		datetime(session.Timestamp),
		uint32(*session.Duration),
		uint16(session.PagesCount),
		uint16(session.EventsCount),
		uint16(session.ErrorsCount),
		session.Referrer,
		session.IssueTypes,
		session.TrackerVersion,
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		session.Metadata1,
		session.Metadata2,
		session.Metadata3,
		session.Metadata4,
		session.Metadata5,
		session.Metadata6,
		session.Metadata7,
		session.Metadata8,
		session.Metadata9,
		session.Metadata10,
		"web",
		session.Timezone,
		session.UtmSource,
		session.UtmMedium,
		session.UtmCampaign,
		session.ScreenWidth,
		session.ScreenHeight,
	); err != nil {
		c.checkError("sessions", err)
		return fmt.Errorf("can't append to sessions batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertAutocomplete(session *sessions.Session, msgType, msgValue string) error {
	if len(msgValue) == 0 {
		return nil
	}
	if err := c.batches["autocompletes"].Append(
		uint16(session.ProjectID),
		msgType,
		msgValue,
	); err != nil {
		c.checkError("autocompletes", err)
		return fmt.Errorf("can't append to autocompletes batch: %s", err)
	}
	return nil
}

func msToSeconds(ms uint64) uint16 {
	ms = (ms + 500) / 1000
	if ms > uint64(^uint16(0)) {
		return ^uint16(0) // ms exceeds uint16 limit
	}
	return uint16(ms)
}

func sanitizePayload(payload map[string]interface{}) map[string]interface{} {
	for key, value := range payload {
		if value == nil {
			delete(payload, key)
			continue
		}

		switch v := value.(type) {
		case string:
			if v == "" {
				delete(payload, key)
			}
		case int, int8, int16, int32, int64:
			if reflect.ValueOf(v).Int() == 0 {
				delete(payload, key)
			}
		case uint, uint8, uint16, uint32, uint64:
			if reflect.ValueOf(v).Uint() == 0 {
				delete(payload, key)
			}
		case float32, float64:
			if reflect.ValueOf(v).Float() == 0 {
				delete(payload, key)
			}
		}
	}
	return payload
}

func (c *connectorImpl) InsertWebInputDuration(session *sessions.Session, msg *messages.InputChange) error {
	if msg.Label == "" {
		return nil
	}
	if msg.HesitationTime > 2147483647 {
		msg.HesitationTime = 0
	}
	if msg.InputDuration > 2147483647 {
		msg.InputDuration = 0
	}
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"label":            msg.Label,
		"hesitation_time":  nullableUint32(uint32(msg.HesitationTime)),
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
		"page_title":       strings.TrimSpace(msg.PageTitle),
	}))
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["inputs"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"INPUT",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.Url),
		nullableUint16(msToSeconds(uint64(msg.InputDuration))),
		jsonString,
	); err != nil {
		c.checkError("inputs", err)
		return fmt.Errorf("can't append to inputs batch: %s", err)
	}
	return c.InsertAutocomplete(session, "INPUT", msg.Label)
}

func (c *connectorImpl) InsertMouseThrashing(session *sessions.Session, msg *messages.MouseThrashing) error {
	issueID := hashid.MouseThrashingID(session.ProjectID, session.SessionID, msg.Timestamp)
	host, path, hostpath, err := extractUrlParts(msg.Url)
	if err != nil {
		return fmt.Errorf("can't extract url parts: %s", err)
	}
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"issue_type":       "mouse_thrashing",
		"url":              cropString(msg.Url),
		"url_host":         host,
		"url_path":         path,
		"url_hostpath":     hostpath,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
		"page_title":       strings.TrimSpace(msg.PageTitle),
	}))
	if err != nil {
		return fmt.Errorf("can't marshal issue event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["issuesEvents"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"ISSUE",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.Url),
		"mouse_thrashing",
		issueID,
		jsonString,
	); err != nil {
		c.checkError("issuesEvents", err)
		return fmt.Errorf("can't append to issuesEvents batch: %s", err)
	}
	if err := c.batches["issues"].Append(
		uint16(session.ProjectID),
		issueID,
		"mouse_thrashing",
		msg.Url,
	); err != nil {
		c.checkError("issues", err)
		return fmt.Errorf("can't append to issues batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertIssue(session *sessions.Session, msg *messages.IssueEvent) error {
	issueID := hashid.IssueID(session.ProjectID, msg)
	// Check issue type before insert to avoid panic from clickhouse lib
	switch msg.Type {
	case "click_rage", "dead_click", "excessive_scrolling", "bad_request", "missing_resource", "memory", "cpu", "slow_resource", "slow_page_load", "crash", "ml_cpu", "ml_memory", "ml_dead_click", "ml_click_rage", "ml_mouse_thrashing", "ml_excessive_scrolling", "ml_slow_resources", "custom", "js_exception", "mouse_thrashing", "app_crash":
	default:
		return fmt.Errorf("unknown issueType: %s", msg.Type)
	}
	host, path, hostpath, err := extractUrlParts(msg.Url)
	if err != nil {
		return fmt.Errorf("can't extract url parts: %s", err)
	}
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"issue_type":       msg.Type,
		"url":              cropString(msg.Url),
		"url_host":         host,
		"url_path":         path,
		"url_hostpath":     hostpath,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
		"page_title":       strings.TrimSpace(msg.PageTitle),
		"payload":          msg.Payload,
		"context_string":   msg.ContextString,
	}))
	if err != nil {
		return fmt.Errorf("can't marshal issue event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["issuesEvents"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"ISSUE",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.Url),
		msg.Type,
		issueID,
		jsonString,
	); err != nil {
		c.checkError("issuesEvents", err)
		return fmt.Errorf("can't append to issuesEvents batch: %s", err)
	}
	if err := c.batches["issues"].Append(
		uint16(session.ProjectID),
		issueID,
		msg.Type,
		msg.ContextString,
	); err != nil {
		c.checkError("issues", err)
		return fmt.Errorf("can't append to issues batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebPageEvent(session *sessions.Session, msg *messages.PageEvent) error {
	host, path, hostpath, err := extractUrlParts(msg.URL)
	if err != nil {
		return fmt.Errorf("can't extract url parts: %s", err)
	}
	ttfb := nullableUint16(0)
	if msg.ResponseStart >= msg.RequestStart {
		ttfb = nullableUint16(uint16(msg.ResponseStart - msg.RequestStart))
	}
	ttlb := nullableUint16(0)
	if msg.ResponseEnd >= msg.RequestStart {
		ttlb = nullableUint16(uint16(msg.ResponseEnd - msg.RequestStart))
	}
	responseTime := nullableUint16(0)
	if msg.ResponseEnd >= msg.ResponseStart {
		responseTime = nullableUint16(uint16(msg.ResponseEnd - msg.ResponseStart))
	}
	domBuildingTime := nullableUint16(0)
	if msg.DomContentLoadedEventStart >= msg.ResponseEnd {
		domBuildingTime = nullableUint16(uint16(msg.DomContentLoadedEventStart - msg.ResponseEnd))
	}
	domContentLoadedEventTime := nullableUint16(0)
	if msg.DomContentLoadedEventEnd >= msg.DomContentLoadedEventStart {
		domContentLoadedEventTime = nullableUint16(uint16(msg.DomContentLoadedEventEnd - msg.DomContentLoadedEventStart))
	}
	loadEventTime := nullableUint16(0)
	if msg.LoadEventEnd >= msg.LoadEventStart {
		loadEventTime = nullableUint16(uint16(msg.LoadEventEnd - msg.LoadEventStart))
	}
	payload := map[string]interface{}{
		"request_start":                  nullableUint16(uint16(msg.RequestStart)),
		"response_start":                 nullableUint16(uint16(msg.ResponseStart)),
		"response_end":                   nullableUint16(uint16(msg.ResponseEnd)),
		"dom_content_loaded_event_start": nullableUint16(uint16(msg.DomContentLoadedEventStart)),
		"dom_content_loaded_event_end":   nullableUint16(uint16(msg.DomContentLoadedEventEnd)),
		"load_event_start":               nullableUint16(uint16(msg.LoadEventStart)),
		"load_event_end":                 nullableUint16(uint16(msg.LoadEventEnd)),
		"first_paint":                    nullableUint16(uint16(msg.FirstPaint)),
		"first_contentful_paint_time":    nullableUint16(uint16(msg.FirstContentfulPaint)),
		"speed_index":                    nullableUint16(uint16(msg.SpeedIndex)),
		"visually_complete":              nullableUint16(uint16(msg.VisuallyComplete)),
		"time_to_interactive":            nullableUint16(uint16(msg.TimeToInteractive)),
		"url":                            cropString(msg.URL),
		"url_host":                       host,
		"url_path":                       path,
		"url_hostpath":                   hostpath,
		"ttfb":                           ttfb,
		"ttlb":                           ttlb,
		"response_time":                  responseTime,
		"dom_building_time":              domBuildingTime,
		"dom_content_loaded_event_time":  domContentLoadedEventTime,
		"load_event_time":                loadEventTime,
		"user_device":                    session.UserDevice,
		"user_device_type":               session.UserDeviceType,
		"page_title":                     strings.TrimSpace(msg.PageTitle),
		"web_vitals":                     msg.WebVitals,
	}
	if len(msg.WebVitals) > 0 {
		webVitals := map[string]interface{}{}
		if err := json.Unmarshal([]byte(msg.WebVitals), &webVitals); err == nil {
			for key, value := range webVitals {
				payload[strings.ToLower(key)] = value
			}
		}
	}
	jsonString, err := json.Marshal(sanitizePayload(payload))
	if err != nil {
		return fmt.Errorf("can't marshal page event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["pages"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"LOCATION",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.URL),
		jsonString,
	); err != nil {
		c.checkError("pages", err)
		return fmt.Errorf("can't append to pages batch: %s", err)
	}
	if err := c.InsertAutocomplete(session, "LOCATION", url.DiscardURLQuery(path)); err != nil {
		c.checkError("autocomplete", err)
	}
	return c.InsertAutocomplete(session, "REFERRER", url.DiscardURLQuery(msg.Referrer))
}

func (c *connectorImpl) InsertWebClickEvent(session *sessions.Session, msg *messages.MouseClick) error {
	if msg.Label == "" {
		return nil
	}
	var nX *float32 = nil
	var nY *float32 = nil
	if msg.NormalizedX != 101 && msg.NormalizedY != 101 {
		// To support previous versions of tracker
		if msg.NormalizedX <= 100 && msg.NormalizedY <= 100 {
			msg.NormalizedX *= 100
			msg.NormalizedY *= 100
		}
		normalizedX := float32(msg.NormalizedX) / 100.0
		normalizedY := float32(msg.NormalizedY) / 100.0
		nXVal := normalizedX
		nX = &nXVal
		nYVal := normalizedY
		nY = &nYVal
	}
	host, path, hostpath, err := extractUrlParts(msg.Url)
	if err != nil {
		return fmt.Errorf("can't extract url parts: %s", err)
	}
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"label":            msg.Label,
		"hesitation_time":  nullableUint32(uint32(msg.HesitationTime)),
		"selector":         msg.Selector,
		"normalized_x":     nX,
		"normalized_y":     nY,
		"url":              cropString(msg.Url),
		"url_host":         host,
		"url_path":         path,
		"url_hostpath":     hostpath,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
		"page_title":       strings.TrimSpace(msg.PageTitle),
	}))
	if err != nil {
		return fmt.Errorf("can't marshal click event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["clicks"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"CLICK",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.Url),
		jsonString,
	); err != nil {
		c.checkError("clicks", err)
		return fmt.Errorf("can't append to clicks batch: %s", err)
	}
	return c.InsertAutocomplete(session, "CLICK", msg.Label)
}

func (c *connectorImpl) InsertWebJSException(session *sessions.Session, msg *messages.JSException) error {
	msgID, _ := types.GenerateID(msg, session.ProjectID)
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"source":           types.JsExceptionType,
		"name":             nullableString(msg.Name),
		"message":          msg.Message,
		"payload":          msg.Payload,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
		"page_title":       strings.TrimSpace(msg.PageTitle),
	}))
	if err != nil {
		return fmt.Errorf("can't marshal error event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["errors"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		types.GenerateUUID(msg, session.SessionID),
		"ERROR",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.Url),
		msgID,
		jsonString,
	); err != nil {
		c.checkError("errors", err)
		return fmt.Errorf("can't append to errors batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebPerformanceTrackAggr(session *sessions.Session, msg *messages.PerformanceTrackAggr) error {
	var timestamp = (msg.TimestampStart + msg.TimestampEnd) / 2
	host, path, hostpath, err := extractUrlParts(msg.Url)
	if err != nil {
		return fmt.Errorf("can't extract url parts: %s", err)
	}
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"url":                    cropString(msg.Url),
		"url_host":               host,
		"url_path":               path,
		"url_hostpath":           hostpath,
		"min_fps":                uint8(msg.MinFPS),
		"avg_fps":                uint8(msg.AvgFPS),
		"max_fps":                uint8(msg.MaxFPS),
		"min_cpu":                uint8(msg.MinCPU),
		"avg_cpu":                uint8(msg.AvgCPU),
		"max_cpu":                uint8(msg.MaxCPU),
		"min_total_js_heap_size": msg.MinTotalJSHeapSize,
		"avg_total_js_heap_size": msg.AvgTotalJSHeapSize,
		"max_total_js_heap_size": msg.MaxTotalJSHeapSize,
		"min_used_js_heap_size":  msg.MinUsedJSHeapSize,
		"avg_used_js_heap_size":  msg.AvgUsedJSHeapSize,
		"max_used_js_heap_size":  msg.MaxUsedJSHeapSize,
		"user_device":            session.UserDevice,
		"user_device_type":       session.UserDeviceType,
		"page_title":             strings.TrimSpace(msg.PageTitle),
	}))
	if err != nil {
		return fmt.Errorf("can't marshal performance event: %s", err)
	}
	eventTime := datetime(timestamp)
	if err := c.batches["performance"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"PERFORMANCE",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.Url),
		jsonString,
	); err != nil {
		c.checkError("performance", err)
		return fmt.Errorf("can't append to performance batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertRequest(session *sessions.Session, msg *messages.NetworkRequest, savePayload bool) error {
	urlMethod := url.EnsureMethod(msg.Method)
	if urlMethod == "" {
		return fmt.Errorf("can't parse http method. sess: %d, method: %s", session.SessionID, msg.Method)
	}
	var request, response *string
	if savePayload {
		request = &msg.Request
		response = &msg.Response
	}
	host, path, hostpath, err := extractUrlParts(msg.URL)
	if err != nil {
		return fmt.Errorf("can't extract url parts: %s", err)
	}
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"request_body":     request,
		"response_body":    response,
		"status":           uint16(msg.Status),
		"method":           url.EnsureMethod(msg.Method),
		"success":          msg.Status < 400,
		"transfer_size":    uint32(msg.TransferredBodySize),
		"url":              cropString(msg.URL),
		"url_host":         host,
		"url_path":         path,
		"url_hostpath":     hostpath,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
		"page_title":       strings.TrimSpace(msg.PageTitle),
	}))
	if err != nil {
		return fmt.Errorf("can't marshal request event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["requests"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"REQUEST",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.URL),
		nullableUint16(msToSeconds(msg.Duration)),
		jsonString,
	); err != nil {
		c.checkError("requests", err)
		return fmt.Errorf("can't append to requests batch: %s", err)
	}
	return c.InsertAutocomplete(session, "REQUEST", path)
}

func (c *connectorImpl) InsertCustom(session *sessions.Session, msg *messages.CustomEvent) error {
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
		"page_title":       strings.TrimSpace(msg.PageTitle),
	}))
	if err != nil {
		return fmt.Errorf("can't marshal custom event: %s", err)
	}
	customPayload := make(map[string]interface{})
	if err := json.Unmarshal([]byte(msg.Payload), &customPayload); err != nil {
		log.Printf("can't unmarshal custom event payload into object: %s", err)
		customPayload = map[string]interface{}{
			"payload": msg.Payload,
		}
	}
	customPayloadString, err := json.Marshal(customPayload)
	if err != nil {
		log.Printf("can't marshal custom event payload into object: %s", err)
	}

	eventTime := datetime(msg.Timestamp)
	if err := c.batches["custom"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		msg.Name,
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		false,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.Url),
		jsonString,          // $properties
		customPayloadString, // properties
	); err != nil {
		c.checkError("custom", err)
		return fmt.Errorf("can't append to custom batch: %s", err)
	}
	return c.InsertAutocomplete(session, "CUSTOM", msg.Name)
}

func (c *connectorImpl) InsertGraphQL(session *sessions.Session, msg *messages.GraphQL) error {
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"name":             msg.OperationName,
		"request_body":     nullableString(msg.Variables),
		"response_body":    nullableString(msg.Response),
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
		"page_title":       strings.TrimSpace(msg.PageTitle),
	}))
	if err != nil {
		return fmt.Errorf("can't marshal graphql event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["graphql"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"GRAPHQL",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.Url),
		jsonString,
	); err != nil {
		c.checkError("graphql", err)
		return fmt.Errorf("can't append to graphql batch: %s", err)
	}
	return c.InsertAutocomplete(session, "GRAPHQL", msg.OperationName)
}

func (c *connectorImpl) InsertIncident(session *sessions.Session, msg *messages.Incident) error {
	fakeMsg := &messages.IssueEvent{
		Type: types.IncidentType,
	}
	issueID := hashid.IssueID(session.ProjectID, fakeMsg)
	host, path, hostpath, err := extractUrlParts(msg.Url)
	if err != nil {
		return fmt.Errorf("can't extract url parts: %s", err)
	}
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"issue_type":       fakeMsg.Type,
		"url":              cropString(msg.Url),
		"url_host":         host,
		"url_path":         path,
		"url_hostpath":     hostpath,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
		"page_title":       strings.TrimSpace(msg.PageTitle),
		"label":            msg.Label,
		"start_time":       msg.StartTime,
		"end_time":         msg.EndTime,
	}))
	if err != nil {
		return fmt.Errorf("can't marshal issue event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["issuesEvents"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"ISSUE",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.Url),
		fakeMsg.Type,
		issueID,
		jsonString,
	); err != nil {
		c.checkError("issuesEvents", err)
		return fmt.Errorf("can't append to issuesEvents batch: %s", err)
	}
	if err := c.batches["issues"].Append(
		uint16(session.ProjectID),
		issueID,
		fakeMsg.Type,
		fakeMsg.ContextString,
	); err != nil {
		c.checkError("issues", err)
		return fmt.Errorf("can't append to issues batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertTagTrigger(session *sessions.Session, msg *messages.TagTrigger) error {
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"tag_id": msg.TagId,
	}))
	if err != nil {
		return fmt.Errorf("can't marshal tagTriggers event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["tagTriggers"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"TAG_TRIGGER",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		session.UserOS,
		session.UserBrowser,
		session.Referrer,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		cropString(msg.Url),
		jsonString,
	); err != nil {
		c.checkError("tagTriggers", err)
		return fmt.Errorf("can't append to tagTriggers batch: %s", err)
	}
	return nil
}

// Mobile events

func (c *connectorImpl) InsertMobileSession(session *sessions.Session) error {
	if session.Duration == nil {
		return errors.New("trying to insert mobile session with nil duration")
	}
	if err := c.batches["mobile_sessions"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		session.UserID,
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		session.UserState,
		session.UserCity,
		datetime(session.Timestamp),
		uint32(*session.Duration),
		uint16(session.PagesCount),
		uint16(session.EventsCount),
		uint16(session.ErrorsCount),
		session.Referrer,
		session.IssueTypes,
		session.TrackerVersion,
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		session.Metadata1,
		session.Metadata2,
		session.Metadata3,
		session.Metadata4,
		session.Metadata5,
		session.Metadata6,
		session.Metadata7,
		session.Metadata8,
		session.Metadata9,
		session.Metadata10,
		"mobile",
		session.Timezone,
	); err != nil {
		c.checkError("mobile_sessions", err)
		return fmt.Errorf("can't append to sessions batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileCustom(session *sessions.Session, msg *messages.MobileEvent) error {
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"name":             msg.Name,
		"payload":          msg.Payload,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
	}))
	if err != nil {
		return fmt.Errorf("can't marshal mobile custom event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["mobile_custom"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"CUSTOM",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		jsonString,
	); err != nil {
		c.checkError("mobile_custom", err)
		return fmt.Errorf("can't append to mobile custom batch: %s", err)
	}
	return c.InsertAutocomplete(session, "CUSTOMMOBILE", msg.Name)
}

func (c *connectorImpl) InsertMobileClick(session *sessions.Session, msg *messages.MobileClickEvent) error {
	if msg.Label == "" {
		return nil
	}
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"label":            msg.Label,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
	}))
	if err != nil {
		return fmt.Errorf("can't marshal mobile clicks event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["mobile_clicks"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"TAP",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		jsonString,
	); err != nil {
		c.checkError("mobile_clicks", err)
		return fmt.Errorf("can't append to mobile clicks batch: %s", err)
	}
	return c.InsertAutocomplete(session, "CLICKMOBILE", msg.Label)
}

func (c *connectorImpl) InsertMobileSwipe(session *sessions.Session, msg *messages.MobileSwipeEvent) error {
	if msg.Label == "" {
		return nil
	}
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"label":            msg.Label,
		"direction":        nullableString(msg.Direction),
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
	}))
	if err != nil {
		return fmt.Errorf("can't marshal mobile swipe event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["mobile_swipes"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"SWIPE",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		jsonString,
	); err != nil {
		c.checkError("mobile_swipes", err)
		return fmt.Errorf("can't append to mobile swipe batch: %s", err)
	}
	return c.InsertAutocomplete(session, "SWIPEMOBILE", msg.Label)
}

func (c *connectorImpl) InsertMobileInput(session *sessions.Session, msg *messages.MobileInputEvent) error {
	if msg.Label == "" {
		return nil
	}
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"label":            msg.Label,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
	}))
	if err != nil {
		return fmt.Errorf("can't marshal mobile input event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["mobile_inputs"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"INPUT",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		jsonString,
	); err != nil {
		c.checkError("mobile_inputs", err)
		return fmt.Errorf("can't append to mobile inputs batch: %s", err)
	}
	return c.InsertAutocomplete(session, "INPUTMOBILE", msg.Label)
}

func (c *connectorImpl) InsertMobileRequest(session *sessions.Session, msg *messages.MobileNetworkCall, savePayload bool) error {
	urlMethod := url.EnsureMethod(msg.Method)
	if urlMethod == "" {
		return fmt.Errorf("can't parse http method. sess: %d, method: %s", session.SessionID, msg.Method)
	}
	var request, response *string
	if savePayload {
		request = &msg.Request
		response = &msg.Response
	}
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"url":              cropString(msg.URL),
		"request_body":     request,
		"response_body":    response,
		"status":           uint16(msg.Status),
		"method":           url.EnsureMethod(msg.Method),
		"duration":         uint16(msg.Duration),
		"success":          msg.Status < 400,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
	}))
	if err != nil {
		return fmt.Errorf("can't marshal mobile request event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["mobile_requests"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"REQUEST",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		jsonString,
	); err != nil {
		c.checkError("mobile_requests", err)
		return fmt.Errorf("can't append to mobile requests batch: %s", err)
	}
	return c.InsertAutocomplete(session, "REQUESTMOBILE", url.DiscardURLQuery(msg.URL))
}

func (c *connectorImpl) InsertMobileCrash(session *sessions.Session, msg *messages.MobileCrash) error {
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"name":             msg.Name,
		"reason":           msg.Reason,
		"stacktrace":       msg.Stacktrace,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
	}))
	if err != nil {
		return fmt.Errorf("can't marshal mobile crash event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["mobile_crashes"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"CRASH",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		jsonString,
	); err != nil {
		c.checkError("mobile_crashes", err)
		return fmt.Errorf("can't append to mobile crashs batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileIssue(session *sessions.Session, msg *messages.MobileIssueEvent) error {
	jsonString, err := json.Marshal(sanitizePayload(map[string]interface{}{
		"context_string":   msg.ContextString,
		"context":          msg.Context,
		"payload":          msg.Payload,
		"user_device":      session.UserDevice,
		"user_device_type": session.UserDeviceType,
	}))
	if err != nil {
		return fmt.Errorf("can't marshal mobile issue event: %s", err)
	}
	eventTime := datetime(msg.Timestamp)
	if err := c.batches["mobile_issues"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		getUUID(msg),
		"ISSUE",
		eventTime,
		eventTime.Unix(),
		session.UserUUID,
		true,
		session.Platform,
		session.UserOSVersion,
		jsonString,
	); err != nil {
		c.checkError("mobile_issues", err)
		return fmt.Errorf("can't append to mobile issue batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) checkError(name string, err error) {
	if !errors.Is(err, clickhouse.ErrBatchAlreadySent) {
		log.Printf("can't create %s batch after failed append operation: %s", name, err)
	}
}

func extractUrlParts(fullUrl string) (string, string, string, error) {
	host, path, query, err := url.GetURLParts(strings.ToLower(fullUrl))
	if err != nil {
		return "", "", "", err
	}
	pathQuery := path
	if query != "" {
		pathQuery += "?" + query
	}
	return cropString(host), cropString(pathQuery), cropString(host + pathQuery), nil
}

func getUUID(m messages.Message) string {
	hash := fnv.New128a()
	hash.Write(uint64ToBytes(m.SessionID()))
	hash.Write(uint64ToBytes(m.MsgID()))
	hash.Write(uint64ToBytes(uint64(m.TypeID())))
	if m.MsgID() == 1 && m.Time() == 0 {
		// Temp fix to make an uniq backend message ID
		hash.Write(uint64ToBytes(uint64(time.Now().UnixMilli())))
	}
	uuidObj, err := uuid.FromBytes(hash.Sum(nil))
	if err != nil {
		fmt.Printf("can't create uuid from bytes: %s", err)
		uuidObj = uuid.New()
	}
	return uuidObj.String()
}

func uint64ToBytes(num uint64) []byte {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, num)
	return buf
}

func cropString(s string) string {
	if len(s) > 8000 {
		return s[:8000]
	}
	return s
}
