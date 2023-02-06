package postgres

import (
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
)

func (conn *Conn) InsertWebStatsPerformance(sessionID uint64, p *PerformanceTrackAggr) error {
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
	conn.batchQueue(sessionID, sqlRequest,
		sessionID, timestamp, timestamp, // ??? TODO: primary key by timestamp+session_id
		p.MinFPS, p.AvgFPS, p.MaxFPS,
		p.MinCPU, p.AvgCPU, p.MinCPU,
		p.MinTotalJSHeapSize, p.AvgTotalJSHeapSize, p.MaxTotalJSHeapSize,
		p.MinUsedJSHeapSize, p.AvgUsedJSHeapSize, p.MaxUsedJSHeapSize,
	)

	// Record approximate message size
	conn.updateBatchSize(sessionID, len(sqlRequest)+8*15)
	return nil
}

func (conn *Conn) InsertWebStatsResourceEvent(sessionID uint64, e *ResourceEvent) error {
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
	conn.batchQueue(sessionID, sqlRequest,
		sessionID, e.Timestamp, truncSqIdx(e.MessageID),
		e.Type,
		e.URL, host, urlQuery,
		e.Success, e.Status,
		urlMethod,
		e.Duration, e.TTFB, e.HeaderSize, e.EncodedBodySize, e.DecodedBodySize,
	)

	// Record approximate message size
	conn.updateBatchSize(sessionID, len(sqlRequest)+len(e.Type)+len(e.URL)+len(host)+len(urlQuery)+len(urlMethod)+8*9+1)
	return nil
}
