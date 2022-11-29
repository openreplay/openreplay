package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/config/sink"
	"openreplay/backend/internal/sink/assetscache"
	"openreplay/backend/internal/sink/sessionwriter"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/url/assets"
)

func main() {
	metrics := monitoring.New("sink")

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := sink.New()

	if _, err := os.Stat(cfg.FsDir); os.IsNotExist(err) {
		log.Fatalf("%v doesn't exist. %v", cfg.FsDir, err)
	}

	writer := sessionwriter.NewWriter(cfg.FsUlimit, cfg.FsDir, cfg.FileBuffer, cfg.SyncTimeout)

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(cfg.ProducerCloseTimeout)
	rewriter := assets.NewRewriter(cfg.AssetsOrigin)
	assetMessageHandler := assetscache.New(cfg, rewriter, producer, metrics)

	counter := storage.NewLogCounter()
	// Session message metrics
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

	msgHandler := func(msg messages.Message) {
		// [METRICS] Increase the number of processed messages
		totalMessages.Add(context.Background(), 1)

		// Send SessionEnd trigger to storage service
		if msg.TypeID() == messages.MsgSessionEnd {
			if err := producer.Produce(cfg.TopicTrigger, msg.SessionID(), msg.Encode()); err != nil {
				log.Printf("can't send SessionEnd to trigger topic: %s; sessID: %d", err, msg.SessionID())
			}
			writer.Close(msg.SessionID())
			return
		}

		// Process assets
		if msg.TypeID() == messages.MsgSetNodeAttributeURLBased ||
			msg.TypeID() == messages.MsgSetCSSDataURLBased ||
			msg.TypeID() == messages.MsgCSSInsertRuleURLBased ||
			msg.TypeID() == messages.MsgAdoptedSSReplaceURLBased ||
			msg.TypeID() == messages.MsgAdoptedSSInsertRuleURLBased {
			m := msg.Decode()
			if m == nil {
				log.Printf("assets decode err, info: %s", msg.Meta().Batch().Info())
				return
			}
			msg = assetMessageHandler.ParseAssets(m)
		}

		// Filter message
		if !messages.IsReplayerType(msg.TypeID()) {
			return
		}

		// If message timestamp is empty, use at least ts of session start
		ts := msg.Meta().Timestamp
		if ts == 0 {
			log.Printf("zero ts; sessID: %d, msgType: %d", msg.SessionID(), msg.TypeID())
		} else {
			// Log ts of last processed message
			counter.Update(msg.SessionID(), time.UnixMilli(ts))
		}

		// Try to encode message to avoid null data inserts
		data := msg.Encode()
		if data == nil {
			return
		}

		// Write message to file
		if err := writer.Write(msg); err != nil {
			log.Printf("writer error: %s", err)
			return
		}

		// [METRICS] Increase the number of written to the files messages and the message size
		messageSize.Record(context.Background(), float64(len(msg.Encode())))
		savedMessages.Add(context.Background(), 1)
	}

	consumer := queue.NewConsumer(
		cfg.GroupSink,
		[]string{
			cfg.TopicRawWeb,
		},
		messages.NewMessageIterator(msgHandler, nil, false),
		false,
		cfg.MessageSizeLimit,
	)
	log.Printf("Sink service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(10 * time.Second)
	tickInfo := time.Tick(30 * time.Second)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			// Sync and stop writer
			writer.Stop()
			// Commit and stop consumer
			if err := consumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
			consumer.Close()
			os.Exit(0)
		case <-tick:
			if err := consumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
		case <-tickInfo:
			counter.Print()
			log.Printf("writer: %s", writer.Info())
		case <-consumer.Rebalanced():
			s := time.Now()
			// Commit now to avoid duplicate reads
			if err := consumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
			// Sync all files
			writer.Sync()
			log.Printf("manual sync finished, dur: %d", time.Now().Sub(s).Milliseconds())
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}
}
