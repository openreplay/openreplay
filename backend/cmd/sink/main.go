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

	filePool := sessionwriter.NewFilePool(log, int(cfg.FsUlimit), cfg.FileBuffer)
	msgWriter := sessionwriter.NewWriter(log, filePool, cfg.FsDir, cfg.SyncTimeout)
	batchWriter := sessionwriter.NewMobWriter(log, filePool, cfg.FsDir, cfg.FileSplitTime, cfg.MaxFileSize)

	counter := storage.NewLogCounter()
	assetMessageHandler := assetscache.New(log, &cfg.Cache, rewriter, producer, sinkMetrics)
	msgHandler := handler.New(cfg, log, msgWriter, producer, assetMessageHandler, sinkMetrics, counter)

	wrappedHandle := func(msg messages.Message) {
		msgHandler.Handle(msg)
		if msg != nil && (msg.TypeID() == messages.MsgSessionEnd || msg.TypeID() == messages.MsgMobileSessionEnd) {
			batchWriter.Close(msg.SessionID())
		}
	}

	batchIterator := messages.NewBatchIterator(
		log,
		batchWriter.HandleBatch,
		messages.NewSinkMessageIterator(log, wrappedHandle, nil, false, sinkMetrics),
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
			msgWriter.Sync()
			batchWriter.Sync()
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
			// Sync and stop writers
			msgWriter.Stop()
			batchWriter.Stop()
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
			log.Info(ctx, "writer: %s", msgWriter.Info())
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "error on consumption: %v", err)
			}
		}
	}
}
