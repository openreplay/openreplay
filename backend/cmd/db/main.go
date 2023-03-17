package main

import (
	"log"

	config "openreplay/backend/internal/config/db"
	"openreplay/backend/internal/db"
	"openreplay/backend/internal/db/datasaver"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/terminator"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	m := metrics.New()
	m.Register(databaseMetrics.List())

	cfg := config.New()

	// Init database
	pg := cache.NewPGCache(
		postgres.NewConn(cfg.Postgres.String(), cfg.BatchQueueLimit, cfg.BatchSizeLimit), cfg.ProjectExpirationTimeoutMs)
	defer pg.Close()

	// Init data saver
	saver := datasaver.New(cfg, pg)

	// Message filter
	msgFilter := []int{messages.MsgMetadata, messages.MsgIssueEvent, messages.MsgSessionStart, messages.MsgSessionEnd,
		messages.MsgUserID, messages.MsgUserAnonymousID, messages.MsgIntegrationEvent, messages.MsgPerformanceTrackAggr,
		messages.MsgJSException, messages.MsgResourceTiming, messages.MsgCustomEvent, messages.MsgCustomIssue,
		messages.MsgFetch, messages.MsgNetworkRequest, messages.MsgGraphQL, messages.MsgStateAction,
		messages.MsgSetInputTarget, messages.MsgSetInputValue, messages.MsgCreateDocument, messages.MsgMouseClick,
		messages.MsgSetPageLocation, messages.MsgPageLoadTiming, messages.MsgPageRenderTiming,
		messages.MsgInputEvent, messages.MsgPageEvent, messages.MsgMouseThrashing, messages.MsgInputChange,
		messages.MsgUnbindNodes}

	// Init consumer
	consumer := queue.NewConsumer(
		cfg.GroupDB,
		[]string{
			cfg.TopicRawWeb,
			cfg.TopicAnalytics,
		},
		messages.NewMessageIterator(saver.Handle, msgFilter, true),
		false,
		cfg.MessageSizeLimit,
	)

	// Run service and wait for TERM signal
	service := db.New(cfg, consumer, saver)
	log.Printf("Db service started\n")
	terminator.Wait(service)
}
