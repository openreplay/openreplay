package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/imagestorage"
	"openreplay/backend/internal/imagestorage"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	storageMetrics "openreplay/backend/pkg/metrics/imagestorage"
	"openreplay/backend/pkg/queue"
)

func main() {
	m := metrics.New()
	m.Register(storageMetrics.List())

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := config.New()

	srv, err := imagestorage.New(cfg)
	if err != nil {
		log.Printf("can't init storage service: %s", err)
		return
	}

	consumer := queue.NewConsumer(
		cfg.GroupImageStorage,
		[]string{
			cfg.TopicRawImages,
		},
		messages.NewImagesMessageIterator(func(data []byte, sessID uint64) {
			if err := srv.Process(sessID, data); err != nil {
				log.Printf("can't process image: %s", err)
			}
		}, nil, true),
		false,
		cfg.MessageSizeLimit,
	)

	log.Printf("Image storage service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			srv.Wait()
			consumer.Close()
			os.Exit(0)
		case <-counterTick:
			srv.Wait()
			if err := consumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
		case msg := <-consumer.Rebalanced():
			log.Println(msg)
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on images consumption: %v", err)
			}
		}
	}
}
