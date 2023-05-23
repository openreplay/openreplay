from fastapi.security import OAuth2PasswordBearer
from fastapi import HTTPException, Depends, status
from decouple import config

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class AuthHandler:
    def __init__(self):
        """
        Authorization method using an API key.
        """
        self.__api_keys = [config("API_AUTH_KEY")]

    def __contains__(self, api_key):
        return api_key in self.__api_keys

    def add_key(self, key):
        """Adds new key for authentication."""
        self.__api_keys.append(key)


auth_method = AuthHandler()


def api_key_auth(api_key: str = Depends(oauth2_scheme)):
    """Method to verify auth."""
    global auth_method
    if api_key not in auth_method:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Forbidden"
        )