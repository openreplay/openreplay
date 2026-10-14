import logging
import uuid
from os import environ

import requests
from decouple import config

from chalicelib.core import license_token
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.log import sanitize

logger = logging.getLogger(__name__)

LICENSE_SERVER_URL = "https://api.openreplay.com/license/validate"
LICENSE_SERVER_TIMEOUT = 10
RECHECK_INTERVAL_MS = 60 * 1000


def __get_mid():
    return str(uuid.UUID(int=uuid.getnode()))


def get_license():
    return config("LICENSE_KEY", default="")


def __set_state(expiration_ms: int, number_of_seats=None):
    environ["expiration"] = str(expiration_ms)
    if number_of_seats is not None:
        environ["numberOfSeats"] = str(number_of_seats)
    environ["lastCheck"] = str(TimeUTC.now())


def __check_offline(token: str):
    try:
        lic = license_token.verify(token)
    except license_token.LicenseTokenError as e:
        logger.warning(f"license validation failed: {e}")
        __set_state(-1, 0)
        return
    days_left = lic.days_left()
    if days_left < 0:
        logger.warning(f"license for {lic.customer} expired {-days_left} day(s) ago, "
                       f"grace period ends on {license_token._date(lic.hard_expires_at)}, please renew")
    elif days_left <= license_token.WARN_BEFORE_DAYS:
        logger.warning(f"license for {lic.customer} expires in {days_left} day(s), please renew")
    else:
        logger.info(f"license for {lic.customer} valid, {days_left} day(s) left")
    __set_state(lic.hard_expires_at * 1000, lic.seats)


def __check_remote(license: str):
    logger.info(f"validating: {helper.obfuscate(license)}")
    try:
        r = requests.post(LICENSE_SERVER_URL, json={"mid": __get_mid(), "license": license},
                          timeout=LICENSE_SERVER_TIMEOUT)
        body = r.json()
    except (requests.RequestException, ValueError) as e:
        logger.warning(f"license validation request failed: {e}")
        environ["lastCheck"] = str(TimeUTC.now())
        return
    data = body.get("data") if isinstance(body, dict) else None
    if r.status_code != 200 or not isinstance(data, dict) or "errors" in body or not data.get("valid"):
        logger.warning("license validation failed")
        logger.warning(sanitize(r.text))
        __set_state(-1, data.get("numberOfSeats") if isinstance(data, dict) else None)
    else:
        __set_state(data.get("expiration"), data.get("numberOfSeats"))


def check():
    license = get_license()
    if license is None or len(license) == 0:
        logger.warning("!! license key not found, please provide a LICENSE_KEY env var")
        __set_state(-1, 0)
        return
    if license_token.is_token(license):
        __check_offline(license)
    else:
        __check_remote(license)


def get_expiration_date():
    return config("expiration", default=0, cast=int)


def __last_check():
    return config("lastCheck", default=None, cast=lambda v: int(v) if v is not None else None)


def is_valid():
    last_check = __last_check()
    if last_check is None:
        check()
    elif get_expiration_date() - TimeUTC.now() <= 0 and TimeUTC.now() - last_check > RECHECK_INTERVAL_MS:
        check()
    return get_expiration_date() - TimeUTC.now() > 0
