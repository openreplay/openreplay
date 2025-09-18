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
	"openreplay/backend/pkg/server/middleware"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := analyticsConfig.New(log)

	webMetrics := web.New("analytics")
	dbMetrics := database.New("analytics")
	metrics.New(log, append(webMetrics.List(), dbMetrics.List()...))

	pgPool, err := pool.New(dbMetrics, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgPool.Close()

	chConn, err := clickhouse.NewConnection(cfg.Clickhouse)
	if err != nil {
		log.Fatal(ctx, "can't init clickhouse connection: %s", err)
	}
	defer chConn.Close()

	services, err := analytics.NewServiceBuilder(log, cfg, webMetrics, pgPool, chConn)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	middlewares, err := middleware.NewMiddlewareBuilder(log, cfg.JWTSecret, &cfg.HTTP, &cfg.RateLimiter, pgPool, dbMetrics, services.Handlers(), nil, nil)
	if err != nil {
		log.Fatal(ctx, "can't init middlewares: %s", err)
	}

	router, err := api.NewRouter(log, &cfg.HTTP, api.NoPrefix, services.Handlers(), middlewares.Middlewares())
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	server.Run(ctx, log, &cfg.HTTP, router)
}
