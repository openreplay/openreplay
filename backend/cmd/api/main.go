package main

import (
	"context"

	sessionConfig "openreplay/backend/internal/config/session"
	apiService "openreplay/backend/pkg/api"
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
	cfg := sessionConfig.New(log)

	webMetrics := web.New("api")
	dbMetric := database.New("api")
	metrics.New(log, append(webMetrics.List(), dbMetric.List()...))

	pgPool, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection pool: %s", err)
	}
	defer pgPool.Close()

	chConnection, err := clickhouse.NewConnection(cfg.Clickhouse)
	if err != nil {
		log.Fatal(ctx, "can't init clickhouse connection: %s", err)
	}

	services, err := apiService.NewServiceBuilder(log, cfg, webMetrics, dbMetric, pgPool, chConnection)
	if err != nil {
		log.Fatal(ctx, "can't init services and handlers: %s", err)
	}

	middlewares, err := middleware.NewMiddlewareBuilder(log, cfg.JWTSecret, &cfg.HTTP, &cfg.RateLimiter, pgPool, dbMetric, services.Handlers())
	if err != nil {
		log.Fatal(ctx, "can't init middlewares: %s", err)
	}

	router, err := api.NewRouter(log, &cfg.HTTP, api.NoPrefix, services.Handlers(), middlewares.Middlewares())
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	server.Run(ctx, log, &cfg.HTTP, router)
}
