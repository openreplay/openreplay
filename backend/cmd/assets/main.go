package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/assets"
	"openreplay/backend/internal/assets/cacher"
	config "openreplay/backend/internal/config/assets"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	assetsMetrics "openreplay/backend/pkg/metrics/assets"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)
	// Observability
	assetMetrics := assetsMetrics.New("assets")
	metrics.New(log, assetMetrics.List())

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "can't init object storage: %s", err)
	}
	cacher, err := cacher.NewCacher(cfg, objStore, assetMetrics)
	if err != nil {
		log.Fatal(ctx, "can't init cacher: %s", err)
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

	msgConsumer := queue.NewConsumer(
		cfg.GroupCache,
		[]string{cfg.TopicCache},
		messages.NewMessageIterator(log, msgHandler, []int{messages.MsgAssetCache, messages.MsgJSException}, true),
		true,
		cfg.MessageSizeLimit,
	)

	log.Info(ctx, "Cacher service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(20 * time.Minute)
	for {
		select {
		case sig := <-sigchan:
			log.Error(ctx, "Caught signal %v: terminating", sig)
			cacher.Stop()
			msgConsumer.Close()
			os.Exit(0)
		case err := <-cacher.Errors:
			log.Error(ctx, "Error while caching: %s", err)
		case <-tick:
			cacher.UpdateTimeouts()
		case msg := <-msgConsumer.Rebalanced():
			log.Info(ctx, "Rebalanced: %v", msg)
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
