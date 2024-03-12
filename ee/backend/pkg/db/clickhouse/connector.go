package clickhouse

import (
	"errors"
	"fmt"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"log"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/url"
	"os"
	"strings"
	"time"

	"openreplay/backend/pkg/license"
)

type Connector interface {
	Prepare() error
	Commit() error
	Stop() error
	// Web
	InsertWebSession(session *sessions.Session) error
	InsertWebResourceEvent(session *sessions.Session, msg *messages.ResourceTiming) error
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
	InsertMobileCustom(session *sessions.Session, msg *messages.IOSEvent) error
	InsertMobileClick(session *sessions.Session, msg *messages.IOSClickEvent) error
	InsertMobileSwipe(session *sessions.Session, msg *messages.IOSSwipeEvent) error
	InsertMobileInput(session *sessions.Session, msg *messages.IOSInputEvent) error
	InsertMobileRequest(session *sessions.Session, msg *messages.IOSNetworkCall, savePayload bool) error
	InsertMobileCrash(session *sessions.Session, msg *messages.IOSCrash) error
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

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func NewConnector(url string) Connector {
	license.CheckLicense()
	url = strings.TrimPrefix(url, "tcp://")
	url = strings.TrimSuffix(url, "/default")
	userName := getEnv("CH_USERNAME", "default")
	password := getEnv("CH_PASSWORD", "")
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{url},
		Auth: clickhouse.Auth{
			Database: "default",
			Username: userName,
			Password: password,
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
	// Web
	"sessions":      "INSERT INTO experimental.sessions (session_id, project_id, user_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, user_state, user_city, datetime, duration, pages_count, events_count, errors_count, issue_score, referrer, issue_types, tracker_version, user_browser, user_browser_version, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10, timezone) VALUES (?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), ?)",
	"resources":     "INSERT INTO experimental.resources (session_id, project_id, message_id, datetime, url, type, duration, ttfb, header_size, encoded_body_size, decoded_body_size, success) VALUES (?, ?, ?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?)",
	"autocompletes": "INSERT INTO experimental.autocomplete (project_id, type, value) VALUES (?, ?, SUBSTR(?, 1, 8000))",
	"pages":         "INSERT INTO experimental.events (session_id, project_id, message_id, datetime, url, request_start, response_start, response_end, dom_content_loaded_event_start, dom_content_loaded_event_end, load_event_start, load_event_end, first_paint, first_contentful_paint_time, speed_index, visually_complete, time_to_interactive, event_type) VALUES (?, ?, ?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"clicks":        "INSERT INTO experimental.events (session_id, project_id, message_id, datetime, label, hesitation_time, event_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
	"inputs":        "INSERT INTO experimental.events (session_id, project_id, message_id, datetime, label, event_type, duration, hesitation_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
	"errors":        "INSERT INTO experimental.events (session_id, project_id, message_id, datetime, source, name, message, error_id, event_type, error_tags_keys, error_tags_values) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"performance":   "INSERT INTO experimental.events (session_id, project_id, message_id, datetime, url, min_fps, avg_fps, max_fps, min_cpu, avg_cpu, max_cpu, min_total_js_heap_size, avg_total_js_heap_size, max_total_js_heap_size, min_used_js_heap_size, avg_used_js_heap_size, max_used_js_heap_size, event_type) VALUES (?, ?, ?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"requests":      "INSERT INTO experimental.events (session_id, project_id, message_id, datetime, url, request_body, response_body, status, method, duration, success, event_type, transfer_size) VALUES (?, ?, ?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?, ?)",
	"custom":        "INSERT INTO experimental.events (session_id, project_id, message_id, datetime, name, payload, event_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
	"graphql":       "INSERT INTO experimental.events (session_id, project_id, message_id, datetime, name, request_body, response_body, event_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
	"issuesEvents":  "INSERT INTO experimental.events (session_id, project_id, message_id, datetime, issue_id, issue_type, event_type, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
	"issues":        "INSERT INTO experimental.issues (project_id, issue_id, type, context_string) VALUES (?, ?, ?, ?)",
	//Mobile
	"ios_sessions": "INSERT INTO experimental.sessions (session_id, project_id, user_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, user_state, user_city, datetime, duration, pages_count, events_count, errors_count, issue_score, referrer, issue_types, tracker_version, user_browser, user_browser_version, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10, platform, timezone) VALUES (?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), SUBSTR(?, 1, 8000), ?, ?)",
	"ios_custom":   "INSERT INTO experimental.ios_events (session_id, project_id, message_id, datetime, name, payload, event_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
	"ios_clicks":   "INSERT INTO experimental.ios_events (session_id, project_id, message_id, datetime, label, event_type) VALUES (?, ?, ?, ?, ?, ?)",
	"ios_swipes":   "INSERT INTO experimental.ios_events (session_id, project_id, message_id, datetime, label, direction, event_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
	"ios_inputs":   "INSERT INTO experimental.ios_events (session_id, project_id, message_id, datetime, label, event_type) VALUES (?, ?, ?, ?, ?, ?)",
	"ios_requests": "INSERT INTO experimental.ios_events (session_id, project_id, message_id, datetime, url, request_body, response_body, status, method, duration, success, event_type) VALUES (?, ?, ?, ?, SUBSTR(?, 1, 8000), ?, ?, ?, ?, ?, ?, ?)",
	"ios_crashes":  "INSERT INTO experimental.ios_events (session_id, project_id, message_id, datetime, name, reason, stacktrace, event_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
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

func (c *connectorImpl) checkError(name string, err error) {
	if err != clickhouse.ErrBatchAlreadySent {
		log.Printf("can't create %s batch after failed append operation: %s", name, err)
	}
}

func (c *connectorImpl) InsertWebInputDuration(session *sessions.Session, msg *messages.InputChange) error {
	if msg.Label == "" {
		return nil
	}
	if err := c.batches["inputs"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.MsgID(),
		datetime(msg.Timestamp),
		msg.Label,
		"INPUT",
		nullableUint16(uint16(msg.InputDuration)),
		nullableUint32(uint32(msg.HesitationTime)),
	); err != nil {
		c.checkError("inputs", err)
		return fmt.Errorf("can't append to inputs batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMouseThrashing(session *sessions.Session, msg *messages.MouseThrashing) error {
	issueID := hashid.MouseThrashingID(session.ProjectID, session.SessionID, msg.Timestamp)
	// Insert issue event to batches
	if err := c.batches["issuesEvents"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.MsgID(),
		datetime(msg.Timestamp),
		issueID,
		"mouse_thrashing",
		"ISSUE",
		msg.Url,
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
	case "click_rage", "dead_click", "excessive_scrolling", "bad_request", "missing_resource", "memory", "cpu", "slow_resource", "slow_page_load", "crash", "ml_cpu", "ml_memory", "ml_dead_click", "ml_click_rage", "ml_mouse_thrashing", "ml_excessive_scrolling", "ml_slow_resources", "custom", "js_exception", "mouse_thrashing":
	default:
		return fmt.Errorf("unknown issueType: %s", msg.Type)
	}
	// Insert issue event to batches
	if err := c.batches["issuesEvents"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.MessageID,
		datetime(msg.Timestamp),
		issueID,
		msg.Type,
		"ISSUE",
		msg.URL,
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
	); err != nil {
		c.checkError("sessions", err)
		return fmt.Errorf("can't append to sessions batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebResourceEvent(session *sessions.Session, msg *messages.ResourceTiming) error {
	msgType := url.GetResourceType(msg.Initiator, msg.URL)
	resourceType := url.EnsureType(msgType)
	if resourceType == "" {
		return fmt.Errorf("can't parse resource type, sess: %d, type: %s", session.SessionID, msgType)
	}
	if err := c.batches["resources"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.MsgID(),
		datetime(msg.Timestamp),
		url.DiscardURLQuery(msg.URL),
		msgType,
		nullableUint16(uint16(msg.Duration)),
		nullableUint16(uint16(msg.TTFB)),
		nullableUint16(uint16(msg.HeaderSize)),
		nullableUint32(uint32(msg.EncodedBodySize)),
		nullableUint32(uint32(msg.DecodedBodySize)),
		msg.Duration != 0,
	); err != nil {
		c.checkError("resources", err)
		return fmt.Errorf("can't append to resources batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebPageEvent(session *sessions.Session, msg *messages.PageEvent) error {
	if err := c.batches["pages"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.MessageID,
		datetime(msg.Timestamp),
		msg.URL,
		nullableUint16(uint16(msg.RequestStart)),
		nullableUint16(uint16(msg.ResponseStart)),
		nullableUint16(uint16(msg.ResponseEnd)),
		nullableUint16(uint16(msg.DomContentLoadedEventStart)),
		nullableUint16(uint16(msg.DomContentLoadedEventEnd)),
		nullableUint16(uint16(msg.LoadEventStart)),
		nullableUint16(uint16(msg.LoadEventEnd)),
		nullableUint16(uint16(msg.FirstPaint)),
		nullableUint16(uint16(msg.FirstContentfulPaint)),
		nullableUint16(uint16(msg.SpeedIndex)),
		nullableUint16(uint16(msg.VisuallyComplete)),
		nullableUint16(uint16(msg.TimeToInteractive)),
		"LOCATION",
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
	if err := c.batches["clicks"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.MsgID(),
		datetime(msg.Timestamp),
		msg.Label,
		nullableUint32(uint32(msg.HesitationTime)),
		"CLICK",
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
	// Insert event to batch
	if err := c.batches["errors"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.MessageID,
		datetime(msg.Timestamp),
		msg.Source,
		nullableString(msg.Name),
		msg.Message,
		msg.ID(session.ProjectID),
		"ERROR",
		keys,
		values,
	); err != nil {
		c.checkError("errors", err)
		return fmt.Errorf("can't append to errors batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebPerformanceTrackAggr(session *sessions.Session, msg *messages.PerformanceTrackAggr) error {
	var timestamp uint64 = (msg.TimestampStart + msg.TimestampEnd) / 2
	if err := c.batches["performance"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		uint64(0), // TODO: find messageID for performance events
		datetime(timestamp),
		nullableString(msg.Meta().Url),
		uint8(msg.MinFPS),
		uint8(msg.AvgFPS),
		uint8(msg.MaxFPS),
		uint8(msg.MinCPU),
		uint8(msg.AvgCPU),
		uint8(msg.MaxCPU),
		msg.MinTotalJSHeapSize,
		msg.AvgTotalJSHeapSize,
		msg.MaxTotalJSHeapSize,
		msg.MinUsedJSHeapSize,
		msg.AvgUsedJSHeapSize,
		msg.MaxUsedJSHeapSize,
		"PERFORMANCE",
	); err != nil {
		c.checkError("performance", err)
		return fmt.Errorf("can't append to performance batch: %s", err)
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
	if err := c.batches["requests"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.Meta().Index,
		datetime(uint64(msg.Meta().Timestamp)),
		msg.URL,
		request,
		response,
		uint16(msg.Status),
		url.EnsureMethod(msg.Method),
		uint16(msg.Duration),
		msg.Status < 400,
		"REQUEST",
		uint32(msg.TransferredBodySize),
	); err != nil {
		c.checkError("requests", err)
		return fmt.Errorf("can't append to requests batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertCustom(session *sessions.Session, msg *messages.CustomEvent) error {
	if err := c.batches["custom"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.Meta().Index,
		datetime(uint64(msg.Meta().Timestamp)),
		msg.Name,
		msg.Payload,
		"CUSTOM",
	); err != nil {
		c.checkError("custom", err)
		return fmt.Errorf("can't append to custom batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertGraphQL(session *sessions.Session, msg *messages.GraphQL) error {
	if err := c.batches["graphql"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.Meta().Index,
		datetime(uint64(msg.Meta().Timestamp)),
		msg.OperationName,
		nullableString(msg.Variables),
		nullableString(msg.Response),
		"GRAPHQL",
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

func (c *connectorImpl) InsertMobileCustom(session *sessions.Session, msg *messages.IOSEvent) error {
	if err := c.batches["ios_custom"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.Meta().Index,
		datetime(uint64(msg.Meta().Timestamp)),
		msg.Name,
		msg.Payload,
		"CUSTOM",
	); err != nil {
		c.checkError("ios_custom", err)
		return fmt.Errorf("can't append to mobile custom batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileClick(session *sessions.Session, msg *messages.IOSClickEvent) error {
	if msg.Label == "" {
		return nil
	}
	if err := c.batches["ios_clicks"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.MsgID(),
		datetime(msg.Timestamp),
		msg.Label,
		"TAP",
	); err != nil {
		c.checkError("ios_clicks", err)
		return fmt.Errorf("can't append to mobile clicks batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileSwipe(session *sessions.Session, msg *messages.IOSSwipeEvent) error {
	if msg.Label == "" {
		return nil
	}
	if err := c.batches["ios_swipes"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.MsgID(),
		datetime(msg.Timestamp),
		msg.Label,
		nullableString(msg.Direction),
		"SWIPE",
	); err != nil {
		c.checkError("ios_clicks", err)
		return fmt.Errorf("can't append to mobile clicks batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileInput(session *sessions.Session, msg *messages.IOSInputEvent) error {
	if msg.Label == "" {
		return nil
	}
	if err := c.batches["ios_inputs"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.MsgID(),
		datetime(msg.Timestamp),
		msg.Label,
		"INPUT",
	); err != nil {
		c.checkError("ios_inputs", err)
		return fmt.Errorf("can't append to mobile inputs batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileRequest(session *sessions.Session, msg *messages.IOSNetworkCall, savePayload bool) error {
	urlMethod := url.EnsureMethod(msg.Method)
	if urlMethod == "" {
		return fmt.Errorf("can't parse http method. sess: %d, method: %s", session.SessionID, msg.Method)
	}
	var request, response *string
	if savePayload {
		request = &msg.Request
		response = &msg.Response
	}
	if err := c.batches["ios_requests"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.Meta().Index,
		datetime(uint64(msg.Meta().Timestamp)),
		msg.URL,
		request,
		response,
		uint16(msg.Status),
		url.EnsureMethod(msg.Method),
		uint16(msg.Duration),
		msg.Status < 400,
		"REQUEST",
	); err != nil {
		c.checkError("ios_requests", err)
		return fmt.Errorf("can't append to mobile requests batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertMobileCrash(session *sessions.Session, msg *messages.IOSCrash) error {
	if err := c.batches["ios_crashes"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		msg.MsgID(),
		datetime(msg.Timestamp),
		msg.Name,
		msg.Reason,
		msg.Stacktrace,
		"CRASH",
	); err != nil {
		c.checkError("ios_crashes", err)
		return fmt.Errorf("can't append to mobile crashges batch: %s", err)
	}
	return nil
}
