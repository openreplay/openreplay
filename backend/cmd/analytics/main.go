package main

import (
	"context"
	"github.com/gorilla/mux"
	"net/http"
	"openreplay/backend/internal/http/server"
	"openreplay/backend/pkg/analytics"
	"openreplay/backend/pkg/analytics/api"
	"openreplay/backend/pkg/common"
	"openreplay/backend/pkg/common/api/auth"
	"openreplay/backend/pkg/common/middleware"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"os"
	"os/signal"
	"syscall"
	"time"

	config "openreplay/backend/internal/config/analytics"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)

	pgConn, err := pool.New(cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	services, err := analytics.NewServiceBuilder(log).
		WithDatabase(pgConn).
		WithJWTSecret(cfg.JWTSecret, cfg.JWTSpotSecret).
		WithObjectStorage(&cfg.ObjectsConfig).
		Build()

	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	// Define excluded paths for this service
	excludedPaths := map[string]map[string]bool{
		//"/v1/ping":  {"GET": true},
		//"/v1/spots": {"POST": true},
	}

	// Define permission fetching logic
	getPermissions := func(path string) []string {
		// Example logic to return permissions based on path
		if path == "/v1/admin" {
			return []string{"admin"}
		}
		return []string{"user"}
	}

	authOptionsSelector := func(r *http.Request) *auth.Options {
		pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
		if err != nil {
			log.Error(r.Context(), "failed to get path template: %s", err)
			return nil // Use default options if there’s an error
		}

		// Customize based on route and method
		if pathTemplate == "/v1/spots/{id}/uploaded" && r.Method == "POST" {
			column := "spot_jwt_iat"
			secret := cfg.JWTSpotSecret
			return &auth.Options{JwtColumn: column, Secret: secret}
		}

		// Return nil to signal default options in AuthMiddleware
		return nil
	}

	authMiddleware := middleware.AuthMiddleware(services, log, excludedPaths, getPermissions, authOptionsSelector)
	limiterMiddleware := middleware.RateLimit(common.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute))

	router, err := api.NewRouter(cfg, log, services)
	router.Use(middleware.CORS(cfg.UseAccessControlHeaders))
	router.Use(authMiddleware)
	router.Use(limiterMiddleware)
	router.Use(middleware.Action())

	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	analyticsServer, err := server.New(router.GetHandler(), cfg.HTTPHost, cfg.HTTPPort, cfg.HTTPTimeout)
	if err != nil {
		log.Fatal(ctx, "failed while creating server: %s", err)
	}

	go func() {
		if err := analyticsServer.Start(); err != nil {
			log.Fatal(ctx, "http server error: %s", err)
		}
	}()

	log.Info(ctx, "server successfully started on port %s", cfg.HTTPPort)

	// Wait stop signal to shut down server gracefully
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)
	<-sigchan
	log.Info(ctx, "shutting down the server")
	analyticsServer.Stop()

}
