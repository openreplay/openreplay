package main

import (
	"log"
	"openreplay/backend/internal/builder"
	"openreplay/backend/internal/config/db"
	"openreplay/backend/internal/datasaver"
	"openreplay/backend/internal/handlers"
	"openreplay/backend/internal/handlers/custom"
	"time"

	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/db/postgres"
	logger "openreplay/backend/pkg/log"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := db.New()

	// Init database
	pg := cache.NewPGCache(postgres.NewConn(cfg.Postgres), cfg.ProjectExpirationTimeoutMs)
	defer pg.Close()

	// HandlersFabric returns the list of message handlers we want to be applied to each incoming message.
	handlersFabric := func() []handlers.MessageProcessor {
		return []handlers.MessageProcessor{
			&custom.EventMapper{},
			custom.NewInputEventBuilder(),
			custom.NewPageEventBuilder(),
		}
	}

	// Create handler's aggregator
	builderMap := builder.NewBuilderMap(handlersFabric)

	// Init modules
	saver := datasaver.New(pg)
	saver.InitStats()
	statsLogger := logger.NewQueueStats(cfg.LoggerTimeout)

	// Handler logic
	handler := func(sessionID uint64, msg messages.Message, meta *types.Meta) {
		statsLogger.Collect(sessionID, meta)

		// Just save session data into db without additional checks
		if err := saver.InsertMessage(sessionID, msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				log.Printf("Message Insertion Error %v, SessionID: %v, Message: %v", err, sessionID, msg)
			}
			return
		}

		// Try to get session from db for the following handlers
		session, err := pg.GetSession(sessionID)
		if err != nil {
			// Might happen due to the assets-related message TODO: log only if session is necessary for this kind of message
			log.Printf("Error on session retrieving from cache: %v, SessionID: %v, Message: %v", err, sessionID, msg)
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
			// TODO: DRY code (carefully with the return statement logic)
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

	// Init consumer
	consumer := queue.NewMessageConsumer(
		cfg.GroupDB,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicRawIOS,
			cfg.TopicTrigger, // to receive SessionEnd events
		},
		handler,
		false,
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
			pg.CommitBatches()
			if err := saver.CommitStats(); err != nil {
				log.Printf("Error on stats commit: %v", err)
			}
			// TODO?: separate stats & regular messages
			if err := consumer.Commit(); err != nil {
				log.Printf("Error on consumer commit: %v", err)
			}
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on consumption: %v", err) // TODO: is always fatal?
			}
		}
	}
}
