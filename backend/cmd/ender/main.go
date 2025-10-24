package main

import (
	"context"
	"fmt"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue/types"
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
	ctx := context.Background()
	log := logger.New()
	cfg := ender.New(log)
	metrics.New(log, append(enderMetrics.List(), databaseMetrics.List()...))

	pgConn, err := pool.New(cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Warn(ctx, "can't init redis connection: %s", err)
	}
	defer redisClient.Close()

	projManager := projects.New(log, pgConn, redisClient)
	sessManager := sessions.New(log, pgConn, projManager, redisClient)

	sessionEndGenerator, err := sessionender.New(intervals.EVENTS_SESSION_END_TIMEOUT, cfg.PartitionsNumber)
	if err != nil {
		log.Fatal(ctx, "can't init ender service: %s", err)
	}

	mobileMessages := []int{90, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 107, 110, 111}

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	consumer := queue.NewConsumer(
		cfg.GroupEnder,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicRawMobile,
		},
		messages.NewEnderMessageIterator(
			log,
			func(msg messages.Message) { sessionEndGenerator.UpdateSession(msg) },
			append([]int{messages.MsgTimestamp}, mobileMessages...),
			false),
		false,
		cfg.MessageSizeLimit,
		func(t types.RebalanceType, partitions []uint64) {
			if t == types.RebalanceTypeRevoke {
				sessionEndGenerator.Disable()
			} else {
				sessionEndGenerator.ActivePartitions(partitions)
				sessionEndGenerator.Enable()
			}
		},
	)

	memoryManager, err := memory.NewManager(log, cfg.MemoryLimitMB, cfg.MaxMemoryUsage)
	if err != nil {
		log.Fatal(ctx, "can't init memory manager: %s", err)
	}

	log.Info(ctx, "Ender service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(intervals.EVENTS_COMMIT_INTERVAL * time.Millisecond)
	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "Caught signal %v: terminating", sig)
			producer.Close(cfg.ProducerTimeout)
			if err := consumer.CommitBack(intervals.EVENTS_BACK_COMMIT_GAP); err != nil {
				log.Error(ctx, "can't commit messages with offset: %s", err)
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
			sessionEndGenerator.HandleEndedSessions(func(sessionID uint64, timestamp uint64) (bool, int) {
				sessCtx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", sessionID))
				msg := &messages.SessionEnd{Timestamp: timestamp}
				currDuration, err := sessManager.GetDuration(sessionID)
				if err != nil {
					log.Error(sessCtx, "getSessionDuration failed, err: %s", err)
				}
				sess, err := sessManager.Get(sessionID)
				if err != nil {
					log.Error(sessCtx, "can't get session from database to compare durations, err: %s", err)
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
				newDuration, err := sessManager.UpdateDuration(sessionID, msg.Timestamp)
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
					log.Error(sessCtx, "can't update session duration, err: %s", err)
					return false, 0
				}
				// Check one more time just in case
				if currDuration == newDuration {
					duplicatedSessionEnds[sessionID] = currDuration
					return true, int(DuplicatedSessionEnd)
				}
				if cfg.UseEncryption {
					if key := storage.GenerateEncryptionKey(); key != nil {
						if err := sessManager.UpdateEncryptionKey(sessionID, key); err != nil {
							log.Warn(sessCtx, "can't save session encryption key: %s, session will not be encrypted", err)
						} else {
							msg.EncryptionKey = string(key)
						}
					}
				}
				if sess != nil && (sess.Platform == "ios" || sess.Platform == "android") {
					msg := &messages.MobileSessionEnd{Timestamp: timestamp}
					if err := producer.Produce(cfg.TopicRawMobile, sessionID, msg.Encode()); err != nil {
						log.Error(sessCtx, "can't send MobileSessionEnd to mobile topic: %s", err)
						return false, 0
					}
					// Inform canvas service about session end
					if err := producer.Produce(cfg.TopicRawImages, sessionID, msg.Encode()); err != nil {
						log.Error(sessCtx, "can't send MobileSessionEnd signal to canvas topic: %s", err)
					}
				} else {
					if err := producer.Produce(cfg.TopicRawWeb, sessionID, msg.Encode()); err != nil {
						log.Error(sessCtx, "can't send sessionEnd to raw topic: %s", err)
						return false, 0
					}
					// Inform canvas service about session end
					if err := producer.Produce(cfg.TopicCanvasImages, sessionID, msg.Encode()); err != nil {
						log.Error(sessCtx, "can't send sessionEnd signal to canvas topic: %s", err)
					}
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
				log.Info(ctx, "sessions with wrong duration: %d, %v", n, failedSessionEnds)
			}
			if n := len(negativeDuration); n > 0 {
				log.Info(ctx, "sessions with negative duration: %d, %v", n, negativeDuration)
			}
			if n := len(noSessionInDB); n > 0 {
				log.Info(ctx, "sessions without info in DB: %d, %v", n, noSessionInDB)
			}
			log.Info(ctx, "failed: %d, negative: %d, shorter: %d, same: %d, updated: %d, new: %d, not found: %d",
				len(failedSessionEnds), len(negativeDuration), len(shorterDuration), len(duplicatedSessionEnds),
				updatedDurations, newSessionEnds, len(noSessionInDB))
			producer.Flush(cfg.ProducerTimeout)
			if err := consumer.CommitBack(intervals.EVENTS_BACK_COMMIT_GAP); err != nil {
				log.Error(ctx, "can't commit messages with offset: %s", err)
			}
		default:
			if !memoryManager.HasFreeMemory() {
				continue
			}
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatal(ctx, "error on consuming: %s", err)
			}
		}
	}
}
