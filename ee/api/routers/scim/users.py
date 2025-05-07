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
    if "name" in client_input:
        # note(jon): we're currently not handling the case where the client
        # send patches of individual name components (e.g. name.middleName)
        name = client_input.get("name", {}).get("formatted")
        if name:
            result["name"] = name
    if "userName" in client_input:
        result["email"] = client_input["userName"]
    if "externalId" in client_input:
        result["internal_id"] = client_input["externalId"]
    if "active" in client_input:
        result["deleted_at"] = None if client_input["active"] else datetime.now()
    return result


def convert_client_resource_rewrite_input_to_provider_resource_rewrite_input(
    tenant_id: int, client_input: ClientInput
) -> ProviderInput:
    name = " ".join(
        [
            x
            for x in [
                client_input.get("name", {}).get("honorificPrefix"),
                client_input.get("name", {}).get("givenName"),
                client_input.get("name", {}).get("middleName"),
                client_input.get("name", {}).get("familyName"),
                client_input.get("name", {}).get("honorificSuffix"),
            ]
            if x
        ]
    )
    if not name:
        name = client_input.get("displayName")
    result = {
        "email": client_input["userName"],
        "internal_id": client_input.get("externalId"),
        "name": name,
    }
    result = {k: v for k, v in result.items() if v is not None}
    return result


def convert_client_resource_creation_input_to_provider_resource_creation_input(
    tenant_id: int, client_input: ClientInput
) -> ProviderInput:
    name = " ".join(
        [
            x
            for x in [
                client_input.get("name", {}).get("honorificPrefix"),
                client_input.get("name", {}).get("givenName"),
                client_input.get("name", {}).get("middleName"),
                client_input.get("name", {}).get("familyName"),
                client_input.get("name", {}).get("honorificSuffix"),
            ]
            if x
        ]
    )
    if not name:
        name = client_input.get("displayName")
    result = {
        "email": client_input["userName"],
        "internal_id": client_input.get("externalId"),
        "name": name,
    }
    result = {k: v for k, v in result.items() if v is not None}
    return result


def filter_attribute_mapping() -> dict[str, str]:
    return {"userName": "users.email"}


def get_provider_resource_from_unique_fields(
    email: str, **kwargs: dict[str, Any]
) -> ProviderResource | None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                SELECT *
                FROM public.users
                WHERE users.email = %(email)s
                """,
                {"email": email},
            )
        )
        return cur.fetchone()


def delete_provider_resource(resource_id: ResourceId, tenant_id: int) -> None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                UPDATE public.users
                SET
                    deleted_at = NULL,
                    updated_at = now()
                WHERE
                    users.user_id = %(user_id)s
                    AND users.tenant_id = %(tenant_id)s
                """,
                {"user_id": resource_id, "tenant_id": tenant_id},
            )
        )


def convert_provider_resource_to_client_resource(
    provider_resource: ProviderResource,
) -> ClientResource:
    groups = []
    if provider_resource["role_id"]:
        groups.append(
            {
                "value": str(provider_resource["role_id"]),
                "$ref": f"Groups/{provider_resource['role_id']}",
            }
        )
    return {
        "id": str(provider_resource["user_id"]),
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
        "meta": {
            "resourceType": "User",
            "created": provider_resource["created_at"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "lastModified": provider_resource["updated_at"].strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            ),
            "location": f"Users/{provider_resource['user_id']}",
        },
        "userName": provider_resource["email"],
        "externalId": provider_resource["internal_id"],
        "name": {
            "formatted": provider_resource["name"],
        },
        "displayName": provider_resource["name"] or provider_resource["email"],
        "active": provider_resource["deleted_at"] is None,
        "groups": groups,
    }


def get_active_resource_count(tenant_id: int, filter_clause: str | None = None) -> int:
    where_and_statements = [
        f"users.tenant_id = {tenant_id}",
        "users.deleted_at IS NULL",
    ]
    if filter_clause is not None:
        where_and_statements.append(filter_clause)
    where_clause = " AND ".join(where_and_statements)
    with pg_client.PostgresClient() as cur:
        cur.execute(
            f"""
            SELECT COUNT(*)
            FROM public.users
            WHERE {where_clause}
            """
        )
        return cur.fetchone()["count"]


def get_provider_resource_chunk(
    offset: int, tenant_id: int, limit: int, filter_clause: str | None = None
) -> list[ProviderResource]:
    where_and_statements = [
        f"users.tenant_id = {tenant_id}",
        "users.deleted_at IS NULL",
    ]
    if filter_clause is not None:
        where_and_statements.append(filter_clause)
    where_clause = " AND ".join(where_and_statements)
    with pg_client.PostgresClient() as cur:
        cur.execute(
            f"""
            SELECT *
            FROM public.users
            WHERE {where_clause}
            LIMIT {limit}
            OFFSET {offset};
            """
        )
        return cur.fetchall()


def get_provider_resource(
    resource_id: ResourceId, tenant_id: int
) -> ProviderResource | None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                SELECT *
                FROM public.users
                WHERE
                    users.user_id = %(user_id)s
                    AND users.tenant_id = %(tenant_id)s
                    AND users.deleted_at IS NULL
                LIMIT 1;
                """,
                {
                    "user_id": resource_id,
                    "tenant_id": tenant_id,
                },
            )
        )
        return cur.fetchone()


def create_provider_resource(
    email: str,
    tenant_id: int,
    name: str = "",
    internal_id: str | None = None,
) -> ProviderResource:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                WITH u AS (
                    INSERT INTO public.users (
                        tenant_id,
                        email,
                        name,
                        internal_id
                    )
                    VALUES (
                        %(tenant_id)s,
                        %(email)s,
                        %(name)s,
                        %(internal_id)s
                    )
                    RETURNING *
                )
                SELECT *
                FROM u
                """,
                {
                    "tenant_id": tenant_id,
                    "email": email,
                    "name": name,
                    "internal_id": internal_id,
                },
            )
        )
        return cur.fetchone()


def restore_provider_resource(
    tenant_id: int,
    email: str,
    name: str = "",
    internal_id: str | None = None,
    **kwargs: dict[str, Any],
) -> ProviderResource:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                WITH u AS (
                    UPDATE public.users
                    SET
                        tenant_id = %(tenant_id)s,
                        email = %(email)s,
                        name = %(name)s,
                        internal_id = %(internal_id)s,
                        deleted_at = NULL,
                        created_at = now(),
                        updated_at = now(),
                        api_key = default,
                        jwt_iat = NULL,
                        weekly_report = default
                    WHERE users.email = %(email)s
                    RETURNING *
                )
                SELECT *
                FROM u
                """,
                {
                    "tenant_id": tenant_id,
                    "email": email,
                    "name": name,
                    "internal_id": internal_id,
                },
            )
        )
        return cur.fetchone()


def rewrite_provider_resource(
    resource_id: int,
    tenant_id: int,
    email: str,
    name: str = "",
    internal_id: str | None = None,
):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                WITH u AS (
                    UPDATE public.users
                    SET
                        email = %(email)s,
                        name = %(name)s,
                        internal_id = %(internal_id)s,
                        updated_at = now()
                    WHERE
                        users.user_id = %(user_id)s
                        AND users.tenant_id = %(tenant_id)s
                        AND users.deleted_at IS NULL
                    RETURNING *
                )
                SELECT *
                FROM u
                """,
                {
                    "tenant_id": tenant_id,
                    "user_id": resource_id,
                    "email": email,
                    "name": name,
                    "internal_id": internal_id,
                },
            )
        )
        return cur.fetchone()


def update_provider_resource(
    resource_id: int,
    tenant_id: int,
    **kwargs,
):
    with pg_client.PostgresClient() as cur:
        set_fragments = []
        kwargs["updated_at"] = datetime.now()
        for k, v in kwargs.items():
            fragment = cur.mogrify(
                "%s = %s",
                (AsIs(k), v),
            ).decode("utf-8")
            set_fragments.append(fragment)
        set_clause = ", ".join(set_fragments)
        cur.execute(
            f"""
            WITH u AS (
                UPDATE public.users
                SET {set_clause}
                WHERE
                    users.user_id = {resource_id}
                    AND users.tenant_id = {tenant_id}
                    AND users.deleted_at IS NULL
                RETURNING *
            )
            SELECT *
            FROM u
            """
        )
        return cur.fetchone()
