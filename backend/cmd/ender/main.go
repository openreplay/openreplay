package main

import (
	"log"
	"openreplay/backend/pkg/memory"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"openreplay/backend/internal/config/ender"
	"openreplay/backend/internal/sessionender"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/db/postgres"
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

	pg := cache.NewPGCache(postgres.NewConn(cfg.Postgres.String(), 0, 0), cfg.ProjectExpiration)
	defer pg.Close()

	sessions, err := sessionender.New(intervals.EVENTS_SESSION_END_TIMEOUT, cfg.PartitionsNumber)
	if err != nil {
		log.Printf("can't init ender service: %s", err)
		return
	}

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	consumer := queue.NewConsumer(
		cfg.GroupEnder,
		[]string{cfg.TopicRawWeb},
		messages.NewEnderMessageIterator(
			func(msg messages.Message) { sessions.UpdateSession(msg) },
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
			negativeDuration := make(map[uint64]uint64)
			shorterDuration := make(map[uint64]int64)
			diffDuration := make(map[uint64]int64)
			noSessionInDB := make(map[uint64]uint64)
			updatedDurations := 0
			newSessionEnds := 0

			type SessionEndType int
			const (
				FailedSessionEnd SessionEndType = iota + 1
				DuplicatedSessionEnd
				NegativeDuration
				ShorterDuration
				DiffDuration
				NewSessionEnd
				NoSessionInDB
			)

			// Find ended sessions and send notification to other services
			sessions.HandleEndedSessions(func(sessionID uint64, timestamp uint64) (bool, int) {
				msg := &messages.SessionEnd{Timestamp: timestamp}
				currDuration, err := pg.GetSessionDuration(sessionID)
				if err != nil {
					log.Printf("getSessionDuration failed, sessID: %d, err: %s", sessionID, err)
				}
				sess, err := pg.Cache.GetSession(sessionID)
				if err != nil {
					log.Printf("can't get session from database to compare durations, sessID: %d, err: %s", sessionID, err)
				} else {
					newDur := timestamp - sess.Timestamp
					// Skip if session was ended before with same duration
					if currDuration == newDur {
						duplicatedSessionEnds[sessionID] = currDuration
						return true, int(DuplicatedSessionEnd)
					}
					// Skip if session was ended before with longer duration
					if currDuration > newDur {
						shorterDuration[sessionID] = int64(currDuration) - int64(newDur)
						return true, int(ShorterDuration)
					}
				}
				newDuration, err := pg.InsertSessionEnd(sessionID, msg.Timestamp)
				if err != nil {
					if strings.Contains(err.Error(), "integer out of range") {
						// Skip session with broken duration
						failedSessionEnds[sessionID] = timestamp
						return true, int(FailedSessionEnd)
					}
					if strings.Contains(err.Error(), "is less than zero for uint64") {
						negativeDuration[sessionID] = timestamp
						return true, int(NegativeDuration)
					}
					if strings.Contains(err.Error(), "no rows in result set") {
						noSessionInDB[sessionID] = timestamp
						return true, int(NoSessionInDB)
					}
					log.Printf("can't save sessionEnd to database, sessID: %d, err: %s", sessionID, err)
					return false, 0
				}
				// Check one more time just in case
				if currDuration == newDuration {
					duplicatedSessionEnds[sessionID] = currDuration
					return true, int(DuplicatedSessionEnd)
				}
				if cfg.UseEncryption {
					if key := storage.GenerateEncryptionKey(); key != nil {
						if err := pg.InsertSessionEncryptionKey(sessionID, key); err != nil {
							log.Printf("can't save session encryption key: %s, session will not be encrypted", err)
						} else {
							msg.EncryptionKey = string(key)
						}
					}
				}
				if err := producer.Produce(cfg.TopicRawWeb, sessionID, msg.Encode()); err != nil {
					log.Printf("can't send sessionEnd to topic: %s; sessID: %d", err, sessionID)
					return false, 0
				}
				if currDuration != 0 {
					diffDuration[sessionID] = int64(newDuration) - int64(currDuration)
					updatedDurations++
				} else {
					newSessionEnds++
				}
				return true, int(NewSessionEnd)
			})
			if n := len(failedSessionEnds); n > 0 {
				log.Println("sessions with wrong duration:", n, failedSessionEnds)
			}
			if n := len(negativeDuration); n > 0 {
				log.Println("sessions with negative duration:", n, negativeDuration)
			}
			if n := len(noSessionInDB); n > 0 {
				log.Printf("sessions without info in DB: %d, %v", n, noSessionInDB)
			}
			log.Printf("[INFO] failed: %d, negative: %d, shorter: %d, same: %d, updated: %d, new: %d, not found: %d",
				len(failedSessionEnds), len(negativeDuration), len(shorterDuration), len(duplicatedSessionEnds),
				updatedDurations, newSessionEnds, len(noSessionInDB))
			producer.Flush(cfg.ProducerTimeout)
			if err := consumer.CommitBack(intervals.EVENTS_BACK_COMMIT_GAP); err != nil {
				log.Printf("can't commit messages with offset: %s", err)
			}
		case msg := <-consumer.Rebalanced():
			log.Printf("Rebalanced: %+v", msg)
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
