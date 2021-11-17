from typing import Union

from decouple import config
from fastapi import Body, Depends, HTTPException, status, BackgroundTasks
from starlette.responses import RedirectResponse

import schemas
from chalicelib.core import boarding
from chalicelib.core import errors
from chalicelib.core import errors_favorite_viewed
from chalicelib.core import integrations_manager
from chalicelib.core import sessions
from chalicelib.core import tenants, users, metadata, projects, license, signup, slack, alerts, notifications
from chalicelib.core import webhook
from chalicelib.core.collaboration_slack import Slack
from chalicelib.utils import captcha, SAML2_helper
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@public_app.get('/signup', tags=['signup'])
def get_all_signup():
    return {"data": tenants.tenants_exists()}


@public_app.put('/signup', tags=['signup'])
@public_app.post('/signup', tags=['signup'])
def signup_handler(data: schemas.UserSignupSchema = Body(...)):
    return signup.create_step1(data.dict())


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
                                          stack_integrations=True, version=True)
    c["smtp"] = helper.has_smtp()
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
            "saml2": SAML2_helper.is_saml2_available()
        }
    }


@app.get('/projects', tags=['projects'])
def get_projects(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": projects.get_projects(tenant_id=context.tenant_id, recording_state=True, gdpr=True, recorded=True,
                                          stack_integrations=True, version=True)}


@app.post('/projects', tags=['projects'])
@app.put('/projects', tags=['projects'])
def create_project(data: schemas.CreateProjectSchema = Body(...),
                   context: schemas.CurrentContext = Depends(OR_context)):
    return projects.create(tenant_id=context.tenant_id, user_id=context.user_id, data=data)


@app.post('/projects/{projectId}', tags=['projects'])
@app.put('/projects/{projectId}', tags=['projects'])
def edit_project(projectId: int, data: schemas.CreateProjectSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return projects.edit(tenant_id=context.tenant_id, user_id=context.user_id, data=data, project_id=projectId)


@app.delete('/projects/{projectId}', tags=['projects'])
def delete_project(projectId, context: schemas.CurrentContext = Depends(OR_context)):
    return projects.delete(tenant_id=context.tenant_id, user_id=context.user_id, project_id=projectId)


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


@app.get('/client', tags=['projects'])
def get_client(context: schemas.CurrentContext = Depends(OR_context)):
    r = tenants.get_by_tenant_id(context.tenant_id)
    if r is not None:
        r.pop("createdAt")
        r["projects"] = projects.get_projects(tenant_id=context.tenant_id, recording_state=True, recorded=True,
                                              stack_integrations=True, version=True)
    return {
        'data': r
    }


@app.get('/client/new_api_key', tags=['client'])
def generate_new_tenant_token(context: schemas.CurrentContext = Depends(OR_context)):
    return {
        'data': tenants.generate_new_api_key(context.tenant_id)
    }


@app.put('/client', tags=['client'])
@app.post('/client', tags=['client'])
def edit_client(data: schemas.UpdateTenantSchema = Body(...),
                context: schemas.CurrentContext = Depends(OR_context)):
    return tenants.update(tenant_id=context.tenant_id, user_id=context.user_id, data=data)


@app.put('/integrations/slack', tags=['integrations'])
@app.post('/integrations/slack', tags=['integrations'])
def add_slack_client(data: schemas.AddSlackSchema, context: schemas.CurrentContext = Depends(OR_context)):
    if "url" not in data or "name" not in data:
        return {"errors": ["please provide a url and a name"]}
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


@app.post('/{projectId}/errors/search', tags=['errors'])
def errors_search(projectId: int, status: str = "ALL", favorite: Union[str, bool] = False,
                  data: schemas.SearchErrorsSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    if isinstance(favorite, str):
        favorite = True if len(favorite) == 0 else False
    return errors.search(data.dict(), projectId, user_id=context.user_id, status=status,
                         favorite_only=favorite)


@app.get('/{projectId}/errors/stats', tags=['errors'])
def errors_stats(projectId: int, startTimestamp: int, endTimestamp: int,
                 context: schemas.CurrentContext = Depends(OR_context)):
    return errors.stats(projectId, user_id=context.user_id, startTimestamp=startTimestamp, endTimestamp=endTimestamp)


@app.get('/{projectId}/errors/{errorId}', tags=['errors'])
def errors_get_details(projectId: int, errorId: str, density24: int = 24, density30: int = 30,
                       context: schemas.CurrentContext = Depends(OR_context)):
    data = errors.get_details(project_id=projectId, user_id=context.user_id, error_id=errorId,
                              **{"density24": density24, "density30": density30})
    if data.get("data") is not None:
        errors_favorite_viewed.viewed_error(project_id=projectId, user_id=context.user_id, error_id=errorId)
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
        return errors_favorite_viewed.favorite_error(project_id=projectId, user_id=context.user_id, error_id=errorId)
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


@public_app.post('/async/alerts/notifications/{step}', tags=["async", "alerts"])
@public_app.put('/async/alerts/notifications/{step}', tags=["async", "alerts"])
def send_alerts_notification_async(step: str, data: schemas.AlertNotificationSchema = Body(...)):
    if data.auth != config("async_Token"):
        return {"errors": ["missing auth"]}
    if step == "slack":
        slack.send_batch(notifications_list=data.notifications)
    elif step == "email":
        alerts.send_by_email_batch(notifications_list=data.notifications)
    elif step == "webhook":
        webhook.trigger_batch(data_list=data.notifications)


@app.get('/notifications', tags=['notifications'])
def get_notifications(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": notifications.get_all(tenant_id=context.tenant_id, user_id=context.user_id)}


@app.get('/notifications/{notificationId}/view', tags=['notifications'])
def view_notifications(notificationId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": notifications.view_notification(notification_ids=[notificationId], user_id=context.user_id)}


@app.post('/notifications/view', tags=['notifications'])
@app.put('/notifications/view', tags=['notifications'])
def batch_view_notifications(data: schemas.NotificationsViewSchema,
                             context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": notifications.view_notification(notification_ids=data.ids,
                                                    startTimestamp=data.startTimestamp,
                                                    endTimestamp=data.endTimestamp,
                                                    user_id=context.user_id,
                                                    tenant_id=context.tenant_id)}


@public_app.post('/notifications', tags=['notifications'])
@public_app.put('/notifications', tags=['notifications'])
def create_notifications(data: schemas.CreateNotificationSchema):
    if data.token != config("async_Token"):
        return {"errors": ["missing token"]}
    return notifications.create(data.notifications)


@app.get('/boarding', tags=['boarding'])
def get_boarding_state(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": boarding.get_state(tenant_id=context.tenant_id)}


@app.get('/boarding/installing', tags=['boarding'])
def get_boarding_state_installing(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": boarding.get_state_installing(tenant_id=context.tenant_id)}


@app.get('/boarding/identify-users', tags=["boarding"])
def get_boarding_state_identify_users(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": boarding.get_state_identify_users(tenant_id=context.tenant_id)}


@app.get('/boarding/manage-users', tags=["boarding"])
def get_boarding_state_manage_users(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": boarding.get_state_manage_users(tenant_id=context.tenant_id)}


@app.get('/boarding/integrations', tags=["boarding"])
def get_boarding_state_integrations(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": boarding.get_state_integrations(tenant_id=context.tenant_id)}


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


@app.get('/integrations/slack/channels', tags=["integrations"])
def get_slack_channels(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": webhook.get_by_type(tenant_id=context.tenant_id, webhook_type='slack')}


@app.get('/integrations/slack/{integrationId}', tags=["integrations"])
def get_slack_webhook(integrationId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": webhook.get(tenant_id=context.tenant_id, webhook_id=integrationId)}


@app.delete('/integrations/slack/{integrationId}', tags=["integrations"])
def delete_slack_integration(integrationId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return webhook.delete(context.tenant_id, integrationId)


@app.post('/webhooks', tags=["webhooks"])
@app.put('/webhooks', tags=["webhooks"])
def add_edit_webhook(data: schemas.CreateEditWebhookSchema = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": webhook.add_edit(tenant_id=context.tenant_id, data=data.dict(), replace_none=True)}


@app.get('/webhooks', tags=["webhooks"])
def get_webhooks(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": webhook.get_by_tenant(tenant_id=context.tenant_id, replace_none=True)}


@app.delete('/webhooks/{webhookId}', tags=["webhooks"])
def delete_webhook(webhookId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": webhook.delete(tenant_id=context.tenant_id, webhook_id=webhookId)}


@app.get('/client/members', tags=["client"])
def get_members(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": users.get_members(tenant_id=context.tenant_id)}


@app.post('/client/members', tags=["client"])
@app.put('/client/members', tags=["client"])
def add_member(background_tasks: BackgroundTasks, data: schemas.CreateMemberSchema = Body(...),
               context: schemas.CurrentContext = Depends(OR_context)):
    if SAML2_helper.is_saml2_available():
        return {"errors": ["please use your SSO server to add teammates"]}
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
def edit_member(memberId: int, data: schemas.EditMemberSchema,
                context: schemas.CurrentContext = Depends(OR_context)):
    return users.edit(tenant_id=context.tenant_id, editor_id=context.user_id, changes=data.dict(),
                      user_id_to_update=memberId)


@app.get('/client/members/{memberId}/reset', tags=["client"])
def reset_reinvite_member(memberId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return users.reset_member(tenant_id=context.tenant_id, editor_id=context.user_id, user_id_to_update=memberId)


@app.delete('/client/members/{memberId}', tags=["client"])
def delete_member(memberId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return users.delete_member(tenant_id=context.tenant_id, user_id=context.user_id, id_to_delete=memberId)


@app.get('/account/new_api_key', tags=["account"])
def generate_new_user_token(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": users.generate_new_api_key(user_id=context.user_id)}


@app.post('/account', tags=["account"])
@app.put('/account', tags=["account"])
def edit_account(data: schemas.EditUserSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return users.edit(tenant_id=context.tenant_id, user_id_to_update=context.user_id, changes=data.dict(),
                      editor_id=context.user_id)


@app.post('/account/password', tags=["account"])
@app.put('/account/password', tags=["account"])
def change_client_password(data: schemas.EditUserPasswordSchema = Body(...),
                           context: schemas.CurrentContext = Depends(OR_context)):
    return users.change_password(email=context.email, old_password=data.old_password,
                                 new_password=data.new_password, tenant_id=context.tenant_id,
                                 user_id=context.user_id)


@app.get('/metadata/session_search', tags=["metadata"])
def search_sessions_by_metadata(projectId: int, key: str, value: str,
                                context: schemas.CurrentContext = Depends(OR_context)):
    if key is None or value is None or len(value) == 0 and len(key) == 0:
        return {"errors": ["please provide a key&value for search"]}

    if not projects.is_authorized(project_id=projectId, tenant_id=context.tenant_id):
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


@public_app.post('/alerts/notifications', tags=["alerts"])
@public_app.put('/alerts/notifications', tags=["alerts"])
def send_alerts_notifications(background_tasks: BackgroundTasks, data: schemas.AlertNotificationSchema = Body(...)):
    # TODO: validate token
    return {"data": alerts.process_notifications(data.notifications, background_tasks=background_tasks)}
