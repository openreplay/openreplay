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
    if "externalId" in client_input:
        result["external_id"] = client_input["externalId"]
    if "members" in client_input:
        members = client_input["members"] or []
        result["user_ids"] = [int(member["value"]) for member in members]
    return result


def convert_provider_resource_to_client_resource(
    provider_resource: ProviderResource,
) -> ClientResource:
    members = provider_resource["users"] or []
    return {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
        "id": str(provider_resource["group_id"]),
        "externalId": provider_resource["external_id"],
        "meta": {
            "resourceType": "Group",
            "created": provider_resource["created_at"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "lastModified": provider_resource["updated_at"].strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            ),
            "location": f"Groups/{provider_resource['group_id']}",
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


def get_active_resource_count(tenant_id: int) -> int:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                SELECT COUNT(*)
                FROM public.groups
                WHERE groups.tenant_id = %(tenant_id)s
                """,
                {"tenant_id": tenant_id},
            )
        )
        return cur.fetchone()["count"]


def get_provider_resource_chunk(
    offset: int, tenant_id: int, limit: int
) -> list[ProviderResource]:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                SELECT
                    groups.*,
                    users_data.array as users
                FROM public.groups
                LEFT JOIN LATERAL (
                    SELECT json_agg(users) AS array
                    FROM public.users
                    WHERE users.group_id = groups.group_id
                ) users_data ON true
                WHERE groups.tenant_id = %(tenant_id)s
                LIMIT %(limit)s
                OFFSET %(offset)s;
                """,
                {
                    "offset": offset,
                    "limit": limit,
                    "tenant_id": tenant_id,
                },
            )
        )
        return cur.fetchall()


def get_provider_resource(
    resource_id: ResourceId, tenant_id: int
) -> ProviderResource | None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                SELECT
                    groups.*,
                    users_data.array as users
                FROM public.groups
                LEFT JOIN LATERAL (
                    SELECT json_agg(users) AS array
                    FROM public.users
                    WHERE users.group_id = groups.group_id
                ) users_data ON true
                WHERE
                    groups.tenant_id = %(tenant_id)s
                    AND groups.group_id = %(group_id)s
                LIMIT 1;
                """,
                {"group_id": resource_id, "tenant_id": tenant_id},
            )
        )
        return cur.fetchone()


def get_provider_resource_from_unique_fields(
    **kwargs: dict[str, Any],
) -> ProviderResource | None:
    # note(jon): we do not really use this for groups as we don't have unique values outside
    # of the primary key
    return None


def convert_client_resource_creation_input_to_provider_resource_creation_input(
    tenant_id: int, client_input: ClientInput
) -> ProviderInput:
    return {
        "name": client_input["displayName"],
        "external_id": client_input.get("externalId"),
        "user_ids": [
            int(member["value"]) for member in client_input.get("members", [])
        ],
    }


def convert_client_resource_rewrite_input_to_provider_resource_rewrite_input(
    tenant_id: int, client_input: ClientInput
) -> ProviderInput:
    return {
        "name": client_input["displayName"],
        "external_id": client_input.get("externalId"),
        "user_ids": [
            int(member["value"]) for member in client_input.get("members", [])
        ],
    }


def create_provider_resource(
    name: str,
    tenant_id: int,
    user_ids: list[str] | None = None,
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
        cur.execute(
            f"""
            WITH
                g AS (
                    INSERT INTO public.groups ({column_clause})
                    VALUES ({value_clause})
                    RETURNING *
                ),
                linked_users AS (
                    UPDATE public.users
                    SET
                        group_id = g.group_id,
                        updated_at = now()
                    FROM g
                    WHERE
                        users.user_id = ANY({user_id_clause})
                        AND users.deleted_at IS NULL
                        AND users.tenant_id = {tenant_id}
                    RETURNING *
                )
            SELECT
                g.*,
                COALESCE(users_data.array, '[]') as users
            FROM g
            LEFT JOIN LATERAL (
                SELECT json_agg(lu) AS array
                FROM linked_users AS lu
            ) users_data ON true
            LIMIT 1;
            """
        )
        return cur.fetchone()


def delete_provider_resource(resource_id: ResourceId, tenant_id: int) -> None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                DELETE FROM public.groups
                WHERE groups.group_id = %(group_id)s AND groups.tenant_id = %(tenant_id)s;
                """
            ),
            {"tenant_id": tenant_id, "group_id": resource_id},
        )


def _update_resource_sql(
    group_id: int,
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
        user_ids = user_ids or []
        user_id_fragments = [
            cur.mogrify("%s", (user_id,)).decode("utf-8") for user_id in user_ids
        ]
        user_id_clause = f"ARRAY[{', '.join(user_id_fragments)}]::int[]"
        cur.execute(
            f"""
            WITH
                g AS (
                    UPDATE public.groups
                    SET {set_clause}
                    WHERE
                        groups.group_id = {group_id}
                        AND groups.tenant_id = {tenant_id}
                    RETURNING *
                ),
                unlinked_users AS (
                    UPDATE public.users
                    SET
                        group_id = null,
                        updated_at = now()
                    WHERE
                        users.group_id = {group_id}
                        AND users.user_id <> ALL({user_id_clause})
                        AND users.deleted_at IS NULL
                        AND users.tenant_id = {tenant_id}
                ),
                linked_users AS (
                    UPDATE public.users
                    SET
                        group_id = {group_id},
                        updated_at = now()
                    WHERE
                        users.user_id = ANY({user_id_clause})
                        AND users.deleted_at IS NULL
                        AND users.tenant_id = {tenant_id}
                    RETURNING *
                )
            SELECT
                g.*,
                COALESCE(users_data.array, '[]') as users
            FROM g
            LEFT JOIN LATERAL (
                SELECT json_agg(lu) AS array
                FROM linked_users AS lu
            ) users_data ON true
            LIMIT 1;
            """
        )
        return cur.fetchone()


def rewrite_provider_resource(
    resource_id: int,
    tenant_id: int,
    name: str,
    **kwargs: dict[str, Any],
) -> dict[str, Any]:
    return _update_resource_sql(
        group_id=resource_id,
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
        group_id=resource_id,
        tenant_id=tenant_id,
        **kwargs,
    )
