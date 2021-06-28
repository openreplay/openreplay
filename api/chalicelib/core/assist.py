from chalicelib.utils import pg_client, helper
from chalicelib.core import projects
import requests
from chalicelib.utils.helper import environ

SESSION_PROJECTION_COLS = """s.project_id,
                           s.session_id::text AS session_id,
                           s.user_uuid,
                           s.user_id,
                           s.user_agent,
                           s.user_os,
                           s.user_browser,
                           s.user_device,
                           s.user_device_type,
                           s.user_country,
                           s.start_ts,
                           s.user_anonymous_id,
                           s.platform
                           """


def get_live_sessions(project_id):
    project_key = projects.get_project_key(project_id)
    connected_peers = requests.get(environ["peers"] + f"/{project_key}")
    if connected_peers.status_code != 200:
        print("!! issue with the peer-server")
        print(connected_peers.text)
        return []
    connected_peers = connected_peers.json().get("data", [])

    if len(connected_peers) == 0:
        return []
    connected_peers = tuple(connected_peers)
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                    SELECT {SESSION_PROJECTION_COLS}, %(project_key)s||'-'|| session_id AS peer_id
                    FROM public.sessions AS s
                    WHERE s.project_id = %(project_id)s 
                        AND session_id IN %(connected_peers)s;""",
                            {"project_id": project_id, "connected_peers": connected_peers, "project_key":project_key})
        cur.execute(query)
        results = cur.fetchall()
    return helper.list_to_camel_case(results)
