from routers.scim import helpers

from chalicelib.utils import pg_client
from scim2_models import Resource


def convert_provider_resource_to_client_resource(
        provider_resource: dict,
) -> dict:
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
        "schemas": [
            "urn:ietf:params:scim:schemas:core:2.0:User",
            "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User",
            "urn:ietf:params:scim:schemas:extension:openreplay:2.0:User",
        ],
        "meta": {
            "resourceType": "User",
            "created": provider_resource["created_at"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "lastModified": provider_resource["updated_at"].strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            ),
        },
        "userName": provider_resource["email"],
        "externalId": provider_resource["internal_id"],
        "name": {
            "formatted": provider_resource["name"],
        },
        "displayName": provider_resource["name"] or provider_resource["email"],
        "active": provider_resource["deleted_at"] is None,
        "groups": groups,
        "urn:ietf:params:scim:schemas:extension:openreplay:2.0:User": {
            "permissions": provider_resource.get("permissions") or [],
            "projectKeys": provider_resource.get("project_keys") or [],
        },
    }


def query_resources(tenant_id: int) -> list[dict]:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
            SELECT
                users.*,
                roles.permissions AS permissions,
                COALESCE(
                    (
                        SELECT json_agg(projects.project_key)
                        FROM public.projects
                        LEFT JOIN public.roles_projects USING (project_id)
                        WHERE roles_projects.role_id = roles.role_id
                    ),
                    '[]'
                ) AS project_keys
            FROM public.users
                LEFT JOIN public.roles ON roles.role_id = users.role_id
            WHERE users.tenant_id = %(tenant_id)s 
                AND users.deleted_at IS NULL
            """, {"tenant_id": tenant_id})
        )
        items = cur.fetchall()
        return [convert_provider_resource_to_client_resource(item) for item in items]


def get_resource(resource_id: str, tenant_id: int) -> dict | None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            f"""
            SELECT
                users.*,
                roles.permissions AS permissions,
                COALESCE(
                    (
                        SELECT json_agg(projects.project_key)
                        FROM public.projects
                        LEFT JOIN public.roles_projects USING (project_id)
                        WHERE roles_projects.role_id = roles.role_id
                    ),
                    '[]'
                ) AS project_keys
            FROM public.users
            LEFT JOIN public.roles ON roles.role_id = users.role_id
            WHERE users.tenant_id = {tenant_id} AND users.deleted_at IS NULL AND users.user_id = {resource_id}
            """
        )
        item = cur.fetchone()
        if item:
            return convert_provider_resource_to_client_resource(item)
        return None


def delete_resource(resource_id: str, tenatn_id: int) -> None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                UPDATE public.users
                SET deleted_at = NULL,
                    updated_at = now()
                WHERE users.user_id = %(user_id)s
                """,
                {"user_id": resource_id},
            )
        )


def search_existing(tenant_id: int, resource: Resource) -> dict | None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                SELECT *
                FROM public.users
                WHERE email = %(email)s
                """,
                {"email": resource.user_name},
            )
        )
        item = cur.fetchone()
        if item:
            return convert_provider_resource_to_client_resource(item)
        return None


def restore_resource(tenant_id: int, resource: Resource) -> dict | None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                SELECT role_id
                FROM public.users
                WHERE user_id = %(user_id)s
                """,
                {"user_id": resource.id},
            )
        )
        item = cur.fetchone()
        if item and item["role_id"] is not None:
            _update_role_projects_and_permissions(
                item["role_id"],
                resource.OpenreplayUser.project_keys,
                resource.OpenreplayUser.permissions,
                cur,
            )
        cur.execute(
            cur.mogrify(
                """
                WITH u AS (
                UPDATE public.users
                SET tenant_id     = %(tenant_id)s,
                    email         = %(email)s,
                    name          = %(name)s,
                    internal_id   = %(internal_id)s,
                    deleted_at    = NULL,
                    created_at    = now(),
                    updated_at    = now(),
                    api_key       = default,
                    jwt_iat       = NULL,
                    weekly_report = default
                WHERE users.email = %(email)s RETURNING *
                )
                SELECT u.*,
                       roles.permissions AS permissions,
                       COALESCE(
                               (SELECT json_agg(projects.project_key)
                                FROM public.projects
                                         LEFT JOIN public.roles_projects USING (project_id)
                                WHERE roles_projects.role_id = roles.role_id),
                               '[]'
                       )                 AS project_keys
                FROM u
                         LEFT JOIN public.roles ON roles.role_id = u.role_id
                """,
                {
                    "tenant_id": tenant_id,
                    "email": resource.user_name,
                    "name": " ".join(
                        [
                            x
                            for x in [
                            resource.name.honorific_prefix,
                            resource.name.given_name,
                            resource.name.middle_name,
                            resource.name.family_name,
                            resource.name.honorific_suffix,
                        ]
                            if x
                        ]
                    )
                    if resource.name
                    else "",
                    "internal_id": resource.external_id,
                },
            )
        )
        item = cur.fetchone()
        return convert_provider_resource_to_client_resource(item)


def create_resource(tenant_id: int, resource: Resource) -> dict:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                WITH u AS (
                INSERT
                INTO public.users (tenant_id,
                                   email,
                                   name,
                                   internal_id)
                VALUES (
                    %(tenant_id)s, %(email)s, %(name)s, %(internal_id)s
                    )
                    RETURNING *
                    )
                SELECT *
                FROM u
                """,
                {
                    "tenant_id": tenant_id,
                    "email": resource.user_name,
                    "name": " ".join(
                        [
                            x
                            for x in [
                            resource.name.honorific_prefix,
                            resource.name.given_name,
                            resource.name.middle_name,
                            resource.name.family_name,
                            resource.name.honorific_suffix,
                        ]
                            if x
                        ]
                    )
                    if resource.name
                    else "",
                    "internal_id": resource.external_id,
                },
            )
        )
        item = cur.fetchone()
        return convert_provider_resource_to_client_resource(item)


def update_resource(tenant_id: int, resource: Resource) -> dict | None:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                SELECT role_id
                FROM public.users
                WHERE user_id = %(user_id)s
                """,
                {"user_id": resource.id},
            )
        )
        item = cur.fetchone()
        if item and item["role_id"] is not None:
            _update_role_projects_and_permissions(
                item["role_id"],
                resource.OpenreplayUser.project_keys,
                resource.OpenreplayUser.permissions,
                cur,
            )
        cur.execute(
            cur.mogrify(
                """
                WITH u AS (
                UPDATE public.users
                SET tenant_id   = %(tenant_id)s,
                    email       = %(email)s,
                    name        = %(name)s,
                    internal_id = %(internal_id)s,
                    updated_at  = now()
                WHERE user_id = %(user_id)s RETURNING *
                )
                SELECT u.*,
                       roles.permissions AS permissions,
                       COALESCE(
                               (SELECT json_agg(projects.project_key)
                                FROM public.projects
                                         LEFT JOIN public.roles_projects USING (project_id)
                                WHERE roles_projects.role_id = roles.role_id),
                               '[]'
                       )                 AS project_keys
                FROM u
                         LEFT JOIN public.roles ON roles.role_id = u.role_id
                """,
                {
                    "user_id": resource.id,
                    "tenant_id": tenant_id,
                    "email": resource.user_name,
                    "name": " ".join(
                        [
                            x
                            for x in [
                            resource.name.honorific_prefix,
                            resource.name.given_name,
                            resource.name.middle_name,
                            resource.name.family_name,
                            resource.name.honorific_suffix,
                        ]
                            if x
                        ]
                    )
                    if resource.name
                    else "",
                    "internal_id": resource.external_id,
                },
            )
        )
        item = cur.fetchone()
        return convert_provider_resource_to_client_resource(item)


def _update_role_projects_and_permissions(
        role_id: int,
        project_keys: list[str] | None,
        permissions: list[str] | None,
        cur: pg_client.PostgresClient,
) -> None:
    all_projects = "true" if not project_keys else "false"
    project_key_clause = helpers.safe_mogrify_array(project_keys, "varchar", cur)
    permission_clause = helpers.safe_mogrify_array(permissions, "varchar", cur)
    cur.execute(
        f"""
        UPDATE public.roles
        SET
            updated_at = now(),
            all_projects = {all_projects},
            permissions = {permission_clause}
        WHERE role_id = {role_id}
        RETURNING *
        """
    )
    cur.execute(
        f"""
        DELETE FROM public.roles_projects
        WHERE roles_projects.role_id = {role_id}
        """
    )
    cur.execute(
        f"""
        INSERT INTO public.roles_projects (role_id, project_id)
        SELECT {role_id}, projects.project_id
        FROM public.projects
        WHERE projects.project_key = ANY({project_key_clause})        
        """
    )
