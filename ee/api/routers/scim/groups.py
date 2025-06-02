from typing import Any
from datetime import datetime
from psycopg2.extensions import AsIs

from chalicelib.utils import pg_client
from routers.scim import helpers

from scim2_models import Error, Resource
from scim2_server.utils import SCIMException


def convert_provider_resource_to_client_resource(
    provider_resource: dict,
) -> dict:
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
    query = _main_select_query(tenant_id)
    with pg_client.PostgresClient() as cur:
        cur.execute(query)
        items = cur.fetchall()
        return [convert_provider_resource_to_client_resource(item) for item in items]


def get_resource(resource_id: str, tenant_id: int) -> dict | None:
    query = _main_select_query(tenant_id, resource_id)
    with pg_client.PostgresClient() as cur:
        cur.execute(query)
        item = cur.fetchone()
        if item:
            return convert_provider_resource_to_client_resource(item)
        return None


def delete_resource(resource_id: str, tenant_id: int) -> None:
    _update_resource_sql(
        resource_id=resource_id,
        tenant_id=tenant_id,
        deleted_at=datetime.now(),
    )


def search_existing(tenant_id: int, resource: Resource) -> dict | None:
    return None


def create_resource(tenant_id: int, resource: Resource) -> dict:
    with pg_client.PostgresClient() as cur:
        user_ids = (
            [int(x.value) for x in resource.members] if resource.members else None
        )
        user_id_clause = helpers.safe_mogrify_array(user_ids, "int", cur)
        try:
            cur.execute(
                cur.mogrify(
                    """
                    INSERT INTO public.roles (
                        name,
                        tenant_id
                    )
                    VALUES (
                        %(name)s,
                        %(tenant_id)s
                    )
                    RETURNING role_id
                    """,
                    {
                        "name": resource.display_name,
                        "tenant_id": tenant_id,
                    },
                )
            )
        except Exception:
            raise SCIMException(Error.make_invalid_value_error())
        role_id = cur.fetchone()["role_id"]
        cur.execute(
            f"""
            UPDATE public.users
            SET
                updated_at = now(),
                role_id = {role_id}
            WHERE users.user_id = ANY({user_id_clause})
            """
        )
        cur.execute(f"{_main_select_query(tenant_id, role_id)} LIMIT 1")
        item = cur.fetchone()
        return convert_provider_resource_to_client_resource(item)


def update_resource(tenant_id: int, resource: Resource) -> dict | None:
    item = _update_resource_sql(
        resource_id=resource.id,
        tenant_id=tenant_id,
        name=resource.display_name,
        user_ids=[int(x.value) for x in resource.members],
        deleted_at=None,
    )
    return convert_provider_resource_to_client_resource(item)


def _main_select_query(tenant_id: int, resource_id: str | None = None) -> str:
    where_and_clauses = [
        f"roles.tenant_id = {tenant_id}",
        "roles.deleted_at IS NULL",
    ]
    if resource_id is not None:
        where_and_clauses.append(f"roles.role_id = {resource_id}")
    where_clause = " AND ".join(where_and_clauses)
    return f"""
        SELECT
            roles.*,
            COALESCE(
                (
                    SELECT json_agg(users)
                    FROM public.users
                    WHERE users.role_id = roles.role_id
                ),
                '[]'
            ) AS users,
            COALESCE(
                (
                    SELECT json_agg(projects.project_key)
                    FROM public.projects
                    LEFT JOIN public.roles_projects USING (project_id)
                    WHERE roles_projects.role_id = roles.role_id
                ),
                '[]'
            ) AS project_keys
        FROM public.roles
        WHERE {where_clause}
        """


def _update_resource_sql(
    resource_id: int,
    tenant_id: int,
    user_ids: list[int] | None = None,
    **kwargs: dict[str, Any],
) -> dict[str, Any]:
    with pg_client.PostgresClient() as cur:
        kwargs["updated_at"] = datetime.now()
        set_fragments = [
            cur.mogrify("%s = %s", (AsIs(k), v)).decode("utf-8")
            for k, v in kwargs.items()
        ]
        set_clause = ", ".join(set_fragments)
        user_id_clause = helpers.safe_mogrify_array(user_ids, "int", cur)
        cur.execute(
            f"""
            UPDATE public.users
            SET
                updated_at = now(),
                role_id = NULL
            WHERE
                users.role_id = {resource_id}
                AND users.user_id != ALL({user_id_clause})
            RETURNING *
            """
        )
        cur.execute(
            f"""
            UPDATE public.users
            SET
                updated_at = now(),
                role_id = {resource_id}
            WHERE
                (users.role_id != {resource_id} OR users.role_id IS NULL)
                AND users.user_id = ANY({user_id_clause})
            RETURNING *
            """
        )
        cur.execute(
            f"""
            UPDATE public.roles
            SET {set_clause}
            WHERE
                roles.role_id = {resource_id}
                AND roles.tenant_id = {tenant_id}
            """
        )
        cur.execute(f"{_main_select_query(tenant_id, resource_id)} LIMIT 1")
        return cur.fetchone()
