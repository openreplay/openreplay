package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/ender"
	"openreplay/backend/internal/ender"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/health"
	"openreplay/backend/pkg/logger"
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
	cfg := config.New(log)

	h := health.New()

	dbMetric := database.New("ender")
	enderMetric := enderMetrics.New("ender")
	metrics.New(log, append(enderMetric.List(), dbMetric.List()...))

	pgConn, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()
	h.Register("postgres", func(ctx context.Context) error {
		return pgConn.Ping(ctx)
	})

	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Warn(ctx, "can't init redis connection: %s", err)
	}
	defer redisClient.Close()
	h.Register("redis", func(ctx context.Context) error {
		return redisClient.Ping(ctx)
	})

	projManager := projects.New(log, pgConn, redisClient, dbMetric)
	sessManager := sessions.New(log, pgConn, projManager, redisClient, dbMetric, sessions.DoNotIgnoreInactiveProjects)

	sessionEndGenerator, err := ender.New(log, redisClient, enderMetric, ender.EVENTS_SESSION_END_TIMEOUT, cfg.PartitionsNumber)
	if err != nil {
		log.Fatal(ctx, "can't init ender service: %s", err)
	}

	mobileMessages := []int{90, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 107, 110, 111}

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	h.Register("producer", func(ctx context.Context) error {
		return producer.Ping(ctx)
	})
	consumer, err := queue.NewConsumer(
		log,
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
		-ender.EVENTS_BACK_COMMIT_GAP,
	)
	if err != nil {
		log.Fatal(ctx, "can't init message consumer: %s", err)
	}
	h.Register("consumer", func(ctx context.Context) error {
		return consumer.Ping(ctx)
	})

	log.Info(ctx, "Ender service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(ender.EVENTS_COMMIT_INTERVAL * time.Millisecond)
	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "Caught signal %v: terminating", sig)
			producer.Close(cfg.ProducerTimeout)
			if err := consumer.CommitBack(ender.EVENTS_BACK_COMMIT_GAP); err != nil {
				log.Error(ctx, "can't commit messages with offset: %s", err)
			}
			consumer.Close()
			os.Exit(0)
		case <-tick:
			details := ender.NewLogDetails()
			sessionEndGenerator.HandleEndedSessions(func(candidates map[uint64]uint64) map[uint64]bool {
				return processEndedBatch(ctx, candidates, sessManager, producer, cfg, log, details)
			})
			details.Log(log, ctx)
			producer.Flush(cfg.ProducerTimeout)
			if err := consumer.CommitBack(ender.EVENTS_BACK_COMMIT_GAP); err != nil {
				log.Error(ctx, "can't commit messages with offset: %s", err)
			}
		default:
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatal(ctx, "error on consuming: %s", err)
			}
		}
	}
}

func processEndedBatch(
	ctx context.Context,
	candidates map[uint64]uint64,
	sessManager sessions.Sessions,
	producer types.Producer,
	cfg *config.Config,
	log logger.Logger,
	details *ender.LogDetails,
) map[uint64]bool {
	completed := make(map[uint64]bool, len(candidates))
	for sessionID, timestamp := range candidates {
		sessCtx := context.WithValue(ctx, "sessionID", fmt.Sprintf("%d", sessionID))
		sess, err := sessManager.Get(sessionID)
		if err != nil {
			if postgres.IsNoRowsErr(err) {
				// Session doesn't exist in the database, but somehow we got some data from the tracker
				log.Warn(sessCtx, "session not found in database, dropping: %s", err)
				completed[sessionID] = true
				continue
			}
			log.Error(sessCtx, "can't get session from database, will retry: %s", err)
			continue
		}
		if ender.ProcessEndedSession(sessCtx, sessionID, timestamp, sess, sessManager, producer, cfg, log, details) {
			completed[sessionID] = true
		}
	}
	return completed
}
