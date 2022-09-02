from typing import Optional

from decouple import config
from fastapi import Body, Depends, BackgroundTasks
from starlette.responses import RedirectResponse

import schemas
from chalicelib.core import integrations_manager
from chalicelib.core import sessions
from chalicelib.core import tenants, users, projects, license
from chalicelib.core import webhook
from chalicelib.core.collaboration_slack import Slack
from chalicelib.utils import helper
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
@app.put('/account', tags=["account"])
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


@app.put('/integrations/slack', tags=['integrations'])
@app.post('/integrations/slack', tags=['integrations'])
def add_slack_client(data: schemas.AddSlackSchema, context: schemas.CurrentContext = Depends(OR_context)):
    n = Slack.add_channel(tenant_id=context.tenant_id, url=data.url, name=data.name)
    if n is None:
        return {
            "errors": ["We couldn't send you a test message on your Slack channel. Please verify your webhook url."]
        }
    return {"data": n}


@app.put('/integrations/slack/{integrationId}', tags=['integrations'])
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
@app.put('/client/members', tags=["client"])
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
@public_app.put('/password/reset', tags=["users"])
def change_password_by_invitation(data: schemas.EditPasswordByInvitationSchema = Body(...)):
    if data is None or len(data.invitation) < 64 or len(data.passphrase) < 8:
        return {"errors": ["please provide a valid invitation & pass"]}
    user = users.get_by_invitation_token(token=data.invitation, pass_token=data.passphrase)
    if user is None:
        return {"errors": ["invitation not found"]}
    if user["expiredChange"]:
        return {"errors": ["expired change, please re-use the invitation link"]}

    return users.set_password_invitation(new_password=data.password, user_id=user["userId"])


@app.put('/client/members/{memberId}', tags=["client"])
@app.post('/client/members/{memberId}', tags=["client"])
def edit_member(memberId: int, data: schemas.EditMemberSchema,
                context: schemas.CurrentContext = Depends(OR_context)):
    return users.edit(tenant_id=context.tenant_id, editor_id=context.user_id, changes=data,
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
