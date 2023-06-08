package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/router"
	"openreplay/backend/internal/http/server"
	"openreplay/backend/internal/http/services"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	httpMetrics "openreplay/backend/pkg/metrics/http"
	"openreplay/backend/pkg/queue"
)

func main() {
	m := metrics.New()
	m.Register(httpMetrics.List())
	m.Register(databaseMetrics.List())

	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	cfg := http.New()

	// Connect to queue
	producer := queue.NewProducer(cfg.MessageSizeLimit, true)
	defer producer.Close(15000)

	// Connect to database
	dbConn := cache.NewPGCache(postgres.NewConn(cfg.Postgres.String(), 0, 0), cfg.ProjectExpiration)
	defer dbConn.Close()

	// Build all services
	services, err := services.New(cfg, producer, dbConn)
	if err != nil {
		log.Fatalf("failed while creating services: %s", err)
	}

	// Init server's routes
	router, err := router.NewRouter(cfg, services)
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
