from fastapi import Body, Depends
from fastapi import HTTPException, status
from starlette.responses import JSONResponse, Response

import schemas
from chalicelib.core import spot, webhook
from chalicelib.utils import captcha
from chalicelib.utils import helper
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers(prefix="/spot", tags=["spot"])

COOKIE_PATH = "/api/spot/refresh"


@public_app.post('/login')
def login_spot(response: JSONResponse, data: schemas.UserLoginSchema = Body(...)):
    if helper.allow_captcha() and not captcha.is_valid(data.g_recaptcha_response):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid captcha."
        )

    r = spot.authenticate(data.email, data.password.get_secret_value())
    if r is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You've entered invalid Email or Password."
        )
    if "errors" in r:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=r["errors"][0]
        )

    refresh_token = r.pop("refreshToken")
    refresh_token_max_age = r.pop("refreshTokenMaxAge")
    content = {
        'jwt': r.pop('jwt'),
        'data': {
            "user": r
        }
    }
    response = JSONResponse(content=content)
    response.set_cookie(key="refreshToken", value=refresh_token, path=COOKIE_PATH,
                        max_age=refresh_token_max_age, secure=True, httponly=True)
    return response


@app.get('/logout')
def logout_spot(response: Response, context: schemas.CurrentContext = Depends(OR_context)):
    spot.logout(user_id=context.user_id)
    response.delete_cookie(key="refreshToken", path="/api/refresh")
    return {"data": "success"}


@app.get('/refresh')
def refresh_spot_login(context: schemas.CurrentContext = Depends(OR_context)):
    r = spot.refresh(user_id=context.user_id)
    content = {"jwt": r.get("jwt")}
    response = JSONResponse(content=content)
    response.set_cookie(key="refreshToken", value=r.get("refreshToken"), path=COOKIE_PATH,
                        max_age=r.pop("refreshTokenMaxAge"), secure=True, httponly=True)
    return response


@app.get('/integrations/slack/channels', tags=["integrations"])
def get_slack_channels(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": webhook.get_by_type(tenant_id=context.tenant_id, webhook_type=schemas.WebhookType.SLACK)}
