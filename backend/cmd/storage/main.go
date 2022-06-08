package main

import (
	"log"
	"openreplay/backend/pkg/monitoring"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	s3storage "openreplay/backend/pkg/storage"
)

/*
Storage
*/

func main() {
	metrics := monitoring.New("storage")

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := config.New()

	s3 := s3storage.NewS3(cfg.S3Region, cfg.S3Bucket)
	srv, err := storage.New(cfg, s3, metrics)
	if err != nil {
		log.Printf("can't init storage service: %s", err)
		return
	}

	counter := storage.NewLogCounter()

	consumer := queue.NewMessageConsumer(
		cfg.GroupStorage,
		[]string{
			cfg.TopicTrigger,
		},
		func(sessionID uint64, msg messages.Message, meta *types.Meta) {
			switch msg.(type) {
			case *messages.SessionEnd:
				srv.UploadKey(strconv.FormatUint(sessionID, 10), 5)
				// Log timestamp of last processed session
				counter.Update(sessionID, time.UnixMilli(meta.Timestamp))
			}
		},
		true,
	)

	log.Printf("Storage service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			consumer.Close()
			os.Exit(0)
		case <-counterTick:
			go counter.Print()
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}
