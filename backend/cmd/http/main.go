package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/services"
	conditions "openreplay/backend/pkg/conditions/api"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	featureflags "openreplay/backend/pkg/featureflags/api"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	httpMetrics "openreplay/backend/pkg/metrics/http"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
	mobilesessions "openreplay/backend/pkg/sessions/api/mobile"
	websessions "openreplay/backend/pkg/sessions/api/web"
	tags "openreplay/backend/pkg/tags/api"
	uxtesting "openreplay/backend/pkg/uxtesting/api"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := http.New(log)
	metrics.New(log, append(httpMetrics.List(), databaseMetrics.List()...))

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

	services, err := services.New(log, cfg, producer, pgConn, redisClient)
	if err != nil {
		log.Fatal(ctx, "failed while creating services: %s", err)
	}

	router, err := api.NewRouter(&cfg.HTTP, log, pgConn)
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	webAPI, err := websessions.NewHandlers(cfg, log, services)
	if err != nil {
		log.Fatal(ctx, "failed while creating web sessions handlers: %s", err)
	}
	router.AddHandlers(webAPI.GetAll())

	mobileAPI, err := mobilesessions.NewHandlers(cfg, log, services)
	if err != nil {
		log.Fatal(ctx, "failed while creating mobile sessions handlers: %s", err)
	}
	router.AddHandlers(mobileAPI.GetAll())

	conditionsAPI, err := conditions.NewHandlers(log)
	if err != nil {
		log.Fatal(ctx, "failed while creating conditions handlers: %s", err)
	}
	router.AddHandlers(conditionsAPI.GetAll())

	featureFlagsAPI, err := featureflags.NewHandlers(log, cfg.JsonSizeLimit, services)
	if err != nil {
		log.Fatal(ctx, "failed while creating feature flags handlers: %s", err)
	}
	router.AddHandlers(featureFlagsAPI.GetAll())

	tagsAPI, err := tags.NewHandlers(log, services)
	if err != nil {
		log.Fatal(ctx, "failed while creating tags handlers: %s", err)
	}
	router.AddHandlers(tagsAPI.GetAll())

	uxtestsAPI, err := uxtesting.NewHandlers(log, cfg.JsonSizeLimit, services)
	if err != nil {
		log.Fatal(ctx, "failed while creating ux testing handlers: %s", err)
	}
	router.AddHandlers(uxtestsAPI.GetAll())

	webServer, err := server.New(router.GetHandler(), cfg.HTTPHost, cfg.HTTPPort, cfg.HTTPTimeout)
	if err != nil {
		log.Fatal(ctx, "failed while creating server: %s", err)
	}
	go func() {
		if err := webServer.Start(); err != nil {
			log.Fatal(ctx, "http server error: %s", err)
		}
	}()

	log.Info(ctx, "server successfully started on port %s", cfg.HTTPPort)

	// Wait stop signal to shut down server gracefully
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	<-sigchan
	log.Info(ctx, "shutting down the server")
	webServer.Stop()
}
