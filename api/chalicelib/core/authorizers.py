import logging

import jwt
from decouple import config
from typing import Optional
from chalicelib.core import tenants
from chalicelib.core import users, spot

from chalicelib.utils.TimeUTC import TimeUTC

logger = logging.getLogger(__name__)


def get_supported_audience():
    return [users.AUDIENCE, spot.AUDIENCE]


def jwt_authorizer(scheme: str, token: str, leeway=0) -> Optional[dict]:
    if scheme.lower() != "bearer":
        return None
    try:
        payload = jwt.decode(
            token,
            config("jwt_secret"),
            algorithms=config("jwt_algorithm"),
            audience=get_supported_audience(),
            leeway=leeway
        )
    except jwt.ExpiredSignatureError:
        logger.debug("! JWT Expired signature")
        return None
    except BaseException as e:
        logger.warning("! JWT Base Exception")
        logger.debug(e)
        return None
    return payload


def jwt_refresh_authorizer(scheme: str, token: str):
    if scheme.lower() != "bearer":
        return None
    try:
        payload = jwt.decode(
            token,
            config("JWT_REFRESH_SECRET"),
            algorithms=config("jwt_algorithm"),
            audience=get_supported_audience()
        )
    except jwt.ExpiredSignatureError:
        logger.debug("! JWT-refresh Expired signature")
        return None
    except BaseException as e:
        logger.warning("! JWT-refresh Base Exception")
        logger.debug(e)
        return None
    return payload


def generate_jwt(user_id, tenant_id, iat, aud):
    token = jwt.encode(
        payload={
            "userId": user_id,
            "tenantId": tenant_id,
            "exp": iat + config("JWT_EXPIRATION", cast=int),
            "iss": config("JWT_ISSUER"),
            "iat": iat,
            "aud": aud
        },
        key=config("jwt_secret"),
        algorithm=config("jwt_algorithm")
    )
    return token


def generate_jwt_refresh(user_id, tenant_id, iat, aud, jwt_jti):
    token = jwt.encode(
        payload={
            "userId": user_id,
            "tenantId": tenant_id,
            "exp": iat + config("JWT_REFRESH_EXPIRATION", cast=int),
            "iss": config("JWT_ISSUER"),
            "iat": iat,
            "aud": aud,
            "jti": jwt_jti
        },
        key=config("JWT_REFRESH_SECRET"),
        algorithm=config("jwt_algorithm")
    )
    return token


def api_key_authorizer(token):
    t = tenants.get_by_api_key(token)
    if t is not None:
        t["createdAt"] = TimeUTC.datetime_to_timestamp(t["createdAt"])
    return t
