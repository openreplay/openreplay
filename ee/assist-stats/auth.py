from fastapi.security import OAuth2PasswordBearer
from fastapi import HTTPException, Depends, status
from decouple import config

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class AuthHandler:
    def __init__(self):
        """
        Authorization method using an API key.
        """
        # Attempt to get the ACCESS_TOKEN, if not set, default to an empty list
        api_key = config("ACCESS_TOKEN", default=None)
        self.__api_keys = [api_key] if api_key else []

    def __contains__(self, api_key):
        # Skip the check if no API keys are configured
        if not self.__api_keys:
            return True

        return api_key in self.__api_keys

    def add_key(self, key):
        """Adds new key for authentication."""
        if key:  # Ensure we don't add empty keys
            self.__api_keys.append(key)


auth_method = AuthHandler()


def api_key_auth(api_key: str = Depends(oauth2_scheme)):
    """Method to verify auth."""
    if api_key not in auth_method:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Forbidden"
        )
