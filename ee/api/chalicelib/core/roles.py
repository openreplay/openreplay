import schemas_ee
from chalicelib.core import users, projects
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC


def update(tenant_id, user_id, role_id, data: schemas_ee.RolePayloadSchema):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)

    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}

    if not data.all_projects and (data.projects is None or len(data.projects) == 0):
        return {"errors": ["must specify a project or all projects"]}
    if data.projects is not None and len(data.projects) > 0 and not data.all_projects:
        data.projects = projects.is_authorized_batch(project_ids=data.projects, tenant_id=tenant_id)
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""SELECT 1 
                            FROM public.roles 
                            WHERE role_id = %(role_id)s
                                AND tenant_id = %(tenant_id)s
                                AND protected = TRUE
                            LIMIT 1;""",
                        {"tenant_id": tenant_id, "role_id": role_id})
        )
        if cur.fetchone() is not None:
            return {"errors": ["this role is protected"]}
        cur.execute(
            cur.mogrify("""\
                            UPDATE public.roles 
                            SET name= %(name)s,
                                description= %(description)s,
                                permissions= %(permissions)s,
                                all_projects= %(all_projects)s
                            WHERE role_id = %(role_id)s
                                AND tenant_id = %(tenant_id)s
                                AND deleted_at ISNULL
                                AND protected = FALSE
                            RETURNING *, COALESCE((SELECT ARRAY_AGG(project_id)
                                            FROM roles_projects WHERE roles_projects.role_id=%(role_id)s),'{}') AS projects;""",
                        {"tenant_id": tenant_id, "role_id": role_id, **data.dict()})
        )
        row = cur.fetchone()
        row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
        if not data.all_projects:
            d_projects = [i for i in row["projects"] if i not in data.projects]
            if len(d_projects) > 0:
                cur.execute(
                    cur.mogrify(
                        "DELETE FROM roles_projects WHERE role_id=%(role_id)s AND project_id IN %(project_ids)s",
                        {"role_id": role_id, "project_ids": tuple(d_projects)})
                )
            n_projects = [i for i in data.projects if i not in row["projects"]]
            if len(n_projects) > 0:
                cur.execute(
                    cur.mogrify(
                        f"""INSERT INTO roles_projects(role_id, project_id)
                            VALUES {",".join([f"(%(role_id)s,%(project_id_{i})s)" for i in range(len(n_projects))])}""",
                        {"role_id": role_id, **{f"project_id_{i}": p for i, p in enumerate(n_projects)}})
                )
            row["projects"] = data.projects

    return helper.dict_to_camel_case(row)


def create(tenant_id, user_id, data: schemas_ee.RolePayloadSchema):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)

    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    if not data.all_projects and (data.projects is None or len(data.projects) == 0):
        return {"errors": ["must specify a project or all projects"]}
    if data.projects is not None and len(data.projects) > 0 and not data.all_projects:
        data.projects = projects.is_authorized_batch(project_ids=data.projects, tenant_id=tenant_id)
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""INSERT INTO roles(tenant_id, name, description, permissions, all_projects)
                           VALUES (%(tenant_id)s, %(name)s, %(description)s, %(permissions)s::text[], %(all_projects)s)
                           RETURNING *;""",
                        {"tenant_id": tenant_id, "name": data.name, "description": data.description,
                         "permissions": data.permissions, "all_projects": data.all_projects})
        )
        row = cur.fetchone()
        row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
        if not data.all_projects:
            role_id = row["role_id"]
            cur.execute(
                cur.mogrify(f"""INSERT INTO roles_projects(role_id, project_id)
                               VALUES {",".join(f"(%(role_id)s,%(project_id_{i})s)" for i in range(len(data.projects)))};""",
                            {"role_id": role_id, **{f"project_id_{i}": p for i, p in enumerate(data.projects)}})
            )
    return helper.dict_to_camel_case(row)


def get_roles(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""SELECT *, COALESCE(projects, '{}') AS projects
                            FROM public.roles
                                LEFT JOIN LATERAL (SELECT array_agg(project_id) AS projects
                                                    FROM roles_projects
                                                             INNER JOIN projects USING (project_id)
                                                    WHERE roles_projects.role_id = roles.role_id
                                                      AND projects.deleted_at ISNULL ) AS role_projects ON (TRUE)
                            WHERE tenant_id =%(tenant_id)s
                                AND deleted_at IS NULL
                            ORDER BY role_id;""",
                        {"tenant_id": tenant_id})
        )
        rows = cur.fetchall()
        for r in rows:
            r["created_at"] = TimeUTC.datetime_to_timestamp(r["created_at"])
    return helper.list_to_camel_case(rows)


def get_role_by_name(tenant_id, name):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""SELECT *
                            FROM public.roles
                            where tenant_id =%(tenant_id)s
                                AND deleted_at IS NULL
                                AND name ILIKE %(name)s;""",
                        {"tenant_id": tenant_id, "name": name})
        )
        row = cur.fetchone()
        if row is not None:
            row["created_at"] = TimeUTC.datetime_to_timestamp(row["created_at"])
    return helper.dict_to_camel_case(row)


def delete(tenant_id, user_id, role_id):
    admin = users.get(user_id=user_id, tenant_id=tenant_id)

    if not admin["admin"] and not admin["superAdmin"]:
        return {"errors": ["unauthorized"]}
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""SELECT 1 
                            FROM public.roles 
                            WHERE role_id = %(role_id)s
                                AND tenant_id = %(tenant_id)s
                                AND protected = TRUE
                            LIMIT 1;""",
                        {"tenant_id": tenant_id, "role_id": role_id})
        )
        if cur.fetchone() is not None:
            return {"errors": ["this role is protected"]}
        cur.execute(
            cur.mogrify("""SELECT 1 
                            FROM public.users 
                            WHERE role_id = %(role_id)s
                                AND tenant_id = %(tenant_id)s
                            LIMIT 1;""",
                        {"tenant_id": tenant_id, "role_id": role_id})
        )
        if cur.fetchone() is not None:
            return {"errors": ["this role is already attached to other user(s)"]}
        cur.execute(
            cur.mogrify("""UPDATE public.roles 
                            SET deleted_at = timezone('utc'::text, now())
                            WHERE role_id = %(role_id)s
                                AND tenant_id = %(tenant_id)s
                                AND protected = FALSE;""",
                        {"tenant_id": tenant_id, "role_id": role_id})
        )
    return get_roles(tenant_id=tenant_id)
