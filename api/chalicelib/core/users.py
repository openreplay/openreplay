import json
import secrets
from typing import Optional

from decouple import config
from pydantic import BaseModel, model_validator

import schemas
from chalicelib.core import authorizers
from chalicelib.core import spot
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from cachetools import TTLCache, cached

AUDIENCE = "front:OpenReplay"


def __generate_invitation_token():
    return secrets.token_urlsafe(64)


def generate_new_invitation(user_id):
    invitation_token = __generate_invitation_token()
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(""" \
                            UPDATE public.basic_authentication
                            SET invitation_token     = %(invitation_token)s,
                                invited_at           = timezone('utc'::text, now()),
                                change_pwd_expire_at = NULL,
                                change_pwd_token     = NULL
                            WHERE user_id = %(user_id)s RETURNING invitation_token;""",
                            {"user_id": user_id, "invitation_token": invitation_token})
        cur.execute(
            query
        )
        return __get_invitation_link(cur.fetchone().pop("invitation_token"))


def update(tenant_id, user_id, changes, output=True):
    AUTH_KEYS = ["password", "invitationToken", "invitedAt", "changePwdExpireAt", "changePwdToken"]
    if len(changes.keys()) == 0:
        return None

    sub_query_users = []
    sub_query_bauth = []
    for key in changes.keys():
        if key in AUTH_KEYS:
            if key == "password":
                sub_query_bauth.append("password = crypt(%(password)s, gen_salt('bf', 12))")
                sub_query_bauth.append("changed_at = timezone('utc'::text, now())")
            else:
                sub_query_bauth.append(f"{helper.key_to_snake_case(key)} = %({key})s")
        else:
            sub_query_users.append(f"{helper.key_to_snake_case(key)} = %({key})s")

    with pg_client.PostgresClient() as cur:
        if len(sub_query_users) > 0:
            query = cur.mogrify(f"""\
                            UPDATE public.users
                            SET {" ,".join(sub_query_users)}
                            WHERE users.user_id = %(user_id)s;""",
                                {"user_id": user_id, **changes})
            cur.execute(query)
        if len(sub_query_bauth) > 0:
            query = cur.mogrify(f"""\
                            UPDATE public.basic_authentication
                            SET {" ,".join(sub_query_bauth)}
                            WHERE basic_authentication.user_id = %(user_id)s;""",
                                {"user_id": user_id, **changes})
            cur.execute(query)
    if not output:
        return None
    return get_user(user_id=user_id, tenant_id=tenant_id)


def __get_invitation_link(invitation_token):
    return config("SITE_URL") + config("invitation_link") % invitation_token


def allow_password_change(user_id, delta_min=10):
    pass_token = secrets.token_urlsafe(8)
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.basic_authentication 
                                SET change_pwd_expire_at =  timezone('utc'::text, now()+INTERVAL '%(delta)s MINUTES'),
                                    change_pwd_token = %(pass_token)s
                                WHERE user_id = %(user_id)s""",
                            {"user_id": user_id, "delta": delta_min, "pass_token": pass_token})
        cur.execute(
            query
        )
    return pass_token


cache = TTLCache(maxsize=5000, ttl=config("USERS_CACHE_TTL_S", cast=int, default=60))


@cached(cache)
def get_user(user_id, tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                        users.user_id,
                        email, 
                        role, 
                        users.name,
                        (CASE WHEN role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN role = 'member' THEN TRUE ELSE FALSE END) AS member,
                        TRUE AS has_password,
                        settings
                    FROM public.users  
                    WHERE users.user_id = %(userId)s
                     AND deleted_at IS NULL
                    LIMIT 1;""",
                {"userId": user_id})
        )
        r = cur.fetchone()
        result = helper.dict_to_camel_case(r)
        if result and isinstance(result, dict):
            if result.get("settings") is None or not isinstance(result.get("settings"), dict):
                result["settings"] = {}
            if not result["settings"].get("modules"):
                result["settings"]["modules"] = []
        return result


def generate_new_api_key(user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""UPDATE public.users
                    SET api_key=generate_api_key(20)
                    WHERE users.user_id = %(userId)s
                            AND deleted_at IS NULL
                    RETURNING api_key;""",
                {"userId": user_id})
        )
        r = cur.fetchone()
    return helper.dict_to_camel_case(r)


def __get_account_info(tenant_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT users.name, 
                           tenants.name AS tenant_name, 
                           tenants.opt_out
                    FROM public.users INNER JOIN public.tenants ON(TRUE)
                    WHERE users.user_id = %(userId)s
                        AND users.deleted_at IS NULL;""",
                {"tenantId": tenant_id, "userId": user_id})
        )
        r = cur.fetchone()
    return helper.dict_to_camel_case(r)


def get_by_email_only(email):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                        users.user_id,
                        1 AS tenant_id,
                        users.email, 
                        users.role, 
                        users.name,
                        (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member,
                        TRUE AS has_password
                    FROM public.users LEFT JOIN public.basic_authentication ON users.user_id=basic_authentication.user_id
                    WHERE users.email = %(email)s                     
                     AND users.deleted_at IS NULL
                    LIMIT 1;""",
                {"email": email})
        )
        r = cur.fetchone()
    return helper.dict_to_camel_case(r)


def get_member(tenant_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                        users.user_id,
                        users.email, 
                        users.role, 
                        users.name, 
                        users.created_at,
                        (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member,
                        DATE_PART('day',timezone('utc'::text, now()) \
                            - COALESCE(basic_authentication.invited_at,'2000-01-01'::timestamp ))>=1 AS expired_invitation,
                        basic_authentication.password IS NOT NULL AS joined,
                        invitation_token
                    FROM public.users LEFT JOIN public.basic_authentication ON users.user_id=basic_authentication.user_id 
                    WHERE users.deleted_at IS NULL AND users.user_id=%(user_id)s
                    ORDER BY name, user_id""",
                {"user_id": user_id})
        )
        u = helper.dict_to_camel_case(cur.fetchone())
        if u:
            u["createdAt"] = TimeUTC.datetime_to_timestamp(u["createdAt"])
            invitation_token = u.pop("invitationToken")
            if invitation_token and not u["joined"]:
                u["invitationLink"] = __get_invitation_link(invitation_token)
            else:
                u["invitationLink"] = None

    return u


def get_members(tenant_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            f"""SELECT 
                        users.user_id,
                        users.email, 
                        users.role, 
                        users.name, 
                        users.created_at,
                        (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member,
                        DATE_PART('day',timezone('utc'::text, now()) \
                            - COALESCE(basic_authentication.invited_at,'2000-01-01'::timestamp ))>=1 AS expired_invitation,
                        basic_authentication.password IS NOT NULL AS joined,
                        invitation_token
                    FROM public.users LEFT JOIN public.basic_authentication ON users.user_id=basic_authentication.user_id 
                    WHERE users.deleted_at IS NULL
                    ORDER BY name, user_id"""
        )
        r = cur.fetchall()
        if len(r):
            r = helper.list_to_camel_case(r)
            for u in r:
                u["createdAt"] = TimeUTC.datetime_to_timestamp(u["createdAt"])
                invitation_token = u.pop("invitationToken")
                if invitation_token and not u["joined"]:
                    u["invitationLink"] = __get_invitation_link(invitation_token)
                else:
                    u["invitationLink"] = None
            return r

    return []


def change_password(tenant_id, user_id, email, old_password, new_password):
    item = get_user(tenant_id=tenant_id, user_id=user_id)
    if item is None:
        return {"errors": ["access denied"]}
    if old_password == new_password:
        return {"errors": ["old and new password are the same"]}
    auth = authenticate(email, old_password, for_change_password=True)
    if auth is None:
        return {"errors": ["wrong password"]}
    changes = {"password": new_password}
    user = update(tenant_id=tenant_id, user_id=user_id, changes=changes)
    r = authenticate(user['email'], new_password)

    return {
        "jwt": r.pop("jwt"),
        "refreshToken": r.pop("refreshToken"),
        "refreshTokenMaxAge": r.pop("refreshTokenMaxAge"),
        "spotJwt": r.pop("spotJwt"),
        "spotRefreshToken": r.pop("spotRefreshToken"),
        "spotRefreshTokenMaxAge": r.pop("spotRefreshTokenMaxAge")
    }


def set_password_invitation(user_id, new_password):
    changes = {"password": new_password}
    user = update(tenant_id=-1, user_id=user_id, changes=changes)
    r = authenticate(user['email'], new_password)

    return {
        "jwt": r.pop("jwt"),
        "refreshToken": r.pop("refreshToken"),
        "refreshTokenMaxAge": r.pop("refreshTokenMaxAge"),
        "spotJwt": r.pop("spotJwt"),
        "spotRefreshToken": r.pop("spotRefreshToken"),
        "spotRefreshTokenMaxAge": r.pop("spotRefreshTokenMaxAge"),
        **r
    }


def email_exists(email):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                        count(user_id)                        
                    FROM public.users
                    WHERE
                     email = %(email)s
                     AND deleted_at IS NULL
                    LIMIT 1;""",
                {"email": email})
        )
        r = cur.fetchone()
    return r["count"] > 0


def get_deleted_user_by_email(email):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                        *                        
                    FROM public.users
                    WHERE
                     email = %(email)s
                     AND deleted_at NOTNULL
                    LIMIT 1;""",
                {"email": email})
        )
        r = cur.fetchone()
    return helper.dict_to_camel_case(r)


def get_by_invitation_token(token, pass_token=None):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                        *,
                        DATE_PART('day',timezone('utc'::text, now()) \
                            - COALESCE(basic_authentication.invited_at,'2000-01-01'::timestamp ))>=1 AS expired_invitation,
                        change_pwd_expire_at <= timezone('utc'::text, now()) AS expired_change,
                        (EXTRACT(EPOCH FROM current_timestamp-basic_authentication.change_pwd_expire_at))::BIGINT AS change_pwd_age
                    FROM public.users INNER JOIN public.basic_authentication USING(user_id)
                    WHERE invitation_token = %(token)s {"AND change_pwd_token = %(pass_token)s" if pass_token else ""}
                    LIMIT 1;""",
                {"token": token, "pass_token": pass_token})
        )
        r = cur.fetchone()
    return helper.dict_to_camel_case(r)


def auth_exists(user_id, jwt_iat, skip_iat: bool = False) -> bool:
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""SELECT user_id, EXTRACT(epoch FROM jwt_iat)::BIGINT AS jwt_iat 
                            FROM public.users  
                            WHERE user_id = %(userId)s 
                                AND deleted_at IS NULL
                            LIMIT 1;""",
                        {"userId": user_id})
        )
        r = cur.fetchone()
    return r is not None \
        and (skip_iat or \
             r.get("jwt_iat") is not None \
             and abs(jwt_iat - r["jwt_iat"]) <= 1)


def refresh_auth_exists(user_id, jwt_jti=None):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""SELECT user_id 
                            FROM public.users  
                            WHERE user_id = %(userId)s 
                                AND deleted_at IS NULL
                                AND jwt_refresh_jti = %(jwt_jti)s
                            LIMIT 1;""",
                        {"userId": user_id, "jwt_jti": jwt_jti})
        )
        r = cur.fetchone()
    return r is not None


class FullLoginJWTs(BaseModel):
    jwt_iat: int
    jwt_refresh_jti: str
    jwt_refresh_iat: int
    spot_jwt_iat: int
    spot_jwt_refresh_jti: str
    spot_jwt_refresh_iat: int

    @model_validator(mode="before")
    @classmethod
    def _transform_data(cls, values):
        if values.get("jwt_refresh_jti") is not None:
            values["jwt_refresh_jti"] = str(values["jwt_refresh_jti"])
        if values.get("spot_jwt_refresh_jti") is not None:
            values["spot_jwt_refresh_jti"] = str(values["spot_jwt_refresh_jti"])
        return values


class RefreshLoginJWTs(FullLoginJWTs):
    spot_jwt_iat: Optional[int] = None
    spot_jwt_refresh_jti: Optional[str] = None
    spot_jwt_refresh_iat: Optional[int] = None


class RefreshSpotJWTs(FullLoginJWTs):
    jwt_iat: Optional[int] = None
    jwt_refresh_jti: Optional[str] = None
    jwt_refresh_iat: Optional[int] = None


def change_jwt_iat_jti(user_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.users
                                SET jwt_iat = timezone('utc'::text, now()-INTERVAL '10s'),
                                    jwt_refresh_jti = 0, 
                                    jwt_refresh_iat = timezone('utc'::text, now()-INTERVAL '10s'),
                                    spot_jwt_iat = timezone('utc'::text, now()-INTERVAL '10s'),
                                    spot_jwt_refresh_jti = 0, 
                                    spot_jwt_refresh_iat = timezone('utc'::text, now()-INTERVAL '10s')
                                WHERE user_id = %(user_id)s 
                                RETURNING EXTRACT (epoch FROM jwt_iat)::BIGINT AS jwt_iat, 
                                          jwt_refresh_jti, 
                                          EXTRACT (epoch FROM jwt_refresh_iat)::BIGINT AS jwt_refresh_iat,
                                          EXTRACT (epoch FROM spot_jwt_iat)::BIGINT AS spot_jwt_iat, 
                                          spot_jwt_refresh_jti, 
                                          EXTRACT (epoch FROM spot_jwt_refresh_iat)::BIGINT AS spot_jwt_refresh_iat;""",
                            {"user_id": user_id})
        cur.execute(query)
        row = cur.fetchone()
        return FullLoginJWTs(**row)


def refresh_jwt_iat_jti(user_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.users
                                SET jwt_iat = timezone('utc'::text, now()-INTERVAL '10s'),
                                    jwt_refresh_jti = jwt_refresh_jti + 1 
                                WHERE user_id = %(user_id)s 
                                RETURNING EXTRACT (epoch FROM jwt_iat)::BIGINT AS jwt_iat, 
                                          jwt_refresh_jti, 
                                          EXTRACT (epoch FROM jwt_refresh_iat)::BIGINT AS jwt_refresh_iat;""",
                            {"user_id": user_id})
        cur.execute(query)
        row = cur.fetchone()
        return RefreshLoginJWTs(**row)


def authenticate(email, password, for_change_password=False) -> dict | None:
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            f"""SELECT 
                    users.user_id,
                    1 AS tenant_id,
                    users.role,
                    users.name,
                    (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                    (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                    (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member
                FROM public.users INNER JOIN public.basic_authentication USING(user_id)
                WHERE users.email = %(email)s 
                    AND basic_authentication.password = crypt(%(password)s, basic_authentication.password)
                    AND basic_authentication.user_id = (SELECT su.user_id FROM public.users AS su WHERE su.email=%(email)s AND su.deleted_at IS NULL LIMIT 1)
                LIMIT 1;""",
            {"email": email, "password": password})

        cur.execute(query)
        r = cur.fetchone()

    if r is not None:
        if for_change_password:
            return {}
        r = helper.dict_to_camel_case(r)
        j_r = change_jwt_iat_jti(user_id=r['userId'])
        response = {
            "jwt": authorizers.generate_jwt(user_id=r['userId'], tenant_id=r['tenantId'], iat=j_r.jwt_iat,
                                            aud=AUDIENCE),
            "refreshToken": authorizers.generate_jwt_refresh(user_id=r['userId'],
                                                             tenant_id=r['tenantId'],
                                                             iat=j_r.jwt_refresh_iat,
                                                             aud=AUDIENCE,
                                                             jwt_jti=j_r.jwt_refresh_jti,
                                                             for_spot=False),
            "refreshTokenMaxAge": config("JWT_REFRESH_EXPIRATION", cast=int),
            "email": email,
            "spotJwt": authorizers.generate_jwt(user_id=r['userId'], tenant_id=r['tenantId'],
                                                iat=j_r.spot_jwt_iat, aud=spot.AUDIENCE, for_spot=True),
            "spotRefreshToken": authorizers.generate_jwt_refresh(user_id=r['userId'],
                                                                 tenant_id=r['tenantId'],
                                                                 iat=j_r.spot_jwt_refresh_iat,
                                                                 aud=spot.AUDIENCE,
                                                                 jwt_jti=j_r.spot_jwt_refresh_jti,
                                                                 for_spot=True),
            "spotRefreshTokenMaxAge": config("JWT_SPOT_REFRESH_EXPIRATION", cast=int),
            **r
        }
        return response

    return None


def logout(user_id: int):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """UPDATE public.users
               SET jwt_iat              = NULL,
                   jwt_refresh_jti      = NULL,
                   jwt_refresh_iat      = NULL,
                   spot_jwt_iat         = NULL,
                   spot_jwt_refresh_jti = NULL,
                   spot_jwt_refresh_iat = NULL
               WHERE user_id = %(user_id)s;""",
            {"user_id": user_id})
        cur.execute(query)


def refresh(user_id: int, tenant_id: int = -1) -> dict:
    j = refresh_jwt_iat_jti(user_id=user_id)
    return {
        "jwt": authorizers.generate_jwt(user_id=user_id, tenant_id=tenant_id, iat=j.jwt_iat,
                                        aud=AUDIENCE),
        "refreshToken": authorizers.generate_jwt_refresh(user_id=user_id, tenant_id=tenant_id, iat=j.jwt_refresh_iat,
                                                         aud=AUDIENCE, jwt_jti=j.jwt_refresh_jti),
        "refreshTokenMaxAge": config("JWT_REFRESH_EXPIRATION", cast=int) - (j.jwt_iat - j.jwt_refresh_iat),
    }


def get_user_role(tenant_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                        users.user_id,
                        users.email, 
                        users.role, 
                        users.name, 
                        users.created_at,
                        (CASE WHEN users.role = 'owner' THEN TRUE ELSE FALSE END)  AS super_admin,
                        (CASE WHEN users.role = 'admin' THEN TRUE ELSE FALSE END)  AS admin,
                        (CASE WHEN users.role = 'member' THEN TRUE ELSE FALSE END) AS member
                    FROM public.users 
                    WHERE users.deleted_at IS NULL 
                        AND users.user_id=%(user_id)s
                    LIMIT 1""",
                {"user_id": user_id})
        )
        return helper.dict_to_camel_case(cur.fetchone())


def get_user_settings(user_id):
    #     read user settings from users.settings:jsonb column
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT 
                        settings
                    FROM public.users 
                    WHERE users.deleted_at IS NULL 
                        AND users.user_id=%(user_id)s
                    LIMIT 1""",
                {"user_id": user_id})
        )
        return helper.dict_to_camel_case(cur.fetchone())


def update_user_module(user_id, data: schemas.ModuleStatus):
    # example data = {"settings": {"modules": ['ASSIST', 'METADATA']}
    #     update user settings from users.settings:jsonb column only update settings.modules
    #   if module property is not exists, it will be created
    #  if module property exists, it will be updated, modify here and call update_user_settings
    # module is a single element to be added or removed
    user_settings = get_user_settings(user_id)
    if user_settings is None:
        settings = {}
    else:
        settings = user_settings.get("settings")
        if settings is None or not isinstance(settings, dict):
            settings = {}

    if settings.get("modules") is None:
        settings["modules"] = []

    if data.status and data.module not in settings["modules"]:
        settings["modules"].append(data.module)

    elif not data.status and data.module in settings["modules"]:
        settings["modules"].remove(data.module)

    return update_user_settings(user_id, settings)


def update_user_settings(user_id, settings):
    #     update user settings from users.settings:jsonb column
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""UPDATE public.users
                    SET settings = %(settings)s
                    WHERE users.user_id = %(user_id)s
                            AND deleted_at IS NULL
                    RETURNING settings;""",
                {"user_id": user_id, "settings": json.dumps(settings)})
        )
        return helper.dict_to_camel_case(cur.fetchone())
