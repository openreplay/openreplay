import base64
import hashlib
import hmac
from time import time

from chalicelib.utils import helper
from chalicelib.utils.helper import environ


def get_temporary_credentials():
    user = helper.generate_salt()
    secret = environ["assist_secret"]
    ttl = int(environ.get("assist_ttl", 48)) * 3600
    timestamp = int(time()) + ttl
    username = str(timestamp) + ':' + user
    dig = hmac.new(bytes(secret, 'utf-8'), bytes(username, 'utf-8'), hashlib.sha1)
    dig = dig.digest()
    password = base64.b64encode(dig).decode()
    return user, password
