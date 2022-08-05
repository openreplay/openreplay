package clickhouse

import (
	"context"
	"errors"
	"fmt"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"log"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
	"strings"
	"time"

	"openreplay/backend/pkg/license"
)

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
	InsertLongtask(session *types.Session, msg *messages.LongTask) error
}

type connectorImpl struct {
	conn    driver.Conn
	batches map[string]driver.Batch
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
		batches: make(map[string]driver.Batch, 9),
	}
	return c
}

func (c *connectorImpl) newBatch(name, query string) error {
	batch, err := c.conn.PrepareBatch(context.Background(), query)
	if err != nil {
		return fmt.Errorf("can't create new batch: %s", err)
	}
	if _, ok := c.batches[name]; ok {
		delete(c.batches, name)
	}
	c.batches[name] = batch
	return nil
}

var batches = map[string]string{
	// Sessions table
	"sessions": "INSERT INTO sessions (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, datetime, duration, pages_count, events_count, errors_count, user_browser, user_browser_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"metadata": "INSERT INTO sessions_metadata (session_id, user_id, user_anonymous_id, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10, datetime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	// Events table
	"resources":   "INSERT INTO resources (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, url, type, duration, ttfb, header_size, encoded_body_size, decoded_body_size, success) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"pages":       "INSERT INTO pages (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, url, request_start, response_start, response_end, dom_content_loaded_event_start, dom_content_loaded_event_end, load_event_start, load_event_end, first_paint, first_contentful_paint, speed_index, visually_complete, time_to_interactive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"clicks":      "INSERT INTO clicks (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, label, hesitation_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"inputs":      "INSERT INTO inputs (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"errors":      "INSERT INTO errors (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, source, name, message, error_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"performance": "INSERT INTO performance (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, min_fps, avg_fps, max_fps, min_cpu, avg_cpu, max_cpu, min_total_js_heap_size, avg_total_js_heap_size, max_total_js_heap_size, min_used_js_heap_size, avg_used_js_heap_size, max_used_js_heap_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
	"longtasks":   "INSERT INTO longtasks (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, context, container_type, container_id, container_name, container_src) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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

func (c *connectorImpl) InsertWebSession(session *types.Session) error {
	if session.Duration == nil {
		return errors.New("trying to insert session with nil duration")
	}
	if err := c.batches["sessions"].Append(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
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
		return fmt.Errorf("can't append to sessions batch: %s", err)
	}
	if err := c.batches["metadata"].Append(
		session.SessionID,
		session.UserID,
		session.UserAnonymousID,
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
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
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
		return fmt.Errorf("can't append to resources batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebPageEvent(session *types.Session, msg *messages.PageEvent) error {
	if err := c.batches["pages"].Append(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion, nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
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
	); err != nil {
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
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(msg.Timestamp),
		msg.Label,
		nullableUint32(uint32(msg.HesitationTime)),
	); err != nil {
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
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(msg.Timestamp),
		msg.Label,
	); err != nil {
		return fmt.Errorf("can't append to inputs batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebErrorEvent(session *types.Session, msg *messages.ErrorEvent) error {
	if err := c.batches["errors"].Append(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(msg.Timestamp),
		msg.Source,
		nullableString(msg.Name),
		msg.Message,
		hashid.WebErrorID(session.ProjectID, msg),
	); err != nil {
		return fmt.Errorf("can't append to errors batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertWebPerformanceTrackAggr(session *types.Session, msg *messages.PerformanceTrackAggr) error {
	var timestamp uint64 = (msg.TimestampStart + msg.TimestampEnd) / 2
	if err := c.batches["performance"].Append(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(timestamp),
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
	); err != nil {
		return fmt.Errorf("can't append to performance batch: %s", err)
	}
	return nil
}

func (c *connectorImpl) InsertLongtask(session *types.Session, msg *messages.LongTask) error {
	if err := c.batches["longtasks"].Append(
		session.SessionID,
		session.ProjectID,
		session.TrackerVersion,
		nullableString(session.RevID),
		session.UserUUID,
		session.UserOS,
		nullableString(session.UserOSVersion),
		session.UserBrowser,
		nullableString(session.UserBrowserVersion),
		nullableString(session.UserDevice),
		session.UserDeviceType,
		session.UserCountry,
		datetime(msg.Timestamp),
		CONTEXT_MAP[msg.Context],
		CONTAINER_TYPE_MAP[msg.ContainerType],
		msg.ContainerId,
		msg.ContainerName,
		msg.ContainerSrc,
	); err != nil {
		return fmt.Errorf("can't append to longtasks batch: %s", err)
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
	if t.Year() < 2022 && t.Year() > 2025 {
		return time.Now()
	}
	return t
}
