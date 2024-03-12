package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/imagestorage"
	"openreplay/backend/internal/screenshot-handler"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	storageMetrics "openreplay/backend/pkg/metrics/imagestorage"
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

	srv, err := screenshot_handler.New(cfg, log, objStore)
	if err != nil {
		log.Fatal(ctx, "can't init storage service: %s", err)
	}

	workDir := cfg.FSDir

	consumer := queue.NewConsumer(
		cfg.GroupImageStorage,
		[]string{
			cfg.TopicRawImages,
		},
		messages.NewImagesMessageIterator(func(data []byte, sessID uint64) {
			sessCtx := context.WithValue(context.Background(), "sessionID", sessID)
			checkSessionEnd := func(data []byte) (messages.Message, error) {
				reader := messages.NewBytesReader(data)
				msgType, err := reader.ReadUint()
				if err != nil {
					return nil, err
				}
				if msgType != messages.MsgIOSSessionEnd {
					return nil, fmt.Errorf("not a mobile session end message")
				}
				msg, err := messages.ReadMessage(msgType, reader)
				if err != nil {
					return nil, fmt.Errorf("read message err: %s", err)
				}
				return msg, nil
			}

			if _, err := checkSessionEnd(data); err == nil {
				// Pack all screenshots from mobile session, compress and upload to object storage
				if err := srv.PackScreenshots(sessCtx, sessID, workDir+"/screenshots/"+strconv.FormatUint(sessID, 10)+"/"); err != nil {
					log.Error(sessCtx, "can't pack screenshots: %s", err)
				}
			} else {
				// Unpack new screenshots package from mobile session
				if err := srv.Process(sessCtx, sessID, data); err != nil {
					log.Error(sessCtx, "can't process screenshots: %s", err)
				}
			}
		}, nil, true),
		false,
		cfg.MessageSizeLimit,
	)

	log.Info(ctx, "Image storage service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "Caught signal %v: terminating", sig)
			srv.Wait()
			consumer.Close()
			os.Exit(0)
		case <-counterTick:
			srv.Wait()
			if err := consumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
		case msg := <-consumer.Rebalanced():
			log.Info(ctx, "Rebalanced: %v", msg)
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "Error on images consumption: %v", err)
			}
		}
	}
}
