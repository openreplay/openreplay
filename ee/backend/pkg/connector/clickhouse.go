package connector

import (
	"context"
	"fmt"
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
	if c.cfg.UseS3Batches {
		return c.insertEventsUsingS3Batch(batch)
	}
	return c.insertEventsUsingBuffer(batch)
}

const batchEventsSQL = "INSERT INTO %s SELECT * FROM s3('s3://%s/%s', 'TSVWithNames', 'sessionid UInt64, consolelog_level Nullable(String), consolelog_value Nullable(String), customevent_name Nullable(String), customevent_payload Nullable(String), jsexception_message Nullable(String), jsexception_name Nullable(String), jsexception_payload Nullable(String), jsexception_metadata Nullable(String), networkrequest_type Nullable(String), networkrequest_method Nullable(String), networkrequest_url Nullable(String), networkrequest_request Nullable(String), networkrequest_response Nullable(String), networkrequest_status Nullable(UInt64), networkrequest_timestamp Nullable(UInt64), networkrequest_duration Nullable(UInt64), issueevent_message_id Nullable(UInt64), issueevent_timestamp Nullable(UInt64), issueevent_type Nullable(String), issueevent_context_string Nullable(String), issueevent_context Nullable(String), issueevent_payload Nullable(String), issueevent_url Nullable(String), customissue_name Nullable(String), customissue_payload Nullable(String), mobile_event_name Nullable(String), mobile_event_payload Nullable(String), mobile_networkcall_type Nullable(String), mobile_networkcall_method Nullable(String), mobile_networkcall_url Nullable(String), mobile_networkcall_request Nullable(String), mobile_networkcall_response Nullable(String), mobile_networkcall_status Nullable(UInt64), mobile_networkcall_timestamp Nullable(UInt64), mobile_networkcall_duration Nullable(UInt64), mobile_clickevent_x Nullable(UInt64), mobile_clickevent_y Nullable(UInt64), mobile_clickevent_timestamp Nullable(UInt64), mobile_clickevent_label Nullable(String), mobile_swipeevent_x Nullable(UInt64), mobile_swipeevent_y Nullable(UInt64), mobile_swipeevent_timestamp Nullable(UInt64), mobile_swipeevent_label Nullable(String), mobile_inputevent_label Nullable(String), mobile_inputevent_value Nullable(String), mobile_crash_name Nullable(String), mobile_crash_reason Nullable(String), mobile_crash_stacktrace Nullable(String), mobile_issueevent_timestamp Nullable(UInt64), mobile_issueevent_type Nullable(String), mobile_issueevent_context_string Nullable(String), mobile_issueevent_context Nullable(String), mobile_issueevent_payload Nullable(String), mouseclick_label Nullable(String), mouseclick_selector Nullable(String), mouseclick_url Nullable(String), mouseclick_hesitation_time Nullable(UInt64), mouseclick_timestamp Nullable(UInt64), pageevent_url Nullable(String), pageevent_referrer Nullable(String), pageevent_speed_index Nullable(UInt64), pageevent_timestamp Nullable(UInt64), inputevent_label Nullable(String), inputevent_hesitation_time Nullable(UInt64), inputevent_input_duration Nullable(UInt64), inputevent_timestamp Nullable(UInt64), mobile_viewcomponentevent_screen_name Nullable(String), mobile_viewcomponentevent_view_name Nullable(String), mobile_viewcomponentevent_visible Nullable(String), mobile_viewcomponentevent_timestamp Nullable(UInt64), received_at UInt64') SETTINGS format_csv_delimiter = '|'"

func (c *ClickHouse) insertEventsUsingS3Batch(batch []map[string]string) error {
	fileName := generateTSVName(c.cfg.EventsTableName)
	//if err := c.batches.Insert(batch, fileName, eventColumns); err != nil {
	if err := c.batches.InsertTSV(batch, fileName, eventColumns); err != nil {
		return fmt.Errorf("can't insert events batch: %s", err)
	}
	// Copy data from s3 bucket to ClickHouse
	sql := fmt.Sprintf(batchEventsSQL, c.cfg.EventsTableName, c.cfg.BucketName, fileName)
	if err := c.conn.Exec(context.Background(), sql); err != nil {
		return fmt.Errorf("can't copy data from s3 to ClickHouse: %s", err)
	}
	c.log.Info(context.Background(), "events batch of %d events is successfully saved", len(batch))
	return nil
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
	if c.cfg.UseS3Batches {
		return c.insertSessionsUsingS3Batch(batch)
	}
	return c.insertSessionsUsingBuffer(batch)
}

const batchSessionsSQL = "INSERT INTO %s SELECT * FROM s3('s3://%s/%s', 'TSVWithNames', 'sessionid UInt64, user_browser Nullable(String), user_browser_version Nullable(String), user_country Nullable(String), user_city Nullable(String), user_state Nullable(String), user_device Nullable(String), user_device_heap_size Nullable(UInt64), user_device_memory_size Nullable(UInt64), user_device_type Nullable(String), user_os Nullable(String), user_os_version Nullable(String), user_uuid Nullable(String), connection_effective_bandwidth Nullable(UInt64), connection_type Nullable(String), referrer Nullable(String), user_anonymous_id Nullable(String), user_id Nullable(String), tracker_version Nullable(String), rev_id Nullable(String), session_start_timestamp Nullable(UInt64), session_end_timestamp Nullable(UInt64), session_duration Nullable(UInt64), first_contentful_paint Nullable(UInt64), speed_index Nullable(UInt64), visually_complete Nullable(UInt64), timing_time_to_interactive Nullable(UInt64), avg_cpu Nullable(UInt64), avg_fps Nullable(UInt64), max_cpu Nullable(UInt64), max_fps Nullable(UInt64), max_total_js_heap_size Nullable(UInt64), max_used_js_heap_size Nullable(UInt64), js_exceptions_count Nullable(UInt64), inputs_count Nullable(UInt64), clicks_count Nullable(UInt64), issues_count Nullable(UInt64), pages_count Nullable(UInt64), metadata_1 Nullable(String), metadata_2 Nullable(String), metadata_3 Nullable(String), metadata_4 Nullable(String), metadata_5 Nullable(String), metadata_6 Nullable(String), metadata_7 Nullable(String), metadata_8 Nullable(String), metadata_9 Nullable(String), metadata_10 Nullable(String)') SETTINGS format_csv_delimiter = '|'"

func (c *ClickHouse) insertSessionsUsingS3Batch(batch []map[string]string) error {
	fileName := generateTSVName(c.cfg.SessionsTableName)
	if err := c.batches.InsertTSV(batch, fileName, sessionColumns); err != nil {
		return fmt.Errorf("can't insert sessions batch: %s", err)
	}
	// Copy data from s3 bucket to ClickHouse
	sql := fmt.Sprintf(batchSessionsSQL, c.cfg.SessionsTableName, c.cfg.BucketName, fileName)
	if err := c.conn.Exec(context.Background(), sql); err != nil {
		return fmt.Errorf("can't copy data from s3 to ClickHouse: %s", err)
	}
	c.log.Info(context.Background(), "sessions batch of %d sessions is successfully saved", len(batch))
	return nil
}

const sessionsSQL = "INSERT INTO %s_buffer (sessionid, user_agent, user_browser, user_browser_version, user_country, user_device, user_device_heap_size, user_device_memory_size, user_device_type, user_os, user_os_version, user_uuid, connection_effective_bandwidth, connection_type, referrer, user_anonymous_id, user_id, session_start_timestamp, session_end_timestamp, session_duration, first_contentful_paint, speed_index, visually_complete, timing_time_to_interactive, avg_cpu, avg_fps, max_cpu, max_fps, max_total_js_heap_size, max_used_js_heap_size, js_exceptions_count, inputs_count, clicks_count, issues_count, pages_count, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"

func (c *ClickHouse) insertSessionsUsingBuffer(batch []map[string]string) error {
	sql := fmt.Sprintf(sessionsSQL, c.cfg.SessionsTableName)
	bulk, err := c.conn.PrepareBatch(context.Background(), sql)
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
