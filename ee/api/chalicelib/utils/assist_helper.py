import base64
import hashlib
import hmac
from time import time

from decouple import config

from chalicelib.core import assist
from chalicelib.utils import helper


def __get_secret():
    return config("assist_secret") if config("assist_secret", default=None) is not None \
                                      and len(config("assist_secret")) > 0 else None


def get_temporary_credentials():
    secret = __get_secret()
    if secret is None:
        return {"errors": ["secret not defined"]}
    user = helper.generate_salt()
    ttl = config("assist_ttl", cast=int, default=48) * 3600
    timestamp = int(time()) + ttl
    username = str(timestamp) + ':' + user
    dig = hmac.new(bytes(secret, 'utf-8'), bytes(username, 'utf-8'), hashlib.sha1)
    dig = dig.digest()
    credential = base64.b64encode(dig).decode()
    return {'username': username, 'credential': credential}


def get_full_config():
    servers = assist.get_ice_servers()
    if servers is None:
        return None
    servers = servers.split("|")
    credentials = get_temporary_credentials()
    if __get_secret() is not None:
        servers = [{"url": s.split(",")[0], **credentials} for s in servers]
    else:
        for i in range(len(servers)):
            s = servers[i].split("|")
            if len(s) == 3:
                servers[i] = {"url": s[0], "username": s[1], "credential": s[2]}
            else:
                servers[i] = {"url": s[0]}

    return servers
