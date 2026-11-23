from chalicelib.utils import pg_client
import requests
from chalicelib.core import license


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


def new_client():
    with pg_client.PostgresClient() as cur:
        cur.execute(
            f"""SELECT *, openreplay_version() AS version_number,
                (SELECT email FROM public.users WHERE role='owner' LIMIT 1) AS email
                FROM public.tenants
                LIMIT 1;""")
        data = cur.fetchone()
        requests.post('https://api.openreplay.com/os/signup', json=process_data(data))
