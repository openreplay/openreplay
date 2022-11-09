package main

import (
	"context"
	"log"
	"openreplay/backend/pkg/pprof"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"openreplay/backend/internal/config/sink"
	"openreplay/backend/internal/sink/assetscache"
	"openreplay/backend/internal/sink/oswriter"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/url/assets"
)

func main() {
	pprof.StartProfilingServer()

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

		// Write encoded message with index to session file
		data := msg.EncodeWithIndex()
		if data == nil {
			log.Printf("can't encode with index, err: %s", err)
			return
		}
		wasWritten := false // To avoid timestamp duplicates in original mob file
		if messages.IsDOMType(msg.TypeID()) {
			if err := writer.WriteDOM(msg.SessionID(), data); err != nil {
				if strings.Contains(err.Error(), "not a directory") {
					// Trying to write data to mob file by original path
					oldErr := writer.WriteMOB(msg.SessionID(), data)
					if oldErr != nil {
						log.Printf("MOB Writeer error: %s, prev DOM error: %s, info: %s", oldErr, err, msg.Meta().Batch().Info())
					} else {
						wasWritten = true
					}
				} else {
					log.Printf("DOM Writer error: %s, info: %s", err, msg.Meta().Batch().Info())
				}
			}
		}
		if !messages.IsDOMType(msg.TypeID()) || msg.TypeID() == messages.MsgTimestamp {
			// TODO: write only necessary timestamps
			if err := writer.WriteDEV(msg.SessionID(), data); err != nil {
				if strings.Contains(err.Error(), "not a directory") {
					if !wasWritten {
						// Trying to write data to mob file by original path
						oldErr := writer.WriteMOB(msg.SessionID(), data)
						if oldErr != nil {
							log.Printf("MOB Writeer error: %s, prev DEV error: %s, info: %s", oldErr, err, msg.Meta().Batch().Info())
						}
					}
				} else {
					log.Printf("Devtools Writer error: %s, info: %s", err, msg.Meta().Batch().Info())
				}
			}
		}

		// [METRICS] Increase the number of written to the files messages and the message size
		messageSize.Record(context.Background(), float64(len(data)))
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

	tick := time.Tick(30 * time.Second)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			if err := writer.CloseAll(); err != nil {
				log.Printf("closeAll error: %v\n", err)
			}
			if err := consumer.Commit(); err != nil {
				log.Printf("can't commit messages: %s", err)
			}
			consumer.Close()
			os.Exit(0)
		case <-tick:
			if err := writer.SyncAll(); err != nil {
				log.Fatalf("sync error: %v\n", err)
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
