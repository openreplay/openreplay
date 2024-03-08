package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/failover"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	storageMetrics "openreplay/backend/pkg/metrics/storage"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New()

	m := metrics.New()
	m.Register(storageMetrics.List())

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "can't init object storage: %s", err)
	}
	srv, err := storage.New(cfg, log, objStore)
	if err != nil {
		log.Fatal(ctx, "can't init storage service: %s", err)
	}

	counter := storage.NewLogCounter()
	sessionFinder, err := failover.NewSessionFinder(cfg, srv)
	if err != nil {
		log.Fatal(ctx, "can't init sessionFinder module: %s", err)
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
				sessCtx := context.WithValue(context.Background(), "sessionID", msg.SessionID())
				// Process session to save mob files to s3
				sesEnd := msg.(*messages.SessionEnd)
				if err := srv.Process(sessCtx, sesEnd); err != nil {
					log.Error(sessCtx, "process session err: %s", err)
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

	log.Info(ctx, "Storage service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "caught signal %v: terminating", sig)
			sessionFinder.Stop()
			srv.Wait()
			consumer.Close()
			os.Exit(0)
		case <-counterTick:
			go counter.Print()
			srv.Wait()
			if err := consumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
		case msg := <-consumer.Rebalanced():
			log.Info(ctx, "rebalanced: %v", msg)
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "error on consumption: %v", err)
			}
		}
	}
}
