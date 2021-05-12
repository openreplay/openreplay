from chalicelib.utils import pg_client


def get_status(tenant_id=None):
    with pg_client.PostgresClient() as cur:
        cur.execute("SELECT * FROM public.tenants;")
        r = cur.fetchone()
    return {
        "hasActivePlan": True,
        "current": {
            "edition": r.get("edition", "").upper(),
            "versionNumber": r.get("version_number", ""),
            "license": "",
            "expirationDate": -1
        },
        "count": {
            "teamMember": r.get("t_users"),
            "projects": r.get("t_projects"),
            "capturedSessions": r.get("t_sessions")
        }
    }
