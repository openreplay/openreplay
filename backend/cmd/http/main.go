package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/router"
	"openreplay/backend/internal/http/server"
	"openreplay/backend/internal/http/services"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	httpMetrics "openreplay/backend/pkg/metrics/http"
	"openreplay/backend/pkg/queue"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := http.New()

	m := metrics.New()
	m.Register(httpMetrics.List())
	m.Register(databaseMetrics.List())

	// Connect to queue
	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(15000)

	pgConn, err := pool.New(cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Warn(ctx, "can't init redis connection: %s", err)
	}
	defer redisClient.Close()

	services, err := services.New(cfg, producer, pgConn, redisClient)
	if err != nil {
		log.Fatal(ctx, "failed while creating services: %s", err)
	}

	router, err := router.NewRouter(cfg, log, services)
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	server, err := server.New(router.GetHandler(), cfg.HTTPHost, cfg.HTTPPort, cfg.HTTPTimeout)
	if err != nil {
		log.Fatal(ctx, "failed while creating server: %s", err)
	}

	// Run server
	go func() {
		if err := server.Start(); err != nil {
			log.Fatal(ctx, "http server error: %s", err)
		}
	}()

	log.Info(ctx, "server successfully started on port %s", cfg.HTTPPort)

	// Wait stop signal to shut down server gracefully
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	<-sigchan
	log.Info(ctx, "shutting down the server")
	server.Stop()
}
