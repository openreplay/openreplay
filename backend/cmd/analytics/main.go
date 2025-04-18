package main

import (
	"context"
	analyticsConfig "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics"
	"openreplay/backend/pkg/analytics/db"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	//analyticsMetrics "openreplay/backend/pkg/metrics/analytics"
	//databaseMetrics "openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := analyticsConfig.New(log)
	webMetrics := web.New("analytics")
	dbMetrics := database.New("analytics")
	metrics.New(log, append(webMetrics.List(), dbMetrics.List()...))

	pgConn, err := pool.New(dbMetrics, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	chConn, err := db.NewConnector(cfg.Clickhouse)
	if err != nil {
		log.Fatal(ctx, "can't init clickhouse connection: %s", err)
	}
	defer chConn.Stop()

	builder, err := analytics.NewServiceBuilder(log, cfg, webMetrics, dbMetrics, pgConn, chConn)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	router, err := api.NewRouter(&cfg.HTTP, log)
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}
	router.AddHandlers(api.NoPrefix, builder.CardsAPI, builder.DashboardsAPI, builder.ChartsAPI)
	router.AddMiddlewares(builder.Auth.Middleware, builder.RateLimiter.Middleware, builder.AuditTrail.Middleware)

	server.Run(ctx, log, &cfg.HTTP, router)
}
