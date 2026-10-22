package alerts

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/analytics/lexicon"
	"openreplay/backend/pkg/analytics/search"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/senders"
)

// Config holds the alerts-cron settings taken from the service configuration.
type Config struct {
	SiteURL             string
	SMTP                common.SMTP
	WebhookAllowedHosts string
	CHTimeout           time.Duration
	RunTimeout          time.Duration
	MetadataCacheTTL    time.Duration
}

// Job evaluates alerts once per tick. It implements scheduler.Job and scheduler.TimeoutJob.
type Job struct {
	log        logger.Logger
	store      Storage
	eval       Evaluator
	notifier   Notifier
	runTimeout time.Duration
	now        func() time.Time
}

// NewJob wires the alerts pipeline on top of shared Postgres and ClickHouse connections.
func NewJob(log logger.Logger, cfg Config, pg pool.Pool, ch driver.Conn) (*Job, error) {
	segments := lexicon.NewSegments(log, pg)
	srch, err := search.New(log, ch, pg, segments, cfg.MetadataCacheTTL)
	if err != nil {
		return nil, fmt.Errorf("init sessions search: %w", err)
	}
	httpClient := senders.NewHTTP(cfg.WebhookAllowedHosts, 10*time.Second)
	email, err := senders.NewEmail(cfg.SMTP)
	if err != nil {
		return nil, err
	}
	store := NewStorage(log, pg)
	return &Job{
		log:   log,
		store: store,
		eval:  NewEvaluator(log, ch, srch, cfg.CHTimeout),
		notifier: NewNotifier(log, store, Senders{
			Slack:   senders.NewSlack(httpClient, cfg.SiteURL),
			MSTeams: senders.NewMSTeams(httpClient, cfg.SiteURL),
			Webhook: senders.NewWebhook(httpClient),
			Email:   NewEmailSender(email, cfg.SiteURL),
		}),
		runTimeout: cfg.RunTimeout,
		now:        time.Now,
	}, nil
}

func (j *Job) Name() string              { return "alerts" }
func (j *Job) DefaultSchedule() string   { return "* * * * *" }
func (j *Job) RunTimeout() time.Duration { return j.runTimeout }

// Run is the port of alerts_processor.process for one tick.
func (j *Job) Run(ctx context.Context) error {
	nowMs := j.now().UnixMilli()
	all, err := j.store.ActiveAlerts(ctx)
	if err != nil {
		return err
	}
	var fired []Notification
	checked := 0
	for i := range all {
		a := &all[i]
		if !CanCheck(a, nowMs) {
			continue
		}
		if !Supported(a) {
			j.log.Warn(ctx, "alerts: alert %d: unsupported metric %q", a.AlertID, a.Query.Left)
			continue
		}
		checked++
		res, err := j.eval.Evaluate(ctx, a, nowMs)
		if err != nil {
			j.log.Error(ctx, "alerts: alert %d (%s): evaluation failed: %s", a.AlertID, a.Name, err)
			continue
		}
		j.log.Debug(ctx, "alerts: alert %d (%s): value=%v valid=%v", a.AlertID, a.Name, res.Value, res.Valid)
		if res.Valid {
			fired = append(fired, j.notifier.Build(a, res, nowMs))
		}
	}
	j.log.Info(ctx, "alerts: %d active, %d checked, %d fired", len(all), checked, len(fired))
	if len(fired) == 0 {
		return nil
	}
	ids := make([]int64, 0, len(fired))
	for _, n := range fired {
		ids = append(ids, n.AlertID)
	}
	// Record first so a crashing sender cannot cause a re-notification storm.
	if err := j.store.MarkNotified(ctx, ids, nowMs); err != nil {
		return fmt.Errorf("mark alerts as notified: %w", err)
	}
	j.notifier.Dispatch(ctx, fired)
	return nil
}
