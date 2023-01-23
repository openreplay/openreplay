package main

import (
	"errors"
	"log"
	types2 "openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/pprof"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/internal/db/datasaver"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/handlers"
	custom2 "openreplay/backend/pkg/handlers/custom"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/sessions"
)

func main() {
	metrics := monitoring.New("db")
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := db.New()
	if cfg.UseProfiler {
		pprof.StartProfilingServer()
	}

	// Init database
	pg := cache.NewPGCache(
		postgres.NewConn(cfg.Postgres.String(), cfg.BatchQueueLimit, cfg.BatchSizeLimit, metrics), cfg.ProjectExpirationTimeoutMs)
	defer pg.Close()

	// HandlersFabric returns the list of message handlers we want to be applied to each incoming message.
	handlersFabric := func() []handlers.MessageProcessor {
		return []handlers.MessageProcessor{
			&custom2.EventMapper{},
			custom2.NewInputEventBuilder(),
			custom2.NewPageEventBuilder(),
		}
	}

	// Create handler's aggregator
	builderMap := sessions.NewBuilderMap(handlersFabric)

	// Init modules
	saver := datasaver.New(pg, cfg)
	saver.InitStats()

	msgFilter := []int{messages.MsgMetadata, messages.MsgIssueEvent, messages.MsgSessionStart, messages.MsgSessionEnd,
		messages.MsgUserID, messages.MsgUserAnonymousID, messages.MsgClickEvent,
		messages.MsgIntegrationEvent, messages.MsgPerformanceTrackAggr,
		messages.MsgJSException, messages.MsgResourceTiming,
		messages.MsgCustomEvent, messages.MsgCustomIssue, messages.MsgFetch, messages.MsgNetworkRequest, messages.MsgGraphQL,
		messages.MsgStateAction, messages.MsgSetInputTarget, messages.MsgSetInputValue, messages.MsgCreateDocument,
		messages.MsgMouseClick, messages.MsgSetPageLocation, messages.MsgPageLoadTiming, messages.MsgPageRenderTiming}

	// Handler logic
	msgHandler := func(msg messages.Message) {
		// Just save session data into db without additional checks
		if err := saver.InsertMessage(msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				log.Printf("Message Insertion Error %v, SessionID: %v, Message: %v", err, msg.SessionID(), msg)
			}
			return
		}

		var (
			session *types2.Session
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

		// Handle heuristics and save to temporary queue in memory
		builderMap.HandleMessage(msg)

		// Process saved heuristics messages as usual messages above in the code
		builderMap.IterateSessionReadyMessages(msg.SessionID(), func(msg messages.Message) {
			if err := saver.InsertMessage(msg); err != nil {
				if !postgres.IsPkeyViolation(err) {
					log.Printf("Message Insertion Error %v; Session: %v,  Message %v", err, session, msg)
				}
				return
			}

			if err := saver.InsertStats(session, msg); err != nil {
				log.Printf("Stats Insertion Error %v; Session: %v,  Message %v", err, session, msg)
			}
		})
	}

	// Init consumer
	consumer := queue.NewConsumer(
		cfg.GroupDB,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicAnalytics,
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
		start := time.Now()
		pg.CommitBatches()
		pgDur := time.Now().Sub(start).Milliseconds()

		start = time.Now()
		if err := saver.CommitStats(); err != nil {
			log.Printf("Error on stats commit: %v", err)
		}
		chDur := time.Now().Sub(start).Milliseconds()
		log.Printf("commit duration(ms), pg: %d, ch: %d", pgDur, chDur)

		if err := consumer.Commit(); err != nil {
			log.Printf("Error on consumer commit: %v", err)
		}
	}
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %s: terminating\n", sig.String())
			commitDBUpdates()
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
