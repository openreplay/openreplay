package main

import (
	"log"
	"time"

	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/pkg/intervals"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	logger "openreplay/backend/pkg/log"
	"openreplay/backend/services/ender/builder"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	GROUP_EVENTS := env.String("GROUP_ENDER")
	TOPIC_TRIGGER := env.String("TOPIC_TRIGGER")

	builderMap := builder.NewBuilderMap()

	statsLogger := logger.NewQueueStats(env.Int("LOG_QUEUE_STATS_INTERVAL_SEC"))

	producer := queue.NewProducer()
	consumer := queue.NewMessageConsumer(
		GROUP_EVENTS, 
		[]string{ 
			env.String("TOPIC_RAW_WEB"),
			env.String("TOPIC_RAW_IOS"),
		}, 
		func(sessionID uint64, msg messages.Message, meta *types.Meta) {
			statsLogger.HandleAndLog(sessionID, meta)
			builderMap.HandleMessage(sessionID, msg, msg.Meta().Index)
		},
	)
	consumer.DisableAutoCommit()
	
	tick := time.Tick(intervals.EVENTS_COMMIT_INTERVAL * time.Millisecond)

	sigchan := make(chan os.Signal, 1)
  signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

  log.Printf("Ender service started\n")
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			producer.Close(2000)
			consumer.CommitBack(intervals.EVENTS_BACK_COMMIT_GAP)
			consumer.Close()
			os.Exit(0)
		case <- tick:
			builderMap.IterateReadyMessages(time.Now().UnixNano()/1e6, func(sessionID uint64, readyMsg messages.Message) {
				producer.Produce(TOPIC_TRIGGER, sessionID, messages.Encode(readyMsg))
			})
			// TODO: why exactly do we need Flush here and not in any other place?
			producer.Flush(2000)
			consumer.CommitBack(intervals.EVENTS_BACK_COMMIT_GAP)
		default:
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consuming: %v", err)
			}
		}
	}
}

