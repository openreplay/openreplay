import schemas
from chalicelib.utils import pg_client, helper
from chalicelib.core import projects, sessions, sessions_metas
import requests
from decouple import config

from chalicelib.core import projects, sessions, sessions_metas
from chalicelib.utils import pg_client, helper

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


def get_live_sessions(project_id, filters=None):
    project_key = projects.get_project_key(project_id)
    connected_peers = requests.get(config("peers") % config("S3_KEY") + f"/{project_key}")
    if connected_peers.status_code != 200:
        print("!! issue with the peer-server")
        print(connected_peers.text)
        return []
    connected_peers = connected_peers.json().get("data", [])

    if len(connected_peers) == 0:
        return []
    connected_peers = tuple(connected_peers)
    extra_constraints = ["project_id = %(project_id)s", "session_id IN %(connected_peers)s"]
    extra_params = {}
    if filters is not None:
        for i, f in enumerate(filters):
            if not isinstance(f.get("value"), list):
                f["value"] = [f.get("value")]
            if len(f["value"]) == 0 or f["value"][0] is None:
                continue
            filter_type = f["type"].upper()
            f["value"] = sessions.__get_sql_value_multiple(f["value"])
            if filter_type == schemas.FilterType.user_id:
                op = sessions.__get_sql_operator(f["operator"])
                extra_constraints.append(f"user_id {op} %(value_{i})s")
                extra_params[f"value_{i}"] = helper.string_to_sql_like_with_op(f["value"][0], op)

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                    SELECT {SESSION_PROJECTION_COLS}, %(project_key)s||'-'|| session_id AS peer_id
                    FROM public.sessions AS s
                    WHERE {" AND ".join(extra_constraints)}
                    ORDER BY start_ts DESC
                    LIMIT 500;""",
                            {"project_id": project_id,
                             "connected_peers": connected_peers,
                             "project_key": project_key,
                             **extra_params})
        cur.execute(query)
        results = cur.fetchall()
    return helper.list_to_camel_case(results)


def is_live(project_id, session_id, project_key=None):
    if project_key is None:
        project_key = projects.get_project_key(project_id)
    connected_peers = requests.get(config("peers") % config("S3_KEY") + f"/{project_key}")
    if connected_peers.status_code != 200:
        print("!! issue with the peer-server")
        print(connected_peers.text)
        return False
    connected_peers = connected_peers.json().get("data", [])
    return str(session_id) in connected_peers


def get_ice_servers():
    return config("iceServers") if config("iceServers", default=None) is not None \
                                   and len(config("iceServers")) > 0 else None
