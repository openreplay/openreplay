package main

import (
	"context"

	config "openreplay/backend/internal/config/otlp"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/health"
	"openreplay/backend/pkg/ingest_keys"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	otlpAPI "openreplay/backend/pkg/otlp/api"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/middleware"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)

	h := health.New()

	webMetrics := web.New("otlp")
	dbMetric := database.New("otlp")
	metrics.New(log, append(webMetrics.List(), dbMetric.List()...))

	pgConn, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()
	h.Register("postgres", func(ctx context.Context) error {
		return pgConn.Ping(ctx)
	})

	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Info(ctx, "no redis cache: %s", err)
	}
	defer redisClient.Close()
	h.Register("redis", func(ctx context.Context) error {
		return redisClient.Ping(ctx)
	})

	handlers, err := otlpAPI.NewHandlers(cfg, log, api.NewResponser(webMetrics),
		projects.New(log, pgConn, redisClient, dbMetric), ingest_keys.New(log, pgConn, redisClient))
	if err != nil {
		log.Fatal(ctx, "failed while creating otlp handlers: %s", err)
	}

	middlewares, err := middleware.NewMinimalMiddlewareBuilder(&cfg.HTTP)
	if err != nil {
		log.Fatal(ctx, "failed while creating minimal http middleware: %s", err)
	}

	router, err := api.NewRouter(log, &cfg.HTTP, api.NoPrefix, []api.Handlers{handlers}, middlewares.Middlewares())
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	server.Run(ctx, log, &cfg.HTTP, router)
}
