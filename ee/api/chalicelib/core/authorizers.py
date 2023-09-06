import jwt
from decouple import config

from chalicelib.core import tenants
from chalicelib.core import users
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC


def jwt_authorizer(scheme: str, token: str):
    if scheme.lower() != "bearer":
        return None
    try:
        payload = jwt.decode(
            token,
            config("jwt_secret"),
            algorithms=config("jwt_algorithm"),
            audience=[f"front:{helper.get_stage_name()}"]
        )
    except jwt.ExpiredSignatureError:
        print("! JWT Expired signature")
        return None
    except BaseException as e:
        print("! JWT Base Exception")
        print(e)
        return None
    return payload


def jwt_context(context):
    user = users.get(user_id=context["userId"], tenant_id=context["tenantId"])
    if user is None:
        return None
    return {
        "tenantId": context["tenantId"],
        "userId": context["userId"],
        **user
    }


def get_jwt_exp(iat):
    return iat // 1000 + config("JWT_EXPIRATION", cast=int) + TimeUTC.get_utc_offset() // 1000


def generate_jwt(id, tenant_id, iat, aud, exp=None):
    token = jwt.encode(
        payload={
            "userId": id,
            "tenantId": tenant_id,
            "exp": exp + TimeUTC.get_utc_offset() // 1000 if exp is not None else get_jwt_exp(iat),
            "iss": config("JWT_ISSUER"),
            "iat": iat // 1000,
            "aud": aud
        },
        key=config("jwt_secret"),
        algorithm=config("jwt_algorithm")
    )
    return token


def api_key_authorizer(token):
    t = tenants.get_by_api_key(token)
    if t is not None:
        t["createdAt"] = TimeUTC.datetime_to_timestamp(t["createdAt"])
    return t
