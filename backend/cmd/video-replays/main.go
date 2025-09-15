package main

import (
	"context"
	"openreplay/backend/pkg/projects"
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

	pgConn, err := pool.New(dbMetrics, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	objStorage, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "failed to create object storage:", err)
	}

	projManager := projects.New(log, pgConn, nil, dbMetrics)
	sessManager := sessions.New(log, pgConn, projManager, nil, dbMetrics)

	builder, err := videoreplays.NewServiceBuilder(log, cfg, sessManager, webMetrics, dbMetrics, pgConn, objStorage)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	consumer := queue.NewConsumer(
		cfg.GroupSessionVideoReplay,
		[]string{
			cfg.TopicSessionVideoReplay,
		},
		builder.VideoService,
		false,
		cfg.MessageSizeLimit,
	)

	router, err := api.NewRouter(&cfg.HTTP, log, api.NoPrefix, builder)
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
		case msg := <-consumer.Rebalanced():
			log.Info(ctx, "consumer group rebalanced: %+v", msg)
		default:
			err = consumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "can't consume next message: %s", err)
			}
		}
	}
}
