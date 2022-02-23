package main

import (
	"log"
	"time"

	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/env"
	logger "openreplay/backend/pkg/log"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/services/db/heuristics"
)

var pg *cache.PGCache

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	initStats()
	pg = cache.NewPGCache(postgres.NewConn(env.String("POSTGRES_STRING")), 1000*60*20)
	defer pg.Close()

	heurFinder := heuristics.NewHandler()

	statsLogger := logger.NewQueueStats(env.Int("LOG_QUEUE_STATS_INTERVAL_SEC"))

	consumer := queue.NewMessageConsumer(
		env.String("GROUP_DB"),
		[]string{
			env.String("TOPIC_RAW_IOS"),
			env.String("TOPIC_TRIGGER"),
		},
		func(sessionID uint64, msg messages.Message, meta *types.Meta) {
			statsLogger.HandleAndLog(sessionID, meta)

			if err := insertMessage(sessionID, msg); err != nil {
				if !postgres.IsPkeyViolation(err) {
					log.Printf("Message Insertion Error %v, SessionID: %v, Message: %v", err, sessionID, msg)
				}
				return
			}

			session, err := pg.GetSession(sessionID)
			if err != nil {
				// Might happen due to the assets-related message TODO: log only if session is necessary for this kind of message
				log.Printf("Error on session retrieving from cache: %v, SessionID: %v, Message: %v", err, sessionID, msg)
				return
			}

			err = insertStats(session, msg)
			if err != nil {
				log.Printf("Stats Insertion Error %v; Session: %v, Message: %v", err, session, msg)
			}

			heurFinder.HandleMessage(session, msg)
			heurFinder.IterateSessionReadyMessages(sessionID, func(msg messages.Message) {
				// TODO: DRY code (carefully with the return statement logic)
				if err := insertMessage(sessionID, msg); err != nil {
					if !postgres.IsPkeyViolation(err) {
						log.Printf("Message Insertion Error %v; Session: %v,  Message %v", err, session, msg)
					}
					return
				}

				if err := insertStats(session, msg); err != nil {
					log.Printf("Stats Insertion Error %v; Session: %v,  Message %v", err, session, msg)
				}
			})
		},
	)
	consumer.DisableAutoCommit()

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(15 * time.Second)

	log.Printf("Db service started\n")
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			consumer.Close()
			os.Exit(0)
		case <-tick:
			pg.CommitBatches()
			if err := commitStats(); err != nil {
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
