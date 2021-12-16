from typing import Optional

from fastapi import Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette import status
from starlette.exceptions import HTTPException

from chalicelib.core import authorizers, users
from schemas import CurrentContext


class JWTAuth(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTAuth, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> Optional[CurrentContext]:
        credentials: HTTPAuthorizationCredentials = await super(JWTAuth, self).__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authentication scheme.")
            jwt_payload = authorizers.jwt_authorizer(credentials.scheme + " " + credentials.credentials)
            if jwt_payload is None \
                    or jwt_payload.get("iat") is None or jwt_payload.get("aud") is None \
                    or not users.auth_exists(user_id=jwt_payload["userId"], tenant_id=jwt_payload["tenantId"],
                                             jwt_iat=jwt_payload["iat"], jwt_aud=jwt_payload["aud"]):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token or expired token.")
            user = users.get(user_id=jwt_payload["userId"], tenant_id=jwt_payload["tenantId"])
            if user is None:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not found.")
            jwt_payload["authorizer_identity"] = "jwt"
            print(jwt_payload)
            request.state.authorizer_identity = "jwt"
            request.state.currentContext = CurrentContext(tenant_id=jwt_payload["tenantId"],
                                                          user_id=jwt_payload["userId"],
                                                          email=user["email"])
            return request.state.currentContext

        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authorization code.")
