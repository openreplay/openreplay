package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/canvases"
	canvasService "openreplay/backend/pkg/canvases"
	"openreplay/backend/pkg/canvases/service"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/health"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics"
	canvasesMetrics "openreplay/backend/pkg/metrics/canvas"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/middleware"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)

	h := health.New()

	canvasMetrics := canvasesMetrics.New("canvases")
	webMetrics := web.New("canvases")
	dbMetric := database.New("canvases")
	metrics.New(log, append(canvasMetrics.List(), append(webMetrics.List(), dbMetric.List()...)...))

	pgConn, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	redisConn, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Warn(ctx, "can't init redis connection: %s", err)
	}
	defer redisConn.Close()

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "can't init object storage: %s", err)
	}

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(15000)
	h.Register("producer", func(ctx context.Context) error {
		return producer.Ping(ctx)
	})

	srv, err := service.New(cfg, log, objStore, producer, canvasMetrics)
	if err != nil {
		log.Fatal(ctx, "can't init canvases service: %s", err)
	}

	canvasConsumer, err := queue.NewConsumer(
		log,
		cfg.GroupCanvasImage,
		[]string{
			cfg.TopicCanvasImages,
			cfg.TopicCanvasTrigger,
		},
		messages.NewImagesMessageIterator(srv.MessageIterator, messages.NoFilter, messages.DoAutoDecode),
		queue.DoNotAutoCommit,
		cfg.MessageSizeLimit,
		queue.WithoutRebalanceHandler,
		types.NoReadBackGap,
	)
	if err != nil {
		log.Fatal(ctx, "can't init canvases service: %s", err)
	}
	h.Register("consumer", func(ctx context.Context) error {
		return canvasConsumer.Ping(ctx)
	})

	services, err := canvasService.NewServiceBuilder(log, cfg, webMetrics, dbMetric, producer, pgConn, redisConn, srv)
	if err != nil {
		log.Fatal(ctx, "can't build canvases services: %s", err)
	}

	middlewares, err := middleware.NewMinimalMiddlewareBuilder(&cfg.HTTP)
	if err != nil {
		log.Fatal(ctx, "failed while creating minimal http middleware: %s", err)
	}

	router, err := api.NewRouter(log, &cfg.HTTP, api.NoPrefix, services.Handlers(), middlewares.Middlewares())
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	go server.Run(ctx, log, &cfg.HTTP, router)

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	log.Info(ctx, "canvases service started")

	counterTick := time.Tick(time.Second * 30)
	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "caught signal %v: terminating", sig)
			srv.Wait()
			if err := canvasConsumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
			canvasConsumer.Close()
			os.Exit(0)
		case <-counterTick:
			srv.Wait()
			if err := canvasConsumer.Commit(); err != nil {
				log.Error(ctx, "can't commit messages: %s", err)
			}
		default:
			err = canvasConsumer.ConsumeNext()
			if err != nil {
				log.Fatal(ctx, "can't consume next message: %s", err)
			}
		}
	}

}
