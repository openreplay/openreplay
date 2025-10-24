package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/canvas-handler"
	config "openreplay/backend/internal/config/canvas-handler"
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
	cfg := config.New(log)
	metrics.New(log, storageMetrics.List())

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "can't init object storage: %s", err)
	}

	srv, err := canvas_handler.New(cfg, log, objStore)
	if err != nil {
		log.Fatal(ctx, "can't init canvas service: %s", err)
	}

	canvasConsumer := queue.NewConsumer(
		cfg.GroupCanvasImage,
		[]string{
			cfg.TopicCanvasImages,
		},
		messages.NewImagesMessageIterator(func(data []byte, sessID uint64) {
			isSessionEnd := func(data []byte) bool {
				reader := messages.NewBytesReader(data)
				msgType, err := reader.ReadUint()
				if err != nil {
					return false
				}
				if msgType != messages.MsgSessionEnd {
					return false
				}
				_, err = messages.ReadMessage(msgType, reader)
				if err != nil {
					return false
				}
				return true
			}
			sessCtx := context.WithValue(context.Background(), "sessionID", sessID)

			if isSessionEnd(data) {
				if err := srv.PackSessionCanvases(sessCtx, sessID); err != nil {
					log.Error(sessCtx, "can't pack session's canvases: %s", err)
				}
			} else {
				if err := srv.SaveCanvasToDisk(sessCtx, sessID, data); err != nil {
					log.Error(sessCtx, "can't process canvas image: %s", err)
				}
			}
		}, nil, true),
		false,
		cfg.MessageSizeLimit,
		nil,
	)

	log.Info(ctx, "canvas handler service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "caught signal %v: terminating", sig)
			srv.Wait()
			canvasConsumer.Close()
			os.Exit(0)
		case <-counterTick:
			srv.Wait()
			if err := canvasConsumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
		default:
			err = canvasConsumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "can't consume next message: %s", err)
			}
		}
	}
}
