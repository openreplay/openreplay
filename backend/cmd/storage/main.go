package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/pkg/health"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	storageMetrics "openreplay/backend/pkg/metrics/storage"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/storage"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)

	h := health.New()

	storageMetric := storageMetrics.New("storage")
	metrics.New(log, storageMetric.List())

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "can't init object storage: %s", err)
	}
	srv, err := storage.New(cfg, log, objStore, storageMetric)
	if err != nil {
		log.Fatal(ctx, "can't init storage service: %s", err)
	}
	counter := storage.NewLogCounter()

	consumer, err := queue.NewConsumer(
		log,
		cfg.GroupStorage,
		[]string{
			cfg.TopicTrigger,
		},
		messages.NewMessageIterator(
			log,
			func(msg messages.Message) {
				// Convert MobileSessionEnd to SessionEnd
				if msg.TypeID() == messages.MsgMobileSessionEnd {
					mobileEnd, oldMeta := msg.(*messages.MobileSessionEnd), msg.Meta()
					msg = &messages.SessionEnd{
						Timestamp: mobileEnd.Timestamp,
					}
					msg.Meta().SetMeta(oldMeta)
				}
				sessCtx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", msg.SessionID()))
				if msg.TypeID() == messages.MsgCleanSession {
					if err := srv.Clean(sessCtx, msg.SessionID()); err != nil {
						log.Debug(sessCtx, "can't clean session: %s", err)
					}
					return
				}
				// Process session to save mob files to s3
				sessEnd := msg.(*messages.SessionEnd)
				if err := srv.Upload(sessCtx, sessEnd.SessionID(), sessEnd.EncryptionKey); err != nil {
					log.Error(sessCtx, "process session err: %s", err)
				}
				// Log timestamp of last processed session
				counter.Update(msg.SessionID(), time.UnixMilli(msg.Meta().Batch().Timestamp()))
			},
			[]int{messages.MsgSessionEnd, messages.MsgMobileSessionEnd, messages.MsgCleanSession},
			true,
		),
		false,
		cfg.MessageSizeLimit,
		nil,
		types.NoReadBackGap,
	)
	if err != nil {
		log.Fatal(ctx, "can't init message consumer: %s", err)
	}
	h.Register("consumer", func(ctx context.Context) error {
		return consumer.Ping(ctx)
	})

	log.Info(ctx, "Storage service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "caught signal %v: terminating", sig)
			srv.Wait()
			consumer.Close()
			os.Exit(0)
		case <-counterTick:
			go log.Info(ctx, "%s", counter.Log())
			srv.Wait()
			if err := consumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "error on consumption: %v", err)
			}
		}
	}
}
