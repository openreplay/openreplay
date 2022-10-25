from os import access, R_OK
from os.path import exists as path_exists

import jwt
import requests
from decouple import config
from starlette.exceptions import HTTPException

import schemas
from chalicelib.core import projects
from chalicelib.utils.TimeUTC import TimeUTC

ASSIST_KEY = config("ASSIST_KEY")
ASSIST_URL = config("ASSIST_URL") % ASSIST_KEY
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
        "filter": {"userId": user_id} if user_id else {}
    }
    return __get_live_sessions_ws(project_id=project_id, data=data)


def get_live_sessions_ws(project_id, body: schemas.LiveSessionsSearchPayloadSchema):
    data = {
        "filter": {},
        "pagination": {"limit": body.limit, "page": body.page},
        "sort": {"key": body.sort, "order": body.order}
    }
    for f in body.filters:
        if f.type == schemas.LiveFilterType.metadata:
            data["filter"][f.source] = {"values": f.value, "operator": f.operator}

        else:
            data["filter"][f.type.value] = {"values": f.value, "operator": f.operator}
    return __get_live_sessions_ws(project_id=project_id, data=data)


def __get_live_sessions_ws(project_id, data):
    project_key = projects.get_project_key(project_id)
    try:
        results = requests.post(ASSIST_URL + config("assist") + f"/{project_key}",
                                json=data, timeout=config("assistTimeout", cast=int, default=5))
        if results.status_code != 200:
            print(f"!! issue with the peer-server code:{results.status_code}")
            print(results.text)
            return {"total": 0, "sessions": []}
        live_peers = results.json().get("data", [])
    except requests.exceptions.Timeout:
        print("!! Timeout getting Assist response")
        live_peers = {"total": 0, "sessions": []}
    except Exception as e:
        print("!! Issue getting Live-Assist response")
        print(str(e))
        print("expected JSON, received:")
        try:
            print(results.text)
        except:
            print("couldn't get response")
        live_peers = {"total": 0, "sessions": []}
    _live_peers = live_peers
    if "sessions" in live_peers:
        _live_peers = live_peers["sessions"]
    for s in _live_peers:
        s["live"] = True
        s["projectId"] = project_id
    return live_peers


def __get_agent_token(project_id, project_key, session_id):
    iat = TimeUTC.now()
    return jwt.encode(
        payload={
            "projectKey": project_key,
            "projectId": project_id,
            "sessionId": session_id,
            "iat": iat // 1000,
            "exp": iat // 1000 + config("ASSIST_JWT_EXPIRATION", cast=int) + TimeUTC.get_utc_offset() // 1000,
            "iss": config("JWT_ISSUER"),
            "aud": f"openreplay:agent"
        },
        key=config("ASSIST_JWT_SECRET"),
        algorithm=config("jwt_algorithm")
    )


def get_live_session_by_id(project_id, session_id):
    project_key = projects.get_project_key(project_id)
    try:
        results = requests.get(ASSIST_URL + config("assist") + f"/{project_key}/{session_id}",
                               timeout=config("assistTimeout", cast=int, default=5))
        if results.status_code != 200:
            print(f"!! issue with the peer-server code:{results.status_code}")
            print(results.text)
            return None
        results = results.json().get("data")
        if results is None:
            return None
        results["live"] = True
        results["agentToken"] = __get_agent_token(project_id=project_id, project_key=project_key, session_id=session_id)
    except requests.exceptions.Timeout:
        print("!! Timeout getting Assist response")
        return None
    except Exception as e:
        print("!! Issue getting Assist response")
        print(str(e))
        print("expected JSON, received:")
        try:
            print(results.text)
        except:
            print("couldn't get response")
        return None
    return results


def is_live(project_id, session_id, project_key=None):
    if project_key is None:
        project_key = projects.get_project_key(project_id)
    try:
        results = requests.get(ASSIST_URL + config("assistList") + f"/{project_key}/{session_id}",
                               timeout=config("assistTimeout", cast=int, default=5))
        if results.status_code != 200:
            print(f"!! issue with the peer-server code:{results.status_code}")
            print(results.text)
            return False
        results = results.json().get("data")
    except requests.exceptions.Timeout:
        print("!! Timeout getting Assist response")
        return False
    except Exception as e:
        print("!! Issue getting Assist response")
        print(str(e))
        print("expected JSON, received:")
        try:
            print(results.text)
        except:
            print("couldn't get response")
        return False
    return str(session_id) == results


def autocomplete(project_id, q: str, key: str = None):
    project_key = projects.get_project_key(project_id)
    params = {"q": q}
    if key:
        params["key"] = key
    try:
        results = requests.get(
            ASSIST_URL + config("assistList") + f"/{project_key}/autocomplete",
            params=params, timeout=config("assistTimeout", cast=int, default=5))
        if results.status_code != 200:
            print(f"!! issue with the peer-server code:{results.status_code}")
            print(results.text)
            return {"errors": [f"Something went wrong wile calling assist:{results.text}"]}
        results = results.json().get("data", [])
    except requests.exceptions.Timeout:
        print("!! Timeout getting Assist response")
        return {"errors": ["Assist request timeout"]}
    except Exception as e:
        print("!! Issue getting Assist response")
        print(str(e))
        print("expected JSON, received:")
        try:
            print(results.text)
        except:
            print("couldn't get response")
        return {"errors": ["Something went wrong wile calling assist"]}
    return {"data": results}


def get_ice_servers():
    return config("iceServers") if config("iceServers", default=None) is not None \
                                   and len(config("iceServers")) > 0 else None


def __get_efs_path():
    efs_path = config("FS_DIR")
    if not path_exists(efs_path):
        raise HTTPException(400, f"EFS not found in path: {efs_path}")

    if not access(efs_path, R_OK):
        raise HTTPException(400, f"EFS found under: {efs_path}; but it is not readable, please check permissions")
    return efs_path


def __get_mob_path(project_id, session_id):
    params = {"projectId": project_id, "sessionId": session_id}
    return config("EFS_SESSION_MOB_PATTERN", default="%(sessionId)s") % params


def get_raw_mob_by_id(project_id, session_id):
    efs_path = __get_efs_path()
    path_to_file = efs_path + "/" + __get_mob_path(project_id=project_id, session_id=session_id)
    if path_exists(path_to_file):
        if not access(path_to_file, R_OK):
            raise HTTPException(400, f"Replay file found under: {efs_path};"
                                     f" but it is not readable, please check permissions")

        return path_to_file

    return None


def __get_devtools_path(project_id, session_id):
    params = {"projectId": project_id, "sessionId": session_id}
    return config("EFS_DEVTOOLS_MOB_PATTERN", default="%(sessionId)s") % params


def get_raw_devtools_by_id(project_id, session_id):
    efs_path = __get_efs_path()
    path_to_file = efs_path + "/" + __get_devtools_path(project_id=project_id, session_id=session_id)
    if path_exists(path_to_file):
        if not access(path_to_file, R_OK):
            raise HTTPException(400, f"Devtools file found under: {efs_path};"
                                     f" but it is not readable, please check permissions")

        return path_to_file

    return None


def session_exists(project_id, session_id):
    project_key = projects.get_project_key(project_id)
    try:
        results = requests.get(ASSIST_URL + config("assist") + f"/{project_key}/{session_id}",
                               timeout=config("assistTimeout", cast=int, default=5))
        if results.status_code != 200:
            print(f"!! issue with the peer-server code:{results.status_code}")
            print(results.text)
            return None
        results = results.json().get("data")
        if results is None:
            return False
        return True
    except requests.exceptions.Timeout:
        print("!! Timeout getting Assist response")
        return False
    except Exception as e:
        print("!! Issue getting Assist response")
        print(str(e))
        print("expected JSON, received:")
        try:
            print(results.text)
        except:
            print("couldn't get response")
        return False
