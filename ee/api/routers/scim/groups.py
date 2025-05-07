from typing import Any
from datetime import datetime
from psycopg2.extensions import AsIs

from chalicelib.utils import pg_client
from routers.scim.resource_config import (
    ProviderResource,
    ClientResource,
    ResourceId,
    ClientInput,
    ProviderInput,
)


def convert_client_resource_update_input_to_provider_resource_update_input(
    tenant_id: int, client_input: ClientInput
) -> ProviderInput:
    result = {}
    if "displayName" in client_input:
        result["name"] = client_input["displayName"]
    if "members" in client_input:
        members = client_input["members"] or []
        result["user_ids"] = [int(member["value"]) for member in members]
    if "projectKeys" in client_input:
        result["project_keys"] = [item["value"] for item in client_input["projectKeys"]]
    return result


def convert_provider_resource_to_client_resource(
    provider_resource: ProviderResource,
) -> ClientResource:
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
            "location": f"Groups/{provider_resource['role_id']}",
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
        "projectKeys": [
            {"value": project_key} for project_key in provider_resource["project_keys"]
        ],
    }


def get_active_resource_count(tenant_id: int, filter_clause: str | None = None) -> int:
    where_and_clauses = [
        f"roles.tenant_id = {tenant_id}",
        "roles.deleted_at IS NULL",
    ]
    if filter_clause is not None:
        where_and_clauses.append(filter_clause)
    where_clause = " AND ".join(where_and_clauses)
    with pg_client.PostgresClient() as cur:
        cur.execute(
            f"""
            SELECT COUNT(*)
            FROM public.roles
            WHERE {where_clause}
            """
        )
        return cur.fetchone()["count"]


def _main_select_query(
    tenant_id: int, resource_id: int | None = None, filter_clause: str | None = None
) -> str:
    where_and_clauses = [
        f"roles.tenant_id = {tenant_id}",
        "roles.deleted_at IS NULL",
    ]
    if resource_id is not None:
        where_and_clauses.append(f"roles.role_id = {resource_id}")
    if filter_clause is not None:
        where_and_clauses.append(filter_clause)
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


def get_provider_resource_chunk(
    offset: int, tenant_id: int, limit: int, filter_clause: str | None = None
) -> list[ProviderResource]:
    query = _main_select_query(tenant_id, filter_clause=filter_clause)
    with pg_client.PostgresClient() as cur:
        cur.execute(f"{query} LIMIT {limit} OFFSET {offset}")
        return cur.fetchall()


def filter_attribute_mapping() -> dict[str, str]:
    return {"displayName": "roles.name"}


def get_provider_resource(
    resource_id: ResourceId, tenant_id: int
) -> ProviderResource | None:
    with pg_client.PostgresClient() as cur:
        cur.execute(f"{_main_select_query(tenant_id, resource_id)} LIMIT 1")
        return cur.fetchone()


def convert_client_resource_creation_input_to_provider_resource_creation_input(
    tenant_id: int, client_input: ClientInput
) -> ProviderInput:
    return {
        "name": client_input["displayName"],
        "user_ids": [
            int(member["value"]) for member in client_input.get("members", [])
        ],
        "project_keys": [item["value"] for item in client_input.get("projectKeys", [])],
    }


def convert_client_resource_rewrite_input_to_provider_resource_rewrite_input(
    tenant_id: int, client_input: ClientInput
) -> ProviderInput:
    return {
        "name": client_input["displayName"],
        "user_ids": [
            int(member["value"]) for member in client_input.get("members", [])
        ],
        "project_keys": [item["value"] for item in client_input.get("projectKeys", [])],
    }


def create_provider_resource(
    name: str,
    tenant_id: int,
    user_ids: list[str] | None = None,
    project_keys: list[str] | None = None,
    **kwargs: dict[str, Any],
) -> ProviderResource:
    with pg_client.PostgresClient() as cur:
        kwargs["name"] = name
        kwargs["tenant_id"] = tenant_id
        column_fragments = [
            cur.mogrify("%s", (AsIs(k),)).decode("utf-8") for k in kwargs.keys()
        ]
        column_clause = ", ".join(column_fragments)
        value_fragments = [
            cur.mogrify("%s", (v,)).decode("utf-8") for v in kwargs.values()
        ]
        value_clause = ", ".join(value_fragments)
        user_ids = user_ids or []
        user_id_fragments = [
            cur.mogrify("%s", (user_id,)).decode("utf-8") for user_id in user_ids
        ]
        user_id_clause = f"ARRAY[{', '.join(user_id_fragments)}]::int[]"
        project_keys = project_keys or []
        project_key_fragments = [
            cur.mogrify("%s", (project_key,)).decode("utf-8")
            for project_key in project_keys
        ]
        project_key_clause = f"ARRAY[{', '.join(project_key_fragments)}]::varchar[]"
        cur.execute(
            f"""
            INSERT INTO public.roles ({column_clause})
            VALUES ({value_clause})
            RETURNING role_id
            """
        )
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
        cur.execute(
            f"""
            WITH ps AS (
                SELECT *
                FROM public.projects
                WHERE projects.project_key = ANY({project_key_clause})
            )
            INSERT INTO public.roles_projects (role_id, project_id)
            SELECT {role_id}, ps.project_id
            FROM ps
            """
        )
        cur.execute(f"{_main_select_query(tenant_id, role_id)} LIMIT 1")
        return cur.fetchone()


def _update_resource_sql(
    resource_id: int,
    tenant_id: int,
    user_ids: list[int] | None = None,
    project_keys: list[str] | None = None,
    **kwargs: dict[str, Any],
) -> dict[str, Any]:
    with pg_client.PostgresClient() as cur:
        kwargs["updated_at"] = datetime.now()
        set_fragments = [
            cur.mogrify("%s = %s", (AsIs(k), v)).decode("utf-8")
            for k, v in kwargs.items()
        ]
        set_clause = ", ".join(set_fragments)
        user_ids = user_ids or []
        user_id_fragments = [
            cur.mogrify("%s", (user_id,)).decode("utf-8") for user_id in user_ids
        ]
        user_id_clause = f"ARRAY[{', '.join(user_id_fragments)}]::int[]"
        project_keys = project_keys or []
        project_key_fragments = [
            cur.mogrify("%s", (project_key,)).decode("utf-8")
            for project_key in project_keys
        ]
        project_key_clause = f"ARRAY[{', '.join(project_key_fragments)}]::varchar[]"
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
            DELETE FROM public.roles_projects
            USING public.projects
            WHERE
                projects.project_id = roles_projects.project_id
                AND roles_projects.role_id = {resource_id}
                AND projects.project_key != ALL({project_key_clause})
            """
        )
        cur.execute(
            f"""
            INSERT INTO public.roles_projects (role_id, project_id)
            SELECT {resource_id}, projects.project_id
            FROM public.projects
            LEFT JOIN public.roles_projects USING (project_id)
            WHERE
                projects.project_key = ANY({project_key_clause})
                AND roles_projects.role_id IS NULL
            """
        )
        cur.execute(
            f"""
            UPDATE public.roles
            SET {set_clause}
            WHERE
                roles.role_id = {resource_id}
                AND roles.tenant_id = {tenant_id}
                AND roles.deleted_at IS NULL
            """
        )
        cur.execute(f"{_main_select_query(tenant_id, resource_id)} LIMIT 1")
        return cur.fetchone()


def delete_provider_resource(resource_id: ResourceId, tenant_id: int) -> None:
    _update_resource_sql(
        resource_id=resource_id,
        tenant_id=tenant_id,
        deleted_at=datetime.now(),
    )


def rewrite_provider_resource(
    resource_id: int,
    tenant_id: int,
    name: str,
    **kwargs: dict[str, Any],
) -> dict[str, Any]:
    return _update_resource_sql(
        resource_id=resource_id,
        tenant_id=tenant_id,
        name=name,
        **kwargs,
    )


def update_provider_resource(
    resource_id: int,
    tenant_id: int,
    **kwargs: dict[str, Any],
):
    return _update_resource_sql(
        resource_id=resource_id,
        tenant_id=tenant_id,
        **kwargs,
    )
