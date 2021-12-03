from chalicelib.utils.helper import environ
from chalicelib.utils.TimeUTC import TimeUTC
import requests
import uuid


def __get_mid():
    return str(uuid.UUID(int=uuid.getnode()))


def get_license():
    return environ.get("LICENSE_KEY", "")


def check():
    license = get_license()
    if license is None or len(license) == 0:
        print("!! license key not found, please provide a LICENSE_KEY env var")
        environ["expiration"] = "-1"
        environ["numberOfSeats"] = "0"
        return
    print(f"validating: {license}")
    r = requests.post('https://api.openreplay.com/os/license', json={"mid": __get_mid(), "license": get_license()})
    if r.status_code != 200 or "errors" in r.json() or not r.json()["data"].get("valid"):
        print("license validation failed")
        print(r.text)
        environ["expiration"] = "-1"
    else:
        environ["expiration"] = str(r.json()["data"].get("expiration"))
    environ["lastCheck"] = str(TimeUTC.now())
    if r.json()["data"].get("numberOfSeats") is not None:
        environ["numberOfSeats"] = str(r.json()["data"]["numberOfSeats"])


def get_expiration_date():
    return int(environ.get("expiration", 0))


def is_valid():
    if environ.get("lastCheck") is None:
        check()
    return get_expiration_date() - TimeUTC.now() > 0
