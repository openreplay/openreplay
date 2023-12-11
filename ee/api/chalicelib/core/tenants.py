from chalicelib.core import license
from chalicelib.utils import helper
from chalicelib.utils import pg_client


def get_by_tenant_key(tenant_key):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT tenants.tenant_id,
                                       tenants.name,
                                       tenants.api_key,
                                       tenants.created_at,
                                        '{license.EDITION}' AS edition,
                                        openreplay_version() AS version_number,
                                        tenants.opt_out,
                                        tenants.tenant_key
                                FROM public.tenants
                                WHERE tenants.tenant_key = %(tenant_key)s 
                                    AND tenants.deleted_at ISNULL
                                LIMIT 1;""",
                            {"tenant_key": tenant_key})
        cur.execute(query=query)
        return helper.dict_to_camel_case(cur.fetchone())


def get_by_tenant_id(tenant_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT tenants.tenant_id,
                                       tenants.name,
                                       tenants.api_key,
                                       tenants.created_at,
                                        '{license.EDITION}' AS edition,
                                        openreplay_version() AS version_number,
                                        tenants.opt_out,
                                        tenants.tenant_key
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


def generate_new_api_key(tenant_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.tenants
                                SET api_key=generate_api_key(20)
                                WHERE tenant_id= %(tenant_id)s 
                                    AND deleted_at ISNULL
                                RETURNING api_key;""",
                            {"tenant_id": tenant_id})
        cur.execute(query=query)
        return helper.dict_to_camel_case(cur.fetchone())


def edit_tenant(tenant_id, changes):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.tenants 
                                SET {", ".join([f"{helper.key_to_snake_case(k)} = %({k})s" for k in changes.keys()])}
                                WHERE tenant_id= %(tenant_id)s AND deleted_at ISNULL
                                RETURNING name, opt_out;""",
                            {"tenant_id": tenant_id, **changes})
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
        async with cnx.transaction() as txn:
            row = await cnx.execute("SELECT EXISTS(SELECT 1 FROM public.tenants)")
            row = await row.fetchone()
            return row["exists"]
