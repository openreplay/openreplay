from fastapi import HTTPException, Depends, status, Security
from fastapi.security import OAuth2PasswordBearer
from decouple import config

# Instantiate OAuth2PasswordBearer with automatic error responses disabled
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


class AuthHandler:
    def __init__(self):
        """
        Authorization method using an API key.
        """
        # Attempt to get the ACCESS_TOKEN, if not set, default to None
        self.api_key = config("ACCESS_TOKEN", default=None)

    def verify_api_key(self, api_key: str):
        return api_key == self.api_key


auth_handler = AuthHandler()


async def api_key_auth(api_key: str = Security(oauth2_scheme)):
    # If ACCESS_TOKEN is not configured, skip the authorization check
    if not auth_handler.api_key:
        return True

    # If the Authorization header is not provided, raise an HTTP 403 Forbidden error
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authenticated"
        )

    # If the provided API key is invalid, raise an HTTP 401 Unauthorized error
    if not auth_handler.verify_api_key(api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Forbidden"
        )
    # If the API key is valid, continue processing the request
    return True
