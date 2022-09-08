package stats

import (
	"fmt"
	"openreplay/backend/pkg/db/batch"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
)

type Stats interface {
	InsertWebStatsPerformance(sessionID uint64, p *messages.PerformanceTrackAggr) error
	InsertWebStatsResourceEvent(sessionID uint64, e *messages.ResourceEvent) error
}

type statsImpl struct {
	conn    postgres.Pool
	batches batch.Batches
}

func New(conn postgres.Pool, batches batch.Batches) (Stats, error) {
	if conn == nil {
		return nil, fmt.Errorf("db connection is empty")
	}
	return &statsImpl{
		conn:    conn,
		batches: batches,
	}, nil
}

func (s *statsImpl) InsertWebStatsPerformance(sessionID uint64, p *messages.PerformanceTrackAggr) error {
	timestamp := (p.TimestampEnd + p.TimestampStart) / 2

	sqlRequest := `
		INSERT INTO events.performance (
			session_id, timestamp, message_id,
			min_fps, avg_fps, max_fps,
			min_cpu, avg_cpu, max_cpu,
			min_total_js_heap_size, avg_total_js_heap_size, max_total_js_heap_size,
			min_used_js_heap_size, avg_used_js_heap_size, max_used_js_heap_size
		) VALUES (
			$1, $2, $3,
			$4, $5, $6,
			$7, $8, $9,
			$10, $11, $12,
			$13, $14, $15
		)`
	s.batches.Queue(sessionID, sqlRequest,
		sessionID, timestamp, timestamp, // ??? TODO: primary key by timestamp+session_id
		p.MinFPS, p.AvgFPS, p.MaxFPS,
		p.MinCPU, p.AvgCPU, p.MinCPU,
		p.MinTotalJSHeapSize, p.AvgTotalJSHeapSize, p.MaxTotalJSHeapSize,
		p.MinUsedJSHeapSize, p.AvgUsedJSHeapSize, p.MaxUsedJSHeapSize,
	)

	// Record approximate message size
	s.batches.UpdateSize(sessionID, len(sqlRequest)+8*15)
	return nil
}

func (s *statsImpl) InsertWebStatsResourceEvent(sessionID uint64, e *messages.ResourceEvent) error {
	host, _, _, err := url.GetURLParts(e.URL)
	if err != nil {
		return err
	}

	sqlRequest := `
		INSERT INTO events.resources (
			session_id, timestamp, message_id, 
			type,
			url, url_host, url_hostpath,
			success, status, 
			method,
			duration, ttfb, header_size, encoded_body_size, decoded_body_size
		) VALUES (
			$1, $2, $3, 
			$4, 
			left($5, 2700), $6, $7, 
			$8, $9, 
			NULLIF($10, '')::events.resource_method,
			NULLIF($11, 0), NULLIF($12, 0), NULLIF($13, 0), NULLIF($14, 0), NULLIF($15, 0)
		)`
	urlQuery := url.DiscardURLQuery(e.URL)
	urlMethod := url.EnsureMethod(e.Method)
	s.batches.Queue(sessionID, sqlRequest,
		sessionID, e.Timestamp, e.MessageID,
		e.Type,
		e.URL, host, urlQuery,
		e.Success, e.Status,
		urlMethod,
		e.Duration, e.TTFB, e.HeaderSize, e.EncodedBodySize, e.DecodedBodySize,
	)

	// Record approximate message size
	s.batches.UpdateSize(sessionID, len(sqlRequest)+len(e.Type)+len(e.URL)+len(host)+len(urlQuery)+len(urlMethod)+8*9+1)
	return nil
}
