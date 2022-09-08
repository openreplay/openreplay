package main

import (
	"context"
	"github.com/jackc/pgx/v4/pgxpool"
	"log"

	"openreplay/backend/pkg/db/autocomplete"
	"openreplay/backend/pkg/db/batch"

	"openreplay/backend/pkg/sessions/cache"
	sessions "openreplay/backend/pkg/sessions/storage/postgres"

	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/config/ender"
	service "openreplay/backend/internal/ender"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/intervals"
	logger "openreplay/backend/pkg/log"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/queue"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)
	metrics := monitoring.New("ender")
	cfg := ender.New()

	// Create pool of connections to DB (postgres)
	conn, err := pgxpool.Connect(context.Background(), cfg.Postgres)
	if err != nil {
		log.Fatalf("pgxpool.Connect err: %s", err)
	}
	// Create pool wrapper
	connWrapper, err := postgres.NewPool(conn, metrics)
	if err != nil {
		log.Fatalf("can't create new pool wrapper: %s", err)
	}
	// Create cache level for projects and sessions-builder
	cacheService, err := cache.New(connWrapper, cfg.ProjectExpirationTimeoutMs)
	if err != nil {
		log.Fatalf("can't create cacher, err: %s", err)
	}
	batches := batch.New(connWrapper, cfg.BatchQueueLimit, cfg.BatchSizeLimit, metrics)
	autocompletes, err := autocomplete.New(connWrapper)
	if err != nil {
		log.Fatalf("can't init autocompletes: %s", err)
	}
	// Sessions
	sessionService, err := sessions.New(connWrapper, cacheService, batches, autocompletes)
	if err != nil {
		log.Fatalf("can't create session service: %s", err)
	}

	// Init all modules
	statsLogger := logger.NewQueueStats(cfg.LoggerTimeout)
	sessions, err := service.New(metrics, intervals.EVENTS_SESSION_END_TIMEOUT, cfg.PartitionsNumber)
	if err != nil {
		log.Printf("can't init ender service: %s", err)
		return
	}
	producer := queue.NewProducer(cfg.MessageSizeLimit, true)

	msgHandler := func(msg messages.Message) {
		if msg.TypeID() == messages.MsgSessionStart || msg.TypeID() == messages.MsgSessionEnd {
			return
		}
		if msg.Meta().Timestamp == 0 {
			log.Printf("ZERO TS, sessID: %d, msgType: %d", msg.Meta().SessionID(), msg.TypeID())
		}
		statsLogger.Collect(msg)
		sessions.UpdateSession(msg)
	}

	consumer := queue.NewConsumer(
		cfg.GroupEnder,
		[]string{
			cfg.TopicRawWeb,
		},
		messages.NewMessageIterator(msgHandler, nil, false),
		false,
		cfg.MessageSizeLimit,
	)

	log.Printf("Ender service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(intervals.EVENTS_COMMIT_INTERVAL * time.Millisecond)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			producer.Close(cfg.ProducerTimeout)
			if err := consumer.CommitBack(intervals.EVENTS_BACK_COMMIT_GAP); err != nil {
				log.Printf("can't commit messages with offset: %s", err)
			}
			consumer.Close()
			os.Exit(0)
		case <-tick:
			// Find ended sessions-builder and send notification to other services
			sessions.HandleEndedSessions(func(sessionID uint64, timestamp int64) bool {
				msg := &messages.SessionEnd{Timestamp: uint64(timestamp)}
				err := sessionService.InsertSessionEnd(sessionID, msg)
				if err != nil {
					log.Printf("can't save sessionEnd to database, sessID: %d, err: %s", sessionID, err)
					return false
				}
				if err := producer.Produce(cfg.TopicRawWeb, sessionID, msg.Encode()); err != nil {
					log.Printf("can't send sessionEnd to topic: %s; sessID: %d", err, sessionID)
					return false
				}
				return true
			})
			producer.Flush(cfg.ProducerTimeout)
			if err := consumer.CommitBack(intervals.EVENTS_BACK_COMMIT_GAP); err != nil {
				log.Printf("can't commit messages with offset: %s", err)
			}
		default:
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consuming: %v", err)
			}
		}
	}
}
