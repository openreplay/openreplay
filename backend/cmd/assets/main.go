package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/assets"
	"openreplay/backend/internal/assets/cacher"
	config "openreplay/backend/internal/config/assets"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/queue"
)

func main() {
	metrics := monitoring.New("assets")

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := config.New()

	cacher := cacher.NewCacher(cfg, metrics)

	totalAssets, err := metrics.RegisterCounter("assets_total")
	if err != nil {
		log.Printf("can't create assets_total metric: %s", err)
	}

	msgHandler := func(msg messages.Message) {
		switch m := msg.(type) {
		case *messages.AssetCache:
			cacher.CacheURL(m.SessionID(), m.URL)
			totalAssets.Add(context.Background(), 1)
		case *messages.ErrorEvent:
			if m.Source != "js_exception" {
				return
			}
			sourceList, err := assets.ExtractJSExceptionSources(&m.Payload)
			if err != nil {
				log.Printf("Error on source extraction: %v", err)
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
		messages.NewMessageIterator(msgHandler, []int{messages.MsgAssetCache, messages.MsgErrorEvent}, true),
		true,
		cfg.MessageSizeLimit,
	)

	log.Printf("Cacher service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(20 * time.Minute)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			cacher.Stop()
			msgConsumer.Close()
			os.Exit(0)
		case err := <-cacher.Errors:
			log.Printf("Error while caching: %v", err)
		case <-tick:
			cacher.UpdateTimeouts()
		default:
			if !cacher.CanCache() {
				continue
			}
			if err := msgConsumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}
