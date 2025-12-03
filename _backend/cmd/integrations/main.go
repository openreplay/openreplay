package main

import (
	"context"

	config "openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/integrations"
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
	cfg := config.New(log)

	webMetrics := web.New("integrations")
	dbMetric := database.New("integrations")
	metrics.New(log, append(webMetrics.List(), dbMetric.List()...))

	pgPool, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgPool.Close()

	services, err := integrations.NewServiceBuilder(log, cfg, webMetrics, pgPool)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	middlewares, err := middleware.NewMiddlewareBuilder(log, cfg.JWTSecret, &cfg.HTTP, &cfg.RateLimiter, pgPool, dbMetric, services.Handlers(), nil, nil, nil, nil)
	if err != nil {
		log.Fatal(ctx, "can't init middlewares: %s", err)
	}

	router, err := api.NewRouter(log, &cfg.HTTP, api.NoPrefix, services.Handlers(), middlewares.Middlewares())
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	server.Run(ctx, log, &cfg.HTTP, router)
}
