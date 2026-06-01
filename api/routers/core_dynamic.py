import logging
from typing import Optional, Union

from decouple import config
from fastapi import Body, Depends, BackgroundTasks
from fastapi import HTTPException, status
from starlette.responses import RedirectResponse, FileResponse, JSONResponse, Response

import schemas
from chalicelib.core import signup, feature_flags
from chalicelib.core import scope
from chalicelib.core import tenants, users, projects, license
from chalicelib.core import webhook
from chalicelib.core.collaborations.collaboration_slack import Slack
from chalicelib.core.errors import errors, errors_details
from chalicelib.utils import captcha, smtp
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC
from or_dependencies import OR_context, OR_role
from routers.base import get_routers
from routers.subs import spot

logger = logging.getLogger(__name__)
public_app, app, app_apikey = get_routers()

if config("LOCAL_DEV", cast=bool, default=False):
    COOKIE_PATH = "/refresh"
else:
    COOKIE_PATH = "/api/refresh"


@public_app.get('/signup', tags=['signup'])
async def get_all_signup():
    return {"data": {"tenants": await tenants.tenants_exists(),
                     "sso": None,
                     "ssoProvider": None,
                     "enforceSSO": None,
                     "edition": license.EDITION}}


if not tenants.tenants_exists_sync(use_pool=False):
    @public_app.post('/signup', tags=['signup'])
    @public_app.put('/signup', tags=['signup'])
    async def signup_handler(response: JSONResponse, data: schemas.UserSignupSchema = Body(...)):
        content = await signup.create_tenant(data)
        if "errors" in content:
            return content
        content = __process_authentication_response(response=response, data=content)
        return content


def __process_authentication_response(response: JSONResponse, data: dict) -> dict:
    data["smtp"] = smtp.has_smtp()
    refresh_token = data.pop("refreshToken")
    refresh_token_max_age = data.pop("refreshTokenMaxAge")
    spot_refresh_token = data.pop("spotRefreshToken")
    spot_refresh_token_max_age = data.pop("spotRefreshTokenMaxAge")
    data = {
        'jwt': data.pop('jwt'),
        "spotJwt": data.pop("spotJwt"),
        'data': {
            "scopeState": scope.get_scope(-1),
            "user": data
        }
    }
    response.set_cookie(key="refreshToken", value=refresh_token, path=COOKIE_PATH,
                        max_age=refresh_token_max_age, secure=True, httponly=True)
    response.set_cookie(key="spotRefreshToken", value=spot_refresh_token, path=spot.COOKIE_PATH,
                        max_age=spot_refresh_token_max_age, secure=True, httponly=True)
    return data


@public_app.post('/login', tags=["authentication"])
def login_user(response: JSONResponse, data: schemas.UserLoginSchema = Body(...)):
    if helper.allow_captcha() and not captcha.is_valid(data.g_recaptcha_response):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid captcha."
        )

    r = users.authenticate(email=data.email, password=data.password.get_secret_value())
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
    r = __process_authentication_response(response=response, data=r)
    return r


@app.get('/logout', tags=["login"])
def logout_user(response: Response, context: schemas.CurrentContext = Depends(OR_context)):
    users.logout(user_id=context.user_id)
    response.delete_cookie(key="refreshToken", path=COOKIE_PATH)
    response.delete_cookie(key="spotRefreshToken", path=spot.COOKIE_PATH)
    return {"data": "success"}


@app.get('/refresh', tags=["login"])
def refresh_login(response: JSONResponse, context: schemas.CurrentContext = Depends(OR_context)):
    r = users.refresh(user_id=context.user_id)
    content = {"jwt": r.get("jwt")}
    response.set_cookie(key="refreshToken", value=r.get("refreshToken"), path=COOKIE_PATH,
                        max_age=r.pop("refreshTokenMaxAge"), secure=True, httponly=True)
    return content


@app.get('/account', tags=['accounts'])
def get_account(context: schemas.CurrentContext = Depends(OR_context)):
    r = users.get_user(tenant_id=context.tenant_id, user_id=context.user_id)
    if r is None:
        return {"errors": ["current user not found"]}
    t = tenants.get_by_tenant_id(context.tenant_id)
    if t is not None:
        t = dict(t)
        t["createdAt"] = TimeUTC.datetime_to_timestamp(t["createdAt"])
        t["tenantName"] = t.pop("name")
    else:
        return {"errors": ["current tenant not found"]}

    return {
        'data': {
            **r,
            **t,
            **license.get_status(context.tenant_id),
            "smtp": smtp.has_smtp()
        }
    }


@app.post('/account', tags=["account"])
def edit_account(data: schemas.EditAccountSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return users.edit_account(tenant_id=context.tenant_id, user_id=context.user_id, changes=data)


@app.post('/account/scope', tags=["account"])
def change_scope(data: schemas.ScopeSchema = Body(),
                 context: schemas.CurrentContext = Depends(OR_context)):
    data = scope.update_scope(tenant_id=-1, scope=data.scope)
    return {'data': data}


@app.post('/account/password', tags=["account"])
def change_client_password(resqponse: JSONResponse, data: schemas.EditUserPasswordSchema = Body(...),
                           context: schemas.CurrentContext = Depends(OR_context)):
    r = users.change_password(email=context.email, old_password=data.old_password.get_secret_value(),
                              new_password=data.new_password.get_secret_value(), tenant_id=context.tenant_id,
                              user_id=context.user_id)
    if "errors" not in r:
        r = __process_authentication_response(response=resqponse, data=r)
    return r


@app.post('/integrations/slack', tags=['integrations'])
@app.put('/integrations/slack', tags=['integrations'])
def add_slack_integration(data: schemas.AddCollaborationSchema,
                          context: schemas.CurrentContext = Depends(OR_context)):
    n = Slack.add(tenant_id=context.tenant_id, data=data)
    if n is None:
        return {
            "errors": ["We couldn't send you a test message on your Slack channel. Please verify your webhook url."]
        }
    return {"data": n}


@app.post('/integrations/slack/{integrationId}', tags=['integrations'])
def edit_slack_integration(integrationId: int, data: schemas.EditCollaborationSchema = Body(...),
                           context: schemas.CurrentContext = Depends(OR_context)):
    if len(data.url) > 0:
        old = Slack.get_integration(tenant_id=context.tenant_id, integration_id=integrationId)
        if not old:
            return {"errors": ["Slack integration not found."]}
        if old["endpoint"] != data.url:
            if not Slack.say_hello(data.url):
                return {
                    "errors": [
                        "We couldn't send you a test message on your Slack channel. Please verify your webhook url."]
                }
    return {"data": webhook.update(tenant_id=context.tenant_id, webhook_id=integrationId,
                                   changes={"name": data.name, "endpoint": data.url.unicode_string()})}


@app.post('/client/members', tags=["client"], dependencies=[OR_role("owner", "admin")])
def add_member(background_tasks: BackgroundTasks, data: schemas.CreateMemberSchema = Body(...),
               context: schemas.CurrentContext = Depends(OR_context)):
    return users.create_member(tenant_id=context.tenant_id, user_id=context.user_id, data=data,
                               background_tasks=background_tasks)


@public_app.get('/users/invitation', tags=['users'])
def process_invitation_link(token: str):
    if token is None or len(token) < 64:
        return {"errors": ["please provide a valid invitation"]}
    user = users.get_by_invitation_token(token)
    if user is None:
        return {"errors": ["invitation not found"]}
    if user["expiredInvitation"]:
        return {"errors": ["expired invitation, please ask your admin to send a new one"]}
    if user["expiredChange"] is not None and not user["expiredChange"] \
            and user["changePwdToken"] is not None and user["changePwdAge"] < -5 * 60:
        pass_token = user["changePwdToken"]
    else:
        pass_token = users.allow_password_change(user_id=user["userId"])
    return RedirectResponse(url=config("SITE_URL") + config("change_password_link") % (token, pass_token))


@public_app.post('/password/reset', tags=["users"])
def change_password_by_invitation(response: JSONResponse, data: schemas.EditPasswordByInvitationSchema = Body(...)):
    if data is None or len(data.invitation) < 64 or len(data.passphrase) < 8:
        return {"errors": ["please provide a valid invitation & pass"]}
    user = users.get_by_invitation_token(token=data.invitation, pass_token=data.passphrase)
    if user is None:
        return {"errors": ["invitation not found"]}
    if user["expiredChange"]:
        return {"errors": ["expired change, please re-use the invitation link"]}

    r = users.set_password_invitation(new_password=data.password.get_secret_value(), user_id=user["userId"])
    r = __process_authentication_response(response=response, data=r)
    return r


@app.put('/client/members/{memberId}', tags=["client"], dependencies=[OR_role("owner", "admin")])
def edit_member(memberId: int, data: schemas.EditMemberSchema,
                context: schemas.CurrentContext = Depends(OR_context)):
    return users.edit_member(tenant_id=context.tenant_id, editor_id=context.user_id, changes=data,
                             user_id_to_update=memberId)


@app.get('/projects', tags=['projects'])
def get_projects(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": projects.get_projects(tenant_id=context.tenant_id, gdpr=True, recorded=True)}


@app.get('/{projectId}/sessions/{sessionId}/errors/{errorId}/sourcemaps', tags=["sessions", "sourcemaps"])
def get_error_trace(projectId: int, sessionId: int, errorId: str,
                    context: schemas.CurrentContext = Depends(OR_context)):
    data = errors.get_trace(project_id=projectId, error_id=errorId)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.get('/{projectId}/errors/{errorId}', tags=['errors'])
def errors_get_details(projectId: int, errorId: str, density24: int = 24, density30: int = 30,
                       context: schemas.CurrentContext = Depends(OR_context)):
    data = errors_details.get_details(project_id=projectId, user_id=context.user_id, error_id=errorId,
                                      **{"density24": density24, "density30": density30})
    return data


@app.get('/{projectId}/errors/{errorId}/sourcemaps', tags=['errors'])
def errors_get_details_sourcemaps(projectId: int, errorId: str,
                                  context: schemas.CurrentContext = Depends(OR_context)):
    data = errors.get_trace(project_id=projectId, error_id=errorId)
    if "errors" in data:
        return data
    return {
        'data': data
    }


# TODO: delete this if UI is not calling it
@app.get('/delete_later/{projectId}/errors/{errorId}/sessions', tags=["errors"])
def get_errors_sessions(projectId: int, errorId: str,
                        startDate: int = TimeUTC.now(-7), endDate: int = TimeUTC.now(),
                        context: schemas.CurrentContext = Depends(OR_context)):
    return {
        "data": errors.get_sessions(project_id=projectId, user_id=context.user_id, error_id=errorId,
                                    start_date=startDate, end_date=endDate)}


@app.post('/{project_id}/feature-flags/search', tags=["feature flags"])
def search_feature_flags(project_id: int,
                         data: schemas.SearchFlagsSchema = Body(...),
                         context: schemas.CurrentContext = Depends(OR_context)):
    return feature_flags.search_feature_flags(project_id=project_id, user_id=context.user_id, data=data)


@app.get('/{project_id}/feature-flags/{feature_flag_id}', tags=["feature flags"])
def get_feature_flag(project_id: int, feature_flag_id: int):
    return feature_flags.get_feature_flag(project_id=project_id, feature_flag_id=feature_flag_id)


@app.post('/{project_id}/feature-flags', tags=["feature flags"])
def add_feature_flag(project_id: int, data: schemas.FeatureFlagSchema = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return feature_flags.create_feature_flag(project_id=project_id, user_id=context.user_id, feature_flag_data=data)


@app.put('/{project_id}/feature-flags/{feature_flag_id}', tags=["feature flags"])
def update_feature_flag(project_id: int, feature_flag_id: int, data: schemas.FeatureFlagSchema = Body(...),
                        context: schemas.CurrentContext = Depends(OR_context)):
    return feature_flags.update_feature_flag(project_id=project_id, feature_flag_id=feature_flag_id,
                                             user_id=context.user_id, feature_flag=data)


@app.delete('/{project_id}/feature-flags/{feature_flag_id}', tags=["feature flags"])
def delete_feature_flag(project_id: int, feature_flag_id: int, _=Body(None)):
    return {"data": feature_flags.delete_feature_flag(project_id=project_id, feature_flag_id=feature_flag_id)}


@app.post('/{project_id}/feature-flags/{feature_flag_id}/status', tags=["feature flags"])
def update_feature_flag_status(project_id: int, feature_flag_id: int,
                               data: schemas.FeatureFlagStatus = Body(...)):
    return {"data": feature_flags.update_feature_flag_status(project_id=project_id, feature_flag_id=feature_flag_id,
                                                             is_active=data.is_active)}
