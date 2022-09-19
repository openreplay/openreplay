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
	pg := cache.NewPGCache(postgres.NewConn(cfg.Postgres, cfg.BatchQueueLimit, cfg.BatchSizeLimit, metrics), cfg.ProjectExpirationTimeoutMs)
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

	keepMessage := func(tp int) bool {
		return tp == messages.MsgMetadata || tp == messages.MsgIssueEvent || tp == messages.MsgSessionStart || tp == messages.MsgSessionEnd || tp == messages.MsgUserID || tp == messages.MsgUserAnonymousID || tp == messages.MsgCustomEvent || tp == messages.MsgClickEvent || tp == messages.MsgInputEvent || tp == messages.MsgPageEvent || tp == messages.MsgErrorEvent || tp == messages.MsgFetchEvent || tp == messages.MsgGraphQLEvent || tp == messages.MsgIntegrationEvent || tp == messages.MsgPerformanceTrackAggr || tp == messages.MsgResourceEvent || tp == messages.MsgLongTask || tp == messages.MsgJSException || tp == messages.MsgResourceTiming || tp == messages.MsgRawCustomEvent || tp == messages.MsgCustomIssue || tp == messages.MsgFetch || tp == messages.MsgGraphQL || tp == messages.MsgStateAction || tp == messages.MsgSetInputTarget || tp == messages.MsgSetInputValue || tp == messages.MsgCreateDocument || tp == messages.MsgMouseClick || tp == messages.MsgSetPageLocation || tp == messages.MsgPageLoadTiming || tp == messages.MsgPageRenderTiming
	}

	var producer types.Producer = nil
	if cfg.UseQuickwit {
		producer = queue.NewProducer(cfg.MessageSizeLimit, true)
		defer producer.Close(15000)
	}

	// Init modules
	saver := datasaver.New(pg, producer)
	saver.InitStats()
	statsLogger := logger.NewQueueStats(cfg.LoggerTimeout)

	// Handler logic
	handler := func(sessionID uint64, iter messages.Iterator, meta *types.Meta) {
		statsLogger.Collect(sessionID, meta)

		for iter.Next() {
			if !keepMessage(iter.Type()) {
				continue
			}
			msg := iter.Message().Decode()
			if msg == nil {
				return
			}

			// Just save session data into db without additional checks
			if err := saver.InsertMessage(sessionID, msg); err != nil {
				if !postgres.IsPkeyViolation(err) {
					log.Printf("Message Insertion Error %v, SessionID: %v, Message: %v", err, sessionID, msg)
				}
				return
			}

			session, err := pg.GetSession(sessionID)
			if session == nil {
				if err != nil && !errors.Is(err, cache.NilSessionInCacheError) {
					log.Printf("Error on session retrieving from cache: %v, SessionID: %v, Message: %v", err, sessionID, msg)
				}
				return
			}

			// Save statistics to db
			err = saver.InsertStats(session, msg)
			if err != nil {
				log.Printf("Stats Insertion Error %v; Session: %v, Message: %v", err, session, msg)
			}

			// Handle heuristics and save to temporary queue in memory
			builderMap.HandleMessage(sessionID, msg, msg.Meta().Index)

			// Process saved heuristics messages as usual messages above in the code
			builderMap.IterateSessionReadyMessages(sessionID, func(msg messages.Message) {
				if err := saver.InsertMessage(sessionID, msg); err != nil {
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
		iter.Close()
	}

	// Init consumer
	consumer := queue.NewMessageConsumer(
		cfg.GroupDB,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicAnalytics,
		},
		handler,
		false,
		cfg.MessageSizeLimit,
	)

	log.Printf("Db service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	commitTick := time.Tick(cfg.CommitBatchTimeout)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			consumer.Close()
			os.Exit(0)
		case <-commitTick:
			// Send collected batches to db
			start := time.Now()
			pg.CommitBatches()
			pgDur := time.Now().Sub(start).Milliseconds()

			start = time.Now()
			if err := saver.CommitStats(consumer.HasFirstPartition()); err != nil {
				log.Printf("Error on stats commit: %v", err)
			}
			chDur := time.Now().Sub(start).Milliseconds()
			log.Printf("commit duration(ms), pg: %d, ch: %d", pgDur, chDur)

			// TODO: use commit worker to save time each tick
			if err := consumer.Commit(); err != nil {
				log.Printf("Error on consumer commit: %v", err)
			}
		default:
			// Handle new message from queue
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}
