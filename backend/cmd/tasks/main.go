package main

import (
	"context"

	config "openreplay/backend/internal/config/tasks"
	"openreplay/backend/internal/tasks"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/health"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics"
	"openreplay/backend/pkg/metrics/database"
	schedulerMetrics "openreplay/backend/pkg/metrics/scheduler"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/scheduler"
	"openreplay/backend/pkg/terminator"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

func main() {
	ctx := context.Background()
	log := logger.New()
	cfg := config.New(log)

	// Fail fast on a bad CRON_SCHEDULES before opening any connection.
	overrides, err := scheduler.ParseOverrides(cfg.CronSchedules, cfg.CronDisabled)
	if err != nil {
		log.Fatal(ctx, "invalid cron configuration: %s", err)
	}

	h := health.New()

	dbMetric := database.New("tasks")
	schedMetric := schedulerMetrics.New("tasks")
	metrics.New(log, append(schedMetric.List(), dbMetric.List()...))

	var pgConn pool.Pool
	pgConn, err = pool.New(dbMetric, cfg.Postgres.String())
	if err != nil {
		log.Fatal(ctx, "can't init postgres connection: %s", err)
	}
	defer pgConn.Close()
	h.Register("postgres", func(ctx context.Context) error {
		return pgConn.Ping(ctx)
	})

	var chConn driver.Conn
	chConn, err = clickhouse.NewConnection(cfg.Clickhouse)
	if err != nil {
		log.Fatal(ctx, "can't init clickhouse connection: %s", err)
	}
	defer chConn.Close()
	h.Register("clickhouse", func(ctx context.Context) error {
		return chConn.Ping(ctx)
	})

	objStore, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Fatal(ctx, "can't init object storage: %s", err)
	}

	service, err := tasks.New(log, cfg, overrides, pgConn, chConn, objStore, schedMetric)
	if err != nil {
		log.Fatal(ctx, "can't init scheduler: %s", err)
	}
	h.Register("scheduler", service.Ping)

	log.Info(ctx, "Scheduled activities service started")
	terminator.Wait(log, service)
}
