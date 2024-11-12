package main

import (
	"context"
	config "openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/integrations"
	integrationsAPI "openreplay/backend/pkg/integrations/api"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/tracer"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)
	metrics.New(log, append(database.List()))

	pgConn, err := pool.New(cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	builder, err := integrations.NewServiceBuilder(log, cfg, pgConn)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	handlers, err := integrationsAPI.NewHandlers(log, cfg, builder)
	if err != nil {
		log.Fatal(ctx, "can't init handlers: %s", err)
	}

	router, err := api.NewRouter(&cfg.HTTP, log, pgConn)
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}
	router.AddHandlers(handlers)
	router.AddMiddlewares(builder.Auth.AuthMiddleware, builder.RateLimiter.RateLimitMiddleware, tracer.ActionMiddleware)

	server.Run(ctx, log, &cfg.HTTP, router)
}
