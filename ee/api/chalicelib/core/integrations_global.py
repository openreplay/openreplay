import schemas
from chalicelib.utils import pg_client


def get_global_integrations_status(tenant_id, user_id, project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                    SELECT EXISTS((SELECT 1
                               FROM public.oauth_authentication
                               WHERE user_id = %(user_id)s
                                 AND provider = 'github')) AS {schemas.IntegrationType.GITHUB.value},
                           EXISTS((SELECT 1
                                   FROM public.jira_cloud
                                   WHERE user_id = %(user_id)s)) AS {schemas.IntegrationType.JIRA.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='bugsnag')) AS {schemas.IntegrationType.BUGSNAG.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='cloudwatch')) AS {schemas.IntegrationType.CLOUDWATCH.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='datadog')) AS {schemas.IntegrationType.DATADOG.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='newrelic')) AS {schemas.IntegrationType.NEWRELIC.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='rollbar')) AS {schemas.IntegrationType.ROLLBAR.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='sentry')) AS {schemas.IntegrationType.SENTRY.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='stackdriver')) AS {schemas.IntegrationType.STACKDRIVER.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='sumologic')) AS {schemas.IntegrationType.SUMOLOGIC.value},
                           EXISTS((SELECT 1
                                   FROM public.integrations
                                   WHERE project_id=%(project_id)s 
                                        AND provider='elasticsearch')) AS {schemas.IntegrationType.ELASTICSEARCH.value},
                           EXISTS((SELECT 1
                                   FROM public.webhooks
                                   WHERE type='slack' AND tenant_id=%(tenant_id)s AND deleted_at ISNULL)) AS {schemas.IntegrationType.SLACK.value},
                           EXISTS((SELECT 1
                                   FROM public.webhooks
                                   WHERE type='msteams' AND tenant_id=%(tenant_id)s AND deleted_at ISNULL)) AS {schemas.IntegrationType.MS_TEAMS.value};""",
                        {"user_id": user_id, "tenant_id": tenant_id, "project_id": project_id})
        )
        current_integrations = cur.fetchone()
    result = []
    for k in current_integrations.keys():
        result.append({"name": k, "integrated": current_integrations[k]})
    return result
