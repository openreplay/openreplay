package main

import (
	"context"

	spotConfig "openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	spotMetrics "openreplay/backend/pkg/metrics/spot"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/middleware"
	"openreplay/backend/pkg/spot"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := spotConfig.New(log)

	webMetrics := web.New("spot")
	spotMetric := spotMetrics.New("spot")
	dbMetric := databaseMetrics.New("spot")
	metrics.New(log, append(webMetrics.List(), append(spotMetric.List(), dbMetric.List()...)...))

	pgPool, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgPool.Close()

	prefix := api.NoPrefix
	services, err := spot.NewServiceBuilder(log, cfg, webMetrics, spotMetric, pgPool, prefix)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	middlewares, err := middleware.NewMiddlewareBuilder(log, cfg.JWTSecret, &cfg.HTTP, &cfg.RateLimiter, pgPool, dbMetric, services.Handlers(), nil, nil)
	if err != nil {
		log.Fatal(ctx, "can't init middlewares: %s", err)
	}

	router, err := api.NewRouter(log, &cfg.HTTP, prefix, services.Handlers(), middlewares.Middlewares())
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	server.Run(ctx, log, &cfg.HTTP, router)
}
