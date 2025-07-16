package main

import (
	"context"
	analyticsConfig "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := analyticsConfig.New(log)
	// Observability
	webMetrics := web.New("analytics")
	dbMetrics := database.New("analytics")
	metrics.New(log, append(webMetrics.List(), dbMetrics.List()...))

	pgConn, err := pool.New(dbMetrics, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	chConn, err := clickhouse.NewConnection(cfg.Clickhouse)
	if err != nil {
		log.Fatal(ctx, "can't init clickhouse connection: %s", err)
	}
	defer chConn.Close()

	builder, err := analytics.NewServiceBuilder(log, cfg, webMetrics, dbMetrics, pgConn, chConn)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	router, err := api.NewRouter(&cfg.HTTP, log, builder.RateLimiter, builder.Auth, builder.AuditTrail)
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}
	router.AddHandlers(api.NoPrefix, builder.ChartsAPI, builder.CardsAPI, builder.DashboardsAPI, builder.SearchAPI)

	server.Run(ctx, log, &cfg.HTTP, router)
}
