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
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := config.New()

	cacher := cacher.NewCacher(
		cfg.AWSRegion,
		cfg.S3BucketAssets,
		cfg.AssetsOrigin,
		cfg.AssetsSizeLimit,
	)

	consumer := queue.NewMessageConsumer(
		cfg.GroupCache,
		[]string{cfg.TopicCache},
		func(sessionID uint64, message messages.Message, e *types.Meta) {
			switch msg := message.(type) {
			case *messages.AssetCache:
				cacher.CacheURL(sessionID, msg.URL)
			case *messages.ErrorEvent:
				if msg.Source != "js_exception" {
					return
				}
				sourceList, err := assets.ExtractJSExceptionSources(&msg.Payload)
				if err != nil {
					log.Printf("Error on source extraction: %v", err)
					return
				}
				for _, source := range sourceList {
					cacher.CacheJSFile(source)
				}
			}
		},
		true,
	)

	log.Printf("Cacher service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(20 * time.Minute)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			consumer.Close()
			os.Exit(0)
		case err := <-cacher.Errors:
			log.Printf("Error while caching: %v", err)
			// TODO: notify user
		case <-tick:
			cacher.UpdateTimeouts()
		default:
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}
