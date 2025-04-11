from decouple import config
from fastapi import Depends
from starlette.responses import JSONResponse, Response

import schemas
from chalicelib.core import spot, webhook
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers(prefix="/spot", tags=["spot"])

if config("LOCAL_DEV", cast=bool, default=False):
    COOKIE_PATH = "/spot/refresh"
else:
    COOKIE_PATH = "/api/spot/refresh"


@app.get('/logout')
def logout_spot(response: Response, context: schemas.CurrentContext = Depends(OR_context)):
    spot.logout(user_id=context.user_id)
    response.delete_cookie(key="spotRefreshToken", path=COOKIE_PATH)
    return {"data": "success"}


@app.get('/refresh')
def refresh_spot_login(response: JSONResponse, context: schemas.CurrentContext = Depends(OR_context)):
    r = spot.refresh(user_id=context.user_id, tenant_id=context.tenant_id)
    content = {"jwt": r.get("jwt")}
    response.set_cookie(key="spotRefreshToken", value=r.get("refreshToken"), path=COOKIE_PATH,
                        max_age=r.pop("refreshTokenMaxAge"), secure=True, httponly=True)
    return content


@app.get('/integrations/slack/channels', tags=["integrations"])
def get_slack_channels(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": webhook.get_by_type(tenant_id=context.tenant_id, webhook_type=schemas.WebhookType.SLACK)}
