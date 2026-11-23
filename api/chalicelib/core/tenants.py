from chalicelib.utils import helper
from chalicelib.utils import pg_client


def get_by_api_key(api_key):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT 1 AS tenant_id,
                                       tenants.name,
                                       tenants.created_at                       
                                FROM public.tenants
                                WHERE tenants.api_key = %(api_key)s
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
