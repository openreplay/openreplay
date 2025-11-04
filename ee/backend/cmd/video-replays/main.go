package main

import (
	"context"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/server/middleware"
	"openreplay/backend/pkg/server/tenant"
	"openreplay/backend/pkg/sessions"
	"os"
	"os/signal"
	"syscall"
	"time"

	videoConfig "openreplay/backend/internal/config/videoreplays"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/videoreplays"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := videoConfig.New(log)

	webMetrics := web.New("video-replays")
	dbMetrics := database.New("video-replays")
	metrics.New(log, append(webMetrics.List(), dbMetrics.List()...))

	pgPool, err := pool.New(dbMetrics, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgPool.Close()

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "failed to create object storage:", err)
	}

	projManager := projects.New(log, pgPool, nil, dbMetrics)
	sessManager := sessions.New(log, pgPool, projManager, nil, dbMetrics)
	tenantsService := tenant.New(pgPool)

	videoService, err := videoreplays.NewServiceBuilder(log, cfg, sessManager, webMetrics, pgPool, objStore)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	consumer, err := queue.NewConsumer(
		log,
		cfg.GroupSessionVideoReplay,
		[]string{
			cfg.TopicSessionVideoReplay,
		},
		videoService.VideoService,
		false,
		cfg.MessageSizeLimit,
		nil,
		types.NoReadBackGap,
	)

	middlewares, err := middleware.NewMiddlewareBuilder(log, cfg.JWTSecret, &cfg.HTTP, &cfg.RateLimiter, pgPool, dbMetrics, videoService.Handlers(), tenantsService, projManager, nil, nil)
	if err != nil {
		log.Fatal(ctx, "can't init middlewares: %s", err)
	}

	router, err := api.NewRouter(log, &cfg.HTTP, "/replay-exporter", videoService.Handlers(), middlewares.Middlewares())
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}
	go server.Run(ctx, log, &cfg.HTTP, router)

	log.Info(ctx, "video-replays service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "caught signal %v: terminating", sig)
			consumer.Close()
			os.Exit(0)
		case <-counterTick:
			if err := consumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
		default:
			err = consumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "can't consume next message: %s", err)
			}
		}
	}
}
