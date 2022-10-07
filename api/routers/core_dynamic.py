from typing import Optional, Union

from decouple import config
from fastapi import Body, Depends, BackgroundTasks
from starlette.responses import RedirectResponse, FileResponse

import schemas
from chalicelib.core import sessions, errors, errors_viewed, errors_favorite, sessions_assignments, heatmaps, \
    sessions_favorite, assist, sessions_notes
from chalicelib.core import sessions_viewed
from chalicelib.core import tenants, users, projects, license
from chalicelib.core import webhook
from chalicelib.core.collaboration_slack import Slack
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@public_app.get('/signup', tags=['signup'])
def get_all_signup():
    return {"data": {"tenants": tenants.tenants_exists(),
                     "sso": None,
                     "ssoProvider": None,
                     "edition": license.EDITION}}


@app.get('/account', tags=['accounts'])
def get_account(context: schemas.CurrentContext = Depends(OR_context)):
    r = users.get(tenant_id=context.tenant_id, user_id=context.user_id)
    t = tenants.get_by_tenant_id(context.tenant_id)
    if t is not None:
        t.pop("createdAt")
        t["tenantName"] = t.pop("name")
    return {
        'data': {
            **r,
            **t,
            **license.get_status(context.tenant_id),
            "smtp": helper.has_smtp(),
            # "iceServers": assist.get_ice_servers()
        }
    }


@app.post('/account', tags=["account"])
def edit_account(data: schemas.EditUserSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return users.edit(tenant_id=context.tenant_id, user_id_to_update=context.user_id, changes=data,
                      editor_id=context.user_id)


@app.get('/projects/limit', tags=['projects'])
def get_projects_limit(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": {
        "current": projects.count_by_tenant(tenant_id=context.tenant_id),
        "remaining": -1
    }}


@app.get('/projects/{projectId}', tags=['projects'])
def get_project(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = projects.get_project(tenant_id=context.tenant_id, project_id=projectId, include_last_session=True,
                                include_gdpr=True)
    if data is None:
        return {"errors": ["project not found"]}
    return {"data": data}


@app.post('/integrations/slack', tags=['integrations'])
@app.put('/integrations/slack', tags=['integrations'])
def add_slack_client(data: schemas.AddSlackSchema, context: schemas.CurrentContext = Depends(OR_context)):
    n = Slack.add_channel(tenant_id=context.tenant_id, url=data.url, name=data.name)
    if n is None:
        return {
            "errors": ["We couldn't send you a test message on your Slack channel. Please verify your webhook url."]
        }
    return {"data": n}


@app.post('/integrations/slack/{integrationId}', tags=['integrations'])
def edit_slack_integration(integrationId: int, data: schemas.EditSlackSchema = Body(...),
                           context: schemas.CurrentContext = Depends(OR_context)):
    if len(data.url) > 0:
        old = webhook.get(tenant_id=context.tenant_id, webhook_id=integrationId)
        if old["endpoint"] != data.url:
            if not Slack.say_hello(data.url):
                return {
                    "errors": [
                        "We couldn't send you a test message on your Slack channel. Please verify your webhook url."]
                }
    return {"data": webhook.update(tenant_id=context.tenant_id, webhook_id=integrationId,
                                   changes={"name": data.name, "endpoint": data.url})}


@app.post('/client/members', tags=["client"])
def add_member(background_tasks: BackgroundTasks, data: schemas.CreateMemberSchema = Body(...),
               context: schemas.CurrentContext = Depends(OR_context)):
    return users.create_member(tenant_id=context.tenant_id, user_id=context.user_id, data=data.dict(),
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

    return users.set_password_invitation(new_password=data.password, user_id=user["userId"])


@app.post('/client/members/{memberId}', tags=["client"])
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


@public_app.get('/general_stats', tags=["private"], include_in_schema=False)
def get_general_stats():
    return {"data": {"sessions:": sessions.count_all()}}


@app.get('/projects', tags=['projects'])
def get_projects(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": projects.get_projects(tenant_id=context.tenant_id, recording_state=True, gdpr=True, recorded=True,
                                          stack_integrations=True)}


@app.get('/{projectId}/sessions/{sessionId}', tags=["sessions"])
@app.get('/{projectId}/sessions2/{sessionId}', tags=["sessions"])
def get_session(projectId: int, sessionId: Union[int, str], background_tasks: BackgroundTasks,
                context: schemas.CurrentContext = Depends(OR_context)):
    if isinstance(sessionId, str):
        return {"errors": ["session not found"]}
    data = sessions.get_by_id2_pg(project_id=projectId, session_id=sessionId, full_data=True,
                                  include_fav_viewed=True, group_metadata=True, context=context)
    if data is None:
        return {"errors": ["session not found"]}
    if data.get("inDB"):
        background_tasks.add_task(sessions_viewed.view_session, project_id=projectId, user_id=context.user_id,
                                  session_id=sessionId)
    return {
        'data': data
    }


@app.get('/{projectId}/sessions/{sessionId}/errors/{errorId}/sourcemaps', tags=["sessions", "sourcemaps"])
@app.get('/{projectId}/sessions2/{sessionId}/errors/{errorId}/sourcemaps', tags=["sessions", "sourcemaps"])
def get_error_trace(projectId: int, sessionId: int, errorId: str,
                    context: schemas.CurrentContext = Depends(OR_context)):
    data = errors.get_trace(project_id=projectId, error_id=errorId)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.post('/{projectId}/errors/search', tags=['errors'])
def errors_search(projectId: int, data: schemas.SearchErrorsSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": errors.search(data, projectId, user_id=context.user_id)}


@app.get('/{projectId}/errors/stats', tags=['errors'])
def errors_stats(projectId: int, startTimestamp: int, endTimestamp: int,
                 context: schemas.CurrentContext = Depends(OR_context)):
    return errors.stats(projectId, user_id=context.user_id, startTimestamp=startTimestamp, endTimestamp=endTimestamp)


@app.get('/{projectId}/errors/{errorId}', tags=['errors'])
def errors_get_details(projectId: int, errorId: str, background_tasks: BackgroundTasks, density24: int = 24,
                       density30: int = 30,
                       context: schemas.CurrentContext = Depends(OR_context)):
    data = errors.get_details(project_id=projectId, user_id=context.user_id, error_id=errorId,
                              **{"density24": density24, "density30": density30})
    if data.get("data") is not None:
        background_tasks.add_task(errors_viewed.viewed_error, project_id=projectId, user_id=context.user_id,
                                  error_id=errorId)
    return data


@app.get('/{projectId}/errors/{errorId}/stats', tags=['errors'])
def errors_get_details_right_column(projectId: int, errorId: str, startDate: int = TimeUTC.now(-7),
                                    endDate: int = TimeUTC.now(), density: int = 7,
                                    context: schemas.CurrentContext = Depends(OR_context)):
    data = errors.get_details_chart(project_id=projectId, user_id=context.user_id, error_id=errorId,
                                    **{"startDate": startDate, "endDate": endDate, "density": density})
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
                              endDate: int = TimeUTC.now(), context: schemas.CurrentContext = Depends(OR_context)):
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
        data = sessions.get_by_id2_pg(tenant_id=context.tenant_id, project_id=projectId, session_id=sessionId,
                                      full_data=True, user_id=context.user_id, include_fav_viewed=True,
                                      group_metadata=True, live=False)
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
    if isinstance(sessionId, str):
        print(f"{sessionId} not a valid number.")
        return not_found
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
    if isinstance(sessionId, str):
        print(f"{sessionId} not a valid number.")
        return not_found
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
    return {"data": heatmaps.get_by_url(project_id=projectId, data=data.dict())}


@app.get('/{projectId}/sessions/{sessionId}/favorite', tags=["sessions"])
@app.get('/{projectId}/sessions2/{sessionId}/favorite', tags=["sessions"])
def add_remove_favorite_session2(projectId: int, sessionId: int,
                                 context: schemas.CurrentContext = Depends(OR_context)):
    return {
        "data": sessions_favorite.favorite_session(tenant_id=context.tenant_id, project_id=projectId,
                                                   user_id=context.user_id, session_id=sessionId)}


@app.get('/{projectId}/sessions/{sessionId}/assign', tags=["sessions"])
@app.get('/{projectId}/sessions2/{sessionId}/assign', tags=["sessions"])
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
@app.get('/{projectId}/sessions2/{sessionId}/assign/{issueId}', tags=["sessions", "issueTracking"])
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
@app.post('/{projectId}/sessions2/{sessionId}/assign/{issueId}/comment', tags=["sessions", "issueTracking"])
def comment_assignment(projectId: int, sessionId: int, issueId: str, data: schemas.CommentAssignmentSchema = Body(...),
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
def delete_note(projectId: int, noteId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_notes.delete(tenant_id=context.tenant_id, project_id=projectId, user_id=context.user_id,
                                 note_id=noteId)
    return data


@app.get('/{projectId}/notes/{noteId}/slack/{webhookId}', tags=["sessions", "notes"])
def share_note_to_slack(projectId: int, noteId: int, webhookId: int,
                        context: schemas.CurrentContext = Depends(OR_context)):
    return sessions_notes.share_to_slack(tenant_id=context.tenant_id, project_id=projectId, user_id=context.user_id,
                                         note_id=noteId, webhook_id=webhookId)


@app.post('/{projectId}/notes', tags=["sessions", "notes"])
def get_all_notes(projectId: int, data: schemas.SearchNoteSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_notes.get_all_notes_by_project_id(tenant_id=context.tenant_id, project_id=projectId,
                                                      user_id=context.user_id, data=data)
    if "errors" in data:
        return data
    return {'data': data}
