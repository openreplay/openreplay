import logging

import jwt
from decouple import config
from fastapi import HTTPException

from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from schemas import schemas, MCP

logger = logging.getLogger(__name__)

AUDIENCE = "mcp:OpenReplay"
MCP_LOGIN_TIMEOUT_S = config("MCP_LOGIN_TIMEOUT_S", cast=int, default=0)


def get_supported_audience():
    return [AUDIENCE]


def is_mcp_token(token: str) -> bool:
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
        audience = decoded_token.get("aud")
        return audience == AUDIENCE
    except jwt.InvalidTokenError:
        logger.error(f"Invalid token for is_spot_token: {token}")
        raise


def jwt_authorizer(scheme: str, token: str, leeway=0) -> dict | None:
    if scheme.lower() != "bearer" or len(token) < 5:
        return None
    try:
        payload = jwt.decode(jwt=token,
                             key=config("JWT_MCP_SECRET"),
                             algorithms=config("JWT_MCP_ALGORITHM"),
                             audience=get_supported_audience(),
                             leeway=leeway)
    except jwt.ExpiredSignatureError:
        logger.debug("! JWT Expired signature")
        return None
    except jwt.exceptions.InvalidSignatureError:
        logger.warning("! JWT Signature verification failed")
        return None
    except BaseException as e:
        logger.warning("! JWT Base Exception", exc_info=e)
        return None
    return payload


def generate_jwt(user_id, tenant_id, iat, jti, client_id):
    token = jwt.encode(
        payload={
            "userId": user_id,
            "tenantId": tenant_id,
            "exp": iat + config("JWT_MCP_EXPIRATION", cast=int),
            "iss": config("JWT_ISSUER"),
            "iat": iat,
            "jti": jti,
            "aud": AUDIENCE,
            "clientId": client_id
        },
        key=config("JWT_MCP_SECRET"),
        algorithm=config("JWT_MCP_ALGORITHM")
    )
    return token


def store_token_request(data: MCP.AuthorizeSchema, cotext: schemas.CurrentContext):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """
            INSERT INTO public.mcp_authentication_tokens(user_id, client_id, state, iat)
            VALUES (%(user_id)s, %(client_id)s, %(state)s,
                    timezone('utc'::text, now() - INTERVAL '10s')) ON CONFLICT DO NOTHING;""",
            {"client_id": data.client_id, "state": data.state,
             "user_id": cotext.user_id, },
        )
        cur.execute(query=query)


def get_token_by_state(client_id, state):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """
            UPDATE public.mcp_authentication_tokens
            SET generated= TRUE
            WHERE client_id = %(client_id)s
              AND state = %(state)s
              AND NOT generated 
            RETURNING *,EXTRACT(epoch FROM iat)::BIGINT AS iat,
                (SELECT tenant_id 
                 FROM public.users 
                 WHERE users.user_id = mcp_authentication_tokens.user_id 
                    AND users.deleted_at IS NULL) AS tenant_id;""",
            {"client_id": client_id, "state": state},
        )
        cur.execute(query=query)
        row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="State not found or token already generated")
    if MCP_LOGIN_TIMEOUT_S > 0 and (row["iat"] + MCP_LOGIN_TIMEOUT_S) >= TimeUTC.now():
        raise HTTPException(status_code=408, detail="Login timed out")

    return generate_jwt(user_id=row["user_id"], tenant_id=row["tenant_id"], iat=row["iat"], client_id=client_id, jti=row["jti"])
