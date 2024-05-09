import logging
from typing import Optional

from fastapi import Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette import status
from starlette.exceptions import HTTPException

import schemas_ee
from chalicelib.core import authorizers, users

logger = logging.getLogger(__name__)


class JWTAuth(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTAuth, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> Optional[schemas_ee.CurrentContext]:
        credentials: HTTPAuthorizationCredentials = await super(JWTAuth, self).__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authentication scheme.")
            logging.debug("----------------------------------JWT auth")
            jwt_payload = authorizers.jwt_authorizer(scheme=credentials.scheme, token=credentials.credentials)
            logging.debug(jwt_payload)
            auth_exists = jwt_payload is not None \
                          and users.auth_exists(user_id=jwt_payload.get("userId", -1),
                                                tenant_id=jwt_payload.get("tenantId", -1),
                                                jwt_iat=jwt_payload.get("iat", 100),
                                                jwt_aud=jwt_payload.get("aud", ""))
            logging.debug(f"auth exists: {auth_exists}")
            if jwt_payload is None \
                    or jwt_payload.get("iat") is None or jwt_payload.get("aud") is None \
                    or not auth_exists:
                if jwt_payload is not None:
                    logging.warning(jwt_payload)
                    if jwt_payload.get("iat") is None:
                        logging.warning("JWTAuth: iat is None")
                    if jwt_payload.get("aud") is None:
                        logging.warning("JWTAuth: aud is None")
                if not auth_exists:
                    logging.warning("JWTAuth: not users.auth_exists")

                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token or expired token.")
            user = users.get(user_id=jwt_payload.get("userId", -1), tenant_id=jwt_payload.get("tenantId", -1))
            logging.debug(f"user: {user}")
            if user is None:
                logging.warning("JWTAuth: User not found.")
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not found.")
            jwt_payload["authorizer_identity"] = "jwt"
            request.state.authorizer_identity = "jwt"
            if user["serviceAccount"]:
                user["permissions"] = [p.value for p in schemas_ee.ServicePermissions]
            request.state.currentContext = schemas_ee.CurrentContext(tenant_id=jwt_payload.get("tenantId", -1),
                                                                     user_id=jwt_payload.get("userId", -1),
                                                                     email=user["email"],
                                                                     permissions=user["permissions"],
                                                                     service_account=user["serviceAccount"])
            return request.state.currentContext

        else:
            logging.warning("JWTAuth: Invalid authorization code.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authorization code.")
