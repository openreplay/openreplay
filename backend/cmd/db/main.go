package main

import (
	"log"
	"openreplay/backend/internal/config/db"
	"openreplay/backend/internal/datasaver"
	"openreplay/backend/internal/heuristics"
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

	// Init modules
	heurFinder := heuristics.NewHandler()
	saver := datasaver.New(pg)
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
		heurFinder.HandleMessage(session, msg)

		// Process saved heuristics messages as usual messages above in the code
		heurFinder.IterateSessionReadyMessages(sessionID, func(msg messages.Message) {
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
			cfg.TopicRawIOS,
			cfg.TopicTrigger,
		},
		handler,
		false,
	)

	log.Printf("Db service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(cfg.CommitBatchTimeout)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			consumer.Close()
			os.Exit(0)
		case <-tick:
			pg.CommitBatches()
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
