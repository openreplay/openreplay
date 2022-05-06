package main

import (
	"log"
	"openreplay/backend/internal/config/ender"
	"openreplay/backend/internal/sessionender"
	"time"

	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/pkg/intervals"
	logger "openreplay/backend/pkg/log"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	// Load service configuration
	cfg := ender.New()

	// Init all modules
	statsLogger := logger.NewQueueStats(cfg.LoggerTimeout)
	sessions := sessionender.New(intervals.EVENTS_SESSION_END_TIMEOUT)
	producer := queue.NewProducer()
	consumer := queue.NewMessageConsumer(
		cfg.GroupEvents,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicRawIOS,
		},
		func(sessionID uint64, msg messages.Message, meta *types.Meta) {
			statsLogger.Collect(sessionID, meta)
			sessions.UpdateSession(sessionID, messages.GetTimestamp(msg))
		},
		false,
	)

	log.Printf("Ender service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(intervals.EVENTS_COMMIT_INTERVAL * time.Millisecond)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			producer.Close(cfg.ProducerTimeout)
			if err := consumer.CommitBack(intervals.EVENTS_BACK_COMMIT_GAP); err != nil {
				log.Printf("can't commit messages with offset: %s", err)
			}
			consumer.Close()
			os.Exit(0)
		case <-tick:
			// Find ended sessions and send notification to other services
			sessions.HandleEndedSessions(func(sessionID uint64, timestamp int64) bool {
				msg := &messages.SessionEnd{Timestamp: uint64(timestamp)}
				if err := producer.Produce(cfg.TopicTrigger, sessionID, messages.Encode(msg)); err != nil {
					log.Printf("can't send message to queue: %s", err)
					return false
				}
				return true
			})
			producer.Flush(cfg.ProducerTimeout)
			if err := consumer.CommitBack(intervals.EVENTS_BACK_COMMIT_GAP); err != nil {
				log.Printf("can't commit messages with offset: %s", err)
			}
		default:
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consuming: %v", err)
			}
		}
	}
}
