import logging

import requests
from decouple import config

from chalicelib.utils import helper

logger = logging.getLogger(__name__)


def __get_captcha_config():
    return config("captcha_server"), config("captcha_key")


def is_valid(response):
    if not helper.allow_captcha():
        logger.info("!! Captcha is disabled")
        return True
    url, secret = __get_captcha_config()
    r = requests.post(url=url, data={"secret": secret, "response": response})
    if r.status_code != 200:
        logger.warning("something went wrong")
        logger.error(r)
        logger.warning(r.status_code)
        logger.warning(r.text)
        return
    r = r.json()
    logger.debug(r)
    return r["success"]
