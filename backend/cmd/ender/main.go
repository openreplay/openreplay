package main

import (
	"log"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/sessions"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"openreplay/backend/internal/config/ender"
	"openreplay/backend/internal/sessionender"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/intervals"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	enderMetrics "openreplay/backend/pkg/metrics/ender"
	"openreplay/backend/pkg/queue"
)

func main() {
	m := metrics.New()
	m.Register(enderMetrics.List())
	m.Register(databaseMetrics.List())

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := ender.New()

	// Init postgres connection
	pgConn, err := pool.New(cfg.Postgres.String())
	if err != nil {
		log.Printf("can't init postgres connection: %s", err)
		return
	}
	defer pgConn.Close()

	// Init redis connection
	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Printf("can't init redis connection: %s", err)
	}
	defer redisClient.Close()

	projManager := projects.New(pgConn, redisClient)
	sessManager := sessions.New(pgConn, projManager, redisClient)

	sessionEndGenerator, err := sessionender.New(intervals.EVENTS_SESSION_END_TIMEOUT, cfg.PartitionsNumber)
	if err != nil {
		log.Printf("can't init ender service: %s", err)
		return
	}

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	consumer := queue.NewConsumer(
		cfg.GroupEnder,
		[]string{cfg.TopicRawWeb},
		messages.NewEnderMessageIterator(
			func(msg messages.Message) { sessionEndGenerator.UpdateSession(msg) },
			[]int{messages.MsgTimestamp},
			false),
		false,
		cfg.MessageSizeLimit,
	)

	memoryManager, err := memory.NewManager(cfg.MemoryLimitMB, cfg.MaxMemoryUsage)
	if err != nil {
		log.Printf("can't init memory manager: %s", err)
		return
	}

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
			failedSessionEnds := make(map[uint64]uint64)
			duplicatedSessionEnds := make(map[uint64]uint64)

			// Find ended sessions and send notification to other services
			sessionEndGenerator.HandleEndedSessions(func(sessionID uint64, timestamp uint64) bool {
				msg := &messages.SessionEnd{Timestamp: timestamp}
				currDuration, err := sessManager.GetDuration(sessionID)
				if err != nil {
					log.Printf("getSessionDuration failed, sessID: %d, err: %s", sessionID, err)
				}
				newDuration, err := sessManager.UpdateDuration(sessionID, msg.Timestamp)
				if err != nil {
					if strings.Contains(err.Error(), "integer out of range") {
						// Skip session with broken duration
						failedSessionEnds[sessionID] = timestamp
						return true
					}
					log.Printf("can't save sessionEnd to database, sessID: %d, err: %s", sessionID, err)
					return false
				}
				if currDuration == newDuration {
					// Skip session end duplicate
					duplicatedSessionEnds[sessionID] = currDuration
					return true
				}
				if cfg.UseEncryption {
					if key := storage.GenerateEncryptionKey(); key != nil {
						if err := sessManager.UpdateEncryptionKey(sessionID, key); err != nil {
							log.Printf("can't save session encryption key: %s, session will not be encrypted", err)
						} else {
							msg.EncryptionKey = string(key)
						}
					}
				}
				if err := producer.Produce(cfg.TopicRawWeb, sessionID, msg.Encode()); err != nil {
					log.Printf("can't send sessionEnd to topic: %s; sessID: %d", err, sessionID)
					return false
				}
				return true
			})
			if len(failedSessionEnds) > 0 {
				log.Println("sessions with wrong duration:", failedSessionEnds)
			}
			if len(duplicatedSessionEnds) > 0 {
				log.Println("session end duplicates:", duplicatedSessionEnds)
			}
			producer.Flush(cfg.ProducerTimeout)
			if err := consumer.CommitBack(intervals.EVENTS_BACK_COMMIT_GAP); err != nil {
				log.Printf("can't commit messages with offset: %s", err)
			}
		case msg := <-consumer.Rebalanced():
			log.Println(msg)
		default:
			if !memoryManager.HasFreeMemory() {
				continue
			}
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consuming: %v", err)
			}
		}
	}
}
