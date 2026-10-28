package telemetry

// Enterprise edition: one row per tenant, every counter scoped to its tenant.
// Replaces backend/pkg/telemetry/storage_tenant.go in EE builds.

const edition = "ee"

// computeSQL is the EE telemetry.compute statement.
const computeSQL = `
UPDATE public.tenants
SET t_integrations = COALESCE((SELECT COUNT(DISTINCT provider)
                               FROM public.integrations
                                        INNER JOIN public.projects USING (project_id)
                               WHERE projects.tenant_id = all_tenants.tenant_id) +
                              (SELECT COUNT(*)
                               FROM public.webhooks
                               WHERE webhooks.tenant_id = all_tenants.tenant_id
                                 AND type = 'slack') +
                              (SELECT COUNT(*)
                               FROM public.jira_cloud
                                        INNER JOIN public.users USING (user_id)
                               WHERE users.tenant_id = all_tenants.tenant_id), 0),
    t_projects     = COALESCE((SELECT COUNT(*)
                               FROM public.projects
                               WHERE deleted_at ISNULL
                                 AND projects.tenant_id = all_tenants.tenant_id), 0),
    t_sessions     = t_sessions + COALESCE((SELECT COUNT(*)
                                            FROM public.sessions
                                                     INNER JOIN public.projects USING (project_id)
                                            WHERE projects.tenant_id = all_tenants.tenant_id
                                              AND start_ts >= (SELECT last_telemetry FROM public.tenants)
                                              AND start_ts <= CAST(EXTRACT(epoch FROM date_trunc('day', now())) * 1000 AS BIGINT)), 0),
    t_users        = COALESCE((SELECT COUNT(*)
                               FROM public.users
                               WHERE deleted_at ISNULL
                                 AND users.tenant_id = all_tenants.tenant_id), 0),
    last_telemetry = CAST(EXTRACT(epoch FROM date_trunc('day', now())) * 1000 AS BIGINT)
FROM (SELECT tenant_id FROM public.tenants) AS all_tenants
WHERE tenants.tenant_id = all_tenants.tenant_id
RETURNING name, t_integrations, t_projects, t_sessions, t_users, tenant_key, opt_out,
    (SELECT openreplay_version()) AS version_number,
    (SELECT email FROM public.users WHERE role = 'owner' AND users.tenant_id = tenants.tenant_id LIMIT 1) AS email`
