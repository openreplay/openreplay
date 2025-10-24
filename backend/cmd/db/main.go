package main

import (
	"context"

	config "openreplay/backend/internal/config/db"
	"openreplay/backend/internal/db"
	"openreplay/backend/internal/db/datasaver"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/tags"
	"openreplay/backend/pkg/terminator"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)
	metrics.New(log, databaseMetrics.List())

	pgConn, err := pool.New(cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	// Init events module
	pg := postgres.NewConn(log, pgConn)
	defer pg.Close()

	// Init redis connection
	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Warn(ctx, "can't init redis connection: %s", err)
	}
	defer redisClient.Close()

	projManager := projects.New(log, pgConn, redisClient)
	sessManager := sessions.New(log, pgConn, projManager, redisClient)
	tagsManager := tags.New(log, pgConn)

	// Init data saver
	saver := datasaver.New(log, cfg, pg, sessManager, tagsManager)

	// Message filter
	msgFilter := []int{
		// Web messages
		messages.MsgMetadata, messages.MsgIssueEvent, messages.MsgSessionStart, messages.MsgSessionEnd,
		messages.MsgUserID, messages.MsgUserAnonymousID, messages.MsgIntegrationEvent, messages.MsgPerformanceTrackAggr,
		messages.MsgJSException, messages.MsgCustomEvent, messages.MsgCustomIssue,
		messages.MsgFetch, messages.MsgNetworkRequest, messages.MsgGraphQL, messages.MsgStateAction, messages.MsgMouseClick,
		messages.MsgMouseClickDeprecated, messages.MsgSetPageLocation, messages.MsgSetPageLocationDeprecated,
		messages.MsgPageLoadTiming, messages.MsgPageRenderTiming,
		messages.MsgPageEvent, messages.MsgPageEventDeprecated, messages.MsgMouseThrashing, messages.MsgInputChange,
		messages.MsgUnbindNodes, messages.MsgCanvasNode, messages.MsgTagTrigger,
		// Mobile messages
		messages.MsgMobileSessionStart, messages.MsgMobileSessionEnd, messages.MsgMobileUserID, messages.MsgMobileUserAnonymousID,
		messages.MsgMobileMetadata, messages.MsgMobileEvent, messages.MsgMobileNetworkCall,
		messages.MsgMobileClickEvent, messages.MsgMobileSwipeEvent, messages.MsgMobileInputEvent,
		messages.MsgMobileCrash, messages.MsgMobileIssueEvent,
	}

	// Init consumer
	consumer := queue.NewConsumer(
		cfg.GroupDB,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicRawMobile,
			cfg.TopicAnalytics,
		},
		messages.NewMessageIterator(log, saver.Handle, msgFilter, true),
		false,
		cfg.MessageSizeLimit,
		nil,
	)

	// Init memory manager
	memoryManager, err := memory.NewManager(log, cfg.MemoryLimitMB, cfg.MaxMemoryUsage)
	if err != nil {
		log.Fatal(ctx, "can't init memory manager: %s", err)
	}

	// Run service and wait for TERM signal
	service := db.New(log, cfg, consumer, saver, memoryManager, sessManager)
	log.Info(ctx, "Db service started")
	terminator.Wait(log, service)
}
