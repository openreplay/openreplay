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
	"openreplay/backend/services/ender/builder"
)
 

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	GROUP_EVENTS := env.String("GROUP_ENDER")
	TOPIC_TRIGGER := env.String("TOPIC_TRIGGER")

	builderMap := builder.NewBuilderMap()
	var lastTs int64 = 0

	producer := queue.NewProducer()
	consumer := queue.NewMessageConsumer(
		GROUP_EVENTS, 
		[]string{ 
			env.String("TOPIC_RAW"),
		}, 
		func(sessionID uint64, msg messages.Message, meta *types.Meta) {
			lastTs = meta.Timestamp
			builderMap.HandleMessage(sessionID, msg, msg.Meta().Index)
			// builderMap.IterateSessionReadyMessages(sessionID, lastTs, func(readyMsg messages.Message) {
			// 	producer.Produce(TOPIC_TRIGGER, sessionID, messages.Encode(readyMsg))
			// })
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

