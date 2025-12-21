package main

import (
	"context"

	config "openreplay/backend/internal/config/db"
	"openreplay/backend/internal/db"
	"openreplay/backend/internal/db/datasaver"
	"openreplay/backend/pkg/canvas"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/issues"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/tags"
	"openreplay/backend/pkg/terminator"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)

	dbMetric := database.New("db")
	metrics.New(log, dbMetric.List())

	pgConn, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	chConn, err := clickhouse.NewConnection(cfg.Clickhouse)
	if err != nil {
		log.Fatal(ctx, "can't init clickhouse connection: %s", err)
	}

	redisConn, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Warn(ctx, "can't init redis connection: %s", err)
	}
	defer redisConn.Close()

	issuesManager, err := issues.New(log, redisConn)
	if err != nil {
		log.Fatal(ctx, "can't init issues keeper: %s", err)
	}

	chConnector, err := clickhouse.NewConnector(chConn, dbMetric)
	if err != nil {
		log.Fatal(ctx, "can't prepare clickhouse connector: %s", err)
	}
	defer chConnector.Stop()

	projManager := projects.New(log, pgConn, redisConn, dbMetric)
	sessManager := sessions.New(log, pgConn, projManager, redisConn, dbMetric)
	tagsManager := tags.New(log, pgConn)

	canvases, err := canvas.New(log, pgConn, dbMetric)
	if err != nil {
		log.Fatal(ctx, "can't init project service: %s", err)
	}

	saver := datasaver.New(log, cfg, chConnector, sessManager, issuesManager, tagsManager, canvases)

	msgFilter := []int{
		// Web messages
		messages.MsgMetadata, messages.MsgIssueEvent, messages.MsgSessionStart, messages.MsgSessionEnd,
		messages.MsgUserID, messages.MsgUserAnonymousID, messages.MsgPerformanceTrackAggr,
		messages.MsgJSException, messages.MsgResourceTiming, messages.MsgCustomEvent, messages.MsgCustomIssue,
		messages.MsgFetch, messages.MsgNetworkRequest, messages.MsgGraphQL, messages.MsgStateAction, messages.MsgMouseClick,
		messages.MsgMouseClickDeprecated, messages.MsgSetPageLocation, messages.MsgSetPageLocationDeprecated,
		messages.MsgPageLoadTiming, messages.MsgPageRenderTiming,
		messages.MsgPageEvent, messages.MsgPageEventDeprecated, messages.MsgMouseThrashing, messages.MsgInputChange,
		messages.MsgUnbindNodes, messages.MsgTagTrigger, messages.MsgIncident, messages.MsgCanvasNode,
		// Mobile messages
		messages.MsgMobileSessionStart, messages.MsgMobileSessionEnd, messages.MsgMobileUserID, messages.MsgMobileUserAnonymousID,
		messages.MsgMobileMetadata, messages.MsgMobileEvent, messages.MsgMobileNetworkCall,
		messages.MsgMobileClickEvent, messages.MsgMobileSwipeEvent, messages.MsgMobileInputEvent,
		messages.MsgMobileCrash, messages.MsgMobileIssueEvent,
	}

	// Init consumer
	consumer, err := queue.NewConsumer(
		log,
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
		types.NoReadBackGap,
	)
	if err != nil {
		log.Fatal(ctx, "can't init message consumer: %s", err)
	}

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
