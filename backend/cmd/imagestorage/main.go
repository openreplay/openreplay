package main

import (
	"fmt"
	"log"
	"openreplay/backend/pkg/objectstorage/store"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/imagestorage"
	"openreplay/backend/internal/screenshot-handler"
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

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatalf("can't init object storage: %s", err)
	}

	srv, err := screenshot_handler.New(cfg, objStore)
	if err != nil {
		log.Printf("can't init storage service: %s", err)
		return
	}

	workDir := cfg.FSDir

	consumer := queue.NewConsumer(
		cfg.GroupImageStorage,
		[]string{
			cfg.TopicRawImages,
		},
		messages.NewImagesMessageIterator(func(data []byte, sessID uint64) {
			log.Printf("Received message for session %d\n", sessID)
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
				//sessEnd := msg.(*messages.IOSSessionEnd)
				if err := srv.PackScreenshots(sessID, workDir+"/screenshots/"+strconv.FormatUint(sessID, 10)+"/"); err != nil {
					log.Printf("upload session err: %s, sessID: %d", err, sessID)
				}
			} else {
				// Unpack new screenshots package from mobile session
				if err := srv.Process(sessID, data); err != nil {
					log.Printf("can't process mobile screenshots: %s", err)
				}
			}
		}, nil, true),
		false,
		cfg.MessageSizeLimit,
	)

	log.Printf("Image storage service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			srv.Wait()
			consumer.Close()
			os.Exit(0)
		case <-counterTick:
			srv.Wait()
			if err := consumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
		case msg := <-consumer.Rebalanced():
			log.Println(msg)
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on images consumption: %v", err)
			}
		}
	}
}
