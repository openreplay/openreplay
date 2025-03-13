package main

import (
	"bytes"
	"context"
	"encoding/binary"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/sink"
	"openreplay/backend/internal/sink/assetscache"
	"openreplay/backend/internal/sink/sessionwriter"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/sink"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/url/assets"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)
	// Observability
	sinkMetrics := sink.New("sink")
	metrics.New(log, sinkMetrics.List())

	if _, err := os.Stat(cfg.FsDir); os.IsNotExist(err) {
		log.Fatal(ctx, "%v doesn't exist. %v", cfg.FsDir, err)
	}

	writer := sessionwriter.NewWriter(log, cfg.FsUlimit, cfg.FsDir, cfg.FileBuffer, cfg.SyncTimeout)

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(cfg.ProducerCloseTimeout)
	rewriter, err := assets.NewRewriter(cfg.AssetsOrigin)
	if err != nil {
		log.Fatal(ctx, "can't init rewriter: %s", err)
	}
	assetMessageHandler := assetscache.New(log, cfg, rewriter, producer, sinkMetrics)
	counter := storage.NewLogCounter()

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
			sinkMetrics.RecordWrittenBytes(float64(domBuffer.Len()), "dom")
			sinkMetrics.RecordWrittenBytes(float64(devBuffer.Len()), "devtools")

			// Write buffered batches to the session
			if err := writer.Write(sessionID, domBuffer.Bytes(), devBuffer.Bytes()); err != nil {
				sessCtx := context.WithValue(context.Background(), "sessionID", sessionID)
				log.Error(sessCtx, "writer error: %s", err)
			}

			// Prepare buffer for the next batch
			domBuffer.Reset()
			devBuffer.Reset()
			sessionID = 0
			return
		}

		sinkMetrics.IncreaseTotalMessages()
		sessCtx := context.WithValue(context.Background(), "sessionID", msg.SessionID())

		// Send SessionEnd trigger to storage service
		if msg.TypeID() == messages.MsgSessionEnd || msg.TypeID() == messages.MsgMobileSessionEnd {
			if err := producer.Produce(cfg.TopicTrigger, msg.SessionID(), msg.Encode()); err != nil {
				log.Error(sessCtx, "can't send SessionEnd to trigger topic: %s", err)
			}
			// duplicate session end message to mobile trigger topic to build video replay for mobile sessions
			if msg.TypeID() == messages.MsgMobileSessionEnd {
				if err := producer.Produce(cfg.TopicMobileTrigger, msg.SessionID(), msg.Encode()); err != nil {
					log.Error(sessCtx, "can't send MobileSessionEnd to mobile trigger topic: %s", err)
				}
			}
			writer.Close(msg.SessionID())
			return
		}

		// Process assets
		if msg.TypeID() == messages.MsgSetNodeAttributeURLBased ||
			msg.TypeID() == messages.MsgSetCSSDataURLBased ||
			msg.TypeID() == messages.MsgAdoptedSSReplaceURLBased ||
			msg.TypeID() == messages.MsgAdoptedSSInsertRuleURLBased {
			m := msg.Decode()
			if m == nil {
				log.Error(sessCtx, "assets decode err, info: %s", msg.Meta().Batch().Info())
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
			log.Warn(sessCtx, "zero ts in msgType: %d", msg.TypeID())
		} else {
			// Log ts of last processed message
			counter.Update(msg.SessionID(), time.UnixMilli(int64(ts)))
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
				log.Error(sessCtx, "domBuffer index write err: %s", err)
			}
			if n != len(messageIndex) {
				log.Error(sessCtx, "domBuffer index not full write: %d/%d", n, len(messageIndex))
			}
			// Write message body
			n, err = domBuffer.Write(msg.Encode())
			if err != nil {
				log.Error(sessCtx, "domBuffer message write err: %s", err)
			}
			if n != len(msg.Encode()) {
				log.Error(sessCtx, "domBuffer message not full write: %d/%d", n, len(messageIndex))
			}
		}

		// Add message to dev buffer
		if !messages.IsDOMType(msg.TypeID()) || msg.TypeID() == messages.MsgTimestamp || msg.TypeID() == messages.MsgTabData {
			// Write message index
			n, err = devBuffer.Write(messageIndex)
			if err != nil {
				log.Error(sessCtx, "devBuffer index write err: %s", err)
			}
			if n != len(messageIndex) {
				log.Error(sessCtx, "devBuffer index not full write: %d/%d", n, len(messageIndex))
			}
			// Write message body
			n, err = devBuffer.Write(msg.Encode())
			if err != nil {
				log.Error(sessCtx, "devBuffer message write err: %s", err)
			}
			if n != len(msg.Encode()) {
				log.Error(sessCtx, "devBuffer message not full write: %d/%d", n, len(messageIndex))
			}
		}

		sinkMetrics.IncreaseWrittenMessages()
		sinkMetrics.RecordMessageSize(float64(len(msg.Encode())))
	}

	consumer := queue.NewConsumer(
		cfg.GroupSink,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicRawMobile,
		},
		messages.NewSinkMessageIterator(log, msgHandler, nil, false, sinkMetrics),
		false,
		cfg.MessageSizeLimit,
	)
	log.Info(ctx, "sink service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(10 * time.Second)
	tickInfo := time.Tick(30 * time.Second)
	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "Caught signal %v: terminating", sig)
			// Sync and stop writer
			writer.Stop()
			// Commit and stop consumer
			if err := consumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
			consumer.Close()
			os.Exit(0)
		case <-tick:
			if err := consumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
		case <-tickInfo:
			log.Info(ctx, "%s", counter.Log())
			log.Info(ctx, "writer: %s", writer.Info())
		case <-consumer.Rebalanced():
			s := time.Now()
			// Commit now to avoid duplicate reads
			if err := consumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
			// Sync all files
			writer.Sync()
			log.Info(ctx, "manual sync finished, dur: %d", time.Now().Sub(s).Milliseconds())
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "error on consumption: %v", err)
			}
		}
	}
}
