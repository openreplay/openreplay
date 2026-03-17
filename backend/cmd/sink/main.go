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
	"openreplay/backend/pkg/health"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/sink"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	handler "openreplay/backend/pkg/sink"
	"openreplay/backend/pkg/storage"
	"openreplay/backend/pkg/url/assets"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)

	h := health.New()

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
	assetMessageHandler := assetscache.New(log, cfg, rewriter, producer, sinkMetrics)
	writer := sessionwriter.NewWriter(log, cfg.FsUlimit, cfg.FsDir, cfg.FileBuffer, cfg.SyncTimeout)
	counter := storage.NewLogCounter()
	msgHandler := handler.New(cfg, log, writer, producer, assetMessageHandler, sinkMetrics, counter)

	consumer, err := queue.NewConsumer(
		log,
		cfg.GroupSink,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicRawMobile,
		},
		messages.NewSinkMessageIterator(log, msgHandler.Handle, nil, false, sinkMetrics),
		false,
		cfg.MessageSizeLimit,
		func(t types.RebalanceType, partitions []uint64) {
			s := time.Now()
			writer.Sync() // sync all opened files
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

	tick := time.Tick(10 * time.Second)
	tickInfo := time.Tick(30 * time.Second)

	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "Caught signal %v: terminating", sig)
			// Sync and stop writer
			writer.Stop()
			// Commit and stop consumer
			if err := consumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
			consumer.Close()
			os.Exit(0)
		case <-tick:
			if err := consumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
		case <-tickInfo:
			log.Info(ctx, "%s", counter.Log())
			log.Info(ctx, "writer: %s", writer.Info())
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "error on consumption: %v", err)
			}
		}
	}
}
