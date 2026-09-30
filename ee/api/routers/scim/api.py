import logging
from urllib.parse import urlencode, urlparse

from decouple import config, Csv
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

logger = logging.getLogger(__name__)

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
        restore_resource=groups.restore_resource,
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

# Lifetime of an authorization code issued by /authorize (RFC 6749 §4.1.2 recommends <= 10 minutes)
AUTH_CODE_EXPIRE_SECONDS = config("SCIM_AUTH_CODE_EXPIRE_SECONDS", default=600, cast=int)

# Hosts that /authorize is allowed to redirect to.
# An entry starting with "." matches the domain and all of its sub-domains.
# Defaults cover Okta's provisioning OAuth callback domains.
ALLOWED_REDIRECT_HOSTS = [
    h.strip().lower()
    for h in config(
        "SCIM_ALLOWED_REDIRECT_HOSTS",
        cast=Csv(),
        default="system-admin.okta.com,system-admin.oktapreview.com,system-admin.okta-emea.com",
    )
    if h.strip()
]


def _is_allowed_redirect_uri(redirect_uri: str) -> bool:
    try:
        parsed = urlparse(redirect_uri)
    except ValueError:
        return False
    if parsed.scheme != "https":
        return False
    # no credentials, no fragment, no empty host
    if parsed.username is not None or parsed.password is not None or parsed.fragment:
        return False
    host = parsed.hostname
    if not host:
        return False
    host = host.lower()
    for allowed in ALLOWED_REDIRECT_HOSTS:
        if allowed.startswith("."):
            if host == allowed[1:] or host.endswith(allowed):
                return True
        elif host == allowed:
            return True
    return False


@public_app.post("/token/")
@public_app.post("/token")
async def post_token(r: Request):
    form = await r.form()
    tenant_key = form.get("client_id")
    tenant_secret = form.get("client_secret")
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """
                SELECT tenant_id
                FROM public.tenants
                WHERE tenant_key = %(tenant_key)s
                  AND tenant_secret = %(tenant_secret)s
                """,
                {"tenant_key": tenant_key, "tenant_secret": tenant_secret},
            )
        )
        tenant = cur.fetchone()
        if tenant is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")

    grant_type = form.get("grant_type")
    if grant_type == "refresh_token":
        refresh_token = form.get("refresh_token")
        verify_refresh_token(refresh_token)
    else:
        code = form.get("code")
        with pg_client.PostgresClient() as cur:
            cur.execute(
                # @formatter:off
                cur.mogrify(
                    """ \
                    UPDATE public.scim_auth_codes
                    SET used= TRUE
                    WHERE auth_code = %(auth_code)s
                      AND tenant_id = %(tenant_id)s
                      AND NOT used
                      AND created_at > (now() AT TIME ZONE 'utc') - %(expire_seconds)s * INTERVAL '1 second'
                    RETURNING auth_code_id;
                    """,
                    {
                        "auth_code": code,
                        "tenant_id": tenant["tenant_id"],
                        "expire_seconds": AUTH_CODE_EXPIRE_SECONDS,
                    },
                )
                # @formatter:on
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(
                    status_code=401, detail="Invalid or expired code/client_id pair"
                )
            cur.execute(
                cur.mogrify(
                    """
                    UPDATE public.scim_auth_codes
                    SET used= TRUE,
                        used_for_jwt= TRUE
                    WHERE auth_code = %(auth_code)s
                      AND tenant_id = %(tenant_id)s
                      AND used IS FALSE
                    """,
                    {"auth_code": code, "tenant_id": tenant["tenant_id"]},
                )
            )

    access_token, refresh_token, expires_in = create_tokens(
        tenant_id=tenant["tenant_id"]
    )
    response = {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": expires_in,
        "refresh_token": refresh_token,
    }
    return response


# note(jon): this might be specific to okta. if so, we should probably put specify that in the endpoint
@public_app.get("/authorize/")
@public_app.get("/authorize")
async def get_authorize(
        r: Request,
        response_type: str,
        client_id: str,
        redirect_uri: str,
        state: str | None = None,
):
    if response_type != "code":
        raise HTTPException(status_code=400, detail="Unsupported response_type")
    if not _is_allowed_redirect_uri(redirect_uri):
        logger.error(f"!!! Invalid redirect_uri: {redirect_uri}")
        raise HTTPException(status_code=400, detail="Invalid redirect_uri")
    with pg_client.PostgresClient() as cur:
        cur.execute(
            # @formatter:off
            cur.mogrify(
                """ \
                SELECT tenant_id
                FROM public.tenants
                WHERE tenant_key = %(tenant_key)s 
                LIMIT 1
                """,
                {"tenant_key": client_id},
            )
            # @formatter:on
        )
        tenant_id = cur.fetchone()
        if tenant_id is None:
            raise HTTPException(status_code=401, detail="Invalid SCIM-clientId")
        tenant_id = tenant_id["tenant_id"]

        cur.execute(
            # @formatter:off
            cur.mogrify(
                """ \
                WITH purge AS (
                    DELETE FROM public.scim_auth_codes
                    WHERE tenant_id = %(tenant_id)s
                      AND (used OR created_at <= (now() AT TIME ZONE 'utc') - %(expire_seconds)s * INTERVAL '1 second') )
                INSERT INTO public.scim_auth_codes (tenant_id)
                VALUES (%(tenant_id)s)
                RETURNING auth_code;
                """,
                {"tenant_id": tenant_id, "expire_seconds": AUTH_CODE_EXPIRE_SECONDS},
            )
            # @formatter:on
        )
        code = cur.fetchone()
    helpers.set_scim_available()
    params = {"code": code["auth_code"]}
    if state:
        params["state"] = state
    url = f"{redirect_uri}?{urlencode(params)}"
    return RedirectResponse(url)
