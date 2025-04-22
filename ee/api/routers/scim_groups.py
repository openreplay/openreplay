from typing import Any

from chalicelib.utils import helper, pg_client


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


def restore_resource(**kwargs: dict[str, Any]) -> dict[str, Any] | None:
    # note(jon): we're not soft deleting groups, so we don't need this
    return None


def create_resource(
    name: str, tenant_id: int, **kwargs: dict[str, Any]
) -> dict[str, Any]:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                WITH g AS(
                    INSERT INTO public.groups
                        (tenant_id, name, external_id)
                    VALUES (%(tenant_id)s, %(name)s, %(external_id)s)
                    RETURNING *
                )
                SELECT g.group_id
                FROM g;
                """,
                {
                    "tenant_id": tenant_id,
                    "name": name,
                    "external_id": kwargs.get("external_id"),
                },
            )
        )
        group_id = cur.fetchone()["group_id"]
        user_ids = kwargs.get("user_ids", [])
        if user_ids:
            cur.execute(
                cur.mogrify(
                    """
                    UPDATE public.users
                    SET group_id = %s
                    WHERE users.user_id = ANY(%s)
                    """,
                    (group_id, user_ids),
                )
            )
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
                    WHERE users.group_id = %(group_id)s
                ) users_data ON true
                WHERE
                    groups.group_id = %(group_id)s
                    AND groups.tenant_id = %(tenant_id)s
                LIMIT 1;
                """,
                {
                    "group_id": group_id,
                    "tenant_id": tenant_id,
                    "name": name,
                    "external_id": kwargs.get("external_id"),
                },
            )
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


def update_resource(
    group_id: int, tenant_id: int, name: str, **kwargs: dict[str, Any]
) -> dict[str, Any]:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                UPDATE public.users
                SET group_id = null
                WHERE users.group_id = %(group_id)s;
                """,
                {"group_id": group_id},
            )
        )
        user_ids = kwargs.get("user_ids", [])
        if user_ids:
            cur.execute(
                cur.mogrify(
                    """
                    UPDATE public.users
                    SET group_id = %s
                    WHERE users.user_id = ANY(%s);
                    """,
                    (group_id, user_ids),
                )
            )
        cur.execute(
            cur.mogrify(
                """
                WITH g AS (
                    UPDATE public.groups
                    SET
                        tenant_id = %(tenant_id)s,
                        name = %(name)s,
                        external_id = %(external_id)s,
                        updated_at = default
                    WHERE
                        groups.group_id = %(group_id)s
                        AND groups.tenant_id = %(tenant_id)s
                    RETURNING *
                )
                SELECT
                    g.*,
                    users_data.array as users
                FROM g
                LEFT JOIN LATERAL (
                    SELECT json_agg(users) AS array
                    FROM public.users
                    WHERE users.group_id = g.group_id
                ) users_data ON true
                LIMIT 1;
                """,
                {
                    "group_id": group_id,
                    "tenant_id": tenant_id,
                    "name": name,
                    "external_id": kwargs.get("external_id"),
                },
            )
        )
        return helper.dict_to_camel_case(cur.fetchone())
