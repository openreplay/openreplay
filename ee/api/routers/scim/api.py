from urllib.parse import urlencode

from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse
from scim2_server import utils

from chalicelib.utils import pg_client
from chalicelib.utils.scim_auth import (
    create_tokens,
    verify_refresh_token,
)
from routers.base import get_routers
from routers.scim import users, groups, helpers
from routers.scim.backends import PostgresBackend
from routers.scim.postgres_resource import PostgresResource
from routers.scim.providers import MultiTenantProvider

b = PostgresBackend()
b.register_postgres_resource(
    "User",
    PostgresResource(
        query_resources=users.query_resources,
        get_resource=users.get_resource,
        create_resource=users.create_resource,
        search_existing=users.search_existing,
        restore_resource=users.restore_resource,
        delete_resource=users.delete_resource,
        update_resource=users.update_resource,
    ),
)
b.register_postgres_resource(
    "Group",
    PostgresResource(
        query_resources=groups.query_resources,
        get_resource=groups.get_resource,
        create_resource=groups.create_resource,
        search_existing=groups.search_existing,
        restore_resource=None,
        delete_resource=groups.delete_resource,
        update_resource=groups.update_resource,
    ),
)

scim_app = MultiTenantProvider(b)

for schema in utils.load_default_schemas().values():
    scim_app.register_schema(schema)
for schema in helpers.load_custom_schemas().values():
    scim_app.register_schema(schema)
for resource_type in helpers.load_custom_resource_types().values():
    scim_app.register_resource_type(resource_type)

public_app, app, app_apikey = get_routers(prefix="/sso/scim/v2")


@public_app.post("/token")
async def post_token(r: Request):
    form = await r.form()

    client_id = form.get("client_id")
    client_secret = form.get("client_secret")
    with pg_client.PostgresClient() as cur:
        try:
            cur.execute(
                cur.mogrify(
                    """
                    SELECT tenant_id
                    FROM public.tenants
                    WHERE tenant_id = %(tenant_id)s
                      AND tenant_key = %(tenant_key)s
                    """,
                    {"tenant_id": int(client_id), "tenant_key": client_secret},
                )
            )
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        tenant = cur.fetchone()
        if not tenant:
            raise HTTPException(status_code=401, detail="Invalid credentials")

    grant_type = form.get("grant_type")
    if grant_type == "refresh_token":
        refresh_token = form.get("refresh_token")
        verify_refresh_token(refresh_token)
    else:
        code = form.get("code")
        with pg_client.PostgresClient() as cur:
            cur.execute(
                cur.mogrify(
                    """
                    SELECT *
                    FROM public.scim_auth_codes
                    WHERE auth_code = %(auth_code)s
                      AND tenant_id = %(tenant_id)s
                      AND used IS FALSE
                    """,
                    {"auth_code": code, "tenant_id": int(client_id)},
                )
            )
            if cur.fetchone() is None:
                raise HTTPException(
                    status_code=401, detail="Invalid code/client_id pair"
                )
            cur.execute(
                cur.mogrify(
                    """
                    UPDATE public.scim_auth_codes
                    SET used= TRUE
                    WHERE auth_code = %(auth_code)s
                      AND tenant_id = %(tenant_id)s
                      AND used IS FALSE
                    """,
                    {"auth_code": code, "tenant_id": int(client_id)},
                )
            )

    access_token, refresh_token, expires_in = create_tokens(
        tenant_id=tenant["tenant_id"]
    )

    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": expires_in,
        "refresh_token": refresh_token,
    }


# note(jon): this might be specific to okta. if so, we should probably put specify that in the endpoint
@public_app.get("/authorize")
async def get_authorize(
        r: Request,
        response_type: str,
        client_id: str,
        redirect_uri: str,
        state: str | None = None,
):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                UPDATE public.scim_auth_codes
                SET used= TRUE
                WHERE tenant_id = %(tenant_id)s
                """,
                {"tenant_id": int(client_id)},
            )
        )
        cur.execute(
            cur.mogrify(
                """
                INSERT INTO public.scim_auth_codes (tenant_id)
                VALUES (%(tenant_id)s) RETURNING auth_code
                """,
                {"tenant_id": int(client_id)},
            )
        )
        code = cur.fetchone()["auth_code"]
    params = {"code": code}
    if state:
        params["state"] = state
    url = f"{redirect_uri}?{urlencode(params)}"
    return RedirectResponse(url)
