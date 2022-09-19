package main

import (
	"context"
	"log"
	"openreplay/backend/pkg/queue/types"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/config/sink"
	"openreplay/backend/internal/sink/assetscache"
	"openreplay/backend/internal/sink/oswriter"
	"openreplay/backend/internal/storage"
	. "openreplay/backend/pkg/messages"
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

	writer := oswriter.NewWriter(cfg.FsUlimit, cfg.FsDir)

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
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
		func(sessionID uint64, iter Iterator, meta *types.Meta) {
			for iter.Next() {
				// [METRICS] Increase the number of processed messages
				totalMessages.Add(context.Background(), 1)

				// Send SessionEnd trigger to storage service
				if iter.Type() == MsgSessionEnd {
					if err := producer.Produce(cfg.TopicTrigger, sessionID, iter.Message().Encode()); err != nil {
						log.Printf("can't send SessionEnd to trigger topic: %s; sessID: %d", err, sessionID)
					}
					continue
				}

				msg := iter.Message()
				// Process assets
				if iter.Type() == MsgSetNodeAttributeURLBased ||
					iter.Type() == MsgSetCSSDataURLBased ||
					iter.Type() == MsgCSSInsertRuleURLBased ||
					iter.Type() == MsgAdoptedSSReplaceURLBased ||
					iter.Type() == MsgAdoptedSSInsertRuleURLBased {
					m := msg.Decode()
					if m == nil {
						return
					}
					msg = assetMessageHandler.ParseAssets(sessionID, m) // TODO: filter type only once (use iterator inide or bring ParseAssets out here).
				}

				// Filter message
				if !IsReplayerType(msg.TypeID()) {
					continue
				}

				// If message timestamp is empty, use at least ts of session start
				ts := msg.Meta().Timestamp
				if ts == 0 {
					log.Printf("zero ts; sessID: %d, msgType: %d", sessionID, iter.Type())
				} else {
					// Log ts of last processed message
					counter.Update(sessionID, time.UnixMilli(ts))
				}

				// Write encoded message with index to session file
				data := msg.EncodeWithIndex()
				if err := writer.Write(sessionID, data); err != nil {
					log.Printf("Writer error: %v\n", err)
				}

				// [METRICS] Increase the number of written to the files messages and the message size
				messageSize.Record(context.Background(), float64(len(data)))
				savedMessages.Add(context.Background(), 1)
			}
			iter.Close()
		},
		false,
		cfg.MessageSizeLimit,
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
