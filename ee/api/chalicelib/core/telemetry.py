from chalicelib.utils import pg_client
from chalicelib.core import license
import requests


def process_data(data):
    return {
        'edition': license.EDITION,
        'tracking': data["opt_out"],
        'version': data["version_number"],
        'user_id': data["tenant_key"],
        'tenant_key': data["tenant_key"],
        'owner_email': None if data["opt_out"] else data["email"],
        'organization_name': None if data["opt_out"] else data["name"],
        'users_count': data["t_users"],
        'projects_count': data["t_projects"],
        'sessions_count': data["t_sessions"],
        'integrations_count': data["t_integrations"]
    }


def new_client(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""SELECT *, openreplay_version() AS version_number,
                            (SELECT email FROM public.users WHERE tenant_id=%(tenant_id)s AND role='owner' LIMIT 1) AS email
                            FROM public.tenants 
                            WHERE tenant_id=%(tenant_id)s
                            LIMIT 1;""", {"tenant_id": tenant_id}))
        data = cur.fetchone()
        requests.post('https://api.openreplay.com/os/signup', json=process_data(data))
