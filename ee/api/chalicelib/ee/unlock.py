from chalicelib.utils.helper import environ
from chalicelib.utils.TimeUTC import TimeUTC
import requests
import uuid


def __get_mid():
    return str(uuid.UUID(int=uuid.getnode()))


def __get_license():
    return


def check():
    r = requests.post('https://parrot.asayer.io/os/license', json={"mid": __get_mid(), "license": __get_license()})
    if r.status_code != 200 or "errors" in r.json() or not r.json()["data"].get("valid"):
        environ["expiration"] = "-1"
    else:
        environ["expiration"] = str(r.json()["data"].get("expiration"))
    environ["lastCheck"] = str(TimeUTC.now())


def get_expiration_date():
    return int(environ["expiration"])


def is_valid():
    return get_expiration_date() - TimeUTC.now() > 0
