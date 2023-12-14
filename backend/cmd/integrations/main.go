package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v4"

	config "openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/integrations"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/token"
)

func main() {
	m := metrics.New()
	m.Register(databaseMetrics.List())

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := config.New()

	pgConn, err := pgx.Connect(context.Background(), cfg.Postgres.String())
	if err != nil {
		log.Fatalf("can't init postgres connection: %s", err)
	}
	defer pgConn.Close(context.Background())

	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(15000)

	storage := integrations.NewStorage(pgConn)
	if err := storage.Listen(); err != nil {
		log.Fatalf("Listener error: %v", err)
	}

	listener, err := integrations.New(cfg, storage, producer, integrations.NewManager(), token.NewTokenizer(cfg.TokenSecret))
	if err != nil {
		log.Fatalf("Listener error: %v", err)
	}
	defer listener.Close()

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	log.Printf("Integration service started\n")
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			os.Exit(0)
		case err := <-listener.Errors:
			log.Printf("Listener error: %v", err)
			os.Exit(0)
		}
	}
}
