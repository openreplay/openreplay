package events

import (
	"errors"
	"log"
	"openreplay/backend/pkg/db/autocomplete"
	"openreplay/backend/pkg/db/batch"
	"openreplay/backend/pkg/db/bulk"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/sessions/cache"
)

type Events interface {
	InsertPageEvent(event *messages.PageEvent) error
	InsertClickEvent(event *messages.ClickEvent) error
	InsertInputEvent(event *messages.InputEvent) error
	InsertIssueEvent(event *messages.IssueEvent) error
	InsertErrorEvent(event *messages.ErrorEvent) error
	InsertFetchEvent(event *messages.FetchEvent) error
	InsertGraphQLEvent(event *messages.GraphQLEvent) error
	InsertCustomEvent(event *messages.CustomEvent) error
	Commit()
	Close() error
}

// Conn contains batches, bulks and cache for all sessions-builder
type eventsImpl struct {
	db       postgres.Pool
	sessions cache.Sessions
	batches  batch.Batches
	// bulks (common) -> commit method
	requests         bulk.Bulk
	customEvents     bulk.Bulk
	webPageEvents    bulk.Bulk
	webInputEvents   bulk.Bulk
	webGraphQLEvents bulk.Bulk
	autocompletes    autocomplete.Autocompletes
}

func NewConn(pool postgres.Pool, cacher cache.Sessions, queueLimit, sizeLimit int, metrics *monitoring.Metrics, autocompletes autocomplete.Autocompletes) (Events, error) {
	switch {
	case pool == nil:
		return nil, errors.New("db is empty")
	case cacher == nil:
		return nil, errors.New("cache is empty")
	case metrics == nil:
		return nil, errors.New("metrics is empty")
	case autocompletes == nil:
		return nil, errors.New("autocompletes is empty")
	}
	conn := &eventsImpl{
		db:            pool,
		sessions:      cacher,
		batches:       batch.New(pool, queueLimit, sizeLimit, metrics),
		autocompletes: autocompletes,
	}
	conn.initBulks()
	return conn, nil
}

func (e *eventsImpl) Close() error {
	e.db.Close()
	return nil
}

func (e *eventsImpl) initBulks() {
	var err error
	e.requests, err = bulk.NewBulk(e.db,
		"events_common.requests",
		"(session_id, timestamp, seq_index, url, duration, success)",
		"($%d, $%d, $%d, left($%d, 2700), $%d, $%d)",
		6, 100)
	if err != nil {
		log.Fatalf("can't create requests bulk")
	}
	e.customEvents, err = bulk.NewBulk(e.db,
		"events_common.customs",
		"(session_id, timestamp, seq_index, name, payload)",
		"($%d, $%d, $%d, left($%d, 2700), $%d)",
		5, 100)
	if err != nil {
		log.Fatalf("can't create customEvents bulk")
	}
	e.webPageEvents, err = bulk.NewBulk(e.db,
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
	e.webInputEvents, err = bulk.NewBulk(e.db,
		"events.inputs",
		"(session_id, message_id, timestamp, value, label)",
		"($%d, $%d, $%d, $%d, NULLIF($%d,''))",
		5, 100)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk")
	}
	e.webGraphQLEvents, err = bulk.NewBulk(e.db,
		"events.graphql",
		"(session_id, timestamp, message_id, name, request_body, response_body)",
		"($%d, $%d, $%d, left($%d, 2700), $%d, $%d)",
		6, 100)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk")
	}
}

func (e *eventsImpl) sendBulks() {
	if err := e.requests.Send(); err != nil {
		log.Printf("requests bulk send err: %s", err)
	}
	if err := e.customEvents.Send(); err != nil {
		log.Printf("customEvents bulk send err: %s", err)
	}
	if err := e.webPageEvents.Send(); err != nil {
		log.Printf("webPageEvents bulk send err: %s", err)
	}
	if err := e.webInputEvents.Send(); err != nil {
		log.Printf("webInputEvents bulk send err: %s", err)
	}
	if err := e.webGraphQLEvents.Send(); err != nil {
		log.Printf("webGraphQLEvents bulk send err: %s", err)
	}
}

func (e *eventsImpl) Commit() {
	e.sendBulks()
	e.batches.Commit()
}
