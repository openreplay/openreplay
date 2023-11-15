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
	"openreplay/backend/pkg/metrics"
	storageMetrics "openreplay/backend/pkg/metrics/storage"
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
	srv, err := storage.New(cfg, objStore)
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
				// Convert IOSSessionEnd to SessionEnd
				if msg.TypeID() == messages.MsgIOSSessionEnd {
					mobileEnd, oldMeta := msg.(*messages.IOSSessionEnd), msg.Meta()
					msg = &messages.SessionEnd{
						Timestamp: mobileEnd.Timestamp,
					}
					msg.Meta().SetMeta(oldMeta)
				}
				// Process session to save mob files to s3
				sesEnd := msg.(*messages.SessionEnd)
				if err := srv.Process(sesEnd); err != nil {
					log.Printf("upload session err: %s, sessID: %d", err, msg.SessionID())
					sessionFinder.Find(msg.SessionID(), sesEnd.Timestamp)
				}
				// Log timestamp of last processed session
				counter.Update(msg.SessionID(), time.UnixMilli(msg.Meta().Batch().Timestamp()))
			},
			[]int{messages.MsgSessionEnd, messages.MsgIOSSessionEnd},
			true,
		),
		false,
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
			srv.Wait()
			consumer.Close()
			os.Exit(0)
		case <-counterTick:
			go counter.Print()
			srv.Wait()
			if err := consumer.Commit(); err != nil {
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
