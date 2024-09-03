from cachetools import cached, TTLCache

from chalicelib.utils import pg_client

cache = TTLCache(maxsize=1000, ttl=60)


@cached(cache)
def get_scope(tenant_id) -> int:
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT scope_state
                                FROM public.tenants
                                WHERE tenant_id=%(tenant_id)s;""",
                            {"tenant_id": tenant_id})
        cur.execute(query)
        return cur.fetchone()["scope_state"]


def update_scope(tenant_id, scope: int):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.tenants
                                SET scope_state = %(scope_state)s
                                WHERE tenant_id=%(tenant_id)s;""",
                            {"scope_state": scope, "tenant_id": tenant_id})
        cur.execute(query)
    if tenant_id in cache:
        cache.pop(tenant_id)
    return scope
