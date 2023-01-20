package main

import (
	"errors"
	"log"
	"openreplay/backend/pkg/queue/types"
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
	logger "openreplay/backend/pkg/log"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/sessions"
)

func main() {
	metrics := monitoring.New("db")

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := db.New()

	// Init database
	pg := cache.NewPGCache(postgres.NewConn(cfg.Postgres.String(), cfg.BatchQueueLimit, cfg.BatchSizeLimit, metrics), cfg.ProjectExpirationTimeoutMs)
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

	var producer types.Producer = nil
	if cfg.UseQuickwit {
		producer = queue.NewProducer(cfg.MessageSizeLimit, true)
		defer producer.Close(15000)
	}

	// Init modules
	saver := datasaver.New(pg, producer)
	saver.InitStats()
	statsLogger := logger.NewQueueStats(cfg.LoggerTimeout)

	msgFilter := []int{messages.MsgMetadata, messages.MsgIssueEvent, messages.MsgSessionStart, messages.MsgSessionEnd,
		messages.MsgUserID, messages.MsgUserAnonymousID, messages.MsgCustomEvent, messages.MsgClickEvent,
		messages.MsgInputEvent, messages.MsgPageEvent, messages.MsgErrorEvent, messages.MsgFetchEvent,
		messages.MsgGraphQLEvent, messages.MsgIntegrationEvent, messages.MsgPerformanceTrackAggr,
		messages.MsgResourceEvent, messages.MsgLongTask, messages.MsgJSException, messages.MsgResourceTiming,
		messages.MsgRawCustomEvent, messages.MsgCustomIssue, messages.MsgFetch, messages.MsgGraphQL,
		messages.MsgStateAction, messages.MsgSetInputTarget, messages.MsgSetInputValue, messages.MsgCreateDocument,
		messages.MsgMouseClick, messages.MsgSetPageLocation, messages.MsgPageLoadTiming, messages.MsgPageRenderTiming}

	// Handler logic
	msgHandler := func(msg messages.Message) {
		statsLogger.Collect(msg)

		// Just save session data into db without additional checks
		if err := saver.InsertMessage(msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				log.Printf("Message Insertion Error %v, SessionID: %v, Message: %v", err, msg.SessionID(), msg)
			}
			return
		}

		session, err := pg.GetSession(msg.SessionID())
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
		default:
			// Handle new message from queue
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}
