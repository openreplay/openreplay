from chalicelib.utils.helper import environ
from chalicelib.utils.TimeUTC import TimeUTC
import requests
import uuid


def __get_mid():
    return str(uuid.UUID(int=uuid.getnode()))


def __get_license():
    return


def check():
    r = requests.post('https://parrot.openreplay.com/os/license', json={"mid": __get_mid(), "license": __get_license()})
    if r.status_code != 200 or not r.json().get("valid"):
        environ["expiration"] = "-1"
    else:
        environ["expiration"] = r.json().get("expiration")
    environ["lastCheck"] = TimeUTC.now()


def is_valid():
    return int(environ["lastCheck"]) + int(environ["expiration"]) - TimeUTC.now() > 0
