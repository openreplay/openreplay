package main

import (
	"log"
	"openreplay/backend/pkg/pprof"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openreplay/backend/internal/config/heuristics"
	"openreplay/backend/pkg/handlers"
	"openreplay/backend/pkg/handlers/web"
	"openreplay/backend/pkg/intervals"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/sessions"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := heuristics.New()
	if cfg.UseProfiler {
		pprof.StartProfilingServer()
	}

	// HandlersFabric returns the list of message handlers we want to be applied to each incoming message.
	handlersFabric := func() []handlers.MessageProcessor {
		return []handlers.MessageProcessor{
			&web.ClickRageDetector{},
			&web.CpuIssueDetector{},
			&web.DeadClickDetector{},
			&web.MemoryIssueDetector{},
			&web.NetworkIssueDetector{},
			&web.PerformanceAggregator{},
		}
	}

	// Create handler's aggregator
	builderMap := sessions.NewBuilderMap(handlersFabric)

	// Init producer and consumer for data bus
	producer := queue.NewProducer(cfg.MessageSizeLimit, true)

	msgHandler := func(msg messages.Message) {
		builderMap.HandleMessage(msg)
	}

	consumer := queue.NewConsumer(
		cfg.GroupHeuristics,
		[]string{
			cfg.TopicRawWeb,
		},
		messages.NewMessageIterator(msgHandler, nil, true),
		false,
		cfg.MessageSizeLimit,
	)

	log.Printf("Heuristics service started\n")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	tick := time.Tick(intervals.EVENTS_COMMIT_INTERVAL * time.Millisecond)
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			producer.Close(cfg.ProducerTimeout)
			consumer.Commit()
			consumer.Close()
			os.Exit(0)
		case <-tick:
			builderMap.IterateReadyMessages(func(sessionID uint64, readyMsg messages.Message) {
				producer.Produce(cfg.TopicAnalytics, sessionID, readyMsg.Encode())
			})
			producer.Flush(cfg.ProducerTimeout)
			consumer.Commit()
		case msg := <-consumer.Rebalanced():
			log.Println(msg)
		default:
			if err := consumer.ConsumeNext(); err != nil {
				log.Fatalf("Error on consuming: %v", err)
			}
		}
	}
}
