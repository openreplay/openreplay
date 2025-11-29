import re
from datetime import datetime
from typing import Any

from psycopg2.extensions import AsIs
from scim2_models import Error, Resource
from scim2_server.utils import SCIMException

import schemas
from chalicelib.utils import pg_client
from routers.scim import helpers


def convert_provider_resource_to_client_resource(
        provider_resource: dict,
) -> dict:
    if provider_resource is None:
        return None
    members = provider_resource["users"] or []
    return {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
        "id": str(provider_resource["role_id"]),
        "meta": {
            "resourceType": "Group",
            "created": provider_resource["created_at"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "lastModified": provider_resource["updated_at"].strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            ),
        },
        "displayName": provider_resource["name"],
        "active": provider_resource["deleted_at"] is None,
        "members": [
            {
                "value": str(member["user_id"]),
                "$ref": f"Users/{member['user_id']}",
                "type": "User",
            }
            for member in members
        ],
    }


def query_resources(tenant_id: int) -> list[dict]:
    query, params = _main_select_query(tenant_id)
    with pg_client.PostgresClient() as cur:
        cur.execute(query, params)
        items = cur.fetchall()
    return [convert_provider_resource_to_client_resource(item) for item in items]


def get_resource(resource_id: str, tenant_id: int) -> dict | None:
    query, params = _main_select_query(tenant_id, resource_id)
    with pg_client.PostgresClient() as cur:
        cur.execute(query, params)
        item = cur.fetchone()
        if item:
            return convert_provider_resource_to_client_resource(item)
        return None


def delete_resource(resource_id: str, tenant_id: int) -> None:
    r = _update_resource_sql(
        resource_id=resource_id,
        tenant_id=tenant_id,
        deleted_at=datetime.now(),
    )
    if r is not None:
        args = {"tenant_id": tenant_id, "user_ids": [u["user_id"] for u in r["users"]],
                "new_role_id": None, "initial_role_id": resource_id}
        if is_admin_priviledge(r["name"]):
            _set_users_admin_privilege(**args)
        else:
            _set_users_role(**args)


def search_existing(tenant_id: int, resource: Resource) -> dict | None:
    query, params = _main_select_query(tenant_id, resource.id, resource.display_name)
    with pg_client.PostgresClient() as cur:
        cur.execute(query, params)
        item = cur.fetchone()
        return convert_provider_resource_to_client_resource(item)


def group_display_name_to_role_name(group_name_filter: str) -> str:
    # Replace ONLY displayName eq "<something>"
    pattern = r'(displayName\s+eq\s+)"([^"]*)"'
    s = re.match(pattern, group_name_filter)
    new_value = helpers.group_name_to_role_name(s.group(2))
    s = re.sub(
        pattern,
        rf'\1"{new_value}"',
        group_name_filter,
    )
    return s


def is_admin_priviledge(name: str) -> bool:
    return name.lower().strip() == "admin"


def create_resource(tenant_id: int, resource: Resource) -> dict:
    with pg_client.PostgresClient() as cur:
        role_name = helpers.group_name_to_role_name(resource.display_name)
        admin_privilege = is_admin_priviledge(role_name)
        if admin_privilege:
            role_name = role_name.lower()
        params = {
            "name": role_name,
            "tenant_id": tenant_id,
            "permissions": [p.value for p in schemas.Permissions] if not admin_privilege else [],
            "hidden": admin_privilege,
            "all_projects": not admin_privilege,
        }

        try:
            cur.execute(
                cur.mogrify(
                    """ \
                    INSERT INTO public.roles (name, tenant_id, permissions, all_projects, hidden)
                    VALUES (%(name)s, %(tenant_id)s, %(permissions)s, %(all_projects)s, %(hidden)s) RETURNING role_id;
                    """, params)
            )
        except Exception:
            raise SCIMException(Error.make_invalid_value_error())
        role_id = cur.fetchone()["role_id"]
    if resource.members and len(resource.members) > 0:
        user_ids = [int(x.value) for x in resource.members]
        args = {"tenant_id": tenant_id, "user_ids": user_ids, "new_role_id": role_id}
        if admin_privilege:
            _set_users_admin_privilege(**args)
        else:
            _set_users_role(**args)

    return get_resource(role_id, tenant_id)


def update_resource(tenant_id: int, resource: Resource) -> dict | None:
    role_name = helpers.group_name_to_role_name(resource.display_name)
    admin_privilege = is_admin_priviledge(role_name)
    item = _update_resource_sql(
        resource_id=resource.id,
        tenant_id=tenant_id,
        name=role_name,
        user_ids=[int(x.value) for x in resource.members],
        deleted_at=None,
        admin_privilege=admin_privilege,
    )
    return convert_provider_resource_to_client_resource(item)


def _main_select_query(tenant_id: int, resource_id: str = None,
                       resource_name: str = None) -> tuple[str, dict[str, Any]]:
    params = {"tenant_id": tenant_id, "resource_id": resource_id,
              "resource_name": helpers.group_name_to_role_name(resource_name)}
    where_and_clauses = [
        "roles.tenant_id = %(tenant_id)s",
    ]
    if resource_id is not None:
        where_and_clauses.append(f"roles.role_id = %(resource_id)s")
    elif resource_name is not None:
        where_and_clauses.append(f"roles.name ILIKE %(resource_name)s")
    else:
        where_and_clauses.append("roles.deleted_at IS NULL")

    where_clause = " AND ".join(where_and_clauses)
    return (f"""
        SELECT
            roles.*,
            COALESCE(
                (SELECT json_agg(users)
                 FROM public.users
                 WHERE users.tenant_id=%(tenant_id)s 
                    AND (users.role_id = roles.role_id 
                            OR users.admin_privilege_role_id = roles.role_id)),
                '[]'
            ) AS users,
            COALESCE(
                (SELECT json_agg(projects.project_key)
                 FROM public.projects
                 LEFT JOIN public.roles_projects USING (project_id)
                 WHERE tenant_id=%(tenant_id)s 
                    AND roles_projects.role_id = roles.role_id),
                '[]'
            ) AS project_keys
        FROM public.roles
        WHERE {where_clause}
        """, params)


def _set_users_role(tenant_id: int, user_ids: list[int], new_role_id: int | None,
                    initial_role_id: int | None = None) -> None:
    with pg_client.PostgresClient() as cur:
        params = {
            "tenant_id": tenant_id,
            "user_ids": tuple(user_ids),
            "new_role_id": new_role_id,
            "initial_role_id": initial_role_id,
        }
        constraints = ["role!='owner'"]
        if initial_role_id is not None:
            constraints.append("users.role_id = %(initial_role_id)s")
        if len(user_ids) > 0:
            constraints.append("users.user_id IN %(user_ids)s")
        if len(constraints) == 1:
            return
        cur.execute(
            cur.mogrify(
                f"""\
                UPDATE public.users
                SET updated_at = now(),
                    role_id    = %(new_role_id)s
                WHERE {" AND ".join(constraints)}
                """,
                params
            )
        )


def _set_users_admin_privilege(tenant_id: int, user_ids: list[int],
                               new_role_id: int | None, initial_role_id: int | None = None) -> None:
    constraints = ["role!='owner'"]
    if initial_role_id is not None:
        constraints.append("users.admin_privilege_role_id = %(initial_role_id)s")
    if len(user_ids) > 0:
        constraints.append("users.user_id IN %(user_ids)s")
    if len(constraints) == 1:
        return
    with pg_client.PostgresClient() as cur:
        params = {
            "tenant_id": tenant_id,
            "user_ids": tuple(user_ids),
            "role": "admin" if new_role_id else "member",
            "new_role_id": new_role_id,
            "initial_role_id": initial_role_id
        }
        cur.execute(
            cur.mogrify(
                f"""\
                UPDATE public.users
                SET updated_at = now(),
                    role = %(role)s,
                    admin_privilege_role_id = %(new_role_id)s
                WHERE {" AND ".join(constraints)}
                """,
                params
            )
        )


def _update_resource_sql(
        resource_id: int, tenant_id: int,
        user_ids: list[int] | None = None,
        admin_privilege: bool = False,
        **kwargs: dict[str, Any],
) -> dict[str, Any]:
    if user_ids is not None and len(user_ids) > 0:
        args = {"tenant_id": tenant_id, "user_ids": user_ids, "new_role_id": resource_id}
        if admin_privilege:
            _set_users_admin_privilege(**args)
        else:
            _set_users_role(**args)

    with pg_client.PostgresClient() as cur:
        if admin_privilege is not None:
            kwargs["updated_at"] = datetime.now()
            set_fragments = [
                cur.mogrify("%s = %s", (AsIs(k), v)).decode("utf-8")
                for k, v in kwargs.items()
            ]
            set_clause = ", ".join(set_fragments)

            params = {"role_id": resource_id, "tenant_id": tenant_id}

            cur.execute(
                cur.mogrify(f"""
                UPDATE public.roles
                SET {set_clause}
                WHERE role_id = %(role_id)s
                    AND tenant_id = %(tenant_id)s
                    AND NOT protected
                """, params)
            )
        query, params = _main_select_query(tenant_id, resource_id)
        cur.execute(query, params)
        return cur.fetchone()


def restore_resource(tenant_id: int, resource: Resource) -> dict | None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """ \
                UPDATE public.roles
                SET deleted_at = NULL
                WHERE role_id = %(role_id)s
                  AND NOT protected RETURNING roles.*, 
                        COALESCE(
                        (SELECT json_agg(users)
                         FROM public.users
                         WHERE users.role_id = roles.role_id),
                        '[]'
                    ) AS users,
                    COALESCE(
                        (SELECT json_agg(projects.project_key)
                         FROM public.projects
                         LEFT JOIN public.roles_projects USING (project_id)
                         WHERE roles_projects.role_id = roles.role_id),
                        '[]'
                    ) AS project_keys
                """,
                {"role_id": resource.id},
            )
        )
        item = cur.fetchone()

    return convert_provider_resource_to_client_resource(item)
