from chalicelib.core import license
from chalicelib.utils import helper
from chalicelib.utils import pg_client


async def get_by_tenant_id(tenant_id):
    async with pg_client.cursor() as cur:
        query = cur.mogrify(f"""SELECT tenants.tenant_id,
                                       tenants.name,
                                       tenants.api_key,
                                       tenants.created_at,
                                       '{license.EDITION}' AS edition,
                                       openreplay_version() AS version_number,
                                       tenants.opt_out
                                FROM public.tenants
                                LIMIT 1;""",
                            {"tenantId": tenant_id})
        await cur.execute(query=query)
        return helper.dict_to_camel_case(await cur.fetchone())


async def get_by_api_key(api_key):
    async with pg_client.cursor() as cur:
        query = cur.mogrify(f"""SELECT 1 AS tenant_id,
                                       tenants.name,
                                       tenants.created_at                       
                                FROM public.tenants
                                WHERE tenants.api_key = %(api_key)s
                                LIMIT 1;""",
                            {"api_key": api_key})
        await cur.execute(query=query)
        return helper.dict_to_camel_case(await cur.fetchone())


async def generate_new_api_key(tenant_id):
    async with pg_client.cursor() as cur:
        query = cur.mogrify(f"""UPDATE public.tenants
                                SET api_key=generate_api_key(20)
                                RETURNING api_key;""",
                            {"tenant_id": tenant_id})
        await cur.execute(query=query)
        return helper.dict_to_camel_case(await cur.fetchone())


async def edit_tenant(tenant_id, changes):
    async with pg_client.cursor() as cur:
        query = cur.mogrify(f"""UPDATE public.tenants 
                                SET {", ".join([f"{helper.key_to_snake_case(k)} = %({k})s" for k in changes.keys()])}  
                                RETURNING name, opt_out;""",
                            {"tenant_id": tenant_id, **changes})
        await cur.execute(query=query)
        return helper.dict_to_camel_case(await cur.fetchone())


async def tenants_exists_sync(use_pool=True):
    with pg_client.PostgresClient(use_pool=use_pool) as cur:
        await cur.execute("SELECT EXISTS(SELECT 1 FROM public.tenants)")
        out = await cur.fetchone()["exists"]
        return out


async def tenants_exists(use_pool=True):
    async with pg_client.cusor() as cur:
        await cur.execute("SELECT EXISTS(SELECT 1 FROM public.tenants)")
        row = await cur.fetchone()
        return row["exists"]
