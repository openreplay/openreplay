from chalicelib.utils import pg_client
from chalicelib.core import projects, log_tool_datadog, log_tool_stackdriver, log_tool_sentry

from chalicelib.core import users


async def get_state(tenant_id):
    pids = await projects.get_projects_ids(tenant_id=tenant_id)
    async with pg_client.PostgresClient() as cur:
        recorded = False
        meta = False

        if len(pids) > 0:
            await cur.execute(
                cur.mogrify("""SELECT EXISTS((  SELECT 1
                                                FROM public.sessions AS s
                                                WHERE s.project_id IN %(ids)s)) AS exists;""",
                            {"ids": tuple(pids)})
            )
            recorded = await cur.fetchone()
            recorded = recorded["exists"]
            meta = False
            if recorded:
                await cur.execute("""SELECT EXISTS((SELECT 1
                               FROM public.projects AS p
                                        LEFT JOIN LATERAL ( SELECT 1
                                                            FROM public.sessions
                                                            WHERE sessions.project_id = p.project_id
                                                              AND sessions.user_id IS NOT NULL
                                                            LIMIT 1) AS sessions(user_id) ON (TRUE)
                               WHERE p.deleted_at ISNULL
                                 AND ( sessions.user_id IS NOT NULL OR p.metadata_1 IS NOT NULL
                                       OR p.metadata_2 IS NOT NULL OR p.metadata_3 IS NOT NULL
                                       OR p.metadata_4 IS NOT NULL OR p.metadata_5 IS NOT NULL
                                       OR p.metadata_6 IS NOT NULL OR p.metadata_7 IS NOT NULL
                                       OR p.metadata_8 IS NOT NULL OR p.metadata_9 IS NOT NULL
                                       OR p.metadata_10 IS NOT NULL )
                                   )) AS exists;""")

                meta = await cur.fetchone()
                meta = meta["exists"]

    return [
        {"task": "Install OpenReplay",
         "done": recorded,
         "URL": "https://docs.openreplay.com/getting-started/quick-start"},
        {"task": "Identify Users",
         "done": meta,
         "URL": "https://docs.openreplay.com/data-privacy-security/metadata"},
        {"task": "Invite Team Members",
         "done": len(users.get_members(tenant_id=tenant_id)) > 1,
         "URL": "https://app.openreplay.com/client/manage-users"},
        {"task": "Integrations",
         "done": len(log_tool_datadog.get_all(tenant_id=tenant_id)) > 0 \
                 or len(log_tool_sentry.get_all(tenant_id=tenant_id)) > 0 \
                 or len(log_tool_stackdriver.get_all(tenant_id=tenant_id)) > 0,
         "URL": "https://docs.openreplay.com/integrations"}
    ]


async def get_state_installing(tenant_id):
    pids = await projects.get_projects_ids(tenant_id=tenant_id)
    async with pg_client.PostgresClient() as cur:
        recorded = False

        if len(pids) > 0:
            await cur.execute(
                cur.mogrify("""SELECT EXISTS((  SELECT 1
                                                FROM public.sessions AS s
                                                WHERE s.project_id IN %(ids)s)) AS exists;""",
                            {"ids": tuple(pids)})
            )
            recorded = await cur.fetchone()
            recorded = recorded["exists"]

    return {"task": "Install OpenReplay",
            "done": recorded,
            "URL": "https://docs.openreplay.com/getting-started/quick-start"}


async def get_state_identify_users(tenant_id):
    async with pg_client.PostgresClient() as cur:
        await cur.execute("""SELECT EXISTS((SELECT 1
                                       FROM public.projects AS p
                                                LEFT JOIN LATERAL ( SELECT 1
                                                                    FROM public.sessions
                                                                    WHERE sessions.project_id = p.project_id
                                                                      AND sessions.user_id IS NOT NULL
                                                                    LIMIT 1) AS sessions(user_id) ON (TRUE)
                                       WHERE p.deleted_at ISNULL
                                         AND ( sessions.user_id IS NOT NULL OR p.metadata_1 IS NOT NULL
                                               OR p.metadata_2 IS NOT NULL OR p.metadata_3 IS NOT NULL
                                               OR p.metadata_4 IS NOT NULL OR p.metadata_5 IS NOT NULL
                                               OR p.metadata_6 IS NOT NULL OR p.metadata_7 IS NOT NULL
                                               OR p.metadata_8 IS NOT NULL OR p.metadata_9 IS NOT NULL
                                               OR p.metadata_10 IS NOT NULL )
                                           )) AS exists;""")

        meta = await cur.fetchone()
        meta = meta["exists"]

    return {"task": "Identify Users",
            "done": meta,
            "URL": "https://docs.openreplay.com/data-privacy-security/metadata"}


async def get_state_manage_users(tenant_id):
    return {"task": "Invite Team Members",
            "done": len(await users.get_members(tenant_id=tenant_id)) > 1,
            "URL": "https://app.openreplay.com/client/manage-users"}


async def get_state_integrations(tenant_id):
    return {"task": "Integrations",
            "done": len(await log_tool_datadog.get_all(tenant_id=tenant_id)) > 0 \
                    or len(await log_tool_sentry.get_all(tenant_id=tenant_id)) > 0 \
                    or len(await log_tool_stackdriver.get_all(tenant_id=tenant_id)) > 0,
            "URL": "https://docs.openreplay.com/integrations"}
