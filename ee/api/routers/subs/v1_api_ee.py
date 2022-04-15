from chalicelib.utils import assist_helper
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app_apikey.get('/v1/assist/credentials', tags=["api"])
def get_assist_credentials():
    credentials = assist_helper.get_temporary_credentials()
    if "errors" in credentials:
        return credentials
    return {"data": credentials}
