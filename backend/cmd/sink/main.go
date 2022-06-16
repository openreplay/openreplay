package main

import (
	"context"
	"encoding/binary"
	"log"
	"openreplay/backend/internal/sink/assetscache"
	"openreplay/backend/internal/sink/oswriter"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/monitoring"
	"time"

	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/internal/config/sink"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/url/assets"
)

/*
Sink
*/

func main() {
	metrics := monitoring.New("sink")

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := sink.New()

	if _, err := os.Stat(cfg.FsDir); os.IsNotExist(err) {
		log.Fatalf("%v doesn't exist. %v", cfg.FsDir, err)
	}

	writer := oswriter.NewWriter(cfg.FsUlimit, cfg.FsDir)

	producer := queue.NewProducer()
	defer producer.Close(cfg.ProducerCloseTimeout)
	rewriter := assets.NewRewriter(cfg.AssetsOrigin)
	assetMessageHandler := assetscache.New(cfg, rewriter, producer)

	counter := storage.NewLogCounter()
	totalMessages, err := metrics.RegisterCounter("messages_total")
	if err != nil {
		log.Printf("can't create messages_total metric: %s", err)
	}
	savedMessages, err := metrics.RegisterCounter("messages_saved")
	if err != nil {
		log.Printf("can't create messages_saved metric: %s", err)
	}
	messageSize, err := metrics.RegisterHistogram("messages_size")
	if err != nil {
		log.Printf("can't create messages_size metric: %s", err)
	}

	consumer := queue.NewMessageConsumer(
		cfg.GroupSink,
		[]string{
			cfg.TopicRawWeb,
		},
		func(sessionID uint64, message Message, _ *types.Meta) {
			// Process assets
			message = assetMessageHandler.ParseAssets(sessionID, message)

			totalMessages.Add(context.Background(), 1)

			// Filter message
			typeID := message.TypeID()

			// Send SessionEnd trigger to storage service
			switch message.(type) {
			case *SessionEnd:
				if err := producer.Produce(cfg.TopicTrigger, sessionID, Encode(message)); err != nil {
					log.Printf("can't send SessionEnd to trigger topic: %s; sessID: %d", err, sessionID)
				}
				return
			}
			if !IsReplayerType(typeID) {
				return
			}

			// If message timestamp is empty, use at least ts of session start
			ts := message.Meta().Timestamp
			if ts == 0 {
				log.Printf("zero ts; sessID: %d, msg: %+v", sessionID, message)
			} else {
				// Log ts of last processed message
				counter.Update(sessionID, time.UnixMilli(ts))
			}

			value := message.Encode()
			var data []byte
			if IsIOSType(typeID) {
				data = value
			} else {
				data = make([]byte, len(value)+8)
				copy(data[8:], value[:])
				binary.LittleEndian.PutUint64(data[0:], message.Meta().Index)
			}
			if err := writer.Write(sessionID, data); err != nil {
				log.Printf("Writer error: %v\n", err)
			}

			messageSize.Record(context.Background(), float64(len(data)))
			savedMessages.Add(context.Background(), 1)
		},
		false,
	)
	log.Printf("Sink service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(30 * time.Second)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			if err := consumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
			consumer.Close()
			os.Exit(0)
		case <-tick:
			if err := writer.SyncAll(); err != nil {
				log.Fatalf("Sync error: %v\n", err)
			}
			counter.Print()
			if err := consumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}

}
