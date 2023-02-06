import requests
from decouple import config
from chalicelib.core import projects


def start_replay(project_id, session_id, device, os_version, mob_url):
    r = requests.post(config("IOS_MIDDLEWARE") + "/replay", json={
        "projectId": project_id,
        "projectKey": projects.get_project_key(project_id),
        "session_id": session_id,
        "device": device,
        "osVersion": os_version,
        "mobUrl": mob_url
    })
    if r.status_code != 200:
        print("failed replay middleware")
        print("status code: %s" % r.status_code)
        print(r.text)
        return r.text
    result = r.json()
    result["url"] = config("IOS_MIDDLEWARE")
    return result
