package main

import (
	"context"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"openreplay/backend/internal/canvases"
	config "openreplay/backend/internal/config/canvases"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	canvasesMetrics "openreplay/backend/pkg/metrics/canvas"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)
	// Observability
	canvasMetrics := canvasesMetrics.New("canvases")
	metrics.New(log, canvasMetrics.List())

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "can't init object storage: %s", err)
	}

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(15000)

	srv, err := canvases.New(cfg, log, objStore, producer, canvasMetrics)
	if err != nil {
		log.Fatal(ctx, "can't init canvases service: %s", err)
	}

	canvasConsumer := queue.NewConsumer(
		cfg.GroupCanvasImage,
		[]string{
			cfg.TopicCanvasImages,
			cfg.TopicCanvasTrigger,
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
			isTriggerEvent := func(data []byte) (string, string, bool) {
				reader := messages.NewBytesReader(data)
				msgType, err := reader.ReadUint()
				if err != nil {
					return "", "", false
				}
				if msgType != messages.MsgCustomEvent {
					return "", "", false
				}
				msg, err := messages.ReadMessage(msgType, reader)
				if err != nil {
					return "", "", false
				}
				customEvent := msg.(*messages.CustomEvent)
				return customEvent.Payload, customEvent.Name, true
			}
			sessCtx := context.WithValue(context.Background(), "sessionID", sessID)

			if isSessionEnd(data) {
				if err := srv.PrepareSessionCanvases(sessCtx, sessID); err != nil {
					if !strings.Contains(err.Error(), "no such file or directory") {
						log.Error(sessCtx, "can't pack session's canvases: %s", err)
					}
				}
			} else if path, name, ok := isTriggerEvent(data); ok {
				if err := srv.ProcessSessionCanvas(sessCtx, sessID, path, name); err != nil {
					log.Error(sessCtx, "can't process session's canvas: %s", err)
				}
			} else {
				if err := srv.SaveCanvasToDisk(sessCtx, sessID, data); err != nil {
					log.Error(sessCtx, "can't process canvas image: %s", err)
				}
			}
		}, nil, true),
		false,
		cfg.MessageSizeLimit,
	)

	log.Info(ctx, "canvases service started")

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
		case msg := <-canvasConsumer.Rebalanced():
			log.Info(ctx, "consumer group rebalanced: %+v", msg)
		default:
			err = canvasConsumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "can't consume next message: %s", err)
			}
		}
	}
}
