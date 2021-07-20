from chalicelib.utils import pg_client
from chalicelib.core import unlock


def get_status(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("SELECT * FROM public.tenants WHERE tenant_id=%(tenant_id)s;", {"tenant_id": tenant_id}))
        r = cur.fetchone()
    license = unlock.get_license()
    return {
        "hasActivePlan": unlock.is_valid(),
        "current": {
            "edition": r.get("edition", "").upper(),
            "versionNumber": r.get("version_number", ""),
            "license": license[0:2] + "*" * (len(license) - 4) + license[-2:],
            "expirationDate": unlock.get_expiration_date()
        },
        "count": {
            "teamMember": r.get("t_users"),
            "projects": r.get("t_projects"),
            "capturedSessions": r.get("t_sessions")
        }
    }
