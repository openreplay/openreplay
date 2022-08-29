package clickhouse

import (
	"context"
	"errors"
	"fmt"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"log"
	"math"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
	"strings"
	"time"

	"openreplay/backend/pkg/license"
)

type Bulk interface {
	Append(args ...interface{}) error
	Send() error
}

type bulkImpl struct {
	conn   driver.Conn
	query  string
	values [][]interface{}
}

func NewBulk(conn driver.Conn, query string) (Bulk, error) {
	switch {
	case conn == nil:
		return nil, errors.New("clickhouse connection is empty")
	case query == "":
		return nil, errors.New("query is empty")
	}
	return &bulkImpl{
		conn:   conn,
		query:  query,
		values: make([][]interface{}, 0),
	}, nil
}

func (b *bulkImpl) Append(args ...interface{}) error {
	b.values = append(b.values, args)
	return nil
}

func (b *bulkImpl) Send() error {
	batch, err := b.conn.PrepareBatch(context.Background(), b.query)
	if err != nil {
		return fmt.Errorf("can't create new batch: %s", err)
	}
	for _, set := range b.values {
		if err := batch.Append(set...); err != nil {
			log.Printf("can't append value set to batch, err: %s", err)
		}
	}
	b.values = make([][]interface{}, 0)
	return batch.Send()
}

var CONTEXT_MAP = map[uint64]string{0: "unknown", 1: "self", 2: "same-origin-ancestor", 3: "same-origin-descendant", 4: "same-origin", 5: "cross-origin-ancestor", 6: "cross-origin-descendant", 7: "cross-origin-unreachable", 8: "multiple-contexts"}
var CONTAINER_TYPE_MAP = map[uint64]string{0: "window", 1: "iframe", 2: "embed", 3: "object"}

type Connector interface {
	Prepare() error
	Commit() error
	FinaliseSessionsTable() error
	InsertWebSession(session *types.Session) error
	InsertWebResourceEvent(session *types.Session, msg *messages.ResourceEvent) error
	InsertWebPageEvent(session *types.Session, msg *messages.PageEvent) error
	InsertWebClickEvent(session *types.Session, msg *messages.ClickEvent) error
	InsertWebInputEvent(session *types.Session, msg *messages.InputEvent) error
	InsertWebErrorEvent(session *types.Session, msg *messages.ErrorEvent) error
	InsertWebPerformanceTrackAggr(session *types.Session, msg *messages.PerformanceTrackAggr) error
	InsertAutocomplete(session *types.Session, msgType, msgValue string) error
	InsertRequest(session *types.Session, msg *messages.FetchEvent) error
	InsertCustom(session *types.Session, msg *messages.CustomEvent) error
	InsertGraphQL(session *types.Session, msg *messages.GraphQLEvent) error
}

type connectorImpl struct {
	conn    driver.Conn
	batches map[string]Bulk //driver.Batch
}

func NewConnector(url string) Connector {
	license.CheckLicense()
	url = strings.TrimPrefix(url, "tcp://")
	url = strings.TrimSuffix(url, "/default")
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{url},
		Auth: clickhouse.Auth{
			Database: "default",
		},
		MaxOpenConns:    20,
		MaxIdleConns:    15,
		ConnMaxLifetime: 3 * time.Minute,
		Compression: &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		},
		// Debug: true,
	})
	if err != nil {
		log.Fatal(err)
	}

	c := &connectorImpl{
		conn:    conn,
		batches: make(map[string]Bulk, 9),
	}
	return c
}

func (c *connectorImpl) newBatch(name, query string) error {
	batch, err := NewBulk(c.conn, query)
	if err != nil {
		return fmt.Errorf("can't create new batch: %s", err)
	}
	c.batches[name] = batch
	return nil
}

/*
TODO:
+. add page_path to performance event (for the performance event, I need the page URL where that event happened
if it is not present in the message, you can extract it from the last page before that performance event)
2. add base_referrer to sessions table (if you check the code that adds page events to PG; it has columns called referrer
and base_referrer; I need these columns in the sessions table in clickhouse)
+. copy autocomplete to Clickhouse
+. add following tables from pg: REQUEST, CUSTOM, GRAPHQL
5. add issue_types to sessions (the same way it exists in PG) -> rewrite session end handler
*/
var batches = map[string]string{
	"sessions":      "INSERT INTO experimental.sessions (session_id, project_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, datetime, duration, pages_count, events_count, errors_count, user_browser, user_browser_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"metadata":      "INSERT INTO experimental.sessions (session_id, user_id, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10, datetime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"resources":     "INSERT INTO experimental.resources (session_id, project_id, datetime, url, type, duration, ttfb, header_size, encoded_body_size, decoded_body_size, success) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"pages":         "INSERT INTO experimental.events (session_id, project_id, datetime, url, request_start, response_start, response_end, dom_content_loaded_event_start, dom_content_loaded_event_end, load_event_start, load_event_end, first_paint, first_contentful_paint_time, speed_index, visually_complete, time_to_interactive, event_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"clicks":        "INSERT INTO experimental.events (session_id, project_id, datetime, label, hesitation_time, event_type) VALUES (?, ?, ?, ?, ?, ?)",
	"inputs":        "INSERT INTO experimental.events (session_id, project_id, datetime, label, event_type) VALUES (?, ?, ?, ?, ?)",
	"errors":        "INSERT INTO experimental.events (session_id, project_id, datetime, source, name, message, error_id, event_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
	"performance":   "INSERT INTO experimental.events (session_id, project_id, datetime, page_path, min_fps, avg_fps, max_fps, min_cpu, avg_cpu, max_cpu, min_total_js_heap_size, avg_total_js_heap_size, max_total_js_heap_size, min_used_js_heap_size, avg_used_js_heap_size, max_used_js_heap_size, event_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"autocompletes": "INSERT INTO experimental.autocomplete (project_id, type, value) VALUES (?, ?, ?)",
	"requests":      "INSERT INTO experimental.events (session_id, project_id, datetime, url, request_body, response_body, status, method, duration, success, event_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"custom":        "INSERT INTO experimental.events (session_id, project_id, datetime, name, payload, event_type) VALUES (?, ?, ?, ?, ?, ?)",
	"graphql":       "INSERT INTO experimental.events (session_id, project_id, datetime, name, request_body, response_body, event_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
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
	for _, b := range c.batches {
		if err := b.Send(); err != nil {
			return fmt.Errorf("can't send batch: %s", err)
		}
	}
	return nil
}

func (c *connectorImpl) FinaliseSessionsTable() error {
	if err := c.conn.Exec(context.Background(), "OPTIMIZE TABLE sessions FINAL"); err != nil {
		return fmt.Errorf("can't finalise sessions table: %s", err)
	}
	return nil
}

func (c *connectorImpl) checkError(name string, err error) {
	if err != clickhouse.ErrBatchAlreadySent {
		//if batchErr := c.newBatch(name, batches[name]); batchErr != nil {
		log.Printf("can't create %s batch after failed append operation: %s", name, err) //batchErr)
		//}
	}
}

func (c *connectorImpl) InsertWebSession(session *types.Session) error {
	if session.Duration == nil {
		return errors.New("trying to insert session with nil duration")
	}
	if err := c.batches["sessions"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(session.Timestamp),
		uint32(*session.Duration),
		uint16(session.PagesCount),
		uint16(session.EventsCount),
		uint16(session.ErrorsCount),
		// Web unique columns
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
	); err != nil {
		c.checkError("sessions", err)
		return fmt.Errorf("can't append to sessions batch: %s", err)
	}
	if err := c.batches["metadata"].Append(
		session.SessionID,
		session.UserID,
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
		datetime(session.Timestamp),
	); err != nil {
		c.checkError("metadata", err)
		return fmt.Errorf("can't append to metadata batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebResourceEvent(session *types.Session, msg *messages.ResourceEvent) error {
	var method interface{} = url.EnsureMethod(msg.Method)
	if method == "" {
		method = nil
	}
	if err := c.batches["resources"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		datetime(msg.Timestamp),
		url.DiscardURLQuery(msg.URL),
		msg.Type,
		nullableUint16(uint16(msg.Duration)),
		nullableUint16(uint16(msg.TTFB)),
		nullableUint16(uint16(msg.HeaderSize)),
		nullableUint32(uint32(msg.EncodedBodySize)),
		nullableUint32(uint32(msg.DecodedBodySize)),
		msg.Success,
	); err != nil {
		c.checkError("resources", err)
		return fmt.Errorf("can't append to resources batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebPageEvent(session *types.Session, msg *messages.PageEvent) error {
	if err := c.batches["pages"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		datetime(msg.Timestamp),
		url.DiscardURLQuery(msg.URL),
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

func (c *connectorImpl) InsertWebClickEvent(session *types.Session, msg *messages.ClickEvent) error {
	if msg.Label == "" {
		return nil
	}
	if err := c.batches["clicks"].Append(
		session.SessionID,
		uint16(session.ProjectID),
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

func (c *connectorImpl) InsertWebInputEvent(session *types.Session, msg *messages.InputEvent) error {
	if msg.Label == "" {
		return nil
	}
	if err := c.batches["inputs"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		datetime(msg.Timestamp),
		msg.Label,
		"INPUT",
	); err != nil {
		c.checkError("inputs", err)
		return fmt.Errorf("can't append to inputs batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebErrorEvent(session *types.Session, msg *messages.ErrorEvent) error {
	if err := c.batches["errors"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		datetime(msg.Timestamp),
		msg.Source,
		nullableString(msg.Name),
		msg.Message,
		hashid.WebErrorID(session.ProjectID, msg),
		"ERROR",
	); err != nil {
		c.checkError("errors", err)
		return fmt.Errorf("can't append to errors batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebPerformanceTrackAggr(session *types.Session, msg *messages.PerformanceTrackAggr) error {
	var timestamp uint64 = (msg.TimestampStart + msg.TimestampEnd) / 2
	if err := c.batches["performance"].Append(
		session.SessionID,
		uint16(session.ProjectID),
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

func (c *connectorImpl) InsertAutocomplete(session *types.Session, msgType, msgValue string) error {
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

func (c *connectorImpl) InsertRequest(session *types.Session, msg *messages.FetchEvent) error {
	if err := c.batches["requests"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		datetime(msg.Timestamp),
		msg.URL,
		nullableString(msg.Request),
		nullableString(msg.Response),
		msg.Status,
		url.EnsureMethod(msg.Method),
		msg.Duration,
		msg.Status < 400,
		"REQUEST",
	); err != nil {
		c.checkError("requests", err)
		return fmt.Errorf("can't append to requests batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertCustom(session *types.Session, msg *messages.CustomEvent) error {
	if err := c.batches["custom"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		datetime(msg.Timestamp),
		msg.Name,
		msg.Payload,
		"CUSTOM",
	); err != nil {
		c.checkError("custom", err)
		return fmt.Errorf("can't append to custom batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertGraphQL(session *types.Session, msg *messages.GraphQLEvent) error {
	if err := c.batches["graphql"].Append(
		session.SessionID,
		uint16(session.ProjectID),
		datetime(msg.Timestamp),
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

func nullableUint16(v uint16) *uint16 {
	var p *uint16 = nil
	if v != 0 {
		p = &v
	}
	return p
}

func nullableUint32(v uint32) *uint32 {
	var p *uint32 = nil
	if v != 0 {
		p = &v
	}
	return p
}

func nullableString(v string) *string {
	var p *string = nil
	if v != "" {
		p = &v
	}
	return p
}

func datetime(timestamp uint64) time.Time {
	t := time.Unix(int64(timestamp/1e3), 0)
	// Temporal solution for not correct timestamps in performance messages
	if t.Year() < 2022 || t.Year() > 2025 {
		return time.Now()
	}
	return t
}

func getSqIdx(messageID uint64) uint {
	return uint(messageID % math.MaxInt32)
}
