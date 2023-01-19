package main

import (
	"bytes"
	"context"
	"encoding/binary"
	"log"
	"openreplay/backend/pkg/pprof"
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
	if cfg.UseProfiler {
		pprof.StartProfilingServer()
	}

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

	var (
		sessionID    uint64
		messageIndex = make([]byte, 8)
		domBuffer    = bytes.NewBuffer(make([]byte, 1024))
		devBuffer    = bytes.NewBuffer(make([]byte, 1024))
	)

	// Reset buffers
	domBuffer.Reset()
	devBuffer.Reset()

	msgHandler := func(msg messages.Message) {
		// Check batchEnd signal (nil message)
		if msg == nil {
			// Skip empty buffers
			if domBuffer.Len() <= 0 && devBuffer.Len() <= 0 {
				return
			}
			// TODO: remove debug log
			log.Printf("domBufSize: %d, devBufSize: %d", domBuffer.Len(), devBuffer.Len())

			// Write buffered batches to the session
			if err := writer.Write(sessionID, domBuffer.Bytes(), devBuffer.Bytes()); err != nil {
				log.Printf("writer error: %s", err)
				return
			}

			// Prepare buffer for the next batch
			domBuffer.Reset()
			devBuffer.Reset()
			sessionID = 0
			return
		}

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

		// Write message to the batch buffer
		if sessionID == 0 {
			sessionID = msg.SessionID()
		}

		// Encode message index
		binary.LittleEndian.PutUint64(messageIndex, msg.Meta().Index)

		var (
			n   int
			err error
		)

		// Add message to dom buffer
		if messages.IsDOMType(msg.TypeID()) {
			// Write message index
			n, err = domBuffer.Write(messageIndex)
			if err != nil {
				log.Printf("domBuffer index write err: %s", err)
			}
			if n != len(messageIndex) {
				log.Printf("domBuffer index not full write: %d/%d", n, len(messageIndex))
			}
			// Write message body
			n, err = domBuffer.Write(msg.Encode())
			if err != nil {
				log.Printf("domBuffer message write err: %s", err)
			}
			if n != len(messageIndex) {
				log.Printf("domBuffer message not full write: %d/%d", n, len(messageIndex))
			}
		}

		// Add message to dev buffer
		if !messages.IsDOMType(msg.TypeID()) || msg.TypeID() == messages.MsgTimestamp {
			// Write message index
			n, err = devBuffer.Write(messageIndex)
			if err != nil {
				log.Printf("devBuffer index write err: %s", err)
			}
			if n != len(messageIndex) {
				log.Printf("devBuffer index not full write: %d/%d", n, len(messageIndex))
			}
			// Write message body
			n, err = devBuffer.Write(msg.Encode())
			if err != nil {
				log.Printf("devBuffer message write err: %s", err)
			}
			if n != len(messageIndex) {
				log.Printf("devBuffer message not full write: %d/%d", n, len(messageIndex))
			}
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
		messages.NewSinkMessageIterator(msgHandler, nil, false),
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
