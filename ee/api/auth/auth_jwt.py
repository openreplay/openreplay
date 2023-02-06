from typing import Optional

from fastapi import Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette import status
from starlette.exceptions import HTTPException

from chalicelib.core import authorizers, users
import schemas_ee


class JWTAuth(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTAuth, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> Optional[schemas_ee.CurrentContext]:
        credentials: HTTPAuthorizationCredentials = await super(JWTAuth, self).__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authentication scheme.")
            jwt_payload = authorizers.jwt_authorizer(credentials.scheme + " " + credentials.credentials)
            auth_exists = jwt_payload is not None \
                          and users.auth_exists(user_id=jwt_payload.get("userId", -1),
                                                tenant_id=jwt_payload.get("tenantId", -1),
                                                jwt_iat=jwt_payload.get("iat", 100),
                                                jwt_aud=jwt_payload.get("aud", ""))
            if jwt_payload is None \
                    or jwt_payload.get("iat") is None or jwt_payload.get("aud") is None \
                    or not auth_exists:
                print("JWTAuth: Token issue")
                if jwt_payload is not None:
                    print(jwt_payload)
                    print(f"JWTAuth: user_id={jwt_payload.get('userId')} tenant_id={jwt_payload.get('tenantId')}")
                if jwt_payload is None:
                    print("JWTAuth: jwt_payload is None")
                    print(credentials.scheme + " " + credentials.credentials)
                if jwt_payload is not None and jwt_payload.get("iat") is None:
                    print("JWTAuth: iat is None")
                if jwt_payload is not None and jwt_payload.get("aud") is None:
                    print("JWTAuth: aud is None")
                if jwt_payload is not None and not auth_exists:
                    print("JWTAuth: not users.auth_exists")

                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token or expired token.")
            user = users.get(user_id=jwt_payload.get("userId", -1), tenant_id=jwt_payload.get("tenantId", -1))
            if user is None:
                print("JWTAuth: User not found.")
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not found.")
            jwt_payload["authorizer_identity"] = "jwt"
            print(jwt_payload)
            request.state.authorizer_identity = "jwt"
            request.state.currentContext = schemas_ee.CurrentContext(tenant_id=jwt_payload.get("tenantId", -1),
                                                                     user_id=jwt_payload.get("userId", -1),
                                                                     email=user["email"],
                                                                     permissions=user["permissions"])
            return request.state.currentContext

        else:
            print("JWTAuth: Invalid authorization code.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authorization code.")
