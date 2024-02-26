import httpx
from chalicelib.utils import pg_client
from chalicelib.core import license


def process_data(data):
    return {
        'edition': license.EDITION,
        'tracking': data["opt_out"],
        'version': data["version_number"],
        'user_id': data["tenant_key"],
        'tenant_key': data["tenant_key"],
        'owner_email': None if data["opt_out"] else data["email"],
        'organization_name': None if data["opt_out"] else data["name"],
        'users_count': data["t_users"],
        'projects_count': data["t_projects"],
        'sessions_count': data["t_sessions"],
        'integrations_count': data["t_integrations"]
    }


async def compute():
    async with pg_client.cursor(long_query=True) as cur:
        await cur.execute(
            f"""UPDATE public.tenants
                SET t_integrations = COALESCE((SELECT COUNT(DISTINCT provider) FROM public.integrations) +
                                              (SELECT COUNT(*) FROM public.webhooks WHERE type = 'slack') +
                                              (SELECT COUNT(*) FROM public.jira_cloud), 0),
                    t_projects=COALESCE((SELECT COUNT(*) FROM public.projects WHERE deleted_at ISNULL), 0),
                    t_sessions=t_sessions + COALESCE((SELECT COUNT(*)
                                                      FROM public.sessions
                                                      WHERE start_ts >= (SELECT last_telemetry FROM tenants)
                                                        AND start_ts <=CAST(EXTRACT(epoch FROM date_trunc('day', now())) * 1000 AS BIGINT)), 0),
                    t_users=COALESCE((SELECT COUNT(*) FROM public.users WHERE deleted_at ISNULL), 0),
                    last_telemetry=CAST(EXTRACT(epoch FROM date_trunc('day', now())) * 1000 AS BIGINT)
                RETURNING name,t_integrations,t_projects,t_sessions,t_users,tenant_key,opt_out,
                    (SELECT openreplay_version()) AS version_number,(SELECT email FROM public.users WHERE role = 'owner' LIMIT 1);"""
        )
        data = await cur.fetchone()
        if len(data) > 0:
            async with httpx.AsyncClient() as client:
                await client.post('https://api.openreplay.com/os/telemetry', json={"stats": [process_data(data)]})


async def new_client():
    async with pg_client.cursor() as cur:
        await cur.execute(
            f"""SELECT *, openreplay_version() AS version_number,
                (SELECT email FROM public.users WHERE role='owner' LIMIT 1) AS email
                FROM public.tenants
                LIMIT 1;""")
        data = await cur.fetchone()
        async with httpx.AsyncClient() as client:
            await client.post('https://api.openreplay.com/os/signup', json=process_data(data))
