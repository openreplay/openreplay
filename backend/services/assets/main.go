package main

import (
	"log"
	"time"

	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/services/assets/cacher"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	GROUP_CACHE :=  env.String("GROUP_CACHE") 
	TOPIC_CACHE := env.String("TOPIC_CACHE")

	cacher := cacher.NewCacher(
		env.String("AWS_REGION"),
		env.String("S3_BUCKET_ASSETS"),
		env.String("ASSETS_ORIGIN"),
		env.Int("ASSETS_SIZE_LIMIT"),
	)

	consumer := queue.NewMessageConsumer(
		GROUP_CACHE, 
		[]string{ TOPIC_CACHE }, 
		func(sessionID uint64, message messages.Message, e *types.Meta) {
			switch msg := message.(type) {			
			case *messages.AssetCache:
				cacher.CacheURL(sessionID, msg.URL)
			case *messages.ErrorEvent:
				if msg.Source != "js_exception" {
					return
				}
				sourceList, err := extractJSExceptionSources(&msg.Payload)
				if err != nil {
					log.Printf("Error on source extraction: %v", err)
					return
				}
				for _, source := range sourceList {
					cacher.CacheJSFile(source)
				}
			}		
		},
	)


	tick := time.Tick(20 * time.Minute)

	sigchan := make(chan os.Signal, 1)
  signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

  log.Printf("Cacher service started\n")
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			consumer.Close()
			os.Exit(0)
		case err := <-cacher.Errors:
			log.Printf("Error while caching: %v", err)
		case <-tick:
			cacher.UpdateTimeouts()
		default:
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}