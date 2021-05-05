from chalicelib.utils import pg_client
from chalicelib.core import log_tool_datadog, log_tool_stackdriver, log_tool_sentry

from chalicelib.ee import users
from chalicelib.ee import projects


def get_state(tenant_id):
    my_projects = projects.get_projects(tenant_id=tenant_id, recording_state=False)
    pids = [s["projectId"] for s in my_projects]
    with pg_client.PostgresClient() as cur:
        recorded = False
        meta = False

        if len(pids) > 0:
            cur.execute(
                cur.mogrify("""\
                           SELECT
                                  COUNT(*)
                           FROM public.sessions AS s
                           where s.project_id IN %(ids)s
                           LIMIT 1;""",
                            {"ids": tuple(pids)})
            )
            recorded = cur.fetchone()["count"] > 0
            meta = False
            if recorded:
                cur.execute(
                    cur.mogrify("""SELECT SUM((SELECT COUNT(t.meta)
                                                FROM (VALUES (p.metadata_1), (p.metadata_2), (p.metadata_3), (p.metadata_4), (p.metadata_5),
                                                             (p.metadata_6), (p.metadata_7), (p.metadata_8), (p.metadata_9), (p.metadata_10),
                                                             (sessions.user_id)) AS t(meta)
                                                WHERE t.meta NOTNULL))
                                    FROM public.projects AS p 
                                        LEFT JOIN LATERAL ( SELECT 'defined'
                                                            FROM public.sessions 
                                                            WHERE sessions.project_id=p.project_id AND sessions.user_id IS NOT NULL
                                                            LIMIT 1) AS sessions(user_id) ON(TRUE) 
                                    WHERE p.tenant_id = %(tenant_id)s
                                      AND p.deleted_at ISNULL;"""
                                , {"tenant_id": tenant_id}))

                meta = cur.fetchone()["sum"] > 0

    return [
        {"task": "Install Asayer",
         "done": recorded,
         "URL": "https://docs.asayer.io/getting-started/quick-start"},
        {"task": "Identify Users",
         "done": meta,
         "URL": "https://docs.asayer.io/data-privacy-security/metadata"},
        {"task": "Invite Team Members",
         "done": len(users.get_members(tenant_id=tenant_id)) > 1,
         "URL": "https://app.asayer.io/client/manage-users"},
        {"task": "Integrations",
         "done": len(log_tool_datadog.get_all(tenant_id=tenant_id)) > 0 \
                 or len(log_tool_sentry.get_all(tenant_id=tenant_id)) > 0 \
                 or len(log_tool_stackdriver.get_all(tenant_id=tenant_id)) > 0,
         "URL": "https://docs.asayer.io/integrations"}
    ]


def get_state_installing(tenant_id):
    my_projects = projects.get_projects(tenant_id=tenant_id, recording_state=False)
    pids = [s["projectId"] for s in my_projects]
    with pg_client.PostgresClient() as cur:
        recorded = False

        if len(pids) > 0:
            cur.execute(
                cur.mogrify("""\
                           SELECT
                                  COUNT(*)
                           FROM public.sessions AS s
                           where s.project_id IN %(ids)s
                           LIMIT 1;""",
                            {"ids": tuple(pids)})
            )
            recorded = cur.fetchone()["count"] > 0

    return {"task": "Install Asayer",
            "done": recorded,
            "URL": "https://docs.asayer.io/getting-started/quick-start"}


def get_state_identify_users(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""SELECT SUM((SELECT COUNT(t.meta)
                                                FROM (VALUES (p.metadata_1), (p.metadata_2), (p.metadata_3), (p.metadata_4), (p.metadata_5),
                                                             (p.metadata_6), (p.metadata_7), (p.metadata_8), (p.metadata_9), (p.metadata_10),
                                                             (sessions.user_id)) AS t(meta)
                                                WHERE t.meta NOTNULL))
                                    FROM public.projects AS p 
                                        LEFT JOIN LATERAL ( SELECT 'defined'
                                                            FROM public.sessions 
                                                            WHERE sessions.project_id=p.project_id AND sessions.user_id IS NOT NULL
                                                            LIMIT 1) AS sessions(user_id) ON(TRUE) 
                                    WHERE p.tenant_id = %(tenant_id)s
                                      AND p.deleted_at ISNULL;"""
                        , {"tenant_id": tenant_id}))

        meta = cur.fetchone()["sum"] > 0

    return {"task": "Identify Users",
            "done": meta,
            "URL": "https://docs.asayer.io/data-privacy-security/metadata"}


def get_state_manage_users(tenant_id):
    return {"task": "Invite Team Members",
            "done": len(users.get_members(tenant_id=tenant_id)) > 1,
            "URL": "https://app.asayer.io/client/manage-users"}


def get_state_integrations(tenant_id):
    return {"task": "Integrations",
            "done": len(log_tool_datadog.get_all(tenant_id=tenant_id)) > 0 \
                    or len(log_tool_sentry.get_all(tenant_id=tenant_id)) > 0 \
                    or len(log_tool_stackdriver.get_all(tenant_id=tenant_id)) > 0,
            "URL": "https://docs.asayer.io/integrations"}
