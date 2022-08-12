package postgres

import (
	"log"
	"time"
)

type BulkSet struct {
	c                Pool
	autocompletes    Bulk
	requests         Bulk
	customEvents     Bulk
	webPageEvents    Bulk
	webInputEvents   Bulk
	webGraphQLEvents Bulk
}

func NewBulkSet(c Pool) *BulkSet {
	bs := &BulkSet{
		c: c,
	}
	bs.initBulks()
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
	case "webGraphQLEvents":
		return conn.webGraphQLEvents
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
		3, 100)
	if err != nil {
		log.Fatalf("can't create autocomplete bulk")
	}
	conn.requests, err = NewBulk(conn.c,
		"events_common.requests",
		"(session_id, timestamp, seq_index, url, duration, success)",
		"($%d, $%d, $%d, left($%d, 2700), $%d, $%d)",
		6, 100)
	if err != nil {
		log.Fatalf("can't create requests bulk")
	}
	conn.customEvents, err = NewBulk(conn.c,
		"events_common.customs",
		"(session_id, timestamp, seq_index, name, payload)",
		"($%d, $%d, $%d, left($%d, 2700), $%d)",
		5, 100)
	if err != nil {
		log.Fatalf("can't create customEvents bulk")
	}
	conn.webPageEvents, err = NewBulk(conn.c,
		"events.pages",
		"(session_id, message_id, timestamp, referrer, base_referrer, host, path, query, dom_content_loaded_time, "+
			"load_time, response_end, first_paint_time, first_contentful_paint_time, speed_index, visually_complete, "+
			"time_to_interactive, response_time, dom_building_time)",
		"($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0),"+
			" NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0))",
		18, 100)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk")
	}
	conn.webInputEvents, err = NewBulk(conn.c,
		"events.inputs",
		"(session_id, message_id, timestamp, value, label)",
		"($%d, $%d, $%d, $%d, NULLIF($%d,''))",
		5, 100)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk")
	}
	conn.webGraphQLEvents, err = NewBulk(conn.c,
		"events.graphql",
		"(session_id, timestamp, message_id, name, request_body, response_body)",
		"($%d, $%d, $%d, left($%d, 2700), $%d, $%d)",
		6, 100)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk")
	}

}

func (conn *BulkSet) Send() {
	// Prepare set of bulks to send
	bulksToSend := []Bulk{conn.autocompletes, conn.requests, conn.customEvents, conn.webPageEvents, conn.webInputEvents, conn.webGraphQLEvents}
	// Reset new bulks
	conn.initBulks()
	// Send "old" bulks in goroutine (to save time on insert operations)
	go func() {
		start := time.Now()
		for _, b := range bulksToSend {
			if err := b.Send(); err != nil {
				log.Printf("%s bulk send err: %s", b.Table(), err)
			}
		}
		bulksToSend = nil
		log.Printf("bulks insert duration(ms): %d", time.Now().Sub(start).Milliseconds())
	}()
	return
}
