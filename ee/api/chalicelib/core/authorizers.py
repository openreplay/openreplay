from chalicelib.utils.helper import environ
import jwt
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC

from chalicelib.ee import tenants
from chalicelib.ee import users


def jwt_authorizer(token):
    token = token.split(" ")
    if len(token) != 2 or token[0].lower() != "bearer":
        return None
    try:
        payload = jwt.decode(
            token[1],
            environ["jwt_secret"],
            algorithms=environ["jwt_algorithm"],
            audience=[f"plugin:{helper.get_stage_name()}", f"front:{helper.get_stage_name()}"]
        )
    except jwt.ExpiredSignatureError:
        print("! JWT Expired signature")
        return None
    except BaseException as e:
        print("! JWT Base Exception")
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


def generate_jwt(id, tenant_id, iat, aud):
    token = jwt.encode(
        payload={
            "userId": id,
            "tenantId": tenant_id,
            "exp": iat // 1000 + int(environ["jwt_exp_delta_seconds"]) + TimeUTC.get_utc_offset() // 1000,
            "iss": environ["jwt_issuer"],
            "iat": iat // 1000,
            "aud": aud
        },
        key=environ["jwt_secret"],
        algorithm=environ["jwt_algorithm"]
    )
    return token.decode("utf-8")


def api_key_authorizer(token):
    t = tenants.get_by_api_key(token)
    if t is not None:
        t["createdAt"] = TimeUTC.datetime_to_timestamp(t["createdAt"])
    return t
