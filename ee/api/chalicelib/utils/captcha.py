from chalicelib.utils.helper import environ as env
import requests
from chalicelib.utils import helper


def __get_captcha_config():
    return env["captcha_server"], env["captcha_key"]


def is_valid(response):
    if not helper.allow_captcha():
        print("!! Captcha is disabled")
        return True
    url, secret = __get_captcha_config()
    r = requests.post(url=url, data={"secret": secret, "response": response})
    if r.status_code != 200:
        print("something went wrong")
        print(r)
        print(r.status_code)
        print(r.text)
        return
    r = r.json()
    print(r)
    return r["success"]
