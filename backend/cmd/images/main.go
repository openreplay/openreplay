package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/images"
	"openreplay/backend/internal/images"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	imagesMetrics "openreplay/backend/pkg/metrics/images"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)
	// Observability
	imageMetrics := imagesMetrics.New("images")
	metrics.New(log, imageMetrics.List())

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "can't init object storage: %s", err)
	}

	srv, err := images.New(cfg, log, objStore, imageMetrics)
	if err != nil {
		log.Fatal(ctx, "can't init images service: %s", err)
	}

	workDir := cfg.FSDir

	consumer := queue.NewConsumer(
		cfg.GroupImageStorage,
		[]string{
			cfg.TopicRawImages,
		},
		messages.NewImagesMessageIterator(func(data []byte, sessID uint64) {
			checkSessionEnd := func(data []byte) (messages.Message, error) {
				reader := messages.NewBytesReader(data)
				msgType, err := reader.ReadUint()
				if err != nil {
					return nil, err
				}
				if msgType != messages.MsgMobileSessionEnd {
					return nil, fmt.Errorf("not a mobile session end message")
				}
				msg, err := messages.ReadMessage(msgType, reader)
				if err != nil {
					return nil, fmt.Errorf("read message err: %s", err)
				}
				return msg, nil
			}
			sessCtx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", sessID))

			if _, err := checkSessionEnd(data); err == nil {
				if err := srv.PackScreenshots(sessCtx, sessID, workDir+"/screenshots/"+strconv.FormatUint(sessID, 10)+"/"); err != nil {
					log.Error(sessCtx, "can't pack screenshots: %s", err)
				}
			} else {
				if err := srv.Process(sessCtx, sessID, data); err != nil {
					log.Error(sessCtx, "can't process screenshots: %s", err)
				}
			}
		}, nil, true),
		false,
		cfg.MessageSizeLimit,
	)

	log.Info(ctx, "Images service started")

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
