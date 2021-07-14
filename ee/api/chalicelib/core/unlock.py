from chalicelib.utils.helper import environ
from chalicelib.utils.TimeUTC import TimeUTC
import requests
import uuid


def __get_mid():
    return str(uuid.UUID(int=uuid.getnode()))


def get_license():
    return environ.get("LICENSE_KEY", "")


def check():
    license=get_license()
    print(f"validating: {license}")
    r = requests.post('https://parrot.asayer.io/os/license', json={"mid": __get_mid(), "license": get_license()})
    if r.status_code != 200 or "errors" in r.json() or not r.json()["data"].get("valid"):
        print("license validation failed")
        print(r.text)
        environ["expiration"] = "-1"
    else:
        environ["expiration"] = str(r.json()["data"].get("expiration"))
    environ["lastCheck"] = str(TimeUTC.now())


def get_expiration_date():
    return int(environ.get("expiration", 0))


def is_valid():
    if environ.get("lastCheck") is None:
        check()
    return get_expiration_date() - TimeUTC.now() > 0
