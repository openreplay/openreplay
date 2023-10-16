package main

import (
	"log"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/sessions"

	config "openreplay/backend/internal/config/connector"
	"openreplay/backend/internal/connector"
	saver "openreplay/backend/pkg/connector"
	"openreplay/backend/pkg/memory"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/terminator"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := config.New()

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatalf("can't init object storage: %s", err)
	}

	var db saver.Database
	switch cfg.ConnectorType {
	case "redshift":
		if db, err = saver.NewRedshift(cfg, objStore); err != nil {
			log.Fatalf("can't init redshift connection: %s", err)
		}
	case "clickhouse":
		if db, err = saver.NewClickHouse(cfg); err != nil {
			log.Fatalf("can't init clickhouse connection: %s", err)
		}
	default:
		log.Fatalf("unknown connector type: %s", cfg.ConnectorType)
	}
	defer db.Close()

	// Init postgres connection
	pgConn, err := pool.New(cfg.Postgres.String())
	if err != nil {
		log.Printf("can't init postgres connection: %s", err)
		return
	}
	defer pgConn.Close()

	// Init redis connection
	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Printf("can't init redis connection: %s", err)
	}
	defer redisClient.Close()

	projManager := projects.New(pgConn, redisClient)
	sessManager := sessions.New(pgConn, projManager, redisClient)

	// Saves messages to Redshift
	dataSaver := saver.New(cfg, db, sessManager, projManager)

	// Message filter
	msgFilter := []int{messages.MsgConsoleLog, messages.MsgCustomEvent, messages.MsgJSException,
		messages.MsgNetworkRequest, messages.MsgIssueEvent, messages.MsgCustomIssue,
		messages.MsgSessionStart, messages.MsgSessionEnd, messages.MsgConnectionInformation,
		messages.MsgMetadata, messages.MsgPageEvent, messages.MsgPerformanceTrackAggr, messages.MsgUserID,
		messages.MsgUserAnonymousID, messages.MsgJSException, messages.MsgJSExceptionDeprecated,
		messages.MsgInputEvent, messages.MsgMouseClick, messages.MsgIssueEventDeprecated}

	// Init consumer
	consumer := queue.NewConsumer(
		cfg.GroupConnector,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicAnalytics,
		},
		messages.NewMessageIterator(dataSaver.Handle, msgFilter, true),
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
	service := connector.New(cfg, consumer, dataSaver, memoryManager)
	log.Printf("Connector service started\n")
	terminator.Wait(service)
}
