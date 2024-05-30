package connector

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/internal/config/connector"
	"openreplay/backend/pkg/logger"
)

type ClickHouse struct {
	log     logger.Logger
	cfg     *connector.Config
	conn    driver.Conn
	batches *Batches
}

func NewClickHouse(log logger.Logger, cfg *connector.Config, batches *Batches) (*ClickHouse, error) {
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
		log:     log,
		cfg:     cfg,
		conn:    conn,
		batches: batches,
	}
	return c, nil
}

func (c *ClickHouse) InsertEvents(batch []map[string]string) error {
	return c.insertEventsUsingBuffer(batch)
}

const eventsSQL = "INSERT INTO connector_events_buffer (sessionid, consolelog_level, consolelog_value, customevent_name, customevent_payload, jsexception_message, jsexception_name, jsexception_payload, jsexception_metadata, networkrequest_type, networkrequest_method, networkrequest_url, networkrequest_request, networkrequest_response, networkrequest_status, networkrequest_timestamp, networkrequest_duration, issueevent_message_id, issueevent_timestamp, issueevent_type, issueevent_context_string, issueevent_context, issueevent_payload, issueevent_url, customissue_name, customissue_payload, received_at, batch_order_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"

func (c *ClickHouse) insertEventsUsingBuffer(batch []map[string]string) error {
	bulk, err := c.conn.PrepareBatch(context.Background(), eventsSQL)
	if err != nil {
		return err
	}
	for _, event := range batch {
		ctx := context.Background()
		ctx = context.WithValue(ctx, "sessionID", c.Uint64(ctx, event["sessionid"]))
		if err := bulk.Append(
			c.Uint64(ctx, event["sessionid"]),
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
			c.nullableUint64(ctx, event["networkrequest_status"]),
			c.nullableUint64(ctx, event["networkrequest_timestamp"]),
			c.nullableUint64(ctx, event["networkrequest_duration"]),
			nullableString(event["issueevent_message_id"]),
			c.nullableUint64(ctx, event["issueevent_timestamp"]),
			nullableString(event["issueevent_type"]),
			nullableString(event["issueevent_context_string"]),
			nullableString(event["issueevent_context"]),
			nullableString(event["issueevent_payload"]),
			nullableString(event["issueevent_url"]),
			nullableString(event["customissue_name"]),
			nullableString(event["customissue_payload"]),
			c.nullableUint64(ctx, event["received_at"]),
			c.nullableUint64(ctx, event["batch_order_number"]),
		); err != nil {
			c.log.Error(ctx, "can't append value set to batch, err: ", err)
		}
	}
	return bulk.Send()
}

func (c *ClickHouse) InsertSessions(batch []map[string]string) error {
	return c.insertSessionsUsingBuffer(batch)
}

const sessionsSQL = "INSERT INTO connector_user_sessions_buffer (sessionid, user_agent, user_browser, user_browser_version, user_country, user_device, user_device_heap_size, user_device_memory_size, user_device_type, user_os, user_os_version, user_uuid, connection_effective_bandwidth, connection_type, referrer, user_anonymous_id, user_id, session_start_timestamp, session_end_timestamp, session_duration, first_contentful_paint, speed_index, visually_complete, timing_time_to_interactive, avg_cpu, avg_fps, max_cpu, max_fps, max_total_js_heap_size, max_used_js_heap_size, js_exceptions_count, inputs_count, clicks_count, issues_count, pages_count, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"

func (c *ClickHouse) insertSessionsUsingBuffer(batch []map[string]string) error {
	bulk, err := c.conn.PrepareBatch(context.Background(), sessionsSQL)
	if err != nil {
		return err
	}
	for _, sess := range batch {
		ctx := context.Background()
		ctx = context.WithValue(ctx, "sessionID", c.Uint64(ctx, sess["sessionid"]))
		if err := bulk.Append(
			c.Uint64(ctx, sess["sessionid"]),
			nullableString(sess["user_agent"]),
			nullableString(sess["user_browser"]),
			nullableString(sess["user_browser_version"]),
			nullableString(sess["user_country"]),
			nullableString(sess["user_device"]),
			c.nullableUint64(ctx, sess["user_device_heap_size"]),
			c.nullableUint64(ctx, sess["user_device_memory_size"]),
			nullableString(sess["user_device_type"]),
			nullableString(sess["user_os"]),
			nullableString(sess["user_os_version"]),
			nullableString(sess["user_uuid"]),
			c.nullableUint64(ctx, sess["connection_effective_bandwidth"]),
			nullableString(sess["connection_type"]),
			nullableString(sess["referrer"]),
			nullableString(sess["user_anonymous_id"]),
			nullableString(sess["user_id"]),
			c.nullableUint64(ctx, sess["session_start_timestamp"]),
			c.nullableUint64(ctx, sess["session_end_timestamp"]),
			c.nullableUint64(ctx, sess["session_duration"]),
			c.nullableUint64(ctx, sess["first_contentful_paint"]),
			c.nullableUint64(ctx, sess["speed_index"]),
			c.nullableUint64(ctx, sess["visually_complete"]),
			c.nullableUint64(ctx, sess["timing_time_to_interactive"]),
			c.nullableUint64(ctx, sess["avg_cpu"]),
			c.nullableUint64(ctx, sess["avg_fps"]),
			c.nullableUint64(ctx, sess["max_cpu"]),
			c.nullableUint64(ctx, sess["max_fps"]),
			c.nullableUint64(ctx, sess["max_total_js_heap_size"]),
			c.nullableUint64(ctx, sess["max_used_js_heap_size"]),
			c.nullableUint64(ctx, sess["js_exceptions_count"]),
			c.nullableUint64(ctx, sess["inputs_count"]),
			c.nullableUint64(ctx, sess["clicks_count"]),
			c.nullableUint64(ctx, sess["issues_count"]),
			c.nullableUint64(ctx, sess["pages_count"]),
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
			c.log.Error(ctx, "can't append value set to batch, err: ", err)
		}
	}
	return bulk.Send()
}

func (c *ClickHouse) Close() error {
	return c.conn.Close()
}

func (c *ClickHouse) Uint64(ctx context.Context, v string) uint64 {
	if v == "" {
		return 0
	}
	res, err := strconv.Atoi(v)
	if err != nil {
		c.log.Error(ctx, "can't convert string to uint64, err: %s", err)
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

func (c *ClickHouse) nullableUint64(ctx context.Context, v string) *uint64 {
	var p *uint64 = nil
	if v != "" {
		res, err := strconv.Atoi(v)
		if err != nil {
			c.log.Error(ctx, "can't convert string to uint64, err: %s", err)
			return nil
		}
		a := uint64(res)
		return &a
	}
	return p
}
