package main

import (
	"context"
	"github.com/jackc/pgx/v4/pgxpool"
	"log"
	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/router"
	"openreplay/backend/internal/http/server"
	"openreplay/backend/internal/http/services"
	"openreplay/backend/pkg/db/autocomplete"
	"openreplay/backend/pkg/db/batch"
	"openreplay/backend/pkg/monitoring"
	"openreplay/backend/pkg/sessions/cache"
	sessions "openreplay/backend/pkg/sessions/storage/postgres"
	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/queue"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)
	metrics := monitoring.New("http")
	cfg := http.New()

	// Connect to queue
	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(15000)

	// Create pool of connections to DB (postgres)
	conn, err := pgxpool.Connect(context.Background(), cfg.Postgres)
	if err != nil {
		log.Fatalf("pgxpool.Connect err: %s", err)
	}
	// Create pool wrapper
	connWrapper, err := postgres.NewPool(conn, metrics)
	if err != nil {
		log.Fatalf("can't create new pool wrapper: %s", err)
	}
	// Create cache level for projects and sessions-builder
	cacheService, err := cache.New(connWrapper, cfg.ProjectExpirationTimeoutMs)
	if err != nil {
		log.Fatalf("can't create cacher, err: %s", err)
	}
	batches := batch.New(connWrapper, cfg.BatchQueueLimit, cfg.BatchSizeLimit, metrics)
	autocompletes, err := autocomplete.New(connWrapper)
	if err != nil {
		log.Fatalf("can't init autocompletes: %s", err)
	}
	// Sessions
	sessionService, err := sessions.New(connWrapper, cacheService, batches, autocompletes)
	if err != nil {
		log.Fatalf("can't create session service: %s", err)
	}

	// Build all services
	services := services.New(cfg, producer, sessionService)

	// Init server's routes
	router, err := router.NewRouter(cfg, services, metrics)
	if err != nil {
		log.Fatalf("failed while creating engine: %s", err)
	}

	// Init server
	server, err := server.New(router.GetHandler(), cfg.HTTPHost, cfg.HTTPPort, cfg.HTTPTimeout)
	if err != nil {
		log.Fatalf("failed while creating server: %s", err)
	}

	// Run server
	go func() {
		if err := server.Start(); err != nil {
			log.Fatalf("Server error: %v\n", err)
		}
	}()

	log.Printf("Server successfully started on port %v\n", cfg.HTTPPort)

	// Wait stop signal to shut down server gracefully
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	<-sigchan
	log.Printf("Shutting down the server\n")
	server.Stop()
}
