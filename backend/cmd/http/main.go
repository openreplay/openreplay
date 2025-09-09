package main

import (
	"context"

	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/services"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := http.New(log)

	webMetrics := web.New("http")
	dbMetric := database.New("http")
	metrics.New(log, append(webMetrics.List(), dbMetric.List()...))

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(15000)

	pgConn, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Info(ctx, "no redis cache: %s", err)
	}
	defer redisClient.Close()

	services, err := services.New(log, cfg, webMetrics, dbMetric, producer, pgConn, redisClient)
	if err != nil {
		log.Fatal(ctx, "failed while creating services: %s", err)
	}

	router, err := api.NewRouter(log, &cfg.HTTP, api.NoPrefix, services.Handlers(), nil)
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	server.Run(ctx, log, &cfg.HTTP, router)
}
