import datetime
import logging
from typing import Optional

from decouple import config
from fastapi import Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette import status
from starlette.exceptions import HTTPException

import schemas
from chalicelib.core import authorizers, users, spot

logger = logging.getLogger(__name__)


def _get_current_auth_context(request: Request, jwt_payload: dict) -> schemas.CurrentContext:
    user = users.get(user_id=jwt_payload.get("userId", -1), tenant_id=jwt_payload.get("tenantId", -1))
    if user is None:
        logger.warning("User not found.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not found.")
    request.state.authorizer_identity = "jwt"
    request.state.currentContext = schemas.CurrentContext(tenantId=jwt_payload.get("tenantId", -1),
                                                          userId=jwt_payload.get("userId", -1),
                                                          email=user["email"],
                                                          role=user["role"])
    return request.state.currentContext


class JWTAuth(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTAuth, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> Optional[schemas.CurrentContext]:
        if request.url.path in ["/refresh", "/api/refresh"]:
            return await self.__process_refresh_call(request)

        elif request.url.path in ["/spot/refresh", "/api/spot/refresh"]:
            return await self.__process_spot_refresh_call(request)

        else:
            credentials: HTTPAuthorizationCredentials = await super(JWTAuth, self).__call__(request)
            if credentials:
                if not credentials.scheme == "Bearer":
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                        detail="Invalid authentication scheme.")
                jwt_payload = authorizers.jwt_authorizer(scheme=credentials.scheme, token=credentials.credentials)
                auth_exists = jwt_payload is not None and users.auth_exists(user_id=jwt_payload.get("userId", -1),
                                                                            jwt_iat=jwt_payload.get("iat", 100))
                if jwt_payload is None \
                        or jwt_payload.get("iat") is None or jwt_payload.get("aud") is None \
                        or not auth_exists:
                    if jwt_payload is not None:
                        logger.debug(jwt_payload)
                        if jwt_payload.get("iat") is None:
                            logger.debug("iat is None")
                        if jwt_payload.get("aud") is None:
                            logger.debug("aud is None")
                    if not auth_exists:
                        logger.warning("not users.auth_exists")

                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token or expired token.")

                if jwt_payload.get("aud", "").startswith("spot") and not request.url.path.startswith("/spot"):
                    # Allow access to spot endpoints only
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                        detail="Unauthorized access (spot).")
                elif jwt_payload.get("aud", "").startswith("front") and request.url.path.startswith("/spot"):
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                        detail="Unauthorized access endpoint reserved for Spot only.")

                return _get_current_auth_context(request=request, jwt_payload=jwt_payload)

        logger.warning("Invalid authorization code.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authorization code.")

    async def __process_refresh_call(self, request: Request) -> schemas.CurrentContext:
        if "refreshToken" not in request.cookies:
            logger.warning("Missing refreshToken cookie.")
            jwt_payload = None
        else:
            jwt_payload = authorizers.jwt_refresh_authorizer(scheme="Bearer", token=request.cookies["refreshToken"])

        if jwt_payload is None or jwt_payload.get("jti") is None:
            logger.warning("Null refreshToken's payload, or null JTI.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Invalid refresh-token or expired refresh-token.")
        auth_exists = users.refresh_auth_exists(user_id=jwt_payload.get("userId", -1),
                                                jwt_jti=jwt_payload["jti"])
        if not auth_exists:
            logger.warning("refreshToken's user not found.")
            logger.warning(jwt_payload)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Invalid refresh-token or expired refresh-token.")

        credentials: HTTPAuthorizationCredentials = await super(JWTAuth, self).__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                    detail="Invalid authentication scheme.")
            old_jwt_payload = authorizers.jwt_authorizer(scheme=credentials.scheme, token=credentials.credentials,
                                                         leeway=datetime.timedelta(
                                                             days=config("JWT_LEEWAY_DAYS", cast=int, default=3)
                                                         ))
            if old_jwt_payload is None \
                    or old_jwt_payload.get("userId") is None \
                    or old_jwt_payload.get("userId") != jwt_payload.get("userId"):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token or expired token.")

            return _get_current_auth_context(request=request, jwt_payload=jwt_payload)

        logger.warning("Invalid authorization code (refresh logic).")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authorization code for refresh.")

    async def __process_spot_refresh_call(self, request: Request) -> schemas.CurrentContext:
        if "spotRefreshToken" not in request.cookies:
            logger.warning("Missing soptRefreshToken cookie.")
            jwt_payload = None
        else:
            jwt_payload = authorizers.jwt_refresh_authorizer(scheme="Bearer", token=request.cookies["spotRefreshToken"])

        if jwt_payload is None or jwt_payload.get("jti") is None:
            logger.warning("Null spotRefreshToken's payload, or null JTI.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Invalid spotRefreshToken or expired refresh-token.")
        auth_exists = spot.refresh_auth_exists(user_id=jwt_payload.get("userId", -1),
                                               jwt_jti=jwt_payload["jti"])
        if not auth_exists:
            logger.warning("spotRefreshToken's user not found.")
            logger.warning(jwt_payload)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Invalid spotRefreshToken or expired refresh-token.")

        credentials: HTTPAuthorizationCredentials = await super(JWTAuth, self).__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                    detail="Invalid spot-authentication scheme.")
            old_jwt_payload = authorizers.jwt_authorizer(scheme=credentials.scheme, token=credentials.credentials,
                                                         leeway=datetime.timedelta(
                                                             days=config("JWT_LEEWAY_DAYS", cast=int, default=3)
                                                         ))
            if old_jwt_payload is None \
                    or old_jwt_payload.get("userId") is None \
                    or old_jwt_payload.get("userId") != jwt_payload.get("userId"):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                    detail="Invalid spot-token or expired token.")

            return _get_current_auth_context(request=request, jwt_payload=jwt_payload)

        logger.warning("Invalid authorization code (spot-refresh logic).")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid authorization code for spot-refresh.")
