package connector

import (
	"context"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"openreplay/backend/internal/config/connector"
)

type ClickHouse struct {
	cfg  *connector.Config
	conn driver.Conn
}

func NewClickHouse(cfg *connector.Config) (*ClickHouse, error) {
	url := cfg.Clickhouse.URL
	url = strings.TrimPrefix(url, "tcp://")
	url = strings.TrimSuffix(url, "/default")
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{url},
		Auth: clickhouse.Auth{
			Database: cfg.Clickhouse.Database,
			Username: cfg.Clickhouse.UserName,
			Password: cfg.Clickhouse.Password,
		},
		MaxOpenConns:    20,
		MaxIdleConns:    15,
		ConnMaxLifetime: 3 * time.Minute,
		Compression: &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		},
	})
	if err != nil {
		return nil, err
	}
	ctx, _ := context.WithTimeout(context.Background(), 15*time.Second)
	if err := conn.Ping(ctx); err != nil {
		return nil, err
	}
	c := &ClickHouse{
		cfg:  cfg,
		conn: conn,
	}
	return c, nil
}

const eventsSQL = "INSERT INTO connector_events_buffer (sessionid, consolelog_level, consolelog_value, customevent_name, customevent_payload, jsexception_message, jsexception_name, jsexception_payload, jsexception_metadata, networkrequest_type, networkrequest_method, networkrequest_url, networkrequest_request, networkrequest_response, networkrequest_status, networkrequest_timestamp, networkrequest_duration, issueevent_message_id, issueevent_timestamp, issueevent_type, issueevent_context_string, issueevent_context, issueevent_payload, issueevent_url, customissue_name, customissue_payload, received_at, batch_order_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"

func (c *ClickHouse) InsertEvents(batch []map[string]string) error {
	bulk, err := c.conn.PrepareBatch(context.Background(), eventsSQL)
	if err != nil {
		return err
	}
	for _, event := range batch {
		if err := bulk.Append(
			Uint64(event["sessionid"]),
			nullableString(event["consolelog_level"]),
			nullableString(event["consolelog_value"]),
			nullableString(event["customevent_name"]),
			nullableString(event["customevent_payload"]),
			nullableString(event["jsexception_message"]),
			nullableString(event["jsexception_name"]),
			nullableString(event["jsexception_payload"]),
			nullableString(event["jsexception_metadata"]),
			nullableString(event["networkrequest_type"]),
			nullableString(event["networkrequest_method"]),
			nullableString(event["networkrequest_url"]),
			nullableString(event["networkrequest_request"]),
			nullableString(event["networkrequest_response"]),
			nullableUint64(event["networkrequest_status"]),
			nullableUint64(event["networkrequest_timestamp"]),
			nullableUint64(event["networkrequest_duration"]),
			nullableString(event["issueevent_message_id"]),
			nullableUint64(event["issueevent_timestamp"]),
			nullableString(event["issueevent_type"]),
			nullableString(event["issueevent_context_string"]),
			nullableString(event["issueevent_context"]),
			nullableString(event["issueevent_payload"]),
			nullableString(event["issueevent_url"]),
			nullableString(event["customissue_name"]),
			nullableString(event["customissue_payload"]),
			nullableUint64(event["received_at"]),
			nullableUint64(event["batch_order_number"]),
		); err != nil {
			log.Printf("can't append value set to batch, err: %s", err)
		}
	}
	return bulk.Send()
}

const sessionsSQL = "INSERT INTO connector_user_sessions_buffer (sessionid, user_agent, user_browser, user_browser_version, user_country, user_device, user_device_heap_size, user_device_memory_size, user_device_type, user_os, user_os_version, user_uuid, connection_effective_bandwidth, connection_type, referrer, user_anonymous_id, user_id, session_start_timestamp, session_end_timestamp, session_duration, first_contentful_paint, speed_index, visually_complete, timing_time_to_interactive, avg_cpu, avg_fps, max_cpu, max_fps, max_total_js_heap_size, max_used_js_heap_size, js_exceptions_count, inputs_count, clicks_count, issues_count, pages_count, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"

func (c *ClickHouse) InsertSessions(batch []map[string]string) error {
	bulk, err := c.conn.PrepareBatch(context.Background(), sessionsSQL)
	if err != nil {
		return err
	}
	for _, sess := range batch {
		if err := bulk.Append(
			Uint64(sess["sessionid"]),
			nullableString(sess["user_agent"]),
			nullableString(sess["user_browser"]),
			nullableString(sess["user_browser_version"]),
			nullableString(sess["user_country"]),
			nullableString(sess["user_device"]),
			nullableUint64(sess["user_device_heap_size"]),
			nullableUint64(sess["user_device_memory_size"]),
			nullableString(sess["user_device_type"]),
			nullableString(sess["user_os"]),
			nullableString(sess["user_os_version"]),
			nullableString(sess["user_uuid"]),
			nullableUint64(sess["connection_effective_bandwidth"]),
			nullableString(sess["connection_type"]),
			nullableString(sess["referrer"]),
			nullableString(sess["user_anonymous_id"]),
			nullableString(sess["user_id"]),
			nullableUint64(sess["session_start_timestamp"]),
			nullableUint64(sess["session_end_timestamp"]),
			nullableUint64(sess["session_duration"]),
			nullableUint64(sess["first_contentful_paint"]),
			nullableUint64(sess["speed_index"]),
			nullableUint64(sess["visually_complete"]),
			nullableUint64(sess["timing_time_to_interactive"]),
			nullableUint64(sess["avg_cpu"]),
			nullableUint64(sess["avg_fps"]),
			nullableUint64(sess["max_cpu"]),
			nullableUint64(sess["max_fps"]),
			nullableUint64(sess["max_total_js_heap_size"]),
			nullableUint64(sess["max_used_js_heap_size"]),
			nullableUint64(sess["js_exceptions_count"]),
			nullableUint64(sess["inputs_count"]),
			nullableUint64(sess["clicks_count"]),
			nullableUint64(sess["issues_count"]),
			nullableUint64(sess["pages_count"]),
			nullableString(sess["metadata_1"]),
			nullableString(sess["metadata_2"]),
			nullableString(sess["metadata_3"]),
			nullableString(sess["metadata_4"]),
			nullableString(sess["metadata_5"]),
			nullableString(sess["metadata_6"]),
			nullableString(sess["metadata_7"]),
			nullableString(sess["metadata_8"]),
			nullableString(sess["metadata_9"]),
			nullableString(sess["metadata_10"]),
		); err != nil {
			log.Printf("can't append value set to batch, err: %s", err)
		}
	}
	return bulk.Send()
}

func (c *ClickHouse) Close() error {
	return c.conn.Close()
}

func Uint64(v string) uint64 {
	if v == "" {
		return 0
	}
	res, err := strconv.Atoi(v)
	if err != nil {
		log.Printf("can't convert string to uint64, err: %s", err)
		return 0
	}
	return uint64(res)
}

func nullableString(v string) *string {
	var p *string = nil
	if v != "" {
		p = &v
	}
	return p
}

func nullableUint64(v string) *uint64 {
	var p *uint64 = nil
	if v != "" {
		res, err := strconv.Atoi(v)
		if err != nil {
			log.Printf("can't convert string to uint64, err: %s", err)
			return nil
		}
		a := uint64(res)
		return &a
	}
	return p
}
