package main

import (
	"context"

	config "openreplay/backend/internal/config/db"
	"openreplay/backend/internal/db"
	"openreplay/backend/internal/db/datasaver"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
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
	// Observability
	dbMetric := database.New("db")
	metrics.New(log, dbMetric.List())

	pgConn, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	chConn := clickhouse.NewConnector(cfg.Clickhouse, dbMetric)
	if err := chConn.Prepare(); err != nil {
		log.Fatal(ctx, "can't prepare clickhouse: %s", err)
	}
	defer chConn.Stop()

	// Init db proxy module (postgres + clickhouse + batches)
	dbProxy := postgres.NewConn(log, pgConn, chConn, dbMetric)
	defer dbProxy.Close()

	// Init redis connection
	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Warn(ctx, "can't init redis connection: %s", err)
	}
	defer redisClient.Close()

	projManager := projects.New(log, pgConn, redisClient, dbMetric)
	sessManager := sessions.New(log, pgConn, projManager, redisClient, dbMetric)
	tagsManager := tags.New(log, pgConn)

	// Init data saver
	saver := datasaver.New(log, cfg, dbProxy, chConn, sessManager, tagsManager)

	// Message filter
	msgFilter := []int{
		// Web messages
		messages.MsgMetadata, messages.MsgIssueEvent, messages.MsgSessionStart, messages.MsgSessionEnd,
		messages.MsgUserID, messages.MsgUserAnonymousID, messages.MsgIntegrationEvent, messages.MsgPerformanceTrackAggr,
		messages.MsgJSException, messages.MsgResourceTiming, messages.MsgCustomEvent, messages.MsgCustomIssue,
		messages.MsgNetworkRequest, messages.MsgGraphQL, messages.MsgStateAction, messages.MsgMouseClick,
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
