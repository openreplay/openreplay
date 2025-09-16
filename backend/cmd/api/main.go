package main

import (
	"context"

	sessionConfig "openreplay/backend/internal/config/session"
	apiService "openreplay/backend/pkg/api"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	"openreplay/backend/pkg/metrics/web"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/server/middleware"
	"openreplay/backend/pkg/server/tenant"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := sessionConfig.New(log)

	webMetrics := web.New("api")
	dbMetric := database.New("api")
	metrics.New(log, append(webMetrics.List(), dbMetric.List()...))

	pgPool, err := pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection pool: %s", err)
	}
	defer pgPool.Close()

	redisClient, err := redis.New(&cfg.Redis)
	if err != nil {
		log.Warn(ctx, "can't init redis connection: %s", err)
	}
	defer redisClient.Close()

	chConnection, err := clickhouse.NewConnection(cfg.Clickhouse)
	if err != nil {
		log.Fatal(ctx, "can't init clickhouse connection: %s", err)
	}

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "can't init object storage: %s", err)
	}

	services, err := apiService.NewServiceBuilder(log, cfg, webMetrics, dbMetric, pgPool, chConnection, objStore)
	if err != nil {
		log.Fatal(ctx, "can't init services and handlers: %s", err)
	}

	middlewares, err := middleware.NewMiddlewareBuilder(log, cfg.JWTSecret, &cfg.HTTP, &cfg.RateLimiter, pgPool, dbMetric, services.Handlers())
	if err != nil {
		log.Fatal(ctx, "can't init middlewares: %s", err)
	}

	tenant := tenant.New(pgPool)
	if err != nil {
		log.Fatal(ctx, "can't init tenant service: %s", err)
	}

	projects := projects.New(log, pgPool, redisClient, dbMetric)
	if err != nil {
		log.Fatal(ctx, "can't init project service: %s", err)
	}

	apiAuth, err := auth.NewApiAuth(log, tenant, projects)
	if err != nil {
		log.Fatal(ctx, "can't init api auth service: %s", err)
	}

	middlewares.AddMiddleware(apiAuth)

	router, err := api.NewRouter(log, &cfg.HTTP, api.NoPrefix, services.Handlers(), middlewares.Middlewares())
	if err != nil {
		log.Fatal(ctx, "failed while creating router: %s", err)
	}

	server.Run(ctx, log, &cfg.HTTP, router)
}
