package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v4"

	config "openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/integrations"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/token"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)
	metrics.New(log, databaseMetrics.List())

	pgConn, err := pgx.Connect(context.Background(), cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close(context.Background())

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(15000)

	storage := integrations.NewStorage(pgConn, log)
	if err := storage.Listen(); err != nil {
		log.Fatal(ctx, "can't init storage listener: %s", err)
	}

	listener, err := integrations.New(log, cfg, storage, producer, integrations.NewManager(log), token.NewTokenizer(cfg.TokenSecret))
	if err != nil {
		log.Fatal(ctx, "can't init service: %s", err)
	}
	defer listener.Close()

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	log.Info(ctx, "integration service started")
	for {
		select {
		case sig := <-sigchan:
			log.Info(ctx, "caught signal %v: terminating", sig)
			os.Exit(0)
		case err := <-listener.Errors:
			log.Error(ctx, "listener error: %s", err)
			os.Exit(0)
		}
	}
}
