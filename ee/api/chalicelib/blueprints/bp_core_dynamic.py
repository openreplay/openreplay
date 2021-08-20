from chalice import Blueprint, Response

from chalicelib import _overrides
from chalicelib.core import metadata, errors_favorite_viewed, slack, alerts, sessions, integration_github, \
    integrations_manager
from chalicelib.utils import captcha, SAML2_helper
from chalicelib.utils import helper
from chalicelib.utils.helper import environ

from chalicelib.core import tenants
from chalicelib.core import signup
from chalicelib.core import users
from chalicelib.core import projects
from chalicelib.core import errors
from chalicelib.core import notifications
from chalicelib.core import boarding
from chalicelib.core import webhook
from chalicelib.core import license
from chalicelib.core.collaboration_slack import Slack

app = Blueprint(__name__)
_overrides.chalice_app(app)


@app.route('/signedups', methods=['GET'], authorizer=None)
def signed_ups():
    return {
        'data': tenants.get_tenants()
    }


@app.route('/login', methods=['POST'], authorizer=None)
def login():
    data = app.current_request.json_body
    if helper.allow_captcha() and not captcha.is_valid(data["g-recaptcha-response"]):
        return {"errors": ["Invalid captcha."]}
    r = users.authenticate(data['email'], data['password'],
                           for_plugin=False
                           )
    if r is None:
        return Response(status_code=401, body={
            'errors': ['You’ve entered invalid Email or Password.']
        })
    elif "errors" in r:
        return r

    tenant_id = r.pop("tenantId")
    # change this in open-source
    r["limits"] = {
        "teamMember": -1,
        "projects": -1,
        "metadata": metadata.get_remaining_metadata_with_count(tenant_id)}

    c = tenants.get_by_tenant_id(tenant_id)
    c.pop("createdAt")
    c["projects"] = projects.get_projects(tenant_id=tenant_id, recording_state=True, recorded=True,
                                          stack_integrations=True)
    return {
        'jwt': r.pop('jwt'),
        'data': {
            "user": r,
            "client": c,
        }
    }


@app.route('/account', methods=['GET'])
def get_account(context):
    r = users.get(tenant_id=context['tenantId'], user_id=context['userId'])
    return {
        'data': {
            **r,
            "limits": {
                "teamMember": -1,
                "projects": -1,
                "metadata": metadata.get_remaining_metadata_with_count(context['tenantId'])
            },
            **license.get_status(context["tenantId"]),
            "smtp": environ["EMAIL_HOST"] is not None and len(environ["EMAIL_HOST"]) > 0,
            "saml2": SAML2_helper.is_saml2_available()
        }
    }


@app.route('/projects', methods=['GET'])
def get_projects(context):
    return {"data": projects.get_projects(tenant_id=context["tenantId"], recording_state=True, gdpr=True, recorded=True,
                                          stack_integrations=True)}


@app.route('/projects', methods=['POST', 'PUT'])
def create_project(context):
    data = app.current_request.json_body
    return projects.create(tenant_id=context["tenantId"], user_id=context["userId"], data=data)


@app.route('/projects/{projectId}', methods=['POST', 'PUT'])
def create_edit_project(projectId, context):
    data = app.current_request.json_body

    return projects.edit(tenant_id=context["tenantId"], user_id=context["userId"], data=data, project_id=projectId)


@app.route('/projects/{projectId}', methods=['GET'])
def get_project(projectId, context):
    data = projects.get_project(tenant_id=context["tenantId"], project_id=projectId, include_last_session=True,
                                include_gdpr=True)
    if data is None:
        return {"errors": ["project not found"]}
    return {"data": data}


@app.route('/projects/{projectId}', methods=['DELETE'])
def delete_project(projectId, context):
    return projects.delete(tenant_id=context["tenantId"], user_id=context["userId"], project_id=projectId)


@app.route('/projects/limit', methods=['GET'])
def get_projects_limit(context):
    return {"data": {
        "current": projects.count_by_tenant(tenant_id=context["tenantId"]),
        "remaining": -1  # change this in open-source
    }}


@app.route('/client', methods=['GET'])
def get_client(context):
    r = tenants.get_by_tenant_id(context['tenantId'])
    if r is not None:
        r.pop("createdAt")
        r["projects"] = projects.get_projects(tenant_id=context['tenantId'], recording_state=True, recorded=True,
                                              stack_integrations=True)
    return {
        'data': r
    }


@app.route('/client/new_api_key', methods=['GET'])
def generate_new_tenant_token(context):
    return {
        'data': tenants.generate_new_api_key(context['tenantId'])
    }


@app.route('/client', methods=['PUT', 'POST'])
def put_client(context):
    data = app.current_request.json_body
    return tenants.update(tenant_id=context["tenantId"], user_id=context["userId"], data=data)


# TODO: delete this for production; it is used for dev only
@app.route('/signup', methods=['GET'], authorizer=None)
def get_all_signup():
    return {"data": signup.get_signed_ups()}


@app.route('/signup', methods=['POST', 'PUT'], authorizer=None)
def signup_handler():
    data = app.current_request.json_body
    return signup.create_step1(data)


@app.route('/integrations/slack', methods=['POST', 'PUT'])
def add_slack_client(context):
    data = app.current_request.json_body
    if "url" not in data or "name" not in data:
        return {"errors": ["please provide a url and a name"]}
    n = Slack.add_channel(tenant_id=context["tenantId"], url=data["url"], name=data["name"])
    if n is None:
        return {
            "errors": ["We couldn't send you a test message on your Slack channel. Please verify your webhook url."]
        }
    return {"data": n}


@app.route('/integrations/slack/{integrationId}', methods=['POST', 'PUT'])
def edit_slack_integration(integrationId, context):
    data = app.current_request.json_body
    if data.get("url") and len(data["url"]) > 0:
        old = webhook.get(tenant_id=context["tenantId"], webhook_id=integrationId)
        if old["endpoint"] != data["url"]:
            if not Slack.say_hello(data["url"]):
                return {
                    "errors": [
                        "We couldn't send you a test message on your Slack channel. Please verify your webhook url."]
                }
    return {"data": webhook.update(tenant_id=context["tenantId"], webhook_id=integrationId,
                                   changes={"name": data.get("name", ""), "endpoint": data["url"]})}


@app.route('/{projectId}/errors/search', methods=['POST'])
def errors_search(projectId, context):
    data = app.current_request.json_body
    params = app.current_request.query_params
    if params is None:
        params = {}

    return errors.search(data, projectId, user_id=context["userId"], status=params.get("status", "ALL"),
                         favorite_only="favorite" in params)


@app.route('/{projectId}/errors/stats', methods=['GET'])
def errors_stats(projectId, context):
    params = app.current_request.query_params
    if params is None:
        params = {}

    return errors.stats(projectId, user_id=context["userId"], **params)


@app.route('/{projectId}/errors/{errorId}', methods=['GET'])
def errors_get_details(projectId, errorId, context):
    params = app.current_request.query_params
    if params is None:
        params = {}

    data = errors.get_details(project_id=projectId, user_id=context["userId"], error_id=errorId, **params)
    if data.get("data") is not None:
        errors_favorite_viewed.viewed_error(project_id=projectId, user_id=context['userId'], error_id=errorId)
    return data


@app.route('/{projectId}/errors/{errorId}/stats', methods=['GET'])
def errors_get_details_right_column(projectId, errorId, context):
    params = app.current_request.query_params
    if params is None:
        params = {}

    data = errors.get_details_chart(project_id=projectId, user_id=context["userId"], error_id=errorId, **params)
    return data


@app.route('/{projectId}/errors/{errorId}/sourcemaps', methods=['GET'])
def errors_get_details_sourcemaps(projectId, errorId, context):
    data = errors.get_trace(project_id=projectId, error_id=errorId)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.route('/async/alerts/notifications/{step}', methods=['POST', 'PUT'], authorizer=None)
def send_alerts_notification_async(step):
    data = app.current_request.json_body
    if data.pop("auth") != environ["async_Token"]:
        return {"errors": ["missing auth"]}
    if step == "slack":
        slack.send_batch(notifications_list=data.get("notifications"))
    elif step == "email":
        alerts.send_by_email_batch(notifications_list=data.get("notifications"))
    elif step == "webhook":
        webhook.trigger_batch(data_list=data.get("notifications"))


@app.route('/notifications', methods=['GET'])
def get_notifications(context):
    return {"data": notifications.get_all(tenant_id=context['tenantId'], user_id=context['userId'])}


@app.route('/notifications/{notificationId}/view', methods=['GET'])
def view_notifications(notificationId, context):
    return {"data": notifications.view_notification(notification_ids=[notificationId], user_id=context['userId'])}


@app.route('/notifications/view', methods=['POST', 'PUT'])
def batch_view_notifications(context):
    data = app.current_request.json_body
    return {"data": notifications.view_notification(notification_ids=data.get("ids", []),
                                                    startTimestamp=data.get("startTimestamp"),
                                                    endTimestamp=data.get("endTimestamp"),
                                                    user_id=context['userId'],
                                                    tenant_id=context["tenantId"])}


@app.route('/notifications', methods=['POST', 'PUT'], authorizer=None)
def create_notifications():
    data = app.current_request.json_body
    if data.get("token", "") != "nF46JdQqAM5v9KI9lPMpcu8o9xiJGvNNWOGL7TJP":
        return {"errors": ["missing token"]}
    return notifications.create(data.get("notifications", []))


@app.route('/boarding', methods=['GET'])
def get_boarding_state(context):
    return {"data": boarding.get_state(tenant_id=context["tenantId"])}


@app.route('/boarding/installing', methods=['GET'])
def get_boarding_state_installing(context):
    return {"data": boarding.get_state_installing(tenant_id=context["tenantId"])}


@app.route('/boarding/identify-users', methods=['GET'])
def get_boarding_state_identify_users(context):
    return {"data": boarding.get_state_identify_users(tenant_id=context["tenantId"])}


@app.route('/boarding/manage-users', methods=['GET'])
def get_boarding_state_manage_users(context):
    return {"data": boarding.get_state_manage_users(tenant_id=context["tenantId"])}


@app.route('/boarding/integrations', methods=['GET'])
def get_boarding_state_integrations(context):
    return {"data": boarding.get_state_integrations(tenant_id=context["tenantId"])}


# this endpoint supports both jira & github based on `provider` attribute
@app.route('/integrations/issues', methods=['POST', 'PUT'])
def add_edit_jira_cloud_github(context):
    data = app.current_request.json_body
    provider = data.get("provider", "").upper()
    error, integration = integrations_manager.get_integration(tool=provider, tenant_id=context["tenantId"],
                                                              user_id=context["userId"])
    if error is not None:
        return error
    return {"data": integration.add_edit(data=data)}


@app.route('/integrations/slack/{integrationId}', methods=['GET'])
def get_slack_webhook(integrationId, context):
    return {"data": webhook.get(tenant_id=context["tenantId"], webhook_id=integrationId)}


@app.route('/integrations/slack/channels', methods=['GET'])
def get_slack_integration(context):
    return {"data": webhook.get_by_type(tenant_id=context["tenantId"], webhook_type='slack')}


@app.route('/integrations/slack/{integrationId}', methods=['DELETE'])
def delete_slack_integration(integrationId, context):
    return webhook.delete(context["tenantId"], integrationId)


@app.route('/webhooks', methods=['POST', 'PUT'])
def add_edit_webhook(context):
    data = app.current_request.json_body
    return {"data": webhook.add_edit(tenant_id=context["tenantId"], data=data, replace_none=True)}


@app.route('/webhooks', methods=['GET'])
def get_webhooks(context):
    return {"data": webhook.get_by_tenant(tenant_id=context["tenantId"], replace_none=True)}


@app.route('/webhooks/{webhookId}', methods=['DELETE'])
def delete_webhook(webhookId, context):
    return {"data": webhook.delete(tenant_id=context["tenantId"], webhook_id=webhookId)}


@app.route('/client/members', methods=['GET'])
def get_members(context):
    return {"data": users.get_members(tenant_id=context['tenantId'])}


@app.route('/client/members', methods=['PUT', 'POST'])
def add_member(context):
    if SAML2_helper.is_saml2_available():
        return {"errors": ["please use your SSO server to add teammates"]}
    data = app.current_request.json_body
    return users.create_member(tenant_id=context['tenantId'], user_id=context['userId'], data=data)


@app.route('/users/invitation', methods=['GET'], authorizer=None)
def process_invitation_link():
    params = app.current_request.query_params
    if params is None or len(params.get("token", "")) < 64:
        return {"errors": ["please provide a valid invitation"]}
    user = users.get_by_invitation_token(params["token"])
    if user is None:
        return {"errors": ["invitation not found"]}
    if user["expiredInvitation"]:
        return {"errors": ["expired invitation, please ask your admin to send a new one"]}
    pass_token = users.allow_password_change(user_id=user["userId"])
    return Response(
        status_code=307,
        body='',
        headers={'Location': environ["SITE_URL"] + environ["change_password_link"] % (params["token"], pass_token),
                 'Content-Type': 'text/plain'})


@app.route('/password/reset', methods=['POST', 'PUT'], authorizer=None)
def change_password_by_invitation():
    data = app.current_request.json_body
    if data is None or len(data.get("invitation", "")) < 64 or len(data.get("pass", "")) < 8:
        return {"errors": ["please provide a valid invitation & pass"]}
    user = users.get_by_invitation_token(token=data["token"], pass_token=data["pass"])
    if user is None:
        return {"errors": ["invitation not found"]}
    if user["expiredChange"]:
        return {"errors": ["expired change, please re-use the invitation link"]}

    return users.set_password_invitation(new_password=data["password"], user_id=user["userId"],
                                         tenant_id=user["tenantId"])


@app.route('/client/members/{memberId}', methods=['PUT', 'POST'])
def edit_member(memberId, context):
    data = app.current_request.json_body
    return users.edit(tenant_id=context['tenantId'], editor_id=context['userId'], changes=data,
                      user_id_to_update=memberId)


@app.route('/client/members/{memberId}/reset', methods=['GET'])
def reset_reinvite_member(memberId, context):
    return users.reset_member(tenant_id=context['tenantId'], editor_id=context['userId'], user_id_to_update=memberId)


@app.route('/client/members/{memberId}', methods=['DELETE'])
def delete_member(memberId, context):
    return users.delete_member(tenant_id=context["tenantId"], user_id=context['userId'], id_to_delete=memberId)


@app.route('/account/new_api_key', methods=['GET'])
def generate_new_user_token(context):
    return {"data": users.generate_new_api_key(user_id=context['userId'])}


@app.route('/account', methods=['POST', 'PUT'])
def edit_account(context):
    data = app.current_request.json_body
    return users.edit(tenant_id=context['tenantId'], user_id_to_update=context['userId'], changes=data,
                      editor_id=context['userId'])


@app.route('/account/password', methods=['PUT', 'POST'])
def change_client_password(context):
    data = app.current_request.json_body
    return users.change_password(email=context['email'], old_password=data["oldPassword"],
                                 new_password=data["newPassword"], tenant_id=context["tenantId"],
                                 user_id=context["userId"])


@app.route('/metadata/session_search', methods=['GET'])
def search_sessions_by_metadata(context):
    params = app.current_request.query_params
    if params is None:
        return {"errors": ["please provide a key&value for search"]}
    value = params.get('value', '')
    key = params.get('key', '')
    project_id = params.get('projectId')
    if project_id is not None \
            and not projects.is_authorized(project_id=project_id, tenant_id=context["tenantId"]):
        return {"errors": ["unauthorized project"]}
    if len(value) == 0 and len(key) == 0:
        return {"errors": ["please provide a key&value for search"]}
    if len(value) == 0:
        return {"errors": ["please provide a value for search"]}
    if len(key) == 0:
        return {"errors": ["please provide a key for search"]}
    return {
        "data": sessions.search_by_metadata(tenant_id=context["tenantId"], user_id=context["userId"], m_value=value,
                                            m_key=key,
                                            project_id=project_id)}


@app.route('/plans', methods=['GET'])
def get_current_plan(context):
    return {
        "data": license.get_status(context["tenantId"])
    }


@app.route('/alerts/notifications', methods=['POST', 'PUT'], authorizer=None)
def send_alerts_notifications():
    data = app.current_request.json_body
    return {"data": alerts.process_notifications(data.get("notifications", []))}
