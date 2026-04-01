package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/sink"
	"openreplay/backend/internal/sink/assetscache"
	"openreplay/backend/internal/sink/sessionwriter"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/health"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/sink"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
	handler "openreplay/backend/pkg/sink"
	"openreplay/backend/pkg/storage"
	"openreplay/backend/pkg/url/assets"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)

	h := health.New()

	dbMetric := database.New("sink")
	sinkMetrics := sink.New("sink")
	metrics.New(log, sinkMetrics.List())

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(cfg.ProducerCloseTimeout)
	h.Register("producer", func(ctx context.Context) error {
		return producer.Ping(ctx)
	})

	rewriter, err := assets.NewRewriter(cfg.AssetsOrigin)
	if err != nil {
		log.Fatal(ctx, "can't init rewriter: %s", err)
	}

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
	sessManager := sessions.New(log, pgConn, projManager, redisClient, dbMetric)

	filePool := sessionwriter.NewFilePool(log, int(cfg.FsUlimit), cfg.FileBuffer, cfg.MaxFileSize)
	mobWriter := sessionwriter.NewMobWriter(log, sessManager, filePool, cfg.FsDir, cfg.FileSplitTime)

	counter := storage.NewLogCounter()
	assetMessageHandler := assetscache.New(log, &cfg.Cache, rewriter, producer, sinkMetrics)
	msgHandler := handler.New(cfg, log, mobWriter, producer, assetMessageHandler, sinkMetrics, counter)

	batchIterator := messages.NewBatchIterator(
		log,
		mobWriter.HandleBatch,
		messages.NewSinkMessageIterator(log, msgHandler.Handle, nil, false, sinkMetrics),
	)

	consumer, err := queue.NewConsumer(
		log,
		cfg.GroupSink,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicRawMobile,
		},
		batchIterator,
		false,
		cfg.MessageSizeLimit,
		func(t types.RebalanceType, partitions []uint64) {
			s := time.Now()
			mobWriter.Sync()
			log.Info(ctx, "manual sync finished, dur: %d", time.Now().Sub(s).Milliseconds())
		},
		types.NoReadBackGap,
	)
	if err != nil {
		log.Fatal(ctx, "can't init message consumer: %s", err)
	}
	h.Register("consumer", func(ctx context.Context) error {
		return consumer.Ping(ctx)
	})

	log.Info(ctx, "sink service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tickInfo := time.Tick(30 * time.Second)

	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "Caught signal %v: terminating", sig)
			// Sync and stop writers
			mobWriter.Stop()
			filePool.Stop()
			// Commit and stop consumer
			if err := consumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
			consumer.Close()
			os.Exit(0)
		case <-tickInfo:
			if err := consumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
			mobWriter.Sync()
			log.Info(ctx, "%s", counter.Log())
			log.Info(ctx, "writer: %s", mobWriter.Info())
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "error on consumption: %v", err)
			}
		}
	}
}
