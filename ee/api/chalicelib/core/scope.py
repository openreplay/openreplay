from cachetools import cached, TTLCache

import schemas
from chalicelib.utils import helper
from chalicelib.utils import pg_client

cache = TTLCache(maxsize=1, ttl=24 * 60 * 60)


@cached(cache)
def get_scope(tenant_id) -> schemas.ScopeType:
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT scope 
                                FROM public.tenants
                                WHERE tenant_id=%(tenant_id)s;""",
                            {"tenant_id": tenant_id})
        cur.execute(query)
        return helper.dict_to_camel_case(cur.fetchone())["scope"]


def update_scope(tenant_id, scope: schemas.ScopeType):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.tenants
                                SET scope = %(scope)s
                                WHERE tenant_id=%(tenant_id)s;""",
                            {"scope": scope, "tenant_id": tenant_id})
        cur.execute(query)
        if tenant_id in cache:
            cache.pop(tenant_id)
    return scope
