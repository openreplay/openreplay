from chalicelib.utils import pg_client
import requests

from chalicelib.core.telemetry import process_data


def compute():
    with pg_client.PostgresClient() as cur:
        cur.execute(
            f"""UPDATE public.tenants
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
                    t_projects=COALESCE((SELECT COUNT(*)
                                         FROM public.projects
                                         WHERE deleted_at ISNULL
                                           AND projects.tenant_id = all_tenants.tenant_id), 0),
                    t_sessions=COALESCE((SELECT COUNT(*)
                                         FROM public.sessions
                                                  INNER JOIN public.projects USING (project_id)
                                         WHERE projects.tenant_id = all_tenants.tenant_id), 0),
                    t_users=COALESCE((SELECT COUNT(*)
                                      FROM public.users
                                      WHERE deleted_at ISNULL
                                        AND users.tenant_id = all_tenants.tenant_id), 0)
                FROM (
                         SELECT tenant_id
                         FROM public.tenants
                     ) AS all_tenants
                WHERE tenants.tenant_id = all_tenants.tenant_id
                RETURNING *,(SELECT email FROM users_ee WHERE role = 'owner' AND users_ee.tenant_id = tenants.tenant_id LIMIT 1);"""
        )
        data = cur.fetchall()
        requests.post('https://parrot.asayer.io/os/telemetry',
                      json={"stats": [process_data(d, edition='ee') for d in data]})


def new_client(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""SELECT *,
                            (SELECT email FROM public.users WHERE tenant_id=%(tenant_id)s) AS email
                            FROM public.tenants 
                            WHERE tenant_id=%(tenant_id)s;""", {"tenant_id": tenant_id}))
        data = cur.fetchone()
        requests.post('https://parrot.asayer.io/os/signup', json=process_data(data, edition='ee'))
