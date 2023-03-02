package main

import (
	"errors"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/internal/db/datasaver"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/queue"
)

func main() {
	m := metrics.New()
	m.Register(databaseMetrics.List())

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := db.New()

	// Init database
	pg := cache.NewPGCache(
		postgres.NewConn(cfg.Postgres.String(), cfg.BatchQueueLimit, cfg.BatchSizeLimit), cfg.ProjectExpirationTimeoutMs)
	defer pg.Close()

	// Init modules
	saver := datasaver.New(pg, cfg)
	saver.InitStats()

	msgFilter := []int{messages.MsgMetadata, messages.MsgIssueEvent, messages.MsgSessionStart, messages.MsgSessionEnd,
		messages.MsgUserID, messages.MsgUserAnonymousID, messages.MsgIntegrationEvent, messages.MsgPerformanceTrackAggr,
		messages.MsgJSException, messages.MsgResourceTiming, messages.MsgCustomEvent, messages.MsgCustomIssue,
		messages.MsgFetch, messages.MsgNetworkRequest, messages.MsgGraphQL, messages.MsgStateAction,
		messages.MsgSetInputTarget, messages.MsgSetInputValue, messages.MsgCreateDocument, messages.MsgMouseClick,
		messages.MsgSetPageLocation, messages.MsgPageLoadTiming, messages.MsgPageRenderTiming,
		messages.MsgInputEvent, messages.MsgPageEvent}

	// Handler logic
	msgHandler := func(msg messages.Message) {
		// Convert customIssue
		switch m := msg.(type) {
		case *messages.CustomEvent:
			msg = &messages.IssueEvent{
				Type:          "custom",
				Timestamp:     m.Time(),
				MessageID:     m.MsgID(),
				ContextString: m.Name,
				Payload:       m.Payload,
			}
		}

		// Just save session data into db without additional checks
		if err := saver.InsertMessage(msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				log.Printf("Message Insertion Error %v, SessionID: %v, Message: %v", err, msg.SessionID(), msg)
			}
			return
		}

		// Get sessionID
		var (
			session *types.Session
			err     error
		)
		if msg.TypeID() == messages.MsgSessionEnd {
			session, err = pg.GetSession(msg.SessionID())
		} else {
			session, err = pg.Cache.GetSession(msg.SessionID())
		}
		if session == nil {
			if err != nil && !errors.Is(err, cache.NilSessionInCacheError) {
				log.Printf("Error on session retrieving from cache: %v, SessionID: %v, Message: %v", err, msg.SessionID(), msg)
			}
			return
		}

		// Save statistics to db
		err = saver.InsertStats(session, msg)
		if err != nil {
			log.Printf("Stats Insertion Error %v; Session: %v, Message: %v", err, session, msg)
		}
	}

	// Init consumer
	consumer := queue.NewConsumer(
		cfg.GroupDB,
		[]string{
			cfg.TopicRawWeb,    // from tracker
			cfg.TopicAnalytics, // from heuristics
		},
		messages.NewMessageIterator(msgHandler, msgFilter, true),
		false,
		cfg.MessageSizeLimit,
	)

	log.Printf("Db service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	commitTick := time.Tick(cfg.CommitBatchTimeout)

	// Send collected batches to db
	commitDBUpdates := func() {
		// Commit collected batches and bulks of information to PG
		pg.Commit()
		// Commit collected batches of information to CH
		if err := saver.CommitStats(); err != nil {
			log.Printf("Error on stats commit: %v", err)
		}
		// Commit current position in queue
		if err := consumer.Commit(); err != nil {
			log.Printf("Error on consumer commit: %v", err)
		}
	}

	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %s: terminating\n", sig.String())
			commitDBUpdates()
			if err := pg.Close(); err != nil {
				log.Printf("db.Close error: %s", err)
			}
			if err := saver.Close(); err != nil {
				log.Printf("saver.Close error: %s", err)
			}
			consumer.Close()
			os.Exit(0)
		case <-commitTick:
			commitDBUpdates()
		case msg := <-consumer.Rebalanced():
			log.Println(msg)
		default:
			// Handle new message from queue
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}
