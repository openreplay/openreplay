import json

from chalicelib.ee import users
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC


def __update(tenant_id, project_id, changes):
    if len(changes.keys()) == 0:
        return None

    sub_query = []
    for key in changes.keys():
        sub_query.append(f"{helper.key_to_snake_case(key)} = %({key})s")
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                            UPDATE public.projects 
                            SET 
                              {" ,".join(sub_query)} 
                            WHERE 
                                project_id = %(project_id)s
                                AND deleted_at ISNULL
                            RETURNING project_id,name,gdpr;""",
                        {"project_id": project_id, **changes})
        )
        return helper.dict_to_camel_case(cur.fetchone())


def __create(tenant_id, name):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                    INSERT INTO public.projects (tenant_id, name, active)
                    VALUES (%(tenant_id)s,%(name)s,TRUE)
                    RETURNING project_id;""",
                        {"tenant_id": tenant_id, "name": name})
        )
        project_id = cur.fetchone()["project_id"]
    return get_project(tenant_id=tenant_id, project_id=project_id, include_gdpr=True)


def get_projects(tenant_id, recording_state=False, gdpr=None, recorded=False, stack_integrations=False):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                    SELECT
                           s.project_id, s.name, s.project_key
                            {',s.gdpr' if gdpr else ''} 
                            {',COALESCE((SELECT TRUE FROM public.sessions WHERE sessions.project_id = s.project_id LIMIT 1), FALSE) AS recorded' if recorded else ''}
                            {',stack_integrations.count>0 AS stack_integrations' if stack_integrations else ''}
                    FROM public.projects AS s
                            {'LEFT JOIN LATERAL (SELECT COUNT(*) AS count FROM public.integrations WHERE s.project_id = integrations.project_id LIMIT 1) AS stack_integrations ON TRUE' if stack_integrations else ''}
                    where s.tenant_id =%(tenant_id)s
                        AND s.deleted_at IS NULL
                    ORDER BY s.project_id;""",
                        {"tenant_id": tenant_id})
        )
        rows = cur.fetchall()
        if recording_state:
            for r in rows:
                query = cur.mogrify(
                    "select COALESCE(MAX(start_ts),0) AS last from public.sessions where project_id=%(project_id)s;",
                    {"project_id": r["project_id"]})
                cur.execute(
                    query=query
                )
                status = cur.fetchone()
                if status["last"] < TimeUTC.now(-2):
                    r["status"] = "red"
                elif status["last"] < TimeUTC.now(-1):
                    r["status"] = "yellow"
                else:
                    r["status"] = "green"

        return helper.list_to_camel_case(rows)


def get_project(tenant_id, project_id, include_last_session=False, include_gdpr=None):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                    SELECT
                           s.project_id,
                           s.name,
                            s.project_key
                            {",(SELECT max(ss.start_ts) FROM public.sessions AS ss WHERE ss.project_id = %(project_id)s) AS last_recorded_session_at" if include_last_session else ""}
                            {',s.gdpr' if include_gdpr else ''}
                    FROM public.projects AS s
                    where s.tenant_id =%(tenant_id)s 
                        AND s.project_id =%(project_id)s
                        AND s.deleted_at IS NULL
                    LIMIT 1;""",
                            {"tenant_id": tenant_id, "project_id": project_id})

        cur.execute(
            query=query
        )
        row = cur.fetchone()
        return helper.dict_to_camel_case(row)


def is_authorized(project_id, tenant_id):
    if project_id is None or not str(project_id).isdigit():
        return False
    return get_project(tenant_id=tenant_id, project_id=project_id) is not None


def create(tenant_id, user_id, data):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)
    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    return {"data": __create(tenant_id=tenant_id, name=data.get("name", "my first project"))}


def edit(tenant_id, user_id, project_id, data):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)
    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    return {"data": __update(tenant_id=tenant_id, project_id=project_id,
                             changes={"name": data.get("name", "my first project")})}


def delete(tenant_id, user_id, project_id):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)

    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                            UPDATE public.projects 
                            SET 
                              deleted_at = timezone('utc'::text, now()),
                              active = FALSE
                            WHERE 
                                project_id = %(project_id)s;""",
                        {"project_id": project_id})
        )
    return {"data": {"state": "success"}}


def get_gdpr(project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    SELECT
                           gdpr
                    FROM public.projects AS s
                    where s.project_id =%(project_id)s
                        AND s.deleted_at IS NULL;""",
                        {"project_id": project_id})
        )
        return cur.fetchone()["gdpr"]


def edit_gdpr(project_id, gdpr):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                            UPDATE public.projects 
                            SET 
                              gdpr = gdpr|| %(gdpr)s
                            WHERE 
                                project_id = %(project_id)s 
                                AND deleted_at ISNULL
                            RETURNING gdpr;""",
                        {"project_id": project_id, "gdpr": json.dumps(gdpr)})
        )
        return cur.fetchone()["gdpr"]
