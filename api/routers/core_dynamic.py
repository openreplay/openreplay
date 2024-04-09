from typing import Optional, Union

from decouple import config
from fastapi import Body, Depends, BackgroundTasks
from fastapi import HTTPException, status
from starlette.responses import RedirectResponse, FileResponse, JSONResponse, Response

import schemas
from chalicelib.core import sessions, errors, errors_viewed, errors_favorite, sessions_assignments, heatmaps, \
    sessions_favorite, assist, sessions_notes, click_maps, sessions_replay, signup, feature_flags
from chalicelib.core import sessions_viewed
from chalicelib.core import tenants, users, projects, license
from chalicelib.core import webhook
from chalicelib.core.collaboration_slack import Slack
from chalicelib.utils import captcha, smtp
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC
from or_dependencies import OR_context, OR_role
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


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
    async def signup_handler(data: schemas.UserSignupSchema = Body(...)):
        content = await signup.create_tenant(data)
        if "errors" in content:
            return content
        refresh_token = content.pop("refreshToken")
        refresh_token_max_age = content.pop("refreshTokenMaxAge")
        response = JSONResponse(content=content)
        response.set_cookie(key="refreshToken", value=refresh_token, path="/api/refresh",
                            max_age=refresh_token_max_age, secure=True, httponly=True)
        return response


@public_app.post('/login', tags=["authentication"])
def login_user(response: JSONResponse, data: schemas.UserLoginSchema = Body(...)):
    if helper.allow_captcha() and not captcha.is_valid(data.g_recaptcha_response):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid captcha."
        )

    r = users.authenticate(data.email, data.password.get_secret_value())
    if r is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You’ve entered invalid Email or Password."
        )
    if "errors" in r:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=r["errors"][0]
        )

    r["smtp"] = smtp.has_smtp()
    refresh_token = r.pop("refreshToken")
    refresh_token_max_age = r.pop("refreshTokenMaxAge")
    content = {
        'jwt': r.pop('jwt'),
        'data': {
            "user": r
        }
    }
    response = JSONResponse(content=content)
    response.set_cookie(key="refreshToken", value=refresh_token, path="/api/refresh",
                        max_age=refresh_token_max_age, secure=True, httponly=True)
    return response


@app.get('/logout', tags=["login"])
def logout_user(response: Response, context: schemas.CurrentContext = Depends(OR_context)):
    users.logout(user_id=context.user_id)
    response.delete_cookie(key="refreshToken", path="/api/refresh")
    return {"data": "success"}


@app.get('/refresh', tags=["login"])
def refresh_login(context: schemas.CurrentContext = Depends(OR_context)):
    r = users.refresh(user_id=context.user_id)
    content = {"jwt": r.get("jwt")}
    response = JSONResponse(content=content)
    response.set_cookie(key="refreshToken", value=r.get("refreshToken"), path="/api/refresh",
                        max_age=r.pop("refreshTokenMaxAge"), secure=True, httponly=True)
    return response


@app.get('/account', tags=['accounts'])
def get_account(context: schemas.CurrentContext = Depends(OR_context)):
    r = users.get(tenant_id=context.tenant_id, user_id=context.user_id)
    t = tenants.get_by_tenant_id(context.tenant_id)
    if t is not None:
        t["createdAt"] = TimeUTC.datetime_to_timestamp(t["createdAt"])
        t["tenantName"] = t.pop("name")
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
def change_password_by_invitation(data: schemas.EditPasswordByInvitationSchema = Body(...)):
    if data is None or len(data.invitation) < 64 or len(data.passphrase) < 8:
        return {"errors": ["please provide a valid invitation & pass"]}
    user = users.get_by_invitation_token(token=data.invitation, pass_token=data.passphrase)
    if user is None:
        return {"errors": ["invitation not found"]}
    if user["expiredChange"]:
        return {"errors": ["expired change, please re-use the invitation link"]}

    return users.set_password_invitation(new_password=data.password.get_secret_value(), user_id=user["userId"])


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
    if len(value) == 0:
        return {"errors": ["please provide a value for search"]}
    if len(key) == 0:
        return {"errors": ["please provide a key for search"]}
    return {
        "data": sessions.search_by_metadata(tenant_id=context.tenant_id, user_id=context.user_id, m_value=value,
                                            m_key=key, project_id=projectId)}


@app.get('/projects', tags=['projects'])
def get_projects(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": projects.get_projects(tenant_id=context.tenant_id, gdpr=True, recorded=True)}


# for backward compatibility
@app.get('/{projectId}/sessions/{sessionId}', tags=["sessions", "replay"])
def get_session(projectId: int, sessionId: Union[int, str], background_tasks: BackgroundTasks,
                context: schemas.CurrentContext = Depends(OR_context)):
    if not sessionId.isnumeric():
        return {"errors": ["session not found"]}
    else:
        sessionId = int(sessionId)
    data = sessions_replay.get_by_id2_pg(project_id=projectId, session_id=sessionId, full_data=True,
                                         include_fav_viewed=True, group_metadata=True, context=context)
    if data is None:
        return {"errors": ["session not found"]}
    if data.get("inDB"):
        background_tasks.add_task(sessions_viewed.view_session, project_id=projectId, user_id=context.user_id,
                                  session_id=sessionId)
    return {
        'data': data
    }


@app.post('/{projectId}/sessions/search', tags=["sessions"])
def sessions_search(projectId: int, data: schemas.SessionsSearchPayloadSchema = Body(...),
                    context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions.search_sessions(data=data, project_id=projectId, user_id=context.user_id,
                                    platform=context.project.platform)
    return {'data': data}


@app.post('/{projectId}/sessions/search/ids', tags=["sessions"])
def session_ids_search(projectId: int, data: schemas.SessionsSearchPayloadSchema = Body(...),
                       context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions.search_sessions(data=data, project_id=projectId, user_id=context.user_id, ids_only=True,
                                    platform=context.project.platform)
    return {'data': data}


@app.get('/{projectId}/sessions/{sessionId}/replay', tags=["sessions", "replay"])
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


@app.get('/{projectId}/sessions/{sessionId}/events', tags=["sessions", "replay"])
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
def errors_get_details(projectId: int, errorId: str, background_tasks: BackgroundTasks, density24: int = 24,
                       density30: int = 30, context: schemas.CurrentContext = Depends(OR_context)):
    data = errors.get_details(project_id=projectId, user_id=context.user_id, error_id=errorId,
                              **{"density24": density24, "density30": density30})
    if data.get("data") is not None:
        background_tasks.add_task(errors_viewed.viewed_error, project_id=projectId, user_id=context.user_id,
                                  error_id=errorId)
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


@app.get('/{projectId}/errors/{errorId}/{action}', tags=["errors"])
def add_remove_favorite_error(projectId: int, errorId: str, action: str, startDate: int = TimeUTC.now(-7),
                              endDate: int = TimeUTC.now(),
                              context: schemas.CurrentContext = Depends(OR_context)):
    if action == "favorite":
        return errors_favorite.favorite_error(project_id=projectId, user_id=context.user_id, error_id=errorId)
    elif action == "sessions":
        start_date = startDate
        end_date = endDate
        return {
            "data": errors.get_sessions(project_id=projectId, user_id=context.user_id, error_id=errorId,
                                        start_date=start_date, end_date=end_date)}
    elif action in list(errors.ACTION_STATE.keys()):
        return errors.change_state(project_id=projectId, user_id=context.user_id, error_id=errorId, action=action)
    else:
        return {"errors": ["undefined action"]}


@app.get('/{projectId}/assist/sessions/{sessionId}', tags=["assist"])
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


@app.get('/{projectId}/unprocessed/{sessionId}/dom.mob', tags=["assist"])
def get_live_session_replay_file(projectId: int, sessionId: Union[int, str],
                                 context: schemas.CurrentContext = Depends(OR_context)):
    not_found = {"errors": ["Replay file not found"]}
    if not sessionId.isnumeric():
        return not_found
    else:
        sessionId = int(sessionId)
    if not sessions.session_exists(project_id=projectId, session_id=sessionId):
        print(f"{projectId}/{sessionId} not found in DB.")
        if not assist.session_exists(project_id=projectId, session_id=sessionId):
            print(f"{projectId}/{sessionId} not found in Assist.")
            return not_found

    path = assist.get_raw_mob_by_id(project_id=projectId, session_id=sessionId)
    if path is None:
        return not_found

    return FileResponse(path=path, media_type="application/octet-stream")


@app.get('/{projectId}/unprocessed/{sessionId}/devtools.mob', tags=["assist"])
def get_live_session_devtools_file(projectId: int, sessionId: Union[int, str],
                                   context: schemas.CurrentContext = Depends(OR_context)):
    not_found = {"errors": ["Devtools file not found"]}
    if not sessionId.isnumeric():
        return not_found
    else:
        sessionId = int(sessionId)
    if not sessions.session_exists(project_id=projectId, session_id=sessionId):
        print(f"{projectId}/{sessionId} not found in DB.")
        if not assist.session_exists(project_id=projectId, session_id=sessionId):
            print(f"{projectId}/{sessionId} not found in Assist.")
            return not_found

    path = assist.get_raw_devtools_by_id(project_id=projectId, session_id=sessionId)
    if path is None:
        return {"errors": ["Devtools file not found"]}

    return FileResponse(path=path, media_type="application/octet-stream")


@app.post('/{projectId}/heatmaps/url', tags=["heatmaps"])
def get_heatmaps_by_url(projectId: int, data: schemas.GetHeatmapPayloadSchema = Body(...),
                        context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": heatmaps.get_by_url(project_id=projectId, data=data)}


@app.get('/{projectId}/sessions/{sessionId}/favorite', tags=["sessions"])
def add_remove_favorite_session2(projectId: int, sessionId: int,
                                 context: schemas.CurrentContext = Depends(OR_context)):
    return sessions_favorite.favorite_session(context=context, project_id=projectId, session_id=sessionId)


@app.get('/{projectId}/sessions/{sessionId}/assign', tags=["sessions"])
def assign_session(projectId: int, sessionId, context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_assignments.get_by_session(project_id=projectId, session_id=sessionId,
                                               tenant_id=context.tenant_id,
                                               user_id=context.user_id)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.get('/{projectId}/sessions/{sessionId}/assign/{issueId}', tags=["sessions", "issueTracking"])
def assign_session(projectId: int, sessionId: int, issueId: str,
                   context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_assignments.get(project_id=projectId, session_id=sessionId, assignment_id=issueId,
                                    tenant_id=context.tenant_id, user_id=context.user_id)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.post('/{projectId}/sessions/{sessionId}/assign/{issueId}/comment', tags=["sessions", "issueTracking"])
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


@app.post('/{projectId}/sessions/{sessionId}/notes', tags=["sessions", "notes"])
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


@app.get('/{projectId}/sessions/{sessionId}/notes', tags=["sessions", "notes"])
def get_session_notes(projectId: int, sessionId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_notes.get_session_notes(tenant_id=context.tenant_id, project_id=projectId,
                                            session_id=sessionId, user_id=context.user_id)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.post('/{projectId}/notes/{noteId}', tags=["sessions", "notes"])
def edit_note(projectId: int, noteId: int, data: schemas.SessionUpdateNoteSchema = Body(...),
              context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_notes.edit(tenant_id=context.tenant_id, project_id=projectId, user_id=context.user_id,
                               note_id=noteId, data=data)
    if "errors" in data.keys():
        return data
    return {
        'data': data
    }


@app.delete('/{projectId}/notes/{noteId}', tags=["sessions", "notes"])
def delete_note(projectId: int, noteId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_notes.delete(project_id=projectId, note_id=noteId)
    return data


@app.get('/{projectId}/notes/{noteId}/slack/{webhookId}', tags=["sessions", "notes"])
def share_note_to_slack(projectId: int, noteId: int, webhookId: int,
                        context: schemas.CurrentContext = Depends(OR_context)):
    return sessions_notes.share_to_slack(tenant_id=context.tenant_id, project_id=projectId, user_id=context.user_id,
                                         note_id=noteId, webhook_id=webhookId)


@app.get('/{projectId}/notes/{noteId}/msteams/{webhookId}', tags=["sessions", "notes"])
def share_note_to_msteams(projectId: int, noteId: int, webhookId: int,
                          context: schemas.CurrentContext = Depends(OR_context)):
    return sessions_notes.share_to_msteams(tenant_id=context.tenant_id, project_id=projectId, user_id=context.user_id,
                                           note_id=noteId, webhook_id=webhookId)


@app.post('/{projectId}/notes', tags=["sessions", "notes"])
def get_all_notes(projectId: int, data: schemas.SearchNoteSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_notes.get_all_notes_by_project_id(tenant_id=context.tenant_id, project_id=projectId,
                                                      user_id=context.user_id, data=data)
    if "errors" in data:
        return data
    return {'data': data}


@app.post('/{projectId}/click_maps/search', tags=["click maps"])
def click_map_search(projectId: int, data: schemas.ClickMapSessionsSearch = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": click_maps.search_short_session(user_id=context.user_id, data=data, project_id=projectId)}


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
