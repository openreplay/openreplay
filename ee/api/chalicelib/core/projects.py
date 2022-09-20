import json

import schemas
from chalicelib.core import users
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


def get_projects(tenant_id, recording_state=False, gdpr=None, recorded=False, stack_integrations=False, user_id=None):
    with pg_client.PostgresClient() as cur:
        role_query = """INNER JOIN LATERAL (SELECT 1
                     FROM users
                              INNER JOIN roles USING (role_id)
                              LEFT JOIN roles_projects USING (role_id)
                     WHERE users.user_id = %(user_id)s
                       AND users.deleted_at ISNULL
                       AND users.tenant_id = %(tenant_id)s
                       AND (roles.all_projects OR roles_projects.project_id = s.project_id)
                    ) AS role_project ON (TRUE)"""
        extra_projection = ""
        extra_join = ""
        if gdpr:
            extra_projection += ',s.gdpr'
        if recorded:
            extra_projection += """,COALESCE(nullif(EXTRACT(EPOCH FROM s.first_recorded_session_at) * 1000, NULL)::BIGINT ,
                                      (SELECT MIN(sessions.start_ts)
                                       FROM public.sessions
                                       WHERE sessions.project_id = s.project_id
                                         AND sessions.start_ts >= (EXTRACT(EPOCH FROM 
                                                            COALESCE(s.sessions_last_check_at, s.created_at)) * 1000-24*60*60*1000)
                                         AND sessions.start_ts <= %(now)s
                                       LIMIT 1), NULL) AS first_recorded"""
        if stack_integrations:
            extra_projection += ',stack_integrations.count>0 AS stack_integrations'

        if stack_integrations:
            extra_join = """LEFT JOIN LATERAL (SELECT COUNT(*) AS count 
                                            FROM public.integrations 
                                            WHERE s.project_id = integrations.project_id 
                                            LIMIT 1) AS stack_integrations ON TRUE"""

        query = cur.mogrify(f"""{"SELECT *, first_recorded IS NOT NULL AS recorded FROM (" if recorded else ""}
                                SELECT s.project_id, s.name, s.project_key, s.save_request_payloads, s.first_recorded_session_at
                                        {extra_projection}
                                FROM public.projects AS s
                                        {extra_join}
                                        {role_query if user_id is not None else ""}
                                WHERE s.tenant_id =%(tenant_id)s
                                    AND s.deleted_at IS NULL
                                ORDER BY s.project_id {") AS raw" if recorded else ""};""",
                            {"tenant_id": tenant_id, "user_id": user_id, "now": TimeUTC.now()})
        cur.execute(query)
        rows = cur.fetchall()

        # if recorded is requested, check if it was saved or computed
        if recorded:
            for r in rows:
                if r["first_recorded_session_at"] is None:
                    extra_update = ""
                    if r["recorded"]:
                        extra_update = ", first_recorded_session_at=to_timestamp(%(first_recorded)s/1000)"
                    query = cur.mogrify(f"""UPDATE public.projects 
                                                       SET sessions_last_check_at=(now() at time zone 'utc')
                                                        {extra_update} 
                                                       WHERE project_id=%(project_id)s""",
                                        {"project_id": r["project_id"], "first_recorded": r["first_recorded"]})
                    cur.execute(query)
                r.pop("first_recorded_session_at")
                r.pop("first_recorded")

        if recording_state and len(rows) > 0:
            project_ids = [f'({r["project_id"]})' for r in rows]
            query = cur.mogrify(f"""SELECT projects.project_id, COALESCE(MAX(start_ts), 0) AS last
                                    FROM (VALUES {",".join(project_ids)}) AS projects(project_id)
                                             LEFT JOIN sessions USING (project_id)
                                    WHERE sessions.start_ts >= %(startDate)s AND sessions.start_ts <= %(endDate)s
                                    GROUP BY project_id;""",
                                {"startDate": TimeUTC.now(delta_days=-3), "endDate": TimeUTC.now(delta_days=1)})
            cur.execute(query=query)
            status = cur.fetchall()
            for r in rows:
                r["status"] = "red"
                for s in status:
                    if s["project_id"] == r["project_id"]:
                        if TimeUTC.now(-2) <= s["last"] < TimeUTC.now(-1):
                            r["status"] = "yellow"
                        elif s["last"] >= TimeUTC.now(-1):
                            r["status"] = "green"
                        break

        return helper.list_to_camel_case(rows)


def get_project(tenant_id, project_id, include_last_session=False, include_gdpr=None):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                    SELECT
                           s.project_id,
                           s.project_key,
                           s.name,
                           s.save_request_payloads
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


def is_authorized(project_id, tenant_id, user_id=None):
    if project_id is None or not str(project_id).isdigit():
        return False
    with pg_client.PostgresClient() as cur:
        role_query = """INNER JOIN LATERAL (SELECT 1
                             FROM users
                                      INNER JOIN roles USING (role_id)
                                      LEFT JOIN roles_projects USING (role_id)
                             WHERE users.user_id = %(user_id)s 
                                AND users.deleted_at ISNULL 
                                AND users.tenant_id = %(tenant_id)s 
                                AND (roles.all_projects OR roles_projects.project_id = %(project_id)s)
                        ) AS role_project ON (TRUE)"""

        query = cur.mogrify(f"""\
                    SELECT project_id
                    FROM public.projects AS s
                    {role_query if user_id is not None else ""}
                    where s.tenant_id =%(tenant_id)s 
                        AND s.project_id =%(project_id)s
                        AND s.deleted_at IS NULL
                    LIMIT 1;""",
                            {"tenant_id": tenant_id, "project_id": project_id, "user_id": user_id})
        cur.execute(
            query=query
        )
        row = cur.fetchone()
    return row is not None


def create(tenant_id, user_id, data: schemas.CreateProjectSchema, skip_authorization=False):
    if not skip_authorization:
        admin = users.get(user_id=user_id, tenant_id=tenant_id)
        if not admin["admin"] and not admin["superAdmin"]:
            return {"errors": ["unauthorized"]}
        if admin["roleId"] is not None and not admin["allProjects"]:
            return {"errors": ["unauthorized: you need allProjects permission to create a new project"]}
    return {"data": __create(tenant_id=tenant_id, name=data.name)}


def edit(tenant_id, user_id, project_id, data: schemas.CreateProjectSchema):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)
    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    return {"data": __update(tenant_id=tenant_id, project_id=project_id,
                             changes={"name": data.name})}


def count_by_tenant(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify("""\
                    SELECT
                           count(s.project_id)
                    FROM public.projects AS s
                    WHERE s.deleted_at IS NULL
                     AND tenant_id= %(tenant_id)s;""", {"tenant_id": tenant_id}))
        return cur.fetchone()["count"]


def delete(tenant_id, user_id, project_id):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)

    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""UPDATE public.projects 
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


def get_internal_project_id(project_key):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    SELECT project_id
                    FROM public.projects 
                    where project_key =%(project_key)s AND deleted_at ISNULL;""",
                        {"project_key": project_key})
        )
        row = cur.fetchone()
        return row["project_id"] if row else None


def get_project_key(project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    SELECT project_key
                    FROM public.projects 
                    where project_id =%(project_id)s AND deleted_at ISNULL;""",
                        {"project_id": project_id})
        )
        project = cur.fetchone()
        return project["project_key"] if project is not None else None


def get_capture_status(project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    SELECT 
                        sample_rate AS rate, sample_rate=100 AS capture_all
                    FROM public.projects 
                    where project_id =%(project_id)s AND deleted_at ISNULL;""",
                        {"project_id": project_id})
        )
        return helper.dict_to_camel_case(cur.fetchone())


def update_capture_status(project_id, changes):
    if "rate" not in changes and "captureAll" not in changes:
        return {"errors": ["please provide 'rate' and/or 'captureAll' attributes to update."]}
    if int(changes["rate"]) < 0 or int(changes["rate"]) > 100:
        return {"errors": ["'rate' must be between 0..100."]}
    sample_rate = 0
    if "rate" in changes:
        sample_rate = int(changes["rate"])
    if changes.get("captureAll"):
        sample_rate = 100
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    UPDATE public.projects
                    SET sample_rate= %(sample_rate)s
                    WHERE project_id =%(project_id)s AND deleted_at ISNULL;""",
                        {"project_id": project_id, "sample_rate": sample_rate})
        )

    return changes


def get_project_by_key(tenant_id, project_key, include_last_session=False, include_gdpr=None):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                    SELECT                           
                           s.project_key,
                           s.name
                            {",(SELECT max(ss.start_ts) FROM public.sessions AS ss WHERE ss.project_key = %(project_key)s) AS last_recorded_session_at" if include_last_session else ""}
                            {',s.gdpr' if include_gdpr else ''}
                    FROM public.projects AS s
                    where s.project_key =%(project_key)s
                        AND s.tenant_id =%(tenant_id)s
                        AND s.deleted_at IS NULL
                    LIMIT 1;""",
                            {"project_key": project_key, "tenant_id": tenant_id})

        cur.execute(
            query=query
        )
        row = cur.fetchone()
        return helper.dict_to_camel_case(row)


def is_authorized_batch(project_ids, tenant_id):
    if project_ids is None or not len(project_ids):
        return False
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""\
                    SELECT project_id
                    FROM public.projects
                    WHERE tenant_id =%(tenant_id)s 
                        AND project_id IN %(project_ids)s
                        AND deleted_at IS NULL;""",
                            {"tenant_id": tenant_id, "project_ids": tuple(project_ids)})

        cur.execute(
            query=query
        )
        rows = cur.fetchall()
        return [r["project_id"] for r in rows]


def get_projects_ids(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify("""SELECT s.project_id
                                    FROM public.projects AS s
                                    WHERE tenant_id =%(tenant_id)s AND s.deleted_at IS NULL
                                    ORDER BY s.project_id;""", {"tenant_id": tenant_id}))
        rows = cur.fetchall()
    return [r["project_id"] for r in rows]
