package main

import (
	"log"
	config "openreplay/backend/internal/config/heuristics"
	"openreplay/backend/internal/heuristics"
	"openreplay/backend/pkg/handlers"
	"openreplay/backend/pkg/handlers/custom"
	"openreplay/backend/pkg/handlers/web"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/terminator"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)
	cfg := config.New()

	// HandlersFabric returns the list of message handlers we want to be applied to each incoming message.
	handlersFabric := func() []handlers.MessageProcessor {
		return []handlers.MessageProcessor{
			custom.NewInputEventBuilder(),
			custom.NewPageEventBuilder(),
			&web.ClickRageDetector{},
			&web.CpuIssueDetector{},
			&web.DeadClickDetector{},
			&web.MemoryIssueDetector{},
			&web.NetworkIssueDetector{},
			&web.PerformanceAggregator{},
		}
	}

	eventBuilder := sessions.NewBuilderMap(handlersFabric)
	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	consumer := queue.NewConsumer(
		cfg.GroupHeuristics,
		[]string{
			cfg.TopicRawWeb,
		},
		messages.NewMessageIterator(eventBuilder.HandleMessage, nil, true),
		false,
		cfg.MessageSizeLimit,
	)
	service := heuristics.New(cfg, producer, consumer, eventBuilder)
	log.Printf("Heuristics service started\n")
	terminator.Wait(service)
}
