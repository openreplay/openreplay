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
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := assistConfig.New(log)
	// Observability
	webMetrics := web.New("assist")
	dbMetric := databaseMetrics.New("assist")
	metrics.New(log, append(webMetrics.List(), dbMetric.List()...))

	pgConn, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Fatal(ctx, "can't init redis connection: %s", err)
	}
	defer redisClient.Close()

	prefix := api.NoPrefix
	builder, err := assist.NewServiceBuilder(log, cfg, webMetrics, dbMetric, pgConn, redisClient, prefix)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	router, err := api.NewRouter(&cfg.HTTP, log)
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}
	router.AddHandlers(prefix, builder.AssistAPI)
	router.AddMiddlewares(builder.Auth.Middleware, builder.RateLimiter.Middleware, builder.AuditTrail.Middleware)

	server.Run(ctx, log, &cfg.HTTP, router)
}
