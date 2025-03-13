package main

import (
	"context"

	spotConfig "openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	databaseMetrics "openreplay/backend/pkg/metrics/database"
	spotMetrics "openreplay/backend/pkg/metrics/spot"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/spot"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := spotConfig.New(log)
	// Observability
	webMetrics := web.New("spot")
	spotMetric := spotMetrics.New("spot")
	dbMetric := databaseMetrics.New("spot")
	metrics.New(log, append(webMetrics.List(), append(spotMetric.List(), dbMetric.List()...)...))

	pgConn, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()

	prefix := api.NoPrefix
	builder, err := spot.NewServiceBuilder(log, cfg, webMetrics, spotMetric, dbMetric, pgConn, prefix)
	if err != nil {
		log.Fatal(ctx, "can't init services: %s", err)
	}

	router, err := api.NewRouter(&cfg.HTTP, log)
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}
	router.AddHandlers(prefix, builder.SpotsAPI)
	router.AddMiddlewares(builder.Auth.Middleware, builder.RateLimiter.Middleware, builder.AuditTrail.Middleware)

	server.Run(ctx, log, &cfg.HTTP, router)
}
