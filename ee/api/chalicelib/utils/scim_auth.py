import logging
import time
import jwt

from decouple import config
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from chalicelib.core import users

logger = logging.getLogger(__name__)

ACCESS_SECRET_KEY = config("SCIM_ACCESS_SECRET_KEY", default="")
REFRESH_SECRET_KEY = config("SCIM_REFRESH_SECRET_KEY", default="")
ALGORITHM = config("SCIM_JWT_ALGORITHM", default="HS512")
ACCESS_TOKEN_EXPIRE_SECONDS = config("SCIM_ACCESS_TOKEN_EXPIRE_SECONDS", default=900, cast=int)
REFRESH_TOKEN_EXPIRE_SECONDS = config("SCIM_REFRESH_TOKEN_EXPIRE_SECONDS", default=86400, cast=int)

if len(ACCESS_SECRET_KEY) == 0:
    logger.info("SCIM not configured")


def create_tokens(tenant_id):
    if len(ACCESS_SECRET_KEY) == 0:
        raise HTTPException(status_code=401, detail="SCIM not configured")

    curr_time = time.time()
    access_payload = {
        "tenant_id": tenant_id,
        "sub": "scim_server",
        "aud": users.AUDIENCE,
        "iss": config("JWT_ISSUER"),
        "exp": "",
    }
    access_payload.update({"exp": curr_time + ACCESS_TOKEN_EXPIRE_SECONDS})
    access_token = jwt.encode(access_payload, ACCESS_SECRET_KEY, algorithm=ALGORITHM)

    refresh_payload = access_payload.copy()
    refresh_payload.update({"exp": curr_time + REFRESH_TOKEN_EXPIRE_SECONDS})
    refresh_token = jwt.encode(refresh_payload, REFRESH_SECRET_KEY, algorithm=ALGORITHM)

    return access_token, refresh_token, ACCESS_TOKEN_EXPIRE_SECONDS


def verify_access_token(token: str):
    try:
        payload = jwt.decode(
            token, ACCESS_SECRET_KEY, algorithms=[ALGORITHM], audience=users.AUDIENCE
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def verify_refresh_token(token: str):
    try:
        payload = jwt.decode(
            token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM], audience=users.AUDIENCE
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


required_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Authentication Dependency
def auth_required(token: str = Depends(required_oauth2_scheme)):
    """Dependency to check Authorization header."""
    if config("SCIM_AUTH_TYPE") == "OAuth2":
        payload = verify_access_token(token)
    return payload["tenant_id"]


optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


def auth_optional(token: str | None = Depends(optional_oauth2_scheme)):
    if token is None:
        return None
    try:
        tenant_id = auth_required(token)
        return tenant_id
    except HTTPException:
        return None
