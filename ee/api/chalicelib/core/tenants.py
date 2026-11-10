from cachetools import TTLCache, cached
from decouple import config

from chalicelib.core import license
from chalicelib.utils import helper
from chalicelib.utils import pg_client

cache = TTLCache(maxsize=1000, ttl=config("TENANTS_CACHE_TTL_S", cast=int, default=60))


@cached(cache)
def get_by_tenant_id(tenant_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT tenants.tenant_id,
                                       tenants.name,
                                       tenants.api_key,
                                       tenants.created_at,
                                        '{license.EDITION}' AS edition,
                                        openreplay_version() AS version_number,
                                        tenants.opt_out,
                                        tenants.tenant_key,
                                        scope_state
                                FROM public.tenants
                                WHERE tenants.tenant_id = %(tenantId)s 
                                    AND tenants.deleted_at ISNULL
                                LIMIT 1;""",
                            {"tenantId": tenant_id})
        cur.execute(query=query)
        return helper.dict_to_camel_case(cur.fetchone())


def get_by_api_key(api_key):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT tenants.tenant_id,
                                       tenants.name,
                                       tenants.created_at                        
                                FROM public.tenants
                                WHERE tenants.api_key = %(api_key)s 
                                    AND tenants.deleted_at ISNULL
                                LIMIT 1;""",
                            {"api_key": api_key})
        cur.execute(query=query)
        return helper.dict_to_camel_case(cur.fetchone())


def tenants_exists_sync(use_pool=True):
    with pg_client.PostgresClient(use_pool=use_pool) as cur:
        cur.execute("SELECT EXISTS(SELECT 1 FROM public.tenants)")
        out = cur.fetchone()["exists"]
        return out


async def tenants_exists(use_pool=True):
    from app import app
    async with app.state.postgresql.connection() as cnx:
        async with cnx.cursor() as txn:
            row = await cnx.execute("SELECT EXISTS(SELECT 1 FROM public.tenants)")
            row = await row.fetchone()
            return row["exists"]
