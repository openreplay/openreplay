from typing import Optional

from decouple import config
from fastapi import Body, Depends, HTTPException, status, BackgroundTasks
from starlette.responses import RedirectResponse

import schemas
import schemas_ee
from chalicelib.core import integrations_manager
from chalicelib.core import sessions
from chalicelib.core import tenants, users, metadata, projects, license, assist
from chalicelib.core import webhook
from chalicelib.core.collaboration_slack import Slack
from chalicelib.utils import captcha, SAML2_helper
from chalicelib.utils import helper
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@public_app.get('/signup', tags=['signup'])
def get_all_signup():
    return {"data": {"tenants": tenants.tenants_exists(),
                     "sso": SAML2_helper.is_saml2_available(),
                     "ssoProvider": SAML2_helper.get_saml2_provider(),
                     "edition": helper.get_edition()}}


@public_app.post('/login', tags=["authentication"])
def login(data: schemas.UserLoginSchema = Body(...)):
    if helper.allow_captcha() and not captcha.is_valid(data.g_recaptcha_response):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid captcha."
        )

    r = users.authenticate(data.email, data.password, for_plugin=False)
    if r is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You’ve entered invalid Email or Password."
        )

    tenant_id = r.pop("tenantId")

    r["limits"] = {
        "teamMember": -1,
        "projects": -1,
        "metadata": metadata.get_remaining_metadata_with_count(tenant_id)}

    c = tenants.get_by_tenant_id(tenant_id)
    c.pop("createdAt")
    c["projects"] = projects.get_projects(tenant_id=tenant_id, recording_state=True, recorded=True,
                                          stack_integrations=True, version=True, user_id=r["id"])
    c["smtp"] = helper.has_smtp()
    c["iceServers"] = assist.get_ice_servers()
    r["smtp"] = c["smtp"]
    r["iceServers"] = c["iceServers"]
    return {
        'jwt': r.pop('jwt'),
        'data': {
            "user": r,
            "client": c
        }
    }


@app.get('/account', tags=['accounts'])
def get_account(context: schemas.CurrentContext = Depends(OR_context)):
    r = users.get(tenant_id=context.tenant_id, user_id=context.user_id)
    return {
        'data': {
            **r,
            "limits": {
                "teamMember": -1,
                "projects": -1,
                "metadata": metadata.get_remaining_metadata_with_count(context.tenant_id)
            },
            **license.get_status(context.tenant_id),
            "smtp": helper.has_smtp(),
            "saml2": SAML2_helper.is_saml2_available(),
            "iceServers": assist.get_ice_servers()
        }
    }


@app.get('/projects/limit', tags=['projects'])
def get_projects_limit(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": {
        "current": projects.count_by_tenant(tenant_id=context.tenant_id),
        "remaining": -1
    }}


@app.get('/projects/{projectId}', tags=['projects'])
def get_project(projectId: int, last_tracker_version: Optional[str] = None,
                context: schemas.CurrentContext = Depends(OR_context)):
    data = projects.get_project(tenant_id=context.tenant_id, project_id=projectId, include_last_session=True,
                                include_gdpr=True, last_tracker_version=last_tracker_version)
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


# this endpoint supports both jira & github based on `provider` attribute
@app.post('/integrations/issues', tags=["integrations"])
def add_edit_jira_cloud_github(data: schemas.JiraGithubSchema,
                               context: schemas.CurrentContext = Depends(OR_context)):
    provider = data.provider.upper()
    error, integration = integrations_manager.get_integration(tool=provider, tenant_id=context.tenant_id,
                                                              user_id=context.user_id)
    if error is not None:
        return error
    return {"data": integration.add_edit(data=data.dict())}


@app.post('/client/members', tags=["client"])
@app.put('/client/members', tags=["client"])
def add_member(background_tasks: BackgroundTasks, data: schemas_ee.CreateMemberSchema = Body(...),
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

    return users.set_password_invitation(new_password=data.password, user_id=user["userId"], tenant_id=user["tenantId"])


@app.put('/client/members/{memberId}', tags=["client"])
@app.post('/client/members/{memberId}', tags=["client"])
def edit_member(memberId: int, data: schemas_ee.EditMemberSchema,
                context: schemas.CurrentContext = Depends(OR_context)):
    return users.edit(tenant_id=context.tenant_id, editor_id=context.user_id, changes=data.dict(),
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


@app.get('/plans', tags=["plan"])
def get_current_plan(context: schemas.CurrentContext = Depends(OR_context)):
    return {
        "data": license.get_status(context.tenant_id)
    }


@public_app.get('/general_stats', tags=["private"], include_in_schema=False)
def get_general_stats():
    return {"data": {"sessions:": sessions.count_all()}}


@app.get('/client', tags=['projects'])
def get_client(context: schemas.CurrentContext = Depends(OR_context)):
    r = tenants.get_by_tenant_id(context.tenant_id)
    if r is not None:
        r.pop("createdAt")
        r["projects"] = projects.get_projects(tenant_id=context.tenant_id, recording_state=True, recorded=True,
                                              stack_integrations=True, version=True, user_id=context.user_id)
    return {
        'data': r
    }


@app.get('/projects', tags=['projects'])
def get_projects(last_tracker_version: Optional[str] = None, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": projects.get_projects(tenant_id=context.tenant_id, recording_state=True, gdpr=True, recorded=True,
                                          stack_integrations=True, version=True,
                                          last_tracker_version=last_tracker_version, user_id=context.user_id)}
