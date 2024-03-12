package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/canvas-handler"
	config "openreplay/backend/internal/config/canvas-handler"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	storageMetrics "openreplay/backend/pkg/metrics/imagestorage"
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

	srv, err := canvas_handler.New(cfg, objStore)
	if err != nil {
		log.Printf("can't init storage service: %s", err)
		return
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

			if isSessionEnd(data) {
				if err := srv.PackSessionCanvases(sessID); err != nil {
					log.Printf("can't prepare canvas: %s", err)
				}
			} else {
				if err := srv.SaveCanvasToDisk(sessID, data); err != nil {
					log.Printf("can't process canvas image: %s", err)
				}
			}
		}, nil, true),
		false,
		cfg.MessageSizeLimit,
	)

	log.Printf("Canvas handler service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			srv.Wait()
			canvasConsumer.Close()
			os.Exit(0)
		case <-counterTick:
			srv.Wait()
			if err := canvasConsumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
		case msg := <-canvasConsumer.Rebalanced():
			log.Println(msg)
		default:
			err = canvasConsumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on images consumption: %v", err)
			}
		}
	}
}
