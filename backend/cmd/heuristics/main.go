package main

import (
	"log"
	config "openreplay/backend/internal/config/heuristics"
	"openreplay/backend/internal/heuristics"
	"openreplay/backend/pkg/builders"
	"openreplay/backend/pkg/handlers"
	"openreplay/backend/pkg/handlers/custom"
	"openreplay/backend/pkg/handlers/ios"
	"openreplay/backend/pkg/handlers/web"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	heuristicsMetrics "openreplay/backend/pkg/metrics/heuristics"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/terminator"
)

func main() {
	m := metrics.New()
	m.Register(heuristicsMetrics.List())

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)
	cfg := config.New()

	// HandlersFabric returns the list of message handlers we want to be applied to each incoming message.
	handlersFabric := func() []handlers.MessageProcessor {
		return []handlers.MessageProcessor{
			custom.NewPageEventBuilder(),
			web.NewDeadClickDetector(),
			&web.ClickRageDetector{},
			&web.CpuIssueDetector{},
			&web.MemoryIssueDetector{},
			&web.NetworkIssueDetector{},
			&web.PerformanceAggregator{},
			web.NewAppCrashDetector(),
			&ios.TapRageDetector{},
			ios.NewViewComponentDurations(),
		}
	}

	eventBuilder := builders.NewBuilderMap(handlersFabric)
	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	consumer := queue.NewConsumer(
		cfg.GroupHeuristics,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicRawIOS,
		},
		messages.NewMessageIterator(eventBuilder.HandleMessage, nil, true),
		false,
		cfg.MessageSizeLimit,
	)

	// Init memory manager
	memoryManager, err := memory.NewManager(cfg.MemoryLimitMB, cfg.MaxMemoryUsage)
	if err != nil {
		log.Printf("can't init memory manager: %s", err)
		return
	}

	// Run service and wait for TERM signal
	service := heuristics.New(cfg, producer, consumer, eventBuilder, memoryManager)
	log.Printf("Heuristics service started\n")
	terminator.Wait(service)
	log.Printf("Heuristics service stopped\n")
}
