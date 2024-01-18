package postgres

import (
	"log"
	"openreplay/backend/pkg/db/postgres/pool"
)

type bulksTask struct {
	bulks []Bulk
}

func NewBulksTask() *bulksTask {
	return &bulksTask{bulks: make([]Bulk, 0, 15)}
}

type BulkSet struct {
	c                 pool.Pool
	autocompletes     Bulk
	requests          Bulk
	customEvents      Bulk
	webPageEvents     Bulk
	webInputDurations Bulk
	webGraphQL        Bulk
	webErrors         Bulk
	webErrorEvents    Bulk
	webErrorTags      Bulk
	webIssues         Bulk
	webIssueEvents    Bulk
	webCustomEvents   Bulk
	webClickEvents    Bulk
	webNetworkRequest Bulk
	webCanvasNodes    Bulk
	webTagTriggers    Bulk
	workerTask        chan *bulksTask
	done              chan struct{}
	finished          chan struct{}
}

func NewBulkSet(c pool.Pool) *BulkSet {
	bs := &BulkSet{
		c:          c,
		workerTask: make(chan *bulksTask, 1),
		done:       make(chan struct{}),
		finished:   make(chan struct{}),
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
	case "webInputDurations":
		return conn.webInputDurations
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
	case "canvasNodes":
		return conn.webCanvasNodes
	case "tagTriggers":
		return conn.webTagTriggers
	default:
		return nil
	}
}

func (conn *BulkSet) initBulks() {
	var err error
	conn.autocompletes, err = NewBulk(conn.c,
		"autocomplete",
		"(value, type, project_id)",
		"($%d, $%d, $%d)",
		3, 200)
	if err != nil {
		log.Fatalf("can't create autocomplete bulk: %s", err)
	}
	conn.requests, err = NewBulk(conn.c,
		"events_common.requests",
		"(session_id, timestamp, seq_index, url, duration, success)",
		"($%d, $%d, $%d, LEFT($%d, 8000), $%d, $%d)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create requests bulk: %s", err)
	}
	conn.customEvents, err = NewBulk(conn.c,
		"events_common.customs",
		"(session_id, timestamp, seq_index, name, payload)",
		"($%d, $%d, $%d, LEFT($%d, 2000), $%d)",
		5, 200)
	if err != nil {
		log.Fatalf("can't create customEvents bulk: %s", err)
	}
	conn.webPageEvents, err = NewBulk(conn.c,
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
	conn.webInputDurations, err = NewBulk(conn.c,
		"events.inputs",
		"(session_id, message_id, timestamp, label, hesitation, duration)",
		"($%d, $%d, $%d, NULLIF(LEFT($%d, 2000),''), $%d, $%d)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk: %s", err)
	}
	conn.webGraphQL, err = NewBulk(conn.c,
		"events.graphql",
		"(session_id, timestamp, message_id, name, request_body, response_body)",
		"($%d, $%d, $%d, LEFT($%d, 2000), $%d, $%d)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk: %s", err)
	}
	conn.webErrors, err = NewBulk(conn.c,
		"errors",
		"(error_id, project_id, source, name, message, payload)",
		"($%d, $%d, $%d, $%d, $%d, $%d::jsonb)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create webErrors bulk: %s", err)
	}
	conn.webErrorEvents, err = NewBulk(conn.c,
		"events.errors",
		"(session_id, message_id, timestamp, error_id)",
		"($%d, $%d, $%d, $%d)",
		4, 200)
	if err != nil {
		log.Fatalf("can't create webErrorEvents bulk: %s", err)
	}
	conn.webErrorTags, err = NewBulk(conn.c,
		"public.errors_tags",
		"(session_id, message_id, error_id, key, value)",
		"($%d, $%d, $%d, $%d, $%d)",
		5, 200)
	if err != nil {
		log.Fatalf("can't create webErrorEvents bulk: %s", err)
	}
	conn.webIssues, err = NewBulk(conn.c,
		"issues",
		"(project_id, issue_id, type, context_string)",
		"($%d, $%d, $%d, $%d)",
		4, 200)
	if err != nil {
		log.Fatalf("can't create webIssues bulk: %s", err)
	}
	conn.webIssueEvents, err = NewBulk(conn.c,
		"events_common.issues",
		"(session_id, issue_id, timestamp, seq_index, payload)",
		"($%d, $%d, $%d, $%d, CAST($%d AS jsonb))",
		5, 200)
	if err != nil {
		log.Fatalf("can't create webIssueEvents bulk: %s", err)
	}
	conn.webCustomEvents, err = NewBulk(conn.c,
		"events_common.customs",
		"(session_id, seq_index, timestamp, name, payload, level)",
		"($%d, $%d, $%d, LEFT($%d, 2000), $%d, $%d)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create webCustomEvents bulk: %s", err)
	}
	conn.webClickEvents, err = NewBulk(conn.c,
		"events.clicks",
		"(session_id, message_id, timestamp, label, selector, url, path, hesitation)",
		"($%d, $%d, $%d, NULLIF(LEFT($%d, 2000), ''), LEFT($%d, 8000), LEFT($%d, 2000), LEFT($%d, 2000), $%d)",
		8, 200)
	if err != nil {
		log.Fatalf("can't create webClickEvents bulk: %s", err)
	}
	conn.webNetworkRequest, err = NewBulk(conn.c,
		"events_common.requests",
		"(session_id, timestamp, seq_index, url, host, path, query, request_body, response_body, status_code, method, duration, success, transfer_size)",
		"($%d, $%d, $%d, LEFT($%d, 8000), LEFT($%d, 300), LEFT($%d, 2000), LEFT($%d, 8000), $%d, $%d, $%d::smallint, NULLIF($%d, '')::http_method, $%d, $%d, $%d)",
		14, 200)
	if err != nil {
		log.Fatalf("can't create webNetworkRequest bulk: %s", err)
	}
	conn.webCanvasNodes, err = NewBulk(conn.c,
		"events.canvas_recordings",
		"(session_id, recording_id, timestamp)",
		"($%d, $%d, $%d)",
		3, 200)
	conn.webTagTriggers, err = NewBulk(conn.c,
		"events.tags",
		"(session_id, timestamp, seq_index, tag_id)",
		"($%d, $%d, $%d, $%d)",
		4, 200)
	if err != nil {
		log.Fatalf("can't create webCanvasNodes bulk: %s", err)
	}
}

func (conn *BulkSet) Send() {
	newTask := NewBulksTask()

	// Prepare set of bulks to send
	newTask.bulks = append(newTask.bulks, conn.autocompletes)
	newTask.bulks = append(newTask.bulks, conn.requests)
	newTask.bulks = append(newTask.bulks, conn.customEvents)
	newTask.bulks = append(newTask.bulks, conn.webPageEvents)
	newTask.bulks = append(newTask.bulks, conn.webInputDurations)
	newTask.bulks = append(newTask.bulks, conn.webGraphQL)
	newTask.bulks = append(newTask.bulks, conn.webErrors)
	newTask.bulks = append(newTask.bulks, conn.webErrorEvents)
	newTask.bulks = append(newTask.bulks, conn.webErrorTags)
	newTask.bulks = append(newTask.bulks, conn.webIssues)
	newTask.bulks = append(newTask.bulks, conn.webIssueEvents)
	newTask.bulks = append(newTask.bulks, conn.webCustomEvents)
	newTask.bulks = append(newTask.bulks, conn.webClickEvents)
	newTask.bulks = append(newTask.bulks, conn.webNetworkRequest)
	newTask.bulks = append(newTask.bulks, conn.webCanvasNodes)
	newTask.bulks = append(newTask.bulks, conn.webTagTriggers)

	conn.workerTask <- newTask

	// Reset new bulks
	conn.initBulks()
}

func (conn *BulkSet) Stop() {
	conn.done <- struct{}{}
	<-conn.finished
}

func (conn *BulkSet) sendBulks(t *bulksTask) {
	for _, bulk := range t.bulks {
		if err := bulk.Send(); err != nil {
			log.Printf("%s bulk send err: %s", bulk.Table(), err)
		}
	}
}

func (conn *BulkSet) worker() {
	for {
		select {
		case t := <-conn.workerTask:
			conn.sendBulks(t)
		case <-conn.done:
			if len(conn.workerTask) > 0 {
				for t := range conn.workerTask {
					conn.sendBulks(t)
				}
			}
			conn.finished <- struct{}{}
			return
		}
	}
}
