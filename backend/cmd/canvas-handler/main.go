package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/imagestorage"
	"openreplay/backend/internal/imagestorage"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	storageMetrics "openreplay/backend/pkg/metrics/imagestorage"
	"openreplay/backend/pkg/queue"
)

func main() {
	m := metrics.New()
	m.Register(storageMetrics.List())

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := config.New()

	srv, err := imagestorage.New(cfg)
	if err != nil {
		log.Printf("can't init storage service: %s", err)
		return
	}

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)

	canvasConsumer := queue.NewConsumer(
		cfg.GroupCanvasImage,
		[]string{
			cfg.TopicCanvasImages,
		},
		messages.NewImagesMessageIterator(func(data []byte, sessID uint64) {
			checkSessionEnd := func(data []byte) (messages.Message, error) {
				reader := messages.NewBytesReader(data)
				msgType, err := reader.ReadUint()
				if err != nil {
					return nil, err
				}
				if msgType != messages.MsgSessionEnd {
					return nil, fmt.Errorf("not a session end message")
				}
				msg, err := messages.ReadMessage(msgType, reader)
				if err != nil {
					return nil, fmt.Errorf("read message err: %s", err)
				}
				return msg, nil
			}

			if msg, err := checkSessionEnd(data); err == nil {
				sessEnd := msg.(*messages.SessionEnd)
				// Received session end
				if list, err := srv.PrepareCanvas(sessID); err != nil {
					log.Printf("can't prepare canvas: %s", err)
				} else {
					for _, name := range list {
						sessEnd.EncryptionKey = name
						if err := producer.Produce(cfg.TopicCanvasTrigger, sessID, sessEnd.Encode()); err != nil {
							log.Printf("can't send session end signal to video service: %s", err)
						}
					}
				}
			} else {
				if err := srv.ProcessCanvas(sessID, data); err != nil {
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
