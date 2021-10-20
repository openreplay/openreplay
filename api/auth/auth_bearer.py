from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
# from .auth_handler import decodeJWT
from decouple import config
from chalicelib.utils import helper
from schemas import CurrentContext


class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        print(">>>>")
        credentials: HTTPAuthorizationCredentials = await super(JWTBearer, self).__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(status_code=403, detail="Invalid authentication scheme.")
            current_user = self.verify_jwt(credentials.credentials)
            if current_user is None:
                raise HTTPException(status_code=403, detail="Invalid token or expired token.")
            # return credentials.credentials
            return current_user
        else:
            raise HTTPException(status_code=403, detail="Invalid authorization code.")

    # def verify_jwt(self, token: str) -> bool:
    def verify_jwt(self, token: str) -> CurrentContext:
        try:
            payload = jwt.decode(
                token,
                config("jwt_secret"),
                algorithms=config("jwt_algorithm"),
                audience=[f"plugin:{helper.get_stage_name()}", f"front:{helper.get_stage_name()}"]
            )
        except jwt.ExpiredSignatureError:
            print("! JWT Expired signature")
            return None
        except BaseException as e:
            print("! JWT Base Exception")
            return None
        # return payload
        # print(">>>>>>>>>>>")
        # print(payload)
        # return True
        return CurrentContext(tenant_id=payload["tenantId"], user_id=payload["userId"], email=payload["email"])

    # def verify_jwt(self, jwtoken: str) -> bool:
    #     isTokenValid: bool = False
    #
    #     try:
    #         payload = decodeJWT(jwtoken)
    #     except:
    #         payload = None
    #     if payload:
    #         isTokenValid = True
    #     return isTokenValid


def get_current_username(credentials: JWTBearer = Depends(JWTBearer)):
    print("------")
    print(credentials)
    pass
    # correct_username = secrets.compare_digest(credentials.username, "stanleyjobson")
    # correct_password = secrets.compare_digest(credentials.password, "swordfish")
    # if not (correct_username and correct_password):
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Incorrect email or password",
    #         headers={"WWW-Authenticate": "Basic"},
    #     )
    # return credentials.username
