package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/assets"
	"openreplay/backend/internal/assets/cacher"
	config "openreplay/backend/internal/config/assets"
	"openreplay/backend/internal/sink/assetscache"
	"openreplay/backend/pkg/health"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	assetsMetrics "openreplay/backend/pkg/metrics/assets"
	sinkMetrics "openreplay/backend/pkg/metrics/sink"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	urlAssets "openreplay/backend/pkg/url/assets"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)

	h := health.New()

	assetMetrics := assetsMetrics.New("assets")
	assetCacheMetrics := sinkMetrics.New("assets_cache")
	metrics.New(log, append(assetMetrics.List(), assetCacheMetrics.List()...))

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(cfg.ProducerCloseTimeout)
	h.Register("producer", func(ctx context.Context) error {
		return producer.Ping(ctx)
	})

	rewriter, err := urlAssets.NewRewriter(cfg.AssetsOrigin)
	if err != nil {
		log.Fatal(ctx, "can't init rewriter: %s", err)
	}

	assetMessageHandler := assetscache.New(log, &cfg.Cache, rewriter, producer, assetCacheMetrics)

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "can't init object storage: %s", err)
	}
	cacher, err := cacher.NewCacher(cfg, objStore, assetMetrics)
	if err != nil {
		log.Fatal(ctx, "can't init cacher: %s", err)
	}

	isAssetType := func(id int) bool {
		return id == messages.MsgSetNodeAttributeURLBased ||
			id == messages.MsgSetCSSDataURLBased ||
			id == messages.MsgAdoptedSSReplaceURLBased ||
			id == messages.MsgAdoptedSSInsertRuleURLBased
	}

	batchHandler := func(batchData []byte, info *messages.BatchInfo) {
		sessCtx := context.WithValue(ctx, "sessionID", info.SessionID())

		reader := messages.NewMessageReader(batchData)
		if err := reader.Parse(); err != nil {
			log.Error(sessCtx, "assets batch parse err: %s, info: %s", err, info.Info())
			return
		}

		var buf bytes.Buffer
		for reader.Next() {
			msg := reader.Message()
			msg.Meta().SetBatchInfo(info)

			if isAssetType(msg.TypeID()) {
				decoded := msg.Decode()
				if decoded == nil {
					log.Error(sessCtx, "assets decode err, type: %d, info: %s", msg.TypeID(), info.Info())
					continue
				}
				msg = assetMessageHandler.ParseAssets(decoded)
			}

			data := msg.Encode()
			if data != nil && len(data) > 0 {
				if !messages.MessageHasSize(uint64(msg.TypeID())) {
					buf.Write(data)
				} else {
					encodedSize, err := MsgSize(uint64(len(data) - 1))
					if err != nil {
						log.Error(sessCtx, "assets msg size err: %s, info: %s", err, info.Info())
						continue
					}
					buf.Write(data[0:1])   // message type
					buf.Write(encodedSize) // message size
					buf.Write(data[1:])    // message's data
				}
			}
		}

		if buf.Len() == 0 {
			return
		}

		if err := producer.Produce(cfg.TopicRawWeb, info.SessionID(), buf.Bytes()); err != nil {
			log.Error(sessCtx, "can't send rewritten batch to raw topic: %s", err)
		}
	}

	msgHandler := func(msg messages.Message) {
		switch m := msg.(type) {
		case *messages.AssetCache:
			cacher.CacheURL(m.SessionID(), m.URL)
			assetMetrics.IncreaseProcessesSessions()
		case *messages.JSException:
			sourceList, err := assets.ExtractJSExceptionSources(&m.Payload)
			if err != nil {
				log.Error(ctx, "Error on source extraction: %s", err)
				return
			}
			for _, source := range sourceList {
				cacher.CacheJSFile(source)
			}
		}
	}

	batchIterator := messages.NewAssetsBatchIterator(
		log,
		batchHandler,
		messages.NewMessageIterator(log, msgHandler, []int{messages.MsgAssetCache, messages.MsgJSException}, true),
	)

	msgConsumer, err := queue.NewConsumer(
		log,
		cfg.GroupCache,
		[]string{
			cfg.TopicCache,
			cfg.TopicRawAssets,
		},
		batchIterator,
		true,
		cfg.MessageSizeLimit,
		nil,
		types.NoReadBackGap,
	)
	if err != nil {
		log.Fatal(ctx, "can't init message consumer: %s", err)
	}
	h.Register("consumer", func(ctx context.Context) error {
		return msgConsumer.Ping(ctx)
	})

	log.Info(ctx, "Cacher service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(20 * time.Minute)
	for {
		select {
		case sig := <-sigchan:
			log.Error(ctx, "Caught signal %v: terminating", sig)
			cacher.Stop()
			producer.Close(cfg.ProducerCloseTimeout)
			msgConsumer.Close()
			os.Exit(0)
		case err := <-cacher.Errors:
			log.Error(ctx, "Error while caching: %s", err)
		case <-tick:
			cacher.UpdateTimeouts()
		default:
			if !cacher.CanCache() {
				continue
			}
			if err := msgConsumer.ConsumeNext(); err != nil {
				log.Fatal(ctx, "Error on consumption: %v", err)
			}
		}
	}
}

func MsgSize(size uint64) ([]byte, error) {
	if size > 0xFFFFFF {
		return nil, fmt.Errorf("size too large")
	}

	buf := make([]byte, 3)
	for i := 0; i < 3; i++ {
		buf[i] = byte(size >> (8 * i))
	}
	return buf, nil
}
