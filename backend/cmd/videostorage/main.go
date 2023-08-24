package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/videostorage"
	"openreplay/backend/internal/videostorage"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	storageMetrics "openreplay/backend/pkg/metrics/videostorage"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
)

func main() {
	m := metrics.New()
	m.Register(storageMetrics.List())

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := config.New()

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatalf("can't init object storage: %s", err)
	}
	srv, err := videostorage.New(cfg, objStore)
	if err != nil {
		log.Printf("can't init storage service: %s", err)
		return
	}

	imageConsumer := queue.NewConsumer(
		cfg.GroupImageStorage,
		[]string{
			cfg.TopicRawImages,
		},
		messages.NewImagesMessageIterator(func(data []byte) {
			log.Printf("image data: %d", len(data))
		}, nil, true),
		false,
		cfg.MessageSizeLimit,
	)

	consumer := queue.NewConsumer(
		cfg.GroupVideoStorage,
		[]string{
			cfg.TopicMobileTrigger,
		},
		messages.NewMessageIterator(
			func(msg messages.Message) {
				sesEnd := msg.(*messages.SessionEnd)
				if err := srv.Process(sesEnd.SessionID()); err != nil {
					log.Printf("upload session err: %s, sessID: %d", err, msg.SessionID())
				}
			},
			[]int{messages.MsgSessionEnd},
			true,
		),
		false,
		cfg.MessageSizeLimit,
	)

	log.Printf("Video storage service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			srv.Wait()
			consumer.Close()
			imageConsumer.Close()
			os.Exit(0)
		case <-counterTick:
			srv.Wait()
			if err := consumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
			if err := imageConsumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
		case msg := <-consumer.Rebalanced():
			log.Println(msg)
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}
