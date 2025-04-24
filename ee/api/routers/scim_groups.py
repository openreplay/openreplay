from typing import Any
from datetime import datetime
from psycopg2.extensions import AsIs

from chalicelib.utils import helper, pg_client


def count_total_resources(tenant_id: int) -> int:
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


def get_resources_paginated(
    offset_one_indexed: int, tenant_id: int, limit: int | None = None
) -> list[dict[str, Any]]:
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
                    "offset": offset_one_indexed - 1,
                    "limit": limit,
                    "tenant_id": tenant_id,
                },
            )
        )
        return helper.list_to_camel_case(cur.fetchall())


def get_resource_by_id(group_id: int, tenant_id: int) -> dict[str, Any]:
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
                {"group_id": group_id, "tenant_id": tenant_id},
            )
        )
        return helper.dict_to_camel_case(cur.fetchone())


def get_existing_resource_by_unique_values_from_all_resources(
    **kwargs,
) -> dict[str, Any] | None:
    # note(jon): we do not really use this for groups as we don't have unique values outside
    # of the primary key
    return None


def create_resource(
    name: str,
    tenant_id: int,
    user_ids: list[str] | None = None,
    **kwargs: dict[str, Any],
) -> dict[str, Any]:
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
        return helper.dict_to_camel_case(cur.fetchone())


def delete_resource(group_id: int, tenant_id: int) -> None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                DELETE FROM public.groups
                WHERE groups.group_id = %(group_id)s AND groups.tenant_id = %(tenant_id)s;
                """
            ),
            {"tenant_id": tenant_id, "group_id": group_id},
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
        return helper.dict_to_camel_case(cur.fetchone())


def update_resource(
    group_id: int,
    tenant_id: int,
    name: str,
    **kwargs: dict[str, Any],
) -> dict[str, Any]:
    return _update_resource_sql(
        group_id=group_id,
        tenant_id=tenant_id,
        name=name,
        **kwargs,
    )


def patch_resource(
    group_id: int,
    tenant_id: int,
    **kwargs: dict[str, Any],
):
    return _update_resource_sql(
        group_id=group_id,
        tenant_id=tenant_id,
        **kwargs,
    )
