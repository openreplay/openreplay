from decouple import config

from chalicelib.core import unlock
from chalicelib.utils import pg_client


def get_status(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            # cur.mogrify("SELECT * FROM public.tenants WHERE tenant_id=%(tenant_id)s;", {"tenant_id": tenant_id}))
            cur.mogrify("SELECT edition FROM public.tenants WHERE tenant_id=%(tenant_id)s;", {"tenant_id": tenant_id}))
        r = cur.fetchone()
    license = unlock.get_license()
    return {
        "hasActivePlan": unlock.is_valid(),
        "edition": r.get("edition", "").lower(),
    }
