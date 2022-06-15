import requests
from decouple import config

import schemas
from chalicelib.core import projects

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


def get_live_sessions_ws_user_id(project_id, user_id):
    data = {
        "filter": {"userId": user_id}
    }
    return __get_live_sessions_ws(project_id=project_id, data=data)


def get_live_sessions_ws(project_id, body: schemas.LiveSessionsSearchPayloadSchema):
    data = {
        "filter": {},
        "pagination": {"limit": body.limit, "page": body.page},
        "sort": {"key": body.sort, "order": body.order}
    }
    for f in body.filters:
        data["filter"][f.type] = f.value
    return __get_live_sessions_ws(project_id=project_id, data=data)


def __get_live_sessions_ws(project_id, data):
    project_key = projects.get_project_key(project_id)
    try:
        connected_peers = requests.post(config("assist") % config("S3_KEY") + f"/{project_key}", json=data,
                                        timeout=config("assistTimeout", cast=int, default=5))
        if connected_peers.status_code != 200:
            print("!! issue with the peer-server")
            print(connected_peers.text)
            return []
        live_peers = connected_peers.json().get("data", [])
    except requests.exceptions.Timeout:
        print("Timeout getting Assist response")
        live_peers = []
    except Exception as e:
        print("issue getting Live-Assist response")
        print(str(e))
        print("expected JSON, received:")
        try:
            print(connected_peers.text)
        except:
            print("couldn't get response")
        live_peers = []

    for s in live_peers:
        s["live"] = True
        s["projectId"] = project_id
    live_peers = sorted(live_peers, key=lambda l: l.get("timestamp", 0), reverse=True)
    return live_peers


def get_live_session_by_id(project_id, session_id):
    all_live = __get_live_sessions_ws(project_id, data={"filter": {"sessionId": session_id}})
    for l in all_live:
        if str(l.get("sessionID")) == str(session_id):
            return l
    return None


def is_live(project_id, session_id, project_key=None):
    if project_key is None:
        project_key = projects.get_project_key(project_id)
    try:
        connected_peers = requests.get(config("assistList") % config("S3_KEY") + f"/{project_key}/{session_id}",
                                       timeout=config("assistTimeout", cast=int, default=5))
        if connected_peers.status_code != 200:
            print("!! issue with the peer-server")
            print(connected_peers.text)
            return False
        connected_peers = connected_peers.json().get("data", [])
    except requests.exceptions.Timeout:
        print("Timeout getting Assist response")
        return False
    except Exception as e:
        print("issue getting Assist response")
        print(str(e))
        print("expected JSON, received:")
        try:
            print(connected_peers.text)
        except:
            print("couldn't get response")
        return False
    return str(session_id) in connected_peers


def get_ice_servers():
    return config("iceServers") if config("iceServers", default=None) is not None \
                                   and len(config("iceServers")) > 0 else None
