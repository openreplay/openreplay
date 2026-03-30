package main

import (
	"context"

	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/services"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/health"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/middleware"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := http.New(log)

	h := health.New()

	webMetrics := web.New("http")
	dbMetric := database.New("http")
	metrics.New(log, append(webMetrics.List(), dbMetric.List()...))

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(15000)
	h.Register("producer", func(ctx context.Context) error {
		return producer.Ping(ctx)
	})

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

	services, err := services.New(log, cfg, webMetrics, dbMetric, producer, pgConn, redisClient)
	if err != nil {
		log.Fatal(ctx, "failed while creating services: %s", err)
	}

	middlewares, err := middleware.NewMinimalMiddlewareBuilder(&cfg.HTTP)
	if err != nil {
		log.Fatal(ctx, "failed while creating minimal http middleware: %s", err)
	}

	router, err := api.NewRouter(log, &cfg.HTTP, api.NoPrefix, services.Handlers(), middlewares.Middlewares())
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	server.Run(ctx, log, &cfg.HTTP, router)
}
