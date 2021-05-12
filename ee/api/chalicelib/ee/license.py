from chalicelib.utils import pg_client
from chalicelib.ee import unlock


def get_status(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("SELECT * FROM public.tenants WHERE tenant_id=%(tenant_id)s;", {"tenant_id": tenant_id}))
        r = cur.fetchone()
    return {
        "hasActivePlan": unlock.is_valid(),
        "current": {
            "edition": r.get("edition", "").upper(),
            "versionNumber": r.get("version_number", ""),
            "license": r.get("license", "")[0:2] + "*" * (len(r.get("license", "")) - 4) + r.get("license", "")[-2:],
            "expirationDate": unlock.get_expiration_date()
        },
        "count": {
            "teamMember": r.get("t_users"),
            "projects": r.get("t_projects"),
            "capturedSessions": r.get("t_sessions")
        }
    }
