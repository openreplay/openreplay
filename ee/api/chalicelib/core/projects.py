import json
from collections import Counter
from typing import Optional, List

from fastapi import HTTPException, status

import schemas
from chalicelib.core import users
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC


def __exists_by_name(tenant_id: int, name: str, exclude_id: Optional[int]) -> bool:
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT EXISTS(SELECT 1
                                FROM public.projects
                                WHERE deleted_at IS NULL
                                  AND name ILIKE %(name)s
                                  AND tenant_id = %(tenant_id)s
                                  {"AND project_id!=%(exclude_id)s" if exclude_id else ""}) AS exists;""",
                            {"tenant_id": tenant_id, "name": name, "exclude_id": exclude_id})

        cur.execute(query=query)
        row = cur.fetchone()
        return row["exists"]


def __update(tenant_id, project_id, changes):
    if len(changes.keys()) == 0:
        return None

    sub_query = []
    for key in changes.keys():
        sub_query.append(f"{helper.key_to_snake_case(key)} = %({key})s")
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.projects 
                                SET {" ,".join(sub_query)} 
                                WHERE project_id = %(project_id)s
                                    AND deleted_at ISNULL
                                RETURNING project_id,name,gdpr;""",
                            {"project_id": project_id, **changes})
        cur.execute(query=query)
        return helper.dict_to_camel_case(cur.fetchone())


def __create(tenant_id, data):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""INSERT INTO public.projects (tenant_id, name, platform, active)
                                VALUES (%(tenant_id)s,%(name)s,%(platform)s,TRUE)
                                RETURNING project_id;""",
                            {"tenant_id": tenant_id, **data})
        cur.execute(query=query)
        project_id = cur.fetchone()["project_id"]
    return get_project(tenant_id=tenant_id, project_id=project_id, include_gdpr=True)


def get_projects(tenant_id: int, gdpr: bool = False, recorded: bool = False, user_id: int = None):
    with pg_client.PostgresClient() as cur:
        role_query = """INNER JOIN LATERAL (SELECT 1
                        FROM users
                             INNER JOIN roles USING (role_id)
                             LEFT JOIN roles_projects USING (role_id)
                        WHERE users.user_id = %(user_id)s
                          AND users.deleted_at ISNULL
                          AND users.tenant_id = %(tenant_id)s
                          AND (roles.all_projects OR roles_projects.project_id = s.project_id)
                        LIMIT 1) AS role_project ON (TRUE)"""
        extra_projection = ""
        if gdpr:
            extra_projection += ',s.gdpr'
        if recorded:
            extra_projection += """,\nCOALESCE(EXTRACT(EPOCH FROM s.first_recorded_session_at) * 1000::BIGINT,
                                      (SELECT MIN(sessions.start_ts)
                                       FROM public.sessions
                                       WHERE sessions.project_id = s.project_id
                                         AND sessions.start_ts >= (EXTRACT(EPOCH 
                                                        FROM COALESCE(s.sessions_last_check_at, s.created_at)) * 1000-%(check_delta)s)
                                         AND sessions.start_ts <= %(now)s
                                       )) AS first_recorded"""

        query = cur.mogrify(f"""{"SELECT *, first_recorded IS NOT NULL AS recorded FROM (" if recorded else ""}
                                SELECT s.project_id, s.name, s.project_key, s.save_request_payloads, s.first_recorded_session_at,
                                       s.created_at, s.sessions_last_check_at, s.sample_rate, s.platform,
                                       (SELECT count(*) FROM projects_conditions WHERE project_id = s.project_id) AS conditions_count 
                                       {extra_projection}
                                FROM public.projects AS s
                                        {role_query if user_id is not None else ""}
                                WHERE s.tenant_id =%(tenant_id)s
                                    AND s.deleted_at IS NULL
                                ORDER BY s.name {") AS raw" if recorded else ""};""",
                            {"now": TimeUTC.now(), "check_delta": TimeUTC.MS_HOUR * 4,
                             "tenant_id": tenant_id, "user_id": user_id})
        cur.execute(query)
        rows = cur.fetchall()
        # if recorded is requested, check if it was saved or computed
        if recorded:
            u_values = []
            params = {}
            for i, r in enumerate(rows):
                r["sessions_last_check_at"] = TimeUTC.datetime_to_timestamp(r["sessions_last_check_at"])
                r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
                if r["first_recorded_session_at"] is None \
                        and r["sessions_last_check_at"] is not None \
                        and (TimeUTC.now() - r["sessions_last_check_at"]) > TimeUTC.MS_HOUR:
                    u_values.append(f"(%(project_id_{i})s,to_timestamp(%(first_recorded_{i})s/1000))")
                    params[f"project_id_{i}"] = r["project_id"]
                    params[f"first_recorded_{i}"] = r["first_recorded"] if r["recorded"] else None
                r.pop("first_recorded_session_at")
                r.pop("first_recorded")
                r.pop("sessions_last_check_at")
            if len(u_values) > 0:
                query = cur.mogrify(f"""UPDATE public.projects 
                                        SET sessions_last_check_at=(now() at time zone 'utc'), first_recorded_session_at=u.first_recorded
                                        FROM (VALUES {",".join(u_values)}) AS u(project_id,first_recorded)
                                        WHERE projects.project_id=u.project_id;""", params)
                cur.execute(query)
        else:
            for r in rows:
                r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
                r.pop("sessions_last_check_at")

        return helper.list_to_camel_case(rows)


def get_project(tenant_id, project_id, include_last_session=False, include_gdpr=None):
    with pg_client.PostgresClient() as cur:
        extra_select = ""
        if include_last_session:
            extra_select += """,(SELECT max(ss.start_ts) 
                                 FROM public.sessions AS ss 
                                 WHERE ss.project_id = %(project_id)s) AS last_recorded_session_at"""
        if include_gdpr:
            extra_select += ",s.gdpr"
        query = cur.mogrify(f"""SELECT s.project_id,
                                       s.project_key,
                                       s.name,
                                       s.save_request_payloads,
                                       s.platform
                                       {extra_select}
                                FROM public.projects AS s
                                WHERE s.tenant_id =%(tenant_id)s 
                                    AND s.project_id =%(project_id)s
                                    AND s.deleted_at IS NULL
                                LIMIT 1;""",
                            {"tenant_id": tenant_id, "project_id": project_id})

        cur.execute(query=query)
        row = cur.fetchone()
        return helper.dict_to_camel_case(row)


def get_project_by_key(tenant_id, project_key, include_last_session=False, include_gdpr=None):
    with pg_client.PostgresClient() as cur:
        extra_select = ""
        if include_last_session:
            extra_select += """,(SELECT max(ss.start_ts) 
                                 FROM public.sessions AS ss 
                                 WHERE ss.project_key = %(project_key)s) AS last_recorded_session_at"""
        if include_gdpr:
            extra_select += ",s.gdpr"
        query = cur.mogrify(f"""SELECT s.project_key,
                                       s.name
                                       {extra_select}
                                FROM public.projects AS s
                                WHERE s.project_key =%(project_key)s
                                    AND s.tenant_id =%(tenant_id)s
                                    AND s.deleted_at IS NULL
                                LIMIT 1;""",
                            {"project_key": project_key, "tenant_id": tenant_id})
        cur.execute(query=query)
        row = cur.fetchone()
        return helper.dict_to_camel_case(row)


def create(tenant_id, user_id, data: schemas.CreateProjectSchema, skip_authorization=False):
    if __exists_by_name(name=data.name, exclude_id=None, tenant_id=tenant_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"name already exists.")
    if not skip_authorization:
        admin = users.get(user_id=user_id, tenant_id=tenant_id)
        if not admin["admin"] and not admin["superAdmin"]:
            return {"errors": ["unauthorized"]}
        if admin["roleId"] is not None and not admin["allProjects"]:
            return {"errors": ["unauthorized: you need allProjects permission to create a new project"]}
    return {"data": __create(tenant_id=tenant_id, data=data.model_dump())}


def edit(tenant_id, user_id, project_id, data: schemas.CreateProjectSchema):
    if __exists_by_name(name=data.name, exclude_id=project_id, tenant_id=tenant_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"name already exists.")
    admin = users.get(user_id=user_id, tenant_id=tenant_id)
    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    return {"data": __update(tenant_id=tenant_id, project_id=project_id,
                             changes=data.model_dump())}


def delete(tenant_id, user_id, project_id):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)

    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""UPDATE public.projects 
                               SET deleted_at = timezone('utc'::text, now()),
                                   active = FALSE
                               WHERE project_id = %(project_id)s;""",
                            {"project_id": project_id})
        cur.execute(query=query)
    return {"data": {"state": "success"}}


def get_gdpr(project_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT gdpr
                               FROM public.projects AS s
                               WHERE s.project_id =%(project_id)s
                                    AND s.deleted_at IS NULL;""",
                            {"project_id": project_id})
        cur.execute(query=query)
        row = cur.fetchone()["gdpr"]
        row["projectId"] = project_id
        return row


def edit_gdpr(project_id, gdpr: schemas.GdprSchema):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""UPDATE public.projects 
                               SET gdpr = gdpr|| %(gdpr)s::jsonb
                               WHERE project_id = %(project_id)s
                                    AND deleted_at ISNULL
                               RETURNING gdpr;""",
                            {"project_id": project_id, "gdpr": json.dumps(gdpr.model_dump())})
        cur.execute(query=query)
        row = cur.fetchone()
        if not row:
            return {"errors": ["something went wrong"]}
        row = row["gdpr"]
        row["projectId"] = project_id
        return row


def get_by_project_key(project_key):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT project_id,
                                      project_key,
                                      platform,
                                      name
                               FROM public.projects
                               WHERE project_key =%(project_key)s 
                                    AND deleted_at ISNULL;""",
                            {"project_key": project_key})
        cur.execute(query=query)
        row = cur.fetchone()
        return helper.dict_to_camel_case(row)


def get_project_key(project_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT project_key
                               FROM public.projects
                               WHERE project_id =%(project_id)s
                                    AND deleted_at ISNULL;""",
                            {"project_id": project_id})
        cur.execute(query=query)
        project = cur.fetchone()
        return project["project_key"] if project is not None else None


def get_capture_status(project_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT sample_rate AS rate, sample_rate=100 AS capture_all
                               FROM public.projects
                               WHERE project_id =%(project_id)s 
                                    AND deleted_at ISNULL;""",
                            {"project_id": project_id})
        cur.execute(query=query)
        return helper.dict_to_camel_case(cur.fetchone())


def update_capture_status(project_id, changes: schemas.SampleRateSchema):
    sample_rate = changes.rate
    if changes.capture_all:
        sample_rate = 100
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""UPDATE public.projects
                               SET sample_rate= %(sample_rate)s
                               WHERE project_id =%(project_id)s
                                    AND deleted_at ISNULL;""",
                            {"project_id": project_id, "sample_rate": sample_rate})
        cur.execute(query=query)

    return changes


def get_conditions(project_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT p.sample_rate AS rate, p.conditional_capture,
                                    COALESCE(
                                        array_agg(
                                            json_build_object(
                                                'condition_id', pc.condition_id,
                                                'capture_rate', pc.capture_rate,
                                                'name', pc.name,
                                                'filters', pc.filters
                                            )
                                        ) FILTER (WHERE pc.condition_id IS NOT NULL), 
                                        ARRAY[]::json[]
                                    ) AS conditions
                               FROM public.projects AS p
                               LEFT JOIN (
                                   SELECT * FROM public.projects_conditions
                                   WHERE project_id = %(project_id)s ORDER BY condition_id
                               ) AS pc ON p.project_id = pc.project_id
                               WHERE p.project_id = %(project_id)s 
                                     AND p.deleted_at IS NULL
                               GROUP BY p.sample_rate, p.conditional_capture;""",
                            {"project_id": project_id})
        cur.execute(query=query)
        row = cur.fetchone()
        row = helper.dict_to_camel_case(row)
        row["conditions"] = [schemas.ProjectConditions(**c) for c in row["conditions"]]

        return row


def validate_conditions(conditions: List[schemas.ProjectConditions]) -> List[str]:
    errors = []
    names = [condition.name for condition in conditions]

    # Check for empty strings
    if any(name.strip() == "" for name in names):
        errors.append("Condition names cannot be empty strings")

    # Check for duplicates
    name_counts = Counter(names)
    duplicates = [name for name, count in name_counts.items() if count > 1]
    if duplicates:
        errors.append(f"Duplicate condition names found: {duplicates}")

    return errors


def update_conditions(project_id, changes: schemas.ProjectSettings):
    validation_errors = validate_conditions(changes.conditions)
    if validation_errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation_errors)

    conditions = []
    for condition in changes.conditions:
        conditions.append(condition.model_dump())

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""UPDATE public.projects
                               SET
                                    sample_rate= %(sample_rate)s,
                                    conditional_capture = %(conditional_capture)s
                               WHERE project_id =%(project_id)s
                                    AND deleted_at IS NULL;""",
                            {
                                "project_id": project_id,
                                "sample_rate": changes.rate,
                                "conditional_capture": changes.conditional_capture
                            })
        cur.execute(query=query)

    return update_project_conditions(project_id, changes.conditions)


def create_project_conditions(project_id, conditions):
    rows = []

    # insert all conditions rows with single sql query
    if len(conditions) > 0:
        columns = (
            "project_id",
            "name",
            "capture_rate",
            "filters",
        )

        sql = f"""
            INSERT INTO projects_conditions
            (project_id, name, capture_rate, filters)
            VALUES {", ".join(["%s"] * len(conditions))}
            RETURNING condition_id, {", ".join(columns)}
        """

        with pg_client.PostgresClient() as cur:
            params = [
                (project_id, c.name, c.capture_rate, json.dumps([filter_.model_dump() for filter_ in c.filters]))
                for c in conditions]
            query = cur.mogrify(sql, params)
            cur.execute(query)
            rows = cur.fetchall()

    return rows


def update_project_condition(project_id, conditions):
    values = []
    params = {
        "project_id": project_id,
    }
    for i in range(len(conditions)):
        values.append(f"(%(condition_id_{i})s, %(name_{i})s, %(capture_rate_{i})s, %(filters_{i})s::jsonb)")
        params[f"condition_id_{i}"] = conditions[i].condition_id
        params[f"name_{i}"] = conditions[i].name
        params[f"capture_rate_{i}"] = conditions[i].capture_rate
        params[f"filters_{i}"] = json.dumps(conditions[i].filters)

    sql = f"""
        UPDATE projects_conditions
        SET name = c.name, capture_rate = c.capture_rate, filters = c.filters
        FROM (VALUES {','.join(values)}) AS c(condition_id, name, capture_rate, filters)
        WHERE c.condition_id = projects_conditions.condition_id AND project_id = %(project_id)s;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, params)
        cur.execute(query)


def delete_project_condition(project_id, ids):
    sql = """
        DELETE FROM projects_conditions
        WHERE condition_id IN %(ids)s
            AND project_id= %(project_id)s;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(sql, {"project_id": project_id, "ids": tuple(ids)})
        cur.execute(query)


def update_project_conditions(project_id, conditions):
    if conditions is None:
        return

    existing = get_conditions(project_id)["conditions"]
    existing_ids = {c.condition_id for c in existing}

    to_be_updated = [c for c in conditions if c.condition_id in existing_ids]
    to_be_created = [c for c in conditions if c.condition_id not in existing_ids]
    to_be_deleted = existing_ids - {c.condition_id for c in conditions}

    if to_be_deleted:
        delete_project_condition(project_id, to_be_deleted)

    if to_be_created:
        create_project_conditions(project_id, to_be_created)

    if to_be_updated:
        print(to_be_updated)
        update_project_condition(project_id, to_be_updated)

    return get_conditions(project_id)


def get_projects_ids(tenant_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT s.project_id
                               FROM public.projects AS s
                               WHERE tenant_id =%(tenant_id)s 
                                    AND s.deleted_at IS NULL
                               ORDER BY s.project_id;""", {"tenant_id": tenant_id})
        cur.execute(query=query)
        rows = cur.fetchall()
    return [r["project_id"] for r in rows]


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

        query = cur.mogrify(f"""SELECT project_id
                                FROM public.projects AS s
                                    {role_query if user_id is not None else ""}
                                WHERE s.tenant_id =%(tenant_id)s 
                                    AND s.project_id =%(project_id)s
                                    AND s.deleted_at IS NULL
                                LIMIT 1;""",
                            {"tenant_id": tenant_id, "project_id": project_id, "user_id": user_id})
        cur.execute(query=query)
        row = cur.fetchone()
    return row is not None


def is_authorized_batch(project_ids, tenant_id):
    if project_ids is None or not len(project_ids):
        return False
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT project_id
                               FROM public.projects
                               WHERE tenant_id =%(tenant_id)s 
                                    AND project_id IN %(project_ids)s
                                    AND deleted_at IS NULL;""",
                            {"tenant_id": tenant_id, "project_ids": tuple(project_ids)})

        cur.execute(query=query)
        rows = cur.fetchall()
        return [r["project_id"] for r in rows]
