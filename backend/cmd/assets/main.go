package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/assets"
	"openreplay/backend/internal/assets/cacher"
	config "openreplay/backend/internal/config/assets"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	assetsMetrics "openreplay/backend/pkg/metrics/assets"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
)

func main() {
	m := metrics.New()
	m.Register(assetsMetrics.List())

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := config.New()

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatalf("Error on object storage creation: %v", err)
	}
	cacher, err := cacher.NewCacher(cfg, objStore)
	if err != nil {
		log.Fatalf("Error on cacher creation: %v", err)
	}

	msgHandler := func(msg messages.Message) {
		switch m := msg.(type) {
		case *messages.AssetCache:
			cacher.CacheURL(m.SessionID(), m.URL)
			assetsMetrics.IncreaseProcessesSessions()
		// TODO: connect to "raw" topic in order to listen for JSException
		case *messages.JSException:
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
		messages.NewMessageIterator(msgHandler, []int{messages.MsgAssetCache, messages.MsgJSException}, true),
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
		case msg := <-msgConsumer.Rebalanced():
			log.Println(msg)
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
