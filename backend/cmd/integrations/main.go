package main

import (
	"context"

	config "openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/integrations"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)
	// Observability
	webMetrics := web.New("integrations")
	dbMetric := database.New("integrations")
	metrics.New(log, append(webMetrics.List(), dbMetric.List()...))

	pgConn, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	builder, err := integrations.NewServiceBuilder(log, cfg, webMetrics, dbMetric, pgConn)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	router, err := api.NewRouter(&cfg.HTTP, log)
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}
	router.AddHandlers(api.NoPrefix, builder.IntegrationsAPI)
	router.AddMiddlewares(builder.Auth.Middleware, builder.RateLimiter.Middleware, builder.AuditTrail.Middleware)

	server.Run(ctx, log, &cfg.HTTP, router)
}
