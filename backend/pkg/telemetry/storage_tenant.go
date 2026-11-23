package telemetry

// Community edition: a single tenant row. Overlaid by ee/backend/pkg/telemetry/storage_tenant.go.

const edition = "foss"

// computeSQL is the CE telemetry.compute statement.
const computeSQL = `
UPDATE public.tenants
SET t_integrations = COALESCE((SELECT COUNT(DISTINCT provider) FROM public.integrations) +
                              (SELECT COUNT(*) FROM public.webhooks WHERE type = 'slack') +
                              (SELECT COUNT(*) FROM public.jira_cloud), 0),
    t_projects     = COALESCE((SELECT COUNT(*) FROM public.projects WHERE deleted_at ISNULL), 0),
    t_sessions     = t_sessions + COALESCE((SELECT COUNT(*)
                                            FROM public.sessions
                                            WHERE start_ts >= (SELECT last_telemetry FROM public.tenants)
                                              AND start_ts <= CAST(EXTRACT(epoch FROM date_trunc('day', now())) * 1000 AS BIGINT)), 0),
    t_users        = COALESCE((SELECT COUNT(*) FROM public.users WHERE deleted_at ISNULL), 0),
    last_telemetry = CAST(EXTRACT(epoch FROM date_trunc('day', now())) * 1000 AS BIGINT)
RETURNING name, t_integrations, t_projects, t_sessions, t_users, tenant_key, opt_out,
    (SELECT openreplay_version()) AS version_number,
    (SELECT email FROM public.users WHERE role = 'owner' LIMIT 1) AS email`
