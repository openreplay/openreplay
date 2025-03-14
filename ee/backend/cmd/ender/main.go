package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"openreplay/backend/internal/config/ender"
	"openreplay/backend/internal/sessionender"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/intervals"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	enderMetrics "openreplay/backend/pkg/metrics/ender"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := ender.New(log)
	// Observability
	dbMetric := database.New("ender")
	enderMetric := enderMetrics.New("ender")
	metrics.New(log, append(enderMetric.List(), dbMetric.List()...))

	pgConn, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Warn(ctx, "can't init redis connection: %s", err)
	}
	defer redisClient.Close()

	projManager := projects.New(log, pgConn, redisClient, dbMetric)
	sessManager := sessions.New(log, pgConn, projManager, redisClient, dbMetric)

	sessionEndGenerator, err := sessionender.New(enderMetric, intervals.EVENTS_SESSION_END_TIMEOUT, cfg.PartitionsNumber)
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
			details := newDetails()

			// Find ended sessions and send notification to other services
			sessionEndGenerator.HandleEndedSessions(func(sessions map[uint64]uint64) map[uint64]bool {
				// Load all sessions from DB
				sessionsList := make([]uint64, 0, len(sessions))
				for sessionID := range sessions {
					sessionsList = append(sessionsList, sessionID)
				}
				completedSessions := make(map[uint64]bool)
				sessionsData, err := sessManager.GetManySessions(sessionsList)
				if err != nil {
					log.Error(ctx, "can't get sessions from database: %s", err)
					return completedSessions
				}

				// Check if each session was ended
				for sessionID, sess := range sessionsData {
					sessCtx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", sessionID))

					timestamp := sessions[sessionID]
					currDuration := *sess.Duration
					newDur := timestamp - sess.Timestamp

					// Skip if session was ended before with same duration
					if currDuration == newDur {
						details.Duplicated[sessionID] = currDuration
						completedSessions[sessionID] = true
						continue
					}
					if currDuration > newDur {
						details.Shorter[sessionID] = int64(currDuration) - int64(newDur)
						completedSessions[sessionID] = true
						continue
					}

					newDuration, err := sessManager.UpdateDuration(sessionID, timestamp)
					if err != nil {
						if strings.Contains(err.Error(), "integer out of range") {
							// Skip session with broken duration
							details.Failed[sessionID] = timestamp
							completedSessions[sessionID] = true
							continue
						}
						if strings.Contains(err.Error(), "is less than zero for uint64") {
							details.Negative[sessionID] = timestamp
							completedSessions[sessionID] = true
							continue
						}
						if strings.Contains(err.Error(), "no rows in result set") {
							details.NotFound[sessionID] = timestamp
							completedSessions[sessionID] = true
							continue
						}
						log.Error(sessCtx, "can't update session duration, err: %s", err)
						continue
					}
					// Check one more time just in case
					if currDuration == newDuration {
						details.Duplicated[sessionID] = currDuration
						completedSessions[sessionID] = true
						continue
					}
					msg := &messages.SessionEnd{Timestamp: timestamp}
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
							continue
						}
						if err := producer.Produce(cfg.TopicRawImages, sessionID, msg.Encode()); err != nil {
							log.Error(sessCtx, "can't send MobileSessionEnd signal to canvas topic: %s", err)
						}
					} else {
						if err := producer.Produce(cfg.TopicRawWeb, sessionID, msg.Encode()); err != nil {
							log.Error(sessCtx, "can't send sessionEnd to raw topic: %s", err)
							continue
						}
						if err := producer.Produce(cfg.TopicCanvasImages, sessionID, msg.Encode()); err != nil {
							log.Error(sessCtx, "can't send sessionEnd signal to canvas topic: %s", err)
						}
					}

					if currDuration != 0 {
						details.Diff[sessionID] = int64(newDuration) - int64(currDuration)
						details.Updated++
					} else {
						details.New++
					}
					completedSessions[sessionID] = true
				}
				return completedSessions
			})
			details.Log(log, ctx)
			producer.Flush(cfg.ProducerTimeout)
			if err := consumer.CommitBack(intervals.EVENTS_BACK_COMMIT_GAP); err != nil {
				log.Error(ctx, "can't commit messages with offset: %s", err)
			}
		case msg := <-consumer.Rebalanced():
			if msg.Type == types.RebalanceTypeRevoke {
				sessionEndGenerator.Disable()
			} else {
				sessionEndGenerator.ActivePartitions(msg.Partitions)
				sessionEndGenerator.Enable()
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

type logDetails struct {
	Failed     map[uint64]uint64
	Duplicated map[uint64]uint64
	Negative   map[uint64]uint64
	Shorter    map[uint64]int64
	NotFound   map[uint64]uint64
	Diff       map[uint64]int64
	Updated    int
	New        int
}

func newDetails() *logDetails {
	return &logDetails{
		Failed:     make(map[uint64]uint64),
		Duplicated: make(map[uint64]uint64),
		Negative:   make(map[uint64]uint64),
		Shorter:    make(map[uint64]int64),
		NotFound:   make(map[uint64]uint64),
		Diff:       make(map[uint64]int64),
		Updated:    0,
		New:        0,
	}
}

func (l *logDetails) Log(log logger.Logger, ctx context.Context) {
	if n := len(l.Failed); n > 0 {
		log.Debug(ctx, "sessions with wrong duration: %d, %v", n, l.Failed)
	}
	if n := len(l.Negative); n > 0 {
		log.Debug(ctx, "sessions with negative duration: %d, %v", n, l.Negative)
	}
	if n := len(l.NotFound); n > 0 {
		log.Debug(ctx, "sessions without info in DB: %d, %v", n, l.NotFound)
	}
	var logBuilder strings.Builder
	logValues := []interface{}{}

	if len(l.Failed) > 0 {
		logBuilder.WriteString("failed: %d, ")
		logValues = append(logValues, len(l.Failed))
	}
	if len(l.Negative) > 0 {
		logBuilder.WriteString("negative: %d, ")
		logValues = append(logValues, len(l.Negative))
	}
	if len(l.Shorter) > 0 {
		logBuilder.WriteString("shorter: %d, ")
		logValues = append(logValues, len(l.Shorter))
	}
	if len(l.Duplicated) > 0 {
		logBuilder.WriteString("same: %d, ")
		logValues = append(logValues, len(l.Duplicated))
	}
	if l.Updated > 0 {
		logBuilder.WriteString("updated: %d, ")
		logValues = append(logValues, l.Updated)
	}
	if l.New > 0 {
		logBuilder.WriteString("new: %d, ")
		logValues = append(logValues, l.New)
	}
	if len(l.NotFound) > 0 {
		logBuilder.WriteString("not found: %d, ")
		logValues = append(logValues, len(l.NotFound))
	}

	if logBuilder.Len() > 0 {
		logMessage := logBuilder.String()
		logMessage = logMessage[:len(logMessage)-2]
		log.Info(ctx, logMessage, logValues...)
	}
}

type SessionEndType int

const (
	FailedSessionEnd SessionEndType = iota + 1
	DuplicatedSessionEnd
	NegativeDuration
	ShorterDuration
	NewSessionEnd
	NoSessionInDB
)
