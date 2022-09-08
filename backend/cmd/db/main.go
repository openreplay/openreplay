package main

import (
	"context"
	"github.com/jackc/pgx/v4/pgxpool"
	"log"
	"openreplay/backend/pkg/db/autocomplete"
	"openreplay/backend/pkg/db/batch"
	"openreplay/backend/pkg/db/events"
	"openreplay/backend/pkg/db/stats"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions/cache"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/internal/db/datasaver"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/handlers"
	custom2 "openreplay/backend/pkg/handlers/custom"
	logger "openreplay/backend/pkg/log"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/sessions-builder"
	sessions "openreplay/backend/pkg/sessions/storage/postgres"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)
	metrics := monitoring.New("db")
	cfg := db.New()

	// Create pool of connections to DB (postgres)
	rawConn, err := pgxpool.Connect(context.Background(), cfg.Postgres)
	if err != nil {
		log.Fatalf("pgxpool.Connect err: %s", err)
	}
	// Create pool wrapper
	conn, err := postgres.NewPool(rawConn, metrics)
	if err != nil {
		log.Fatalf("can't create new pool wrapper: %s", err)
	}
	// Create cache level for projects and sessions-builder
	sessionsCache, err := cache.New(conn, cfg.ProjectExpirationTimeoutMs)
	if err != nil {
		log.Fatalf("can't create cacher, err: %s", err)
	}
	// Create db layer with all necessary methods
	autocompletes, err := autocomplete.New(conn)
	if err != nil {
		log.Fatalf("can't init autocomplete: %s", err)
	}
	sessionEvents, err := events.NewConn(conn, sessionsCache, cfg.BatchQueueLimit, cfg.BatchSizeLimit, metrics, autocompletes)
	if err != nil {
		log.Fatalf("can't init db service: %s", err)
	}
	batches := batch.New(conn, cfg.BatchQueueLimit, cfg.BatchSizeLimit, metrics)
	sessionsService, err := sessions.New(conn, sessionsCache, batches, autocompletes)
	if err != nil {
		log.Fatalf("can't init sessions: %s", err)
	}

	analytics, err := stats.New(conn, batches)
	if err != nil {
		log.Fatalf("can't create analytics: %s", err)
	}

	// HandlersFabric returns the list of message handlers we want to be applied to each incoming message.
	handlersFabric := func() []handlers.MessageProcessor {
		return []handlers.MessageProcessor{
			&custom2.EventMapper{},
			custom2.NewInputEventBuilder(),
			custom2.NewPageEventBuilder(),
		}
	}

	// Create handler's aggregator
	builderMap := sessions_builder.NewBuilderMap(handlersFabric)

	var producer types.Producer = nil
	if cfg.UseQuickwit {
		producer = queue.NewProducer(cfg.MessageSizeLimit, true)
		defer producer.Close(15000)
	}

	// Init modules
	saver, err := datasaver.New(sessionsService, sessionsCache, sessionEvents, analytics, producer)
	if err != nil {
		log.Fatalf("can't init events saver: %s", err)
	}
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
			if !events.IsPkeyViolation(err) {
				log.Printf("Message Insertion Error %v, SessionID: %v, Message: %v", err, msg.SessionID(), msg)
			}
			return
		}

		// Save statistics to db
		err = saver.InsertStats(msg.SessionID(), msg)
		if err != nil {
			log.Printf("Stats Insertion Error %v; Session: %s, Message: %v", err, msg.SessionID(), msg)
		}

		// Handle heuristics and save to temporary queue in memory
		builderMap.HandleMessage(msg)

		// Process saved heuristics messages as usual messages above in the code
		builderMap.IterateSessionReadyMessages(msg.SessionID(), func(msg messages.Message) {
			if err := saver.InsertMessage(msg); err != nil {
				if !events.IsPkeyViolation(err) {
					log.Printf("Message Insertion Error %v; Session: %s,  Message %v", err, msg.SessionID(), msg)
				}
				return
			}

			if err := saver.InsertStats(msg.SessionID(), msg); err != nil {
				log.Printf("Stats Insertion Error %v; Session: %s,  Message %v", err, msg.SessionID(), msg)
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
		sessionEvents.Commit()
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
