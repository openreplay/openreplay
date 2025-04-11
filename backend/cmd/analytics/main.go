package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/pkg/logger"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	log.Info(ctx, "Cacher service started")

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	for {
		select {
		case sig := <-sigchan:
			log.Error(ctx, "Caught signal %v: terminating", sig)
			os.Exit(0)
		}
	}
}

//
//import (
//	"context"
//
//	analyticsConfig "openreplay/backend/internal/config/analytics"
//	"openreplay/backend/pkg/analytics"
//	"openreplay/backend/pkg/db/postgres/pool"
//	"openreplay/backend/pkg/logger"
//	"openreplay/backend/pkg/metrics"
//	"openreplay/backend/pkg/metrics/database"
//	"openreplay/backend/pkg/metrics/web"
//	"openreplay/backend/pkg/server"
//	"openreplay/backend/pkg/server/api"
//)
//
//func main() {
//	ctx := context.Background()
//	log := logger.New()
//	cfg := analyticsConfig.New(log)
//	// Observability
//	webMetrics := web.New("analytics")
//	dbMetrics := database.New("analytics")
//	metrics.New(log, append(webMetrics.List(), dbMetrics.List()...))
//
//	pgConn, err := pool.New(dbMetrics, cfg.Postgres.String())
//	if err != nil {
//		log.Fatal(ctx, "can't init postgres connection: %s", err)
//	}
//	defer pgConn.Close()
//
//	builder, err := analytics.NewServiceBuilder(log, cfg, webMetrics, dbMetrics, pgConn)
//	if err != nil {
//		log.Fatal(ctx, "can't init services: %s", err)
//	}
//
//	router, err := api.NewRouter(&cfg.HTTP, log)
//	if err != nil {
//		log.Fatal(ctx, "failed while creating router: %s", err)
//	}
//	router.AddHandlers(api.NoPrefix, builder.CardsAPI, builder.DashboardsAPI, builder.ChartsAPI)
//	router.AddMiddlewares(builder.Auth.Middleware, builder.RateLimiter.Middleware, builder.AuditTrail.Middleware)
//
//	server.Run(ctx, log, &cfg.HTTP, router)
//}
