from decouple import config

from chalicelib.core import authorizers, users
from chalicelib.utils import pg_client

AUDIENCE = "spot:OpenReplay"


def refresh_spot_jwt_iat_jti(user_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""UPDATE public.users
                                SET spot_jwt_iat = timezone('utc'::text, now()-INTERVAL '10s'),
                                    spot_jwt_refresh_jti = spot_jwt_refresh_jti + 1 
                                WHERE user_id = %(user_id)s 
                                RETURNING EXTRACT (epoch FROM spot_jwt_iat)::BIGINT AS spot_jwt_iat, 
                                          spot_jwt_refresh_jti, 
                                          EXTRACT(epoch FROM spot_jwt_refresh_iat)::BIGINT AS spot_jwt_refresh_iat;""",
                            {"user_id": user_id})
        cur.execute(query)
        row = cur.fetchone()
        return users.RefreshSpotJWTs(**row)


def logout(user_id: int):
    users.logout(user_id=user_id)


def refresh(user_id: int, tenant_id: int = -1) -> dict:
    j = refresh_spot_jwt_iat_jti(user_id=user_id)
    return {
        "jwt": authorizers.generate_jwt(user_id=user_id, tenant_id=tenant_id, iat=j.spot_jwt_iat,
                                        aud=AUDIENCE, for_spot=True),
        "refreshToken": authorizers.generate_jwt_refresh(user_id=user_id, tenant_id=tenant_id, iat=j.spot_jwt_refresh_iat,
                                                         aud=AUDIENCE, jwt_jti=j.spot_jwt_refresh_jti, for_spot=True),
        "refreshTokenMaxAge": config("JWT_SPOT_REFRESH_EXPIRATION", cast=int) - (j.spot_jwt_iat - j.spot_jwt_refresh_iat)
    }


def refresh_auth_exists(user_id, jwt_jti):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""SELECT user_id 
                            FROM public.users  
                            WHERE user_id = %(userId)s 
                                AND deleted_at IS NULL
                                AND spot_jwt_refresh_jti = %(jwt_jti)s
                            LIMIT 1;""",
                        {"userId": user_id, "jwt_jti": jwt_jti})
        )
        r = cur.fetchone()
    return r is not None
