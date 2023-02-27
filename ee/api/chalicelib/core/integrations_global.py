import schemas
from chalicelib.utils import pg_client


def get_global_integrations_status(tenant_id, user_id, project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                    SELECT EXISTS((SELECT 1
                               FROM public.oauth_authentication
                               WHERE user_id = %(user_id)s
                                 AND provider = 'github')) AS {schemas.IntegrationType.github.value},
                           EXISTS((SELECT 1
                                   FROM public.jira_cloud
                                   WHERE user_id = %(user_id)s)) AS {schemas.IntegrationType.jira.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='bugsnag')) AS {schemas.IntegrationType.bugsnag.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='cloudwatch')) AS {schemas.IntegrationType.cloudwatch.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='datadog')) AS {schemas.IntegrationType.datadog.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='newrelic')) AS {schemas.IntegrationType.newrelic.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='rollbar')) AS {schemas.IntegrationType.rollbar.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='sentry')) AS {schemas.IntegrationType.sentry.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='stackdriver')) AS {schemas.IntegrationType.stackdriver.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='sumologic')) AS {schemas.IntegrationType.sumologic.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='elasticsearch')) AS {schemas.IntegrationType.elasticsearch.value},
                           EXISTS((SELECT 1
                                   FROM public.webhooks
                                   WHERE type='slack' AND tenant_id=%(tenant_id)s AND deleted_at ISNULL)) AS {schemas.IntegrationType.slack.value},
                           EXISTS((SELECT 1
                                   FROM public.webhooks
                                   WHERE type='msteams' AND tenant_id=%(tenant_id)s AND deleted_at ISNULL)) AS {schemas.IntegrationType.ms_teams.value};""",
                        {"user_id": user_id, "tenant_id": tenant_id, "project_id": project_id})
        )
        current_integrations = cur.fetchone()
    result = []
    for k in current_integrations.keys():
        result.append({"name": k, "integrated": current_integrations[k]})
    return result
