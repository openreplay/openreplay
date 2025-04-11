package main

import (
	"context"

	config "openreplay/backend/internal/config/heuristics"
	"openreplay/backend/internal/heuristics"
	"openreplay/backend/pkg/builders"
	"openreplay/backend/pkg/handlers"
	"openreplay/backend/pkg/handlers/custom"
	"openreplay/backend/pkg/handlers/mobile"
	"openreplay/backend/pkg/handlers/web"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	heuristicsMetrics "openreplay/backend/pkg/metrics/heuristics"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/terminator"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)
	// Observability
	heuristicsMetric := heuristicsMetrics.New("heuristics")
	metrics.New(log, heuristicsMetric.List())

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
			&mobile.TapRageDetector{},
			mobile.NewViewComponentDurations(),
		}
	}

	eventBuilder := builders.NewBuilderMap(log, handlersFabric)
	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	consumer := queue.NewConsumer(
		cfg.GroupHeuristics,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicRawMobile,
		},
		messages.NewMessageIterator(log, eventBuilder.HandleMessage, nil, true),
		false,
		cfg.MessageSizeLimit,
	)

	// Init memory manager
	memoryManager, err := memory.NewManager(log, cfg.MemoryLimitMB, cfg.MaxMemoryUsage)
	if err != nil {
		log.Fatal(ctx, "can't init memory manager: %s", err)
		return
	}

	// Run service and wait for TERM signal
	service := heuristics.New(log, cfg, producer, consumer, eventBuilder, memoryManager, heuristicsMetric)
	log.Info(ctx, "Heuristics service started")
	terminator.Wait(log, service)
}
