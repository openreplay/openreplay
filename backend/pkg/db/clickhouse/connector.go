package clickhouse

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"hash/fnv"
	"log"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/url"
)

type Connector interface {
	Prepare() error
	Commit() error
	Stop() error
	// Web
	InsertWebSession(session *sessions.Session) error
	InsertWebPageEvent(session *sessions.Session, msg *messages.PageEvent) error
	InsertWebClickEvent(session *sessions.Session, msg *messages.MouseClick) error
	InsertWebErrorEvent(session *sessions.Session, msg *types.ErrorEvent) error
	InsertWebPerformanceTrackAggr(session *sessions.Session, msg *messages.PerformanceTrackAggr) error
	InsertAutocomplete(session *sessions.Session, msgType, msgValue string) error
	InsertRequest(session *sessions.Session, msg *messages.NetworkRequest, savePayload bool) error
	InsertCustom(session *sessions.Session, msg *messages.CustomEvent) error
	InsertGraphQL(session *sessions.Session, msg *messages.GraphQL) error
	InsertIssue(session *sessions.Session, msg *messages.IssueEvent) error
	InsertWebInputDuration(session *sessions.Session, msg *messages.InputChange) error
	InsertMouseThrashing(session *sessions.Session, msg *messages.MouseThrashing) error
	// Mobile
	InsertMobileSession(session *sessions.Session) error
	InsertMobileCustom(session *sessions.Session, msg *messages.MobileEvent) error
	InsertMobileClick(session *sessions.Session, msg *messages.MobileClickEvent) error
	InsertMobileSwipe(session *sessions.Session, msg *messages.MobileSwipeEvent) error
	InsertMobileInput(session *sessions.Session, msg *messages.MobileInputEvent) error
	InsertMobileRequest(session *sessions.Session, msg *messages.MobileNetworkCall, savePayload bool) error
	InsertMobileCrash(session *sessions.Session, msg *messages.MobileCrash) error
}

type task struct {
	bulks []Bulk
}

func NewTask() *task {
	return &task{bulks: make([]Bulk, 0, 21)}
}

type connectorImpl struct {
	conn       driver.Conn
	batches    map[string]Bulk //driver.Batch
	workerTask chan *task
	done       chan struct{}
	finished   chan struct{}
}

func NewConnector(cfg common.Clickhouse) Connector {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{cfg.GetTrimmedURL()},
		Auth: clickhouse.Auth{
			Database: cfg.Database,
			Username: cfg.LegacyUserName,
			Password: cfg.LegacyPassword,
		},
		MaxOpenConns:    20,
		MaxIdleConns:    15,
		ConnMaxLifetime: 3 * time.Minute,
		Compression: &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		},
	})
	if err != nil {
		log.Fatal(err)
	}

	c := &connectorImpl{
		conn:       conn,
		batches:    make(map[string]Bulk, 20),
		workerTask: make(chan *task, 1),
		done:       make(chan struct{}),
		finished:   make(chan struct{}),
	}
	go c.worker()
	return c
}

func (c *connectorImpl) newBatch(name, query string) error {
	batch, err := NewBulk(c.conn, name, query)
	if err != nil {
		return fmt.Errorf("can't create new batch: %s", err)
	}
	c.batches[name] = batch
	return nil
}

var batches = map[string]string{
	// Sessions
	"sessions":      "INSERT INTO experimental.sessions (session_id, project_id, user_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, user_state, user_city, datetime, duration, pages_count, events_count, errors_count, issue_score, referrer, issue_types, tracker_version, user_browser, user_browser_version, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10, timezone, utm_source, utm_medium, utm_campaign) VALUES (?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), ?, ?, ?, ?)",
	"autocompletes": "INSERT INTO experimental.autocomplete (project_id, type, value) VALUES (?, ?, SUBSTR(?, 1, 8000))",
	// Web events
	"pages":        `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"clicks":       `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"inputs":       `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"errors":       `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"performance":  `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"requests":     `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"custom":       `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"graphql":      `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"issuesEvents": `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, issue_type, issue_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	"issues":       "INSERT INTO experimental.issues (project_id, issue_id, type, context_string) VALUES (?, ?, ?, ?)",
	//Mobile
	"ios_sessions": "INSERT INTO experimental.sessions (session_id, project_id, user_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, user_state, user_city, datetime, duration, pages_count, events_count, errors_count, issue_score, referrer, issue_types, tracker_version, user_browser, user_browser_version, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10, platform, timezone) VALUES (?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), ?, ?)",
	"ios_custom":   `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"ios_clicks":   `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"ios_swipes":   `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"ios_inputs":   `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"ios_requests": `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
	"ios_crashes":  `INSERT INTO product_analytics.events (session_id, project_id, event_id, "$event_name", created_at, distinct_id, "$properties") VALUES (?, ?, ?, ?, ?, ?, ?)`,
}

func (c *connectorImpl) Prepare() error {
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
	c.batches = make(map[string]Bulk, 20)
	if err := c.Prepare(); err != nil {
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
	fmt.Printf("sending bulks")
	for _, b := range t.bulks {
		if err := b.Send(); err != nil {
			log.Printf("can't send batch: %s", err)
		}
	}
	fmt.Printf("sent bulks")
}

func (c *connectorImpl) worker() {
	for {
		select {
		case t := <-c.workerTask:
			c.sendBulks(t)
		case <-c.done:
			fmt.Printf("done")
			for t := range c.workerTask {
				c.sendBulks(t)
			}
			c.finished <- struct{}{}
			return
		}
	}
}

func (c *connectorImpl) InsertWebSession(session *sessions.Session) error {
	if session.Duration == nil {
		return errors.New("trying to insert session with nil duration")
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
		uint32(session.IssueScore),
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
		session.Timezone,
		session.UtmSource,
		session.UtmMedium,
		session.UtmCampaign,
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

func (c *connectorImpl) InsertWebInputDuration(session *sessions.Session, msg *messages.InputChange) error {
	if msg.Label == "" {
		return nil
	}
	jsonString, err := json.Marshal(map[string]interface{}{
		"label":           msg.Label,
		"duration":        nullableUint16(uint16(msg.InputDuration)),
		"hesitation_time": nullableUint32(uint32(msg.HesitationTime)),
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["inputs"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"INPUT",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("inputs", err)
		return fmt.Errorf("can't append to inputs batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMouseThrashing(session *sessions.Session, msg *messages.MouseThrashing) error {
	issueID := hashid.MouseThrashingID(session.ProjectID, session.SessionID, msg.Timestamp)
	jsonString, err := json.Marshal(map[string]interface{}{
		"issue_id":   issueID,
		"issue_type": "mouse_thrashing",
		"url":        msg.Url,
		"url_path":   extractUrlPath(msg.Url),
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["issuesEvents"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"ISSUE",
		datetime(msg.Timestamp),
		session.UserUUID,
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
	jsonString, err := json.Marshal(map[string]interface{}{
		"issue_id":   issueID,
		"issue_type": msg.Type,
		"url":        msg.Url,
		"url_path":   extractUrlPath(msg.Url),
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["issuesEvents"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"ISSUE",
		datetime(msg.Timestamp),
		session.UserUUID,
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
	jsonString, err := json.Marshal(map[string]interface{}{
		"url":                            msg.URL,
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
		"url_path":                       extractUrlPath(msg.URL),
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["pages"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"LOCATION",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("pages", err)
		return fmt.Errorf("can't append to pages batch: %s", err)
	}
	return nil
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
	jsonString, err := json.Marshal(map[string]interface{}{
		"label":           msg.Label,
		"hesitation_time": nullableUint32(uint32(msg.HesitationTime)),
		"selector":        msg.Selector,
		"normalized_x":    nX,
		"normalized_y":    nY,
		"url":             msg.Url,
		"url_path":        extractUrlPath(msg.Url),
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["clicks"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"CLICK",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("clicks", err)
		return fmt.Errorf("can't append to clicks batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebErrorEvent(session *sessions.Session, msg *types.ErrorEvent) error {
	keys, values := make([]string, 0, len(msg.Tags)), make([]*string, 0, len(msg.Tags))
	for k, v := range msg.Tags {
		keys = append(keys, k)
		values = append(values, v)
	}
	// Check error source before insert to avoid panic from clickhouse lib
	switch msg.Source {
	case "js_exception", "bugsnag", "cloudwatch", "datadog", "elasticsearch", "newrelic", "rollbar", "sentry", "stackdriver", "sumologic":
	default:
		return fmt.Errorf("unknown error source: %s", msg.Source)
	}
	msgID, _ := msg.ID(session.ProjectID)
	jsonString, err := json.Marshal(map[string]interface{}{
		"source":            msg.Source,
		"name":              nullableString(msg.Name),
		"message":           msg.Message,
		"error_id":          msgID,
		"error_tags_keys":   keys,
		"error_tags_values": values,
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["errors"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.GetUUID(session.SessionID),
		"ERROR",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("errors", err)
		return fmt.Errorf("can't append to errors batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebPerformanceTrackAggr(session *sessions.Session, msg *messages.PerformanceTrackAggr) error {
	var timestamp uint64 = (msg.TimestampStart + msg.TimestampEnd) / 2
	jsonString, err := json.Marshal(map[string]interface{}{
		"url":                    nullableString(msg.Meta().Url),
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
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["performance"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"PERFORMANCE",
		datetime(timestamp),
		session.UserUUID,
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
	jsonString, err := json.Marshal(map[string]interface{}{
		"url":           msg.URL,
		"request_body":  request,
		"response_body": response,
		"status":        uint16(msg.Status),
		"method":        url.EnsureMethod(msg.Method),
		"duration":      uint16(msg.Duration),
		"success":       msg.Status < 400,
		"transfer_size": uint32(msg.TransferredBodySize),
		"url_path":      extractUrlPath(msg.URL),
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["requests"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"REQUEST",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("requests", err)
		return fmt.Errorf("can't append to requests batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertCustom(session *sessions.Session, msg *messages.CustomEvent) error {
	jsonString, err := json.Marshal(map[string]interface{}{
		"name":    msg.Name,
		"payload": msg.Payload,
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["custom"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"CUSTOM",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("custom", err)
		return fmt.Errorf("can't append to custom batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertGraphQL(session *sessions.Session, msg *messages.GraphQL) error {
	jsonString, err := json.Marshal(map[string]interface{}{
		"name":          msg.OperationName,
		"request_body":  nullableString(msg.Variables),
		"response_body": nullableString(msg.Response),
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["graphql"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"GRAPHQL",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("graphql", err)
		return fmt.Errorf("can't append to graphql batch: %s", err)
	}
	return nil
}

// Mobile events

func (c *connectorImpl) InsertMobileSession(session *sessions.Session) error {
	if session.Duration == nil {
		return errors.New("trying to insert mobile session with nil duration")
	}
	if err := c.batches["ios_sessions"].Append(
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
		uint32(session.IssueScore),
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
		"ios",
		session.Timezone,
	); err != nil {
		c.checkError("ios_sessions", err)
		return fmt.Errorf("can't append to sessions batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileCustom(session *sessions.Session, msg *messages.MobileEvent) error {
	jsonString, err := json.Marshal(map[string]interface{}{
		"name":    msg.Name,
		"payload": msg.Payload,
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["ios_custom"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"CUSTOM",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("ios_custom", err)
		return fmt.Errorf("can't append to mobile custom batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileClick(session *sessions.Session, msg *messages.MobileClickEvent) error {
	if msg.Label == "" {
		return nil
	}
	jsonString, err := json.Marshal(map[string]interface{}{
		"label": msg.Label,
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["ios_clicks"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"TAP",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("ios_clicks", err)
		return fmt.Errorf("can't append to mobile clicks batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileSwipe(session *sessions.Session, msg *messages.MobileSwipeEvent) error {
	if msg.Label == "" {
		return nil
	}
	jsonString, err := json.Marshal(map[string]interface{}{
		"label":     msg.Label,
		"direction": nullableString(msg.Direction),
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["ios_swipes"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"SWIPE",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("ios_clicks", err)
		return fmt.Errorf("can't append to mobile clicks batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileInput(session *sessions.Session, msg *messages.MobileInputEvent) error {
	if msg.Label == "" {
		return nil
	}
	jsonString, err := json.Marshal(map[string]interface{}{
		"label": msg.Label,
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["ios_inputs"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"INPUT",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("ios_inputs", err)
		return fmt.Errorf("can't append to mobile inputs batch: %s", err)
	}
	return nil
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
	jsonString, err := json.Marshal(map[string]interface{}{
		"url":           msg.URL,
		"request_body":  request,
		"response_body": response,
		"status":        uint16(msg.Status),
		"method":        url.EnsureMethod(msg.Method),
		"duration":      uint16(msg.Duration),
		"success":       msg.Status < 400,
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["ios_requests"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"REQUEST",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("ios_requests", err)
		return fmt.Errorf("can't append to mobile requests batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileCrash(session *sessions.Session, msg *messages.MobileCrash) error {
	jsonString, err := json.Marshal(map[string]interface{}{
		"name":       msg.Name,
		"reason":     msg.Reason,
		"stacktrace": msg.Stacktrace,
	})
	if err != nil {
		return fmt.Errorf("can't marshal input event: %s", err)
	}
	if err := c.batches["ios_crashes"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		GetUUID(msg),
		"CRASH",
		datetime(msg.Timestamp),
		session.UserUUID,
		jsonString,
	); err != nil {
		c.checkError("ios_crashes", err)
		return fmt.Errorf("can't append to mobile crashges batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) checkError(name string, err error) {
	if err != clickhouse.ErrBatchAlreadySent {
		log.Printf("can't create %s batch after failed append operation: %s", name, err)
	}
}

func extractUrlPath(fullUrl string) string {
	_, path, query, err := url.GetURLParts(fullUrl)
	if err != nil {
		log.Printf("can't parse url: %s", err)
		return ""
	}
	pathQuery := path
	if query != "" {
		pathQuery += "?" + query
	}
	return strings.ToLower(pathQuery)
}

func GetUUID(m messages.Message) string {
	hash := fnv.New128a()
	hash.Write(Uint64ToBytes(m.SessionID()))
	hash.Write(Uint64ToBytes(m.MsgID()))
	hash.Write(Uint64ToBytes(uint64(m.TypeID())))
	uuidObj, err := uuid.FromBytes(hash.Sum(nil))
	if err != nil {
		fmt.Printf("can't create uuid from bytes: %s", err)
		uuidObj = uuid.New()
	}
	return uuidObj.String()
}

func Uint64ToBytes(num uint64) []byte {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, num)
	return buf
}
