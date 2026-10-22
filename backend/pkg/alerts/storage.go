package alerts

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

// Storage is the PostgreSQL side of the alerts cron.
type Storage interface {
	// ActiveAlerts returns every active alert of an active project, oldest first.
	ActiveAlerts(ctx context.Context) ([]AlertToExecute, error)
	// MarkNotified sets options.lastNotification = nowMs on the given alerts.
	MarkNotified(ctx context.Context, ids []int64, nowMs int64) error
	// InsertNotifications stores in-app notifications for the fired alerts.
	InsertNotifications(ctx context.Context, ns []Notification) error
	// Webhooks loads non-deleted webhooks by id (scoped to the tenant on EE).
	Webhooks(ctx context.Context, ids []int64, tenantID int64) (map[int64]Webhook, error)
}

type storageImpl struct {
	log logger.Logger
	pg  pool.Pool
}

func NewStorage(log logger.Logger, pg pool.Pool) Storage {
	return &storageImpl{log: log, pg: pg}
}

// activeAlertsSQL is the port of alerts_listener.get_all_alerts. tenantSelectExpr comes from
// storage_tenant.go (CE: -1, EE: projects.tenant_id).
var activeAlertsSQL = fmt.Sprintf(`
SELECT %s                                   AS tenant_id,
       alerts.alert_id,
       projects.project_id,
       projects.name                          AS project_name,
       alerts.detection_method::text          AS detection_method,
       alerts.change::text                    AS change,
       alerts.query,
       alerts.options,
       (EXTRACT(EPOCH FROM alerts.created_at) * 1000)::BIGINT AS created_at,
       alerts.name,
       alerts.series_id,
       metric_series.filter,
       COALESCE(metrics.name || '.' || COALESCE(metric_series.name, 'series ' || metric_series.index) || '.count',
                alerts.query ->> 'left')      AS series_name
FROM public.alerts
         INNER JOIN public.projects USING (project_id)
         LEFT JOIN public.metric_series USING (series_id)
         LEFT JOIN public.metrics USING (metric_id)
WHERE alerts.deleted_at IS NULL
  AND alerts.active
  AND projects.active
  AND projects.deleted_at IS NULL
  AND (alerts.series_id IS NULL OR metric_series.deleted_at IS NULL)
ORDER BY alerts.created_at`, tenantSelectExpr)

func (s *storageImpl) ActiveAlerts(ctx context.Context) ([]AlertToExecute, error) {
	rows, err := s.pg.Query(activeAlertsSQL)
	if err != nil {
		return nil, fmt.Errorf("query active alerts: %w", err)
	}
	all, err := pgx.CollectRows(rows, pgx.RowToStructByName[AlertToExecute])
	if err != nil {
		return nil, fmt.Errorf("scan active alerts: %w", err)
	}
	out := all[:0]
	for i := range all {
		a := all[i]
		if err := a.Query.Validate(); err != nil {
			s.log.Warn(ctx, "alert %d (project %d) skipped: %s", a.AlertID, a.ProjectID, err)
			continue
		}
		out = append(out, a)
	}
	return out, nil
}

func (s *storageImpl) MarkNotified(ctx context.Context, ids []int64, nowMs int64) error {
	if len(ids) == 0 {
		return nil
	}
	return s.pg.ExecContext(ctx, `
UPDATE public.alerts
SET options = options || jsonb_build_object('lastNotification', @now::bigint)
WHERE alert_id = ANY(@ids::bigint[])`,
		pgx.NamedArgs{"now": nowMs, "ids": ids})
}

func (s *storageImpl) InsertNotifications(ctx context.Context, ns []Notification) error {
	if len(ns) == 0 {
		return nil
	}
	rows := make([]string, 0, len(ns))
	args := pgx.NamedArgs{}
	for i, n := range ns {
		opts, err := json.Marshal(n.StoredOptions)
		if err != nil {
			return fmt.Errorf("marshal notification options: %w", err)
		}
		args[fmt.Sprintf("title%d", i)] = n.Title
		args[fmt.Sprintf("description%d", i)] = n.Description
		args[fmt.Sprintf("buttonText%d", i)] = n.ButtonText
		args[fmt.Sprintf("buttonUrl%d", i)] = n.ButtonURL
		args[fmt.Sprintf("options%d", i)] = string(opts)
		rows = append(rows, notificationRow(i, n, args))
	}
	query := fmt.Sprintf(`INSERT INTO public.notifications (%s) VALUES %s`,
		notificationColumns, strings.Join(rows, ","))
	return s.pg.ExecContext(ctx, query, args)
}

func (s *storageImpl) Webhooks(ctx context.Context, ids []int64, tenantID int64) (map[int64]Webhook, error) {
	out := make(map[int64]Webhook, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	query := `
SELECT webhook_id, endpoint, auth_header, type::text AS type
FROM public.webhooks
WHERE webhook_id = ANY(@ids::bigint[]) AND deleted_at IS NULL` + webhookTenantFilter
	rows, err := s.pg.Query(query, pgx.NamedArgs{"ids": ids, "tenantId": tenantID})
	if err != nil {
		return nil, fmt.Errorf("query webhooks: %w", err)
	}
	hooks, err := pgx.CollectRows(rows, pgx.RowToStructByName[Webhook])
	if err != nil {
		return nil, fmt.Errorf("scan webhooks: %w", err)
	}
	for _, h := range hooks {
		out[h.WebhookID] = h
	}
	return out, nil
}
