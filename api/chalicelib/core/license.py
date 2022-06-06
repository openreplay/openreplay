from chalicelib.utils import pg_client


def get_status(tenant_id=None):
    with pg_client.PostgresClient() as cur:
        # cur.execute("SELECT * FROM public.tenants;")
        cur.execute("SELECT edition FROM public.tenants;")
        r = cur.fetchone()
    return {
        "hasActivePlan": True,
        "edition": r.get("edition", "").upper()
    }
