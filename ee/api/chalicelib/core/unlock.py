import logging
import uuid
from os import environ

import requests
from decouple import config

from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC

logger = logging.getLogger(__name__)


def __get_mid():
    return str(uuid.UUID(int=uuid.getnode()))


def get_license():
    return config("LICENSE_KEY", default="")


def check():
    license = get_license()
    if license is None or len(license) == 0:
        logger.warning("!! license key not found, please provide a LICENSE_KEY env var")
        environ["expiration"] = "-1"
        environ["numberOfSeats"] = "0"
        return
    logger.info(f"validating: {helper.obfuscate(license)}")
    r = requests.post('https://api.openreplay.com/license/validate',
                      json={"mid": __get_mid(), "license": get_license()})
    if r.status_code != 200 or "errors" in r.json() or not r.json()["data"].get("valid"):
        logger.warning("license validation failed")
        logger.warning(r.text)
        environ["expiration"] = "-1"
    else:
        environ["expiration"] = str(r.json()["data"].get("expiration"))
    environ["lastCheck"] = str(TimeUTC.now())
    if r.json()["data"].get("numberOfSeats") is not None:
        environ["numberOfSeats"] = str(r.json()["data"]["numberOfSeats"])


def get_expiration_date():
    return config("expiration", default=0, cast=int)


def is_valid():
    if config("lastCheck", default=None) is None or (get_expiration_date() - TimeUTC.now()) <= 0:
        check()
    return get_expiration_date() - TimeUTC.now() > 0
