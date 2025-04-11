import logging
from typing import Optional, Union

from decouple import config
from fastapi import Body, Depends, BackgroundTasks, Request
from fastapi import HTTPException, status
from starlette.responses import RedirectResponse, FileResponse, JSONResponse, Response

import schemas
from chalicelib.core import assist, signup, feature_flags
from chalicelib.core import scope
from chalicelib.core import tenants, users, projects, license
from chalicelib.core import webhook
from chalicelib.core.collaborations.collaboration_slack import Slack
from chalicelib.core.errors import errors, errors_details
from chalicelib.core.metrics import heatmaps
from chalicelib.core.sessions import sessions, sessions_notes, sessions_replay, sessions_favorite, sessions_viewed, \
    sessions_assignments, unprocessed_sessions, sessions_search
from chalicelib.utils import SAML2_helper
from chalicelib.utils import captcha, smtp
from chalicelib.utils import contextual_validators
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC
from or_dependencies import OR_context, OR_role
from or_dependencies import OR_scope
from routers.base import get_routers
from routers.subs import spot
from schemas import Permissions, ServicePermissions

if config("ENABLE_SSO", cast=bool, default=True):
    from routers import saml
logger = logging.getLogger(__name__)
public_app, app, app_apikey = get_routers()

if config("LOCAL_DEV", cast=bool, default=False):
    COOKIE_PATH = "/refresh"
else:
    COOKIE_PATH = "/api/refresh"


@public_app.get('/signup', tags=['signup'])
async def get_all_signup():
    return {"data": {"tenants": await tenants.tenants_exists(),
                     "sso": SAML2_helper.is_saml2_available(),
                     "ssoProvider": SAML2_helper.get_saml2_provider(),
                     "enforceSSO": config("enforce_SSO", cast=bool, default=False) and helper.is_saml2_available(),
                     "edition": license.EDITION}}


if config("MULTI_TENANTS", cast=bool, default=False) or not tenants.tenants_exists_sync(use_pool=False):
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
            "scopeState": scope.get_scope(data["tenantId"]),
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
    r = users.refresh(user_id=context.user_id, tenant_id=context.tenant_id)
    content = {"jwt": r.get("jwt")}
    response.set_cookie(key="refreshToken", value=r.get("refreshToken"), path=COOKIE_PATH,
                        max_age=r.pop("refreshTokenMaxAge"), secure=True, httponly=True)
    return content


@app.get('/account', tags=['accounts'])
def get_account(context: schemas.CurrentContext = Depends(OR_context)):
    r = users.get(tenant_id=context.tenant_id, user_id=context.user_id)
    if r is None:
        return {"errors": ["current user not found"]}
    t = tenants.get_by_tenant_id(context.tenant_id)
    if t is not None:
        t["createdAt"] = TimeUTC.datetime_to_timestamp(t["createdAt"])
        t["tenantName"] = t.pop("name")
    else:
        return {"errors": ["current tenant not found"]}

    return {
        'data': {
            **r,
            **t,
            **license.get_status(context.tenant_id),
            "settings": users.get_user_settings(context.user_id)["settings"],
            "smtp": smtp.has_smtp(),
            "saml2": SAML2_helper.is_saml2_available()
        }
    }


@app.post('/account', tags=["account"])
def edit_account(data: schemas.EditAccountSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return users.edit_account(tenant_id=context.tenant_id, user_id=context.user_id, changes=data)


@app.post('/account/scope', tags=["account"])
def change_scope(data: schemas.ScopeSchema = Body(),
                 context: schemas.CurrentContext = Depends(OR_context)):
    data = scope.update_scope(tenant_id=context.tenant_id, scope=data.scope)
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
async def process_invitation_link(token: str, request: Request):
    if config("enforce_SSO", cast=bool, default=False) and helper.is_saml2_available():
        return await saml.start_sso(request=request)
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

    r = users.set_password_invitation(new_password=data.password.get_secret_value(), user_id=user["userId"],
                                      tenant_id=user["tenantId"])
    r = __process_authentication_response(response=response, data=r)
    return r


@app.put('/client/members/{memberId}', tags=["client"], dependencies=[OR_role("owner", "admin")])
def edit_member(memberId: int, data: schemas.EditMemberSchema,
                context: schemas.CurrentContext = Depends(OR_context)):
    return users.edit_member(tenant_id=context.tenant_id, editor_id=context.user_id, changes=data,
                             user_id_to_update=memberId)


@app.get('/metadata/session_search', tags=["metadata"])
def search_sessions_by_metadata(key: str, value: str, projectId: Optional[int] = None,
                                context: schemas.CurrentContext = Depends(OR_context)):
    if key is None or value is None or len(value) == 0 and len(key) == 0:
        return {"errors": ["please provide a key&value for search"]}

    if projectId is not None and not projects.is_authorized(project_id=projectId, tenant_id=context.tenant_id,
                                                            user_id=context.user_id):
        return {"errors": ["unauthorized project"]}
    if len(value) == 0:
        return {"errors": ["please provide a value for search"]}
    if len(key) == 0:
        return {"errors": ["please provide a key for search"]}
    return {
        "data": sessions.search_by_metadata(tenant_id=context.tenant_id, user_id=context.user_id, m_value=value,
                                            m_key=key, project_id=projectId)}


@app.get('/projects', tags=['projects'])
def get_projects(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": projects.get_projects(tenant_id=context.tenant_id, gdpr=True,
                                          recorded=True, user_id=context.user_id)}


@app.post('/{projectId}/sessions/search', tags=["sessions"],
          dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def search_sessions(projectId: int, data: schemas.SessionsSearchPayloadSchema = \
        Depends(contextual_validators.validate_contextual_payload),
                    context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_search.search_sessions(data=data, project=context.project, user_id=context.user_id,
                                           platform=context.project.platform)
    return {'data': data}


@app.post('/{projectId}/sessions/search/ids', tags=["sessions"],
          dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def session_ids_search(projectId: int, data: schemas.SessionsSearchPayloadSchema = \
        Depends(contextual_validators.validate_contextual_payload),
                       context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_search.search_sessions(data=data, project=context.project, user_id=context.user_id, ids_only=True,
                                           platform=context.project.platform)
    return {'data': data}


@app.get('/{projectId}/sessions/{sessionId}/first-mob', tags=["sessions", "replay"],
         dependencies=[OR_scope(Permissions.SESSION_REPLAY, ServicePermissions.SESSION_REPLAY)])
def get_first_mob_file(projectId: int, sessionId: Union[int, str], background_tasks: BackgroundTasks,
                       context: schemas.CurrentContext = Depends(OR_context)):
    if not sessionId.isnumeric():
        return {"errors": ["session not found"]}
    else:
        sessionId = int(sessionId)
    data = sessions_replay.get_pre_replay(project_id=projectId, session_id=sessionId)
    if data is None:
        return {"errors": ["session not found"]}
    return {
        'data': data
    }


@app.get('/{projectId}/sessions/{sessionId}/replay', tags=["sessions", "replay"],
         dependencies=[OR_scope(Permissions.SESSION_REPLAY, ServicePermissions.SESSION_REPLAY)])
def get_session_events(projectId: int, sessionId: Union[int, str], background_tasks: BackgroundTasks,
                       context: schemas.CurrentContext = Depends(OR_context)):
    if not sessionId.isnumeric():
        return {"errors": ["session not found"]}
    else:
        sessionId = int(sessionId)
    data = sessions_replay.get_replay(project_id=projectId, session_id=sessionId, full_data=True,
                                      include_fav_viewed=True, group_metadata=True, context=context)
    if data is None:
        return {"errors": ["session not found"]}
    if data.get("inDB"):
        background_tasks.add_task(sessions_viewed.view_session, project_id=projectId, user_id=context.user_id,
                                  session_id=sessionId)
    return {
        'data': data
    }


@app.get('/{projectId}/sessions/{sessionId}/events', tags=["sessions", "replay"],
         dependencies=[OR_scope(Permissions.SESSION_REPLAY, ServicePermissions.SESSION_REPLAY)])
def get_session_events(projectId: int, sessionId: Union[int, str],
                       context: schemas.CurrentContext = Depends(OR_context)):
    if not sessionId.isnumeric():
        return {"errors": ["session not found"]}
    else:
        sessionId = int(sessionId)
    data = sessions_replay.get_events(project_id=projectId, session_id=sessionId)
    if data is None:
        return {"errors": ["session not found"]}

    return {
        'data': data
    }


@app.get('/{projectId}/sessions/{sessionId}/errors/{errorId}/sourcemaps', tags=["sessions", "sourcemaps"],
         dependencies=[OR_scope(Permissions.DEV_TOOLS)])
def get_error_trace(projectId: int, sessionId: int, errorId: str,
                    context: schemas.CurrentContext = Depends(OR_context)):
    data = errors.get_trace(project_id=projectId, error_id=errorId)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.get('/{projectId}/errors/{errorId}', tags=['errors'],
         dependencies=[OR_scope(Permissions.DEV_TOOLS, ServicePermissions.DEV_TOOLS)])
def errors_get_details(projectId: int, errorId: str, density24: int = 24, density30: int = 30,
                       context: schemas.CurrentContext = Depends(OR_context)):
    data = errors_details.get_details(project_id=projectId, user_id=context.user_id, error_id=errorId,
                                      **{"density24": density24, "density30": density30})
    return data


@app.get('/{projectId}/errors/{errorId}/sourcemaps', tags=['errors'],
         dependencies=[OR_scope(Permissions.DEV_TOOLS, ServicePermissions.DEV_TOOLS)])
def errors_get_details_sourcemaps(projectId: int, errorId: str,
                                  context: schemas.CurrentContext = Depends(OR_context)):
    data = errors.get_trace(project_id=projectId, error_id=errorId)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.get('/{projectId}/errors/{errorId}/sessions', tags=["errors"], dependencies=[OR_scope(Permissions.DEV_TOOLS)])
def get_errors_sessions(projectId: int, errorId: str, action: str, startDate: int = TimeUTC.now(-7),
                        endDate: int = TimeUTC.now(),
                        context: schemas.CurrentContext = Depends(OR_context)):
    start_date = startDate
    end_date = endDate
    return {
        "data": errors.get_sessions(project_id=projectId, user_id=context.user_id, error_id=errorId,
                                    start_date=start_date, end_date=end_date)}


@app.get('/{projectId}/assist/sessions/{sessionId}', tags=["assist"],
         dependencies=[OR_scope(Permissions.ASSIST_LIVE, ServicePermissions.ASSIST_LIVE)])
def get_live_session(projectId: int, sessionId: str, background_tasks: BackgroundTasks,
                     context: schemas.CurrentContext = Depends(OR_context)):
    data = assist.get_live_session_by_id(project_id=projectId, session_id=sessionId)
    if data is None:
        data = sessions_replay.get_replay(context=context, project_id=projectId, session_id=sessionId,
                                          full_data=True, include_fav_viewed=True, group_metadata=True, live=False)
        if data is None:
            return {"errors": ["session not found"]}
        if data.get("inDB"):
            background_tasks.add_task(sessions_viewed.view_session, project_id=projectId,
                                      user_id=context.user_id, session_id=sessionId)
    return {'data': data}


@app.get('/{projectId}/unprocessed/{sessionId}/dom.mob', tags=["assist"],
         dependencies=[OR_scope(Permissions.ASSIST_LIVE, Permissions.SESSION_REPLAY,
                                ServicePermissions.ASSIST_LIVE, ServicePermissions.SESSION_REPLAY)])
def get_live_session_replay_file(projectId: int, sessionId: Union[int, str],
                                 context: schemas.CurrentContext = Depends(OR_context)):
    not_found = {"errors": ["Replay file not found"]}
    sessionId, err = unprocessed_sessions.check_exists(project_id=projectId, session_id=sessionId,
                                                       not_found_response=not_found)
    if err is not None:
        return err
    path = assist.get_raw_mob_by_id(project_id=projectId, session_id=sessionId)
    if path is None:
        return not_found

    return FileResponse(path=path, media_type="application/octet-stream")


@app.get('/{projectId}/unprocessed/{sessionId}/devtools.mob', tags=["assist"],
         dependencies=[OR_scope(Permissions.ASSIST_LIVE, Permissions.SESSION_REPLAY, Permissions.DEV_TOOLS,
                                ServicePermissions.ASSIST_LIVE, ServicePermissions.SESSION_REPLAY,
                                ServicePermissions.DEV_TOOLS)])
def get_live_session_devtools_file(projectId: int, sessionId: Union[int, str],
                                   context: schemas.CurrentContext = Depends(OR_context)):
    not_found = {"errors": ["Devtools file not found"]}
    sessionId, err = unprocessed_sessions.check_exists(project_id=projectId, session_id=sessionId,
                                                       not_found_response=not_found)
    if err is not None:
        return err
    path = assist.get_raw_devtools_by_id(project_id=projectId, session_id=sessionId)
    if path is None:
        return not_found

    return FileResponse(path=path, media_type="application/octet-stream")


@app.post('/{projectId}/heatmaps/url', tags=["heatmaps"], dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def get_heatmaps_by_url(projectId: int, data: schemas.GetHeatMapPayloadSchema = Body(...),
                        context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": heatmaps.get_by_url(project_id=projectId, data=data)}


@app.post('/{projectId}/sessions/{sessionId}/heatmaps', tags=["heatmaps"],
          dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def get_heatmaps_by_session_id_url(projectId: int, sessionId: int,
                                   data: schemas.GetHeatMapPayloadSchema = Body(...),
                                   context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": heatmaps.get_x_y_by_url_and_session_id(project_id=projectId, session_id=sessionId, data=data)}


@app.post('/{projectId}/sessions/{sessionId}/clickmaps', tags=["heatmaps"],
          dependencies=[OR_scope(Permissions.SESSION_REPLAY, ServicePermissions.SESSION_REPLAY)])
def get_clickmaps_by_session_id_url(projectId: int, sessionId: int,
                                    data: schemas.GetClickMapPayloadSchema = Body(...),
                                    context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": heatmaps.get_selectors_by_url_and_session_id(project_id=projectId, session_id=sessionId, data=data)}


@app.get('/{projectId}/sessions/{sessionId}/favorite', tags=["sessions"],
         dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def add_remove_favorite_session2(projectId: int, sessionId: int,
                                 context: schemas.CurrentContext = Depends(OR_context)):
    return sessions_favorite.favorite_session(context=context, project_id=projectId, session_id=sessionId)


@app.get('/{projectId}/sessions/{sessionId}/assign', tags=["sessions"],
         dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def assign_session(projectId: int, sessionId, context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_assignments.get_by_session(project_id=projectId, session_id=sessionId,
                                               tenant_id=context.tenant_id,
                                               user_id=context.user_id)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.get('/{projectId}/sessions/{sessionId}/assign/{issueId}', tags=["sessions", "issueTracking"],
         dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def assign_session(projectId: int, sessionId: int, issueId: str,
                   context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_assignments.get(project_id=projectId, session_id=sessionId, assignment_id=issueId,
                                    tenant_id=context.tenant_id, user_id=context.user_id)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.post('/{projectId}/sessions/{sessionId}/assign/{issueId}/comment', tags=["sessions", "issueTracking"],
          dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def comment_assignment(projectId: int, sessionId: int, issueId: str,
                       data: schemas.CommentAssignmentSchema = Body(...),
                       context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_assignments.comment(tenant_id=context.tenant_id, project_id=projectId,
                                        session_id=sessionId, assignment_id=issueId,
                                        user_id=context.user_id, message=data.message)
    if "errors" in data.keys():
        return data
    return {
        'data': data
    }


@app.get('/{projectId}/notes/{noteId}', tags=["sessions", "notes"],
         dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def get_note_by_id(projectId: int, noteId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_notes.get_note(tenant_id=context.tenant_id, project_id=projectId, note_id=noteId,
                                   user_id=context.user_id)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.post('/{projectId}/sessions/{sessionId}/notes', tags=["sessions", "notes"],
          dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def create_note(projectId: int, sessionId: int, data: schemas.SessionNoteSchema = Body(...),
                context: schemas.CurrentContext = Depends(OR_context)):
    if not sessions.session_exists(project_id=projectId, session_id=sessionId):
        return {"errors": ["Session not found"]}
    data = sessions_notes.create(tenant_id=context.tenant_id, project_id=projectId,
                                 session_id=sessionId, user_id=context.user_id, data=data)
    if "errors" in data.keys():
        return data
    return {
        'data': data
    }


@app.get('/{projectId}/sessions/{sessionId}/notes', tags=["sessions", "notes"],
         dependencies=[OR_scope(Permissions.SESSION_REPLAY, ServicePermissions.READ_NOTES)])
def get_session_notes(projectId: int, sessionId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_notes.get_session_notes(tenant_id=context.tenant_id, project_id=projectId,
                                            session_id=sessionId, user_id=context.user_id)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.post('/{projectId}/notes/{noteId}', tags=["sessions", "notes"],
          dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def edit_note(projectId: int, noteId: int, data: schemas.SessionUpdateNoteSchema = Body(...),
              context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_notes.edit(tenant_id=context.tenant_id, project_id=projectId, user_id=context.user_id,
                               note_id=noteId, data=data)
    if "errors" in data.keys():
        return data
    return {
        'data': data
    }


@app.delete('/{projectId}/notes/{noteId}', tags=["sessions", "notes"],
            dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def delete_note(projectId: int, noteId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_notes.delete(project_id=projectId, note_id=noteId)
    return data


@app.get('/{projectId}/notes/{noteId}/slack/{webhookId}', tags=["sessions", "notes"],
         dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def share_note_to_slack(projectId: int, noteId: int, webhookId: int,
                        context: schemas.CurrentContext = Depends(OR_context)):
    return sessions_notes.share_to_slack(tenant_id=context.tenant_id, project_id=projectId, user_id=context.user_id,
                                         note_id=noteId, webhook_id=webhookId)


@app.get('/{projectId}/notes/{noteId}/msteams/{webhookId}', tags=["sessions", "notes"])
def share_note_to_msteams(projectId: int, noteId: int, webhookId: int,
                          context: schemas.CurrentContext = Depends(OR_context)):
    return sessions_notes.share_to_msteams(tenant_id=context.tenant_id, project_id=projectId, user_id=context.user_id,
                                           note_id=noteId, webhook_id=webhookId)


@app.post('/{projectId}/notes', tags=["sessions", "notes"], dependencies=[OR_scope(Permissions.SESSION_REPLAY)])
def get_all_notes(projectId: int, data: schemas.SearchNoteSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_notes.get_all_notes_by_project_id(tenant_id=context.tenant_id, project_id=projectId,
                                                      user_id=context.user_id, data=data)
    if "errors" in data:
        return data
    return {'data': data}


@app.post('/{project_id}/feature-flags/search', tags=["feature flags"],
          dependencies=[OR_scope(Permissions.FEATURE_FLAGS)])
def search_feature_flags(project_id: int,
                         data: schemas.SearchFlagsSchema = Body(...),
                         context: schemas.CurrentContext = Depends(OR_context)):
    return feature_flags.search_feature_flags(project_id=project_id, user_id=context.user_id, data=data)


@app.get('/{project_id}/feature-flags/{feature_flag_id}', tags=["feature flags"],
         dependencies=[OR_scope(Permissions.FEATURE_FLAGS)])
def get_feature_flag(project_id: int, feature_flag_id: int):
    return feature_flags.get_feature_flag(project_id=project_id, feature_flag_id=feature_flag_id)


@app.post('/{project_id}/feature-flags', tags=["feature flags"], dependencies=[OR_scope(Permissions.FEATURE_FLAGS)])
def add_feature_flag(project_id: int, data: schemas.FeatureFlagSchema = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return feature_flags.create_feature_flag(project_id=project_id, user_id=context.user_id, feature_flag_data=data)


@app.put('/{project_id}/feature-flags/{feature_flag_id}', tags=["feature flags"],
         dependencies=[OR_scope(Permissions.FEATURE_FLAGS)])
def update_feature_flag(project_id: int, feature_flag_id: int, data: schemas.FeatureFlagSchema = Body(...),
                        context: schemas.CurrentContext = Depends(OR_context)):
    return feature_flags.update_feature_flag(project_id=project_id, feature_flag_id=feature_flag_id,
                                             user_id=context.user_id, feature_flag=data)


@app.delete('/{project_id}/feature-flags/{feature_flag_id}', tags=["feature flags"],
            dependencies=[OR_scope(Permissions.FEATURE_FLAGS)])
def delete_feature_flag(project_id: int, feature_flag_id: int, _=Body(None)):
    return {"data": feature_flags.delete_feature_flag(project_id=project_id, feature_flag_id=feature_flag_id)}


@app.post('/{project_id}/feature-flags/{feature_flag_id}/status', tags=["feature flags"],
          dependencies=[OR_scope(Permissions.FEATURE_FLAGS)])
def update_feature_flag_status(project_id: int, feature_flag_id: int,
                               data: schemas.FeatureFlagStatus = Body(...)):
    return {"data": feature_flags.update_feature_flag_status(project_id=project_id, feature_flag_id=feature_flag_id,
                                                             is_active=data.is_active)}
