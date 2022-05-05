package main

import (
	"log"
	"openreplay/backend/internal/builder"
	"openreplay/backend/internal/config/ender"
	"openreplay/backend/pkg/intervals"
	logger "openreplay/backend/pkg/log"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := ender.New()

	builderMap := builder.NewBuilderMap()
	statsLogger := logger.NewQueueStats(cfg.LoggerTimeout)
	producer := queue.NewProducer()
	consumer := queue.NewMessageConsumer(
		cfg.GroupEvents,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicRawIOS,
		},
		func(sessionID uint64, msg messages.Message, meta *types.Meta) {
			statsLogger.Collect(sessionID, meta)
			builderMap.HandleMessage(sessionID, msg, msg.Meta().Index)
		},
		false,
	)

	tick := time.Tick(intervals.EVENTS_COMMIT_INTERVAL * time.Millisecond)

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	log.Printf("Ender service started\n")
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			producer.Close(cfg.ProducerTimeout)
			consumer.Commit()
			consumer.Close()
			os.Exit(0)
		case <-tick:
			builderMap.IterateReadyMessages(time.Now().UnixMilli(), func(sessionID uint64, readyMsg messages.Message) {
				producer.Produce(cfg.TopicTrigger, sessionID, messages.Encode(readyMsg))
			})
			producer.Flush(cfg.ProducerTimeout)
			consumer.Commit()
		default:
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consuming: %v", err)
			}
		}
	}

	// Config

}
