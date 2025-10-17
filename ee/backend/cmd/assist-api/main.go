package main

import (
	"context"

	assistConfig "openreplay/backend/internal/config/assist"
	"openreplay/backend/pkg/assist"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/middleware"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := assistConfig.New(log)

	webMetrics := web.New("assist")
	dbMetric := databaseMetrics.New("assist")
	metrics.New(log, append(webMetrics.List(), dbMetric.List()...))

	// Use assistKey as an authorization mechanism (legacy)
	if cfg.AssistKey == "" {
		log.Fatal(ctx, "assist key is not set")
	}

	pgPool, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgPool.Close()

	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Fatal(ctx, "can't init redis connection: %s", err)
	}
	defer redisClient.Close()

	prefix := api.NoPrefix
	services, err := assist.NewServiceBuilder(log, cfg, webMetrics, dbMetric, pgPool, redisClient)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	// Use the minimal middleware here because we have the normal one on the api side (assist proxy)
	middlewares, err := middleware.NewMinimalMiddlewareBuilder(&cfg.HTTP)
	if err != nil {
		log.Fatal(ctx, "can't init middlewares: %s", err)
	}

	router, err := api.NewRouter(log, &cfg.HTTP, prefix, services.Handlers(), middlewares.Middlewares())
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	server.Run(ctx, log, &cfg.HTTP, router)
}
