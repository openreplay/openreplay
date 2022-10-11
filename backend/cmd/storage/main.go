package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/failover"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/queue"
	s3storage "openreplay/backend/pkg/storage"
)

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
	sessionFinder, err := failover.NewSessionFinder(cfg, srv)
	if err != nil {
		log.Fatalf("can't init sessionFinder module: %s", err)
	}

	consumer := queue.NewConsumer(
		cfg.GroupStorage,
		[]string{
			cfg.TopicTrigger,
		},
		messages.NewMessageIterator(
			func(msg messages.Message) {
				sesEnd := msg.(*messages.SessionEnd)
				if err := srv.UploadSessionFiles(sesEnd); err != nil {
					log.Printf("can't find session: %d", msg.SessionID())
					sessionFinder.Find(msg.SessionID(), sesEnd.Timestamp)
				}
				// Log timestamp of last processed session
				counter.Update(msg.SessionID(), time.UnixMilli(msg.Meta().Batch().Timestamp()))
			},
			[]int{messages.MsgSessionEnd},
			true,
		),
		true,
		cfg.MessageSizeLimit,
	)

	log.Printf("Storage service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			sessionFinder.Stop()
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
