package main

import (
	"context"

	config "openreplay/backend/internal/config/connector"
	"openreplay/backend/internal/connector"
	saver "openreplay/backend/pkg/connector"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/terminator"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)
	// Observability
	dbMetrics := database.New("connector")
	metrics.New(log, dbMetrics.List())

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "can't init object storage: %s", err)
	}
	batches, err := saver.NewBatches(cfg, objStore)
	if err != nil {
		log.Fatal(ctx, "can't init s3 buckets: %s", err)
	}

	var db saver.Database
	switch cfg.ConnectorType {
	case "redshift":
		if db, err = saver.NewRedshift(log, cfg, batches); err != nil {
			log.Fatal(ctx, "can't init redshift connection: %s", err)
		}
	case "clickhouse":
		if db, err = saver.NewClickHouse(log, cfg, batches); err != nil {
			log.Fatal(ctx, "can't init clickhouse connection: %s", err)
		}
	case "elasticsearch":
		if db, err = saver.NewElasticSearch(log, cfg); err != nil {
			log.Fatal(ctx, "can't init elasticsearch connection: %s", err)
		}
	case "s3":
		if db, err = saver.NewS3Storage(log, cfg, batches); err != nil {
			log.Fatal(ctx, "can't init s3 connection: %s", err)
		}
	default:
		log.Fatal(ctx, "unknown connector type: %s", cfg.ConnectorType)
	}
	defer db.Close()

	// Init postgres connection
	pgConn, err := pool.New(dbMetrics, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	// Init redis connection
	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Warn(ctx, "can't init redis connection: %s", err)
	}
	defer redisClient.Close()

	projManager := projects.New(log, pgConn, redisClient, dbMetrics)
	sessManager := sessions.New(log, pgConn, projManager, redisClient, dbMetrics)
	dataSaver := saver.New(log, cfg, db, sessManager, projManager)

	// Message filter
	msgFilter := []int{messages.MsgConsoleLog, messages.MsgCustomEvent, messages.MsgJSException,
		messages.MsgNetworkRequest, messages.MsgIssueEvent, messages.MsgCustomIssue,
		messages.MsgSessionStart, messages.MsgSessionEnd, messages.MsgConnectionInformation,
		messages.MsgMetadata, messages.MsgPageEvent, messages.MsgPerformanceTrackAggr, messages.MsgUserID,
		messages.MsgUserAnonymousID, messages.MsgJSException, messages.MsgInputEvent, messages.MsgMouseClick,
		// Mobile messages
		messages.MsgMobileSessionStart, messages.MsgMobileSessionEnd, messages.MsgMobileUserID, messages.MsgMobileUserAnonymousID,
		messages.MsgMobileMetadata, messages.MsgMobileEvent, messages.MsgMobileNetworkCall,
		messages.MsgMobileClickEvent, messages.MsgMobileSwipeEvent, messages.MsgMobileInputEvent,
		messages.MsgMobileCrash, messages.MsgMobileIssueEvent,
	}

	// Init consumer
	consumer := queue.NewConsumer(
		cfg.GroupConnector,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicAnalytics,
		},
		messages.NewMessageIterator(log, dataSaver.Handle, msgFilter, true),
		false,
		cfg.MessageSizeLimit,
	)

	// Init memory manager
	memoryManager, err := memory.NewManager(log, cfg.MemoryLimitMB, cfg.MaxMemoryUsage)
	if err != nil {
		log.Fatal(ctx, "can't init memory manager: %s", err)
	}

	// Run service and wait for TERM signal
	service := connector.New(cfg, consumer, dataSaver, memoryManager)
	log.Info(ctx, "Connector service started")
	terminator.Wait(log, service)
}
