package main

import (
	"log"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/videostorage"
	"openreplay/backend/internal/videostorage"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	storageMetrics "openreplay/backend/pkg/metrics/videostorage"
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
	srv, err := videostorage.New(cfg, objStore)
	if err != nil {
		log.Printf("can't init storage service: %s", err)
		return
	}

	workDir := cfg.FSDir

	canvasConsumer := queue.NewConsumer(
		cfg.GroupCanvasVideo,
		[]string{
			cfg.TopicCanvasTrigger,
		},
		messages.NewMessageIterator(
			func(msg messages.Message) {
				sesEnd := msg.(*messages.SessionEnd)
				filePath := workDir + "/canvas/" + strconv.FormatUint(sesEnd.SessionID(), 10) + "/"
				canvasMix := sesEnd.EncryptionKey // dirty hack to use encryption key as canvas mix holder (only between canvas handler and canvas maker)
				if canvasMix == "" {
					log.Printf("no canvas mix for session: %d", sesEnd.SessionID())
					return
				}
				if err := srv.Process(sesEnd.SessionID(), filePath, canvasMix); err != nil {
					if !strings.Contains(err.Error(), "no such file or directory") {
						log.Printf("upload session err: %s, sessID: %d", err, msg.SessionID())
					}
				}
			},
			[]int{messages.MsgSessionEnd},
			true,
		),
		false,
		cfg.MessageSizeLimit,
	)

	log.Printf("Canvas maker service started\n")

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
				log.Fatalf("Error on end event consumption: %v", err)
			}
		}
	}
}
