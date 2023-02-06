package postgres

import (
	"log"
	"openreplay/backend/pkg/monitoring"
)

type BulkSet struct {
	c                 Pool
	autocompletes     Bulk
	requests          Bulk
	customEvents      Bulk
	webPageEvents     Bulk
	webInputEvents    Bulk
	webGraphQL        Bulk
	webErrors         Bulk
	webErrorEvents    Bulk
	webErrorTags      Bulk
	webIssues         Bulk
	webIssueEvents    Bulk
	webCustomEvents   Bulk
	webClickEvents    Bulk
	webNetworkRequest Bulk
	bulksToSend       chan Bulk
	metrics           *monitoring.Metrics
}

func NewBulkSet(c Pool, metrics *monitoring.Metrics) *BulkSet {
	bs := &BulkSet{
		c:           c,
		bulksToSend: make(chan Bulk, 28), // 2 full sets of 14 bulks
		metrics:     metrics,
	}
	bs.initBulks()
	go bs.worker()
	return bs
}

func (conn *BulkSet) Get(name string) Bulk {
	switch name {
	case "autocompletes":
		return conn.autocompletes
	case "requests":
		return conn.requests
	case "customEvents":
		return conn.customEvents
	case "webPageEvents":
		return conn.webPageEvents
	case "webInputEvents":
		return conn.webInputEvents
	case "webGraphQL":
		return conn.webGraphQL
	case "webErrors":
		return conn.webErrors
	case "webErrorEvents":
		return conn.webErrorEvents
	case "webErrorTags":
		return conn.webErrorTags
	case "webIssues":
		return conn.webIssues
	case "webIssueEvents":
		return conn.webIssueEvents
	case "webCustomEvents":
		return conn.webCustomEvents
	case "webClickEvents":
		return conn.webClickEvents
	case "webNetworkRequest":
		return conn.webNetworkRequest
	default:
		return nil
	}
}

func (conn *BulkSet) initBulks() {
	var err error
	conn.autocompletes, err = NewBulk(conn.c, conn.metrics,
		"autocomplete",
		"(value, type, project_id)",
		"($%d, $%d, $%d)",
		3, 200)
	if err != nil {
		log.Fatalf("can't create autocomplete bulk: %s", err)
	}
	conn.requests, err = NewBulk(conn.c, conn.metrics,
		"events_common.requests",
		"(session_id, timestamp, seq_index, url, duration, success)",
		"($%d, $%d, $%d, LEFT($%d, 8000), $%d, $%d)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create requests bulk: %s", err)
	}
	conn.customEvents, err = NewBulk(conn.c, conn.metrics,
		"events_common.customs",
		"(session_id, timestamp, seq_index, name, payload)",
		"($%d, $%d, $%d, LEFT($%d, 2000), $%d)",
		5, 200)
	if err != nil {
		log.Fatalf("can't create customEvents bulk: %s", err)
	}
	conn.webPageEvents, err = NewBulk(conn.c, conn.metrics,
		"events.pages",
		"(session_id, message_id, timestamp, referrer, base_referrer, host, path, query, dom_content_loaded_time, "+
			"load_time, response_end, first_paint_time, first_contentful_paint_time, speed_index, visually_complete, "+
			"time_to_interactive, response_time, dom_building_time)",
		"($%d, $%d, $%d, LEFT($%d, 8000), LEFT($%d, 8000), LEFT($%d, 300), LEFT($%d, 2000), LEFT($%d, 8000), "+
			"NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0),"+
			" NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0))",
		18, 200)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk: %s", err)
	}
	conn.webInputEvents, err = NewBulk(conn.c, conn.metrics,
		"events.inputs",
		"(session_id, message_id, timestamp, value, label)",
		"($%d, $%d, $%d, LEFT($%d, 2000), NULLIF(LEFT($%d, 2000),''))",
		5, 200)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk: %s", err)
	}
	conn.webGraphQL, err = NewBulk(conn.c, conn.metrics,
		"events.graphql",
		"(session_id, timestamp, message_id, name, request_body, response_body)",
		"($%d, $%d, $%d, LEFT($%d, 2000), $%d, $%d)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk: %s", err)
	}
	conn.webErrors, err = NewBulk(conn.c, conn.metrics,
		"errors",
		"(error_id, project_id, source, name, message, payload)",
		"($%d, $%d, $%d, $%d, $%d, $%d::jsonb)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create webErrors bulk: %s", err)
	}
	conn.webErrorEvents, err = NewBulk(conn.c, conn.metrics,
		"events.errors",
		"(session_id, message_id, timestamp, error_id)",
		"($%d, $%d, $%d, $%d)",
		4, 200)
	if err != nil {
		log.Fatalf("can't create webErrorEvents bulk: %s", err)
	}
	conn.webErrorTags, err = NewBulk(conn.c, conn.metrics,
		"public.errors_tags",
		"(session_id, message_id, error_id, key, value)",
		"($%d, $%d, $%d, $%d, $%d)",
		5, 200)
	if err != nil {
		log.Fatalf("can't create webErrorEvents bulk: %s", err)
	}
	conn.webIssues, err = NewBulk(conn.c, conn.metrics,
		"issues",
		"(project_id, issue_id, type, context_string)",
		"($%d, $%d, $%d, $%d)",
		4, 200)
	if err != nil {
		log.Fatalf("can't create webIssues bulk: %s", err)
	}
	conn.webIssueEvents, err = NewBulk(conn.c, conn.metrics,
		"events_common.issues",
		"(session_id, issue_id, timestamp, seq_index, payload)",
		"($%d, $%d, $%d, $%d, CAST($%d AS jsonb))",
		5, 200)
	if err != nil {
		log.Fatalf("can't create webIssueEvents bulk: %s", err)
	}
	conn.webCustomEvents, err = NewBulk(conn.c, conn.metrics,
		"events_common.customs",
		"(session_id, seq_index, timestamp, name, payload, level)",
		"($%d, $%d, $%d, LEFT($%d, 2000), $%d, $%d)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create webCustomEvents bulk: %s", err)
	}
	conn.webClickEvents, err = NewBulk(conn.c, conn.metrics,
		"events.clicks",
		"(session_id, message_id, timestamp, label, selector, url, path)",
		"($%d, $%d, $%d, NULLIF(LEFT($%d, 2000), ''), LEFT($%d, 8000), LEFT($%d, 2000), LEFT($%d, 2000))",
		7, 200)
	if err != nil {
		log.Fatalf("can't create webClickEvents bulk: %s", err)
	}
	conn.webNetworkRequest, err = NewBulk(conn.c, conn.metrics,
		"events_common.requests",
		"(session_id, timestamp, seq_index, url, host, path, query, request_body, response_body, status_code, method, duration, success)",
		"($%d, $%d, $%d, LEFT($%d, 8000), LEFT($%d, 300), LEFT($%d, 2000), LEFT($%d, 8000), $%d, $%d, $%d::smallint, NULLIF($%d, '')::http_method, $%d, $%d)",
		13, 200)
	if err != nil {
		log.Fatalf("can't create webNetworkRequest bulk: %s", err)
	}
}

func (conn *BulkSet) Send() {
	// Prepare set of bulks to send
	conn.bulksToSend <- conn.autocompletes
	conn.bulksToSend <- conn.requests
	conn.bulksToSend <- conn.customEvents
	conn.bulksToSend <- conn.webPageEvents
	conn.bulksToSend <- conn.webInputEvents
	conn.bulksToSend <- conn.webGraphQL
	conn.bulksToSend <- conn.webErrors
	conn.bulksToSend <- conn.webErrorEvents
	conn.bulksToSend <- conn.webErrorTags
	conn.bulksToSend <- conn.webIssues
	conn.bulksToSend <- conn.webIssueEvents
	conn.bulksToSend <- conn.webCustomEvents
	conn.bulksToSend <- conn.webClickEvents
	conn.bulksToSend <- conn.webNetworkRequest

	// Reset new bulks
	conn.initBulks()
}

func (conn *BulkSet) worker() {
	for {
		bulk := <-conn.bulksToSend
		if err := bulk.Send(); err != nil {
			log.Printf("%s bulk send err: %s", bulk.Table(), err)
		}
	}
}
