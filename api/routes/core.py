from fastapi import APIRouter, Depends
from auth import auth_bearer
#
#
# from chalicelib import _overrides
# from chalicelib.blueprints import bp_authorizers
# from chalicelib.core import log_tool_rollbar, sourcemaps, events, sessions_assignments, projects, \
#     sessions_metas, alerts, funnels, issues, integrations_manager, errors_favorite_viewed, metadata, \
#     log_tool_elasticsearch, log_tool_datadog, \
#     log_tool_stackdriver, reset_password, sessions_favorite_viewed, \
#     log_tool_cloudwatch, log_tool_sentry, log_tool_sumologic, log_tools, errors, sessions, \
#     log_tool_newrelic, announcements, log_tool_bugsnag, weekly_report, integration_jira_cloud, integration_github, \
#     assist, heatmaps
# from chalicelib.core.collaboration_slack import Slack
# from chalicelib.utils import email_helper

app = APIRouter(dependencies=[Depends(auth_bearer.JWTBearer())])


# @app.get('/{projectId}/sessions2/favorite', tags=['sessions'])
# def get_favorite_sessions(projectId, context):
#     return {
#         'data': sessions.get_favorite_sessions(project_id=projectId, user_id=context["userId"], include_viewed=True)
#     }

#
# @app.route('/{projectId}/sessions2/{sessionId}', methods=['GET'])
# def get_session2(projectId, sessionId, context):
#     data = sessions.get_by_id2_pg(project_id=projectId, session_id=sessionId, full_data=True, user_id=context["userId"],
#                                   include_fav_viewed=True, group_metadata=True)
#     if data is None:
#         return {"errors": ["session not found"]}
#
#     sessions_favorite_viewed.view_session(project_id=projectId, user_id=context['userId'], session_id=sessionId)
#     return {
#         'data': data
#     }
#
#
# @app.route('/{projectId}/sessions2/{sessionId}/favorite', methods=['GET'])
# def add_remove_favorite_session2(projectId, sessionId, context):
#     return {
#         "data": sessions_favorite_viewed.favorite_session(project_id=projectId, user_id=context['userId'],
#                                                           session_id=sessionId)}
#
#
# @app.route('/{projectId}/sessions2/{sessionId}/assign', methods=['GET'])
# def assign_session(projectId, sessionId, context):
#     data = sessions_assignments.get_by_session(project_id=projectId, session_id=sessionId,
#                                                tenant_id=context['tenantId'],
#                                                user_id=context["userId"])
#     if "errors" in data:
#         return data
#     return {
#         'data': data
#     }
#
#
# @app.route('/{projectId}/sessions2/{sessionId}/errors/{errorId}/sourcemaps', methods=['GET'])
# def get_error_trace(projectId, sessionId, errorId, context):
#     data = errors.get_trace(project_id=projectId, error_id=errorId)
#     if "errors" in data:
#         return data
#     return {
#         'data': data
#     }
#
#
# @app.route('/{projectId}/sessions2/{sessionId}/assign/{issueId}', methods=['GET'])
# def assign_session(projectId, sessionId, issueId, context):
#     data = sessions_assignments.get(project_id=projectId, session_id=sessionId, assignment_id=issueId,
#                                     tenant_id=context['tenantId'], user_id=context["userId"])
#     if "errors" in data:
#         return data
#     return {
#         'data': data
#     }
#
#
# @app.route('/{projectId}/sessions2/{sessionId}/assign/{issueId}/comment', methods=['POST', 'PUT'])
# def comment_assignment(projectId, sessionId, issueId, context):
#     data = app.current_request.json_body
#     data = sessions_assignments.comment(tenant_id=context['tenantId'], project_id=projectId,
#                                         session_id=sessionId, assignment_id=issueId,
#                                         user_id=context["userId"], message=data["message"])
#     if "errors" in data.keys():
#         return data
#     return {
#         'data': data
#     }
#
#
# @app.route('/{projectId}/events/search', methods=['GET'])
# def events_search(projectId, context):
#     params = app.current_request.query_params
#     if params is None:
#         return {"data": []}
#
#     q = params.get('q', '')
#     if len(q) == 0:
#         return {"data": []}
#     result = events.search_pg2(q, params.get('type', ''), project_id=projectId, source=params.get('source'),
#                                key=params.get("key"))
#     return result
#
#
# @app.route('/{projectId}/sessions/search2', methods=['POST'])
# def sessions_search2(projectId, context):
#     data = app.current_request.json_body
#
#     data = sessions.search2_pg(data, projectId, user_id=context["userId"])
#     return {'data': data}
#
#
# @app.route('/{projectId}/sessions/filters', methods=['GET'])
# def session_filter_values(projectId, context):
#     return {'data': sessions_metas.get_key_values(projectId)}
#
#
# @app.route('/{projectId}/sessions/filters/top', methods=['GET'])
# def session_top_filter_values(projectId, context):
#     return {'data': sessions_metas.get_top_key_values(projectId)}
#
#
# @app.route('/{projectId}/sessions/filters/search', methods=['GET'])
# def get_session_filters_meta(projectId, context):
#     params = app.current_request.query_params
#     if params is None:
#         return {"data": []}
#
#     meta_type = params.get('type', '')
#     if len(meta_type) == 0:
#         return {"data": []}
#     q = params.get('q', '')
#     if len(q) == 0:
#         return {"data": []}
#     return sessions_metas.search(project_id=projectId, meta_type=meta_type, text=q)
#
#
# @app.route('/{projectId}/integrations/{integration}/notify/{integrationId}/{source}/{sourceId}',
#            methods=['POST', 'PUT'])
# def integration_notify(projectId, integration, integrationId, source, sourceId, context):
#     data = app.current_request.json_body
#     comment = None
#     if "comment" in data:
#         comment = data["comment"]
#     if integration == "slack":
#         args = {"tenant_id": context["tenantId"],
#                 "user": context['email'], "comment": comment, "project_id": projectId,
#                 "integration_id": integrationId}
#         if source == "sessions":
#             return Slack.share_session(session_id=sourceId, **args)
#         elif source == "errors":
#             return Slack.share_error(error_id=sourceId, **args)
#     return {"data": None}
#
#
# @app.route('/integrations/sentry', methods=['GET'])
# def get_all_sentry(context):
#     return {"data": log_tool_sentry.get_all(tenant_id=context["tenantId"])}
#
#
# @app.route('/{projectId}/integrations/sentry', methods=['GET'])
# def get_sentry(projectId, context):
#     return {"data": log_tool_sentry.get(project_id=projectId)}
#
#
# @app.route('/{projectId}/integrations/sentry', methods=['POST', 'PUT'])
# def add_edit_sentry(projectId, context):
#     data = app.current_request.json_body
#
#     return {"data": log_tool_sentry.add_edit(tenant_id=context["tenantId"], project_id=projectId, data=data)}
#
#
# @app.route('/{projectId}/integrations/sentry', methods=['DELETE'])
# def delete_sentry(projectId, context):
#     return {"data": log_tool_sentry.delete(tenant_id=context["tenantId"], project_id=projectId)}
#
#
# @app.route('/{projectId}/integrations/sentry/events/{eventId}', methods=['GET'])
# def proxy_sentry(projectId, eventId, context):
#     return {"data": log_tool_sentry.proxy_get(tenant_id=context["tenantId"], project_id=projectId, event_id=eventId)}
#
#
# @app.route('/integrations/datadog', methods=['GET'])
# def get_all_datadog(context):
#     return {"data": log_tool_datadog.get_all(tenant_id=context["tenantId"])}
#
#
# @app.route('/{projectId}/integrations/datadog', methods=['GET'])
# def get_datadog(projectId, context):
#     return {"data": log_tool_datadog.get(project_id=projectId)}
#
#
# @app.route('/{projectId}/integrations/datadog', methods=['POST', 'PUT'])
# def add_edit_datadog(projectId, context):
#     data = app.current_request.json_body
#
#     return {"data": log_tool_datadog.add_edit(tenant_id=context["tenantId"], project_id=projectId, data=data)}
#
#
# @app.route('/{projectId}/integrations/datadog', methods=['DELETE'])
# def delete_datadog(projectId, context):
#     return {"data": log_tool_datadog.delete(tenant_id=context["tenantId"], project_id=projectId)}
#
#
# @app.route('/integrations/stackdriver', methods=['GET'])
# def get_all_stackdriver(context):
#     return {"data": log_tool_stackdriver.get_all(tenant_id=context["tenantId"])}
#
#
# @app.route('/{projectId}/integrations/stackdriver', methods=['GET'])
# def get_stackdriver(projectId, context):
#     return {"data": log_tool_stackdriver.get(project_id=projectId)}
#
#
# @app.route('/{projectId}/integrations/stackdriver', methods=['POST', 'PUT'])
# def add_edit_stackdriver(projectId, context):
#     data = app.current_request.json_body
#
#     return {"data": log_tool_stackdriver.add_edit(tenant_id=context["tenantId"], project_id=projectId, data=data)}
#
#
# @app.route('/{projectId}/integrations/stackdriver', methods=['DELETE'])
# def delete_stackdriver(projectId, context):
#     return {"data": log_tool_stackdriver.delete(tenant_id=context["tenantId"], project_id=projectId)}
#
#
# @app.route('/integrations/newrelic', methods=['GET'])
# def get_all_newrelic(context):
#     return {"data": log_tool_newrelic.get_all(tenant_id=context["tenantId"])}
#
#
# @app.route('/{projectId}/integrations/newrelic', methods=['GET'])
# def get_newrelic(projectId, context):
#     return {"data": log_tool_newrelic.get(project_id=projectId)}
#
#
# @app.route('/{projectId}/integrations/newrelic', methods=['POST', 'PUT'])
# def add_edit_newrelic(projectId, context):
#     data = app.current_request.json_body
#
#     return {"data": log_tool_newrelic.add_edit(tenant_id=context["tenantId"], project_id=projectId, data=data)}
#
#
# @app.route('/{projectId}/integrations/newrelic', methods=['DELETE'])
# def delete_newrelic(projectId, context):
#     return {"data": log_tool_newrelic.delete(tenant_id=context["tenantId"], project_id=projectId)}
#
#
# @app.route('/integrations/rollbar', methods=['GET'])
# def get_all_rollbar(context):
#     return {"data": log_tool_rollbar.get_all(tenant_id=context["tenantId"])}
#
#
# @app.route('/{projectId}/integrations/rollbar', methods=['GET'])
# def get_rollbar(projectId, context):
#     return {"data": log_tool_rollbar.get(project_id=projectId)}
#
#
# @app.route('/{projectId}/integrations/rollbar', methods=['POST', 'PUT'])
# def add_edit_rollbar(projectId, context):
#     data = app.current_request.json_body
#
#     return {"data": log_tool_rollbar.add_edit(tenant_id=context["tenantId"], project_id=projectId, data=data)}
#
#
# @app.route('/{projectId}/integrations/rollbar', methods=['DELETE'])
# def delete_datadog(projectId, context):
#     return {"data": log_tool_rollbar.delete(tenant_id=context["tenantId"], project_id=projectId)}
#
#
# @app.route('/integrations/bugsnag/list_projects', methods=['POST'])
# def list_projects_bugsnag(context):
#     data = app.current_request.json_body
#     return {"data": log_tool_bugsnag.list_projects(auth_token=data["authorizationToken"])}
#
#
# @app.route('/integrations/bugsnag', methods=['GET'])
# def get_all_bugsnag(context):
#     return {"data": log_tool_bugsnag.get_all(tenant_id=context["tenantId"])}
#
#
# @app.route('/{projectId}/integrations/bugsnag', methods=['GET'])
# def get_bugsnag(projectId, context):
#     return {"data": log_tool_bugsnag.get(project_id=projectId)}
#
#
# @app.route('/{projectId}/integrations/bugsnag', methods=['POST', 'PUT'])
# def add_edit_bugsnag(projectId, context):
#     data = app.current_request.json_body
#
#     return {"data": log_tool_bugsnag.add_edit(tenant_id=context["tenantId"], project_id=projectId, data=data)}
#
#
# @app.route('/{projectId}/integrations/bugsnag', methods=['DELETE'])
# def delete_bugsnag(projectId, context):
#     return {"data": log_tool_bugsnag.delete(tenant_id=context["tenantId"], project_id=projectId)}
#
#
# @app.route('/integrations/cloudwatch/list_groups', methods=['POST'])
# def list_groups_cloudwatch(context):
#     data = app.current_request.json_body
#     return {"data": log_tool_cloudwatch.list_log_groups(aws_access_key_id=data["awsAccessKeyId"],
#                                                         aws_secret_access_key=data["awsSecretAccessKey"],
#                                                         region=data["region"])}
#
#
# @app.route('/integrations/cloudwatch', methods=['GET'])
# def get_all_cloudwatch(context):
#     return {"data": log_tool_cloudwatch.get_all(tenant_id=context["tenantId"])}
#
#
# @app.route('/{projectId}/integrations/cloudwatch', methods=['GET'])
# def get_cloudwatch(projectId, context):
#     return {"data": log_tool_cloudwatch.get(project_id=projectId)}
#
#
# @app.route('/{projectId}/integrations/cloudwatch', methods=['POST', 'PUT'])
# def add_edit_cloudwatch(projectId, context):
#     data = app.current_request.json_body
#
#     return {"data": log_tool_cloudwatch.add_edit(tenant_id=context["tenantId"], project_id=projectId, data=data)}
#
#
# @app.route('/{projectId}/integrations/cloudwatch', methods=['DELETE'])
# def delete_cloudwatch(projectId, context):
#     return {"data": log_tool_cloudwatch.delete(tenant_id=context["tenantId"], project_id=projectId)}
#
#
# @app.route('/integrations/elasticsearch', methods=['GET'])
# def get_all_elasticsearch(context):
#     return {"data": log_tool_elasticsearch.get_all(tenant_id=context["tenantId"])}
#
#
# @app.route('/{projectId}/integrations/elasticsearch', methods=['GET'])
# def get_elasticsearch(projectId, context):
#     return {"data": log_tool_elasticsearch.get(project_id=projectId)}
#
#
# @app.route('/integrations/elasticsearch/test', methods=['POST'])
# def test_elasticsearch_connection(context):
#     data = app.current_request.json_body
#     return {"data": log_tool_elasticsearch.ping(tenant_id=context["tenantId"], **data)}
#
#
# @app.route('/{projectId}/integrations/elasticsearch', methods=['POST', 'PUT'])
# def add_edit_elasticsearch(projectId, context):
#     data = app.current_request.json_body
#
#     return {"data": log_tool_elasticsearch.add_edit(tenant_id=context["tenantId"], project_id=projectId, data=data)}
#
#
# @app.route('/{projectId}/integrations/elasticsearch', methods=['DELETE'])
# def delete_elasticsearch(projectId, context):
#     return {"data": log_tool_elasticsearch.delete(tenant_id=context["tenantId"], project_id=projectId)}
#
#
# @app.route('/integrations/sumologic', methods=['GET'])
# def get_all_sumologic(context):
#     return {"data": log_tool_sumologic.get_all(tenant_id=context["tenantId"])}
#
#
# @app.route('/{projectId}/integrations/sumologic', methods=['GET'])
# def get_sumologic(projectId, context):
#     return {"data": log_tool_sumologic.get(project_id=projectId)}
#
#
# @app.route('/{projectId}/integrations/sumologic', methods=['POST', 'PUT'])
# def add_edit_sumologic(projectId, context):
#     data = app.current_request.json_body
#
#     return {"data": log_tool_sumologic.add_edit(tenant_id=context["tenantId"], project_id=projectId, data=data)}
#
#
# @app.route('/{projectId}/integrations/sumologic', methods=['DELETE'])
# def delete_sumologic(projectId, context):
#     return {"data": log_tool_sumologic.delete(tenant_id=context["tenantId"], project_id=projectId)}
#
#
# @app.route('/integrations/issues', methods=['GET'])
# def get_integration_status(context):
#     error, integration = integrations_manager.get_integration(tenant_id=context["tenantId"],
#                                                               user_id=context["userId"])
#     if error is not None:
#         return {"data": {}}
#     return {"data": integration.get_obfuscated()}
#
#
# @app.route('/integrations/jira', methods=['POST', 'PUT'])
# def add_edit_jira_cloud(context):
#     data = app.current_request.json_body
#     error, integration = integrations_manager.get_integration(tool=integration_jira_cloud.PROVIDER,
#                                                               tenant_id=context["tenantId"],
#                                                               user_id=context["userId"])
#     if error is not None:
#         return error
#     return {"data": integration.add_edit(data=data)}
#
#
# @app.route('/integrations/github', methods=['POST', 'PUT'])
# def add_edit_github(context):
#     data = app.current_request.json_body
#     error, integration = integrations_manager.get_integration(tool=integration_github.PROVIDER,
#                                                               tenant_id=context["tenantId"],
#                                                               user_id=context["userId"])
#     if error is not None:
#         return error
#     return {"data": integration.add_edit(data=data)}
#
#
# @app.route('/integrations/issues', methods=['DELETE'])
# def delete_default_issue_tracking_tool(context):
#     error, integration = integrations_manager.get_integration(tenant_id=context["tenantId"],
#                                                               user_id=context["userId"])
#     if error is not None:
#         return error
#     return {"data": integration.delete()}
#
#
# @app.route('/integrations/jira', methods=['DELETE'])
# def delete_jira_cloud(context):
#     error, integration = integrations_manager.get_integration(tool=integration_jira_cloud.PROVIDER,
#                                                               tenant_id=context["tenantId"],
#                                                               user_id=context["userId"])
#     if error is not None:
#         return error
#     return {"data": integration.delete()}
#
#
# @app.route('/integrations/github', methods=['DELETE'])
# def delete_github(context):
#     error, integration = integrations_manager.get_integration(tool=integration_github.PROVIDER,
#                                                               tenant_id=context["tenantId"],
#                                                               user_id=context["userId"])
#     if error is not None:
#         return error
#     return {"data": integration.delete()}
#
#
# @app.route('/integrations/issues/list_projects', methods=['GET'])
# def get_all_issue_tracking_projects(context):
#     error, integration = integrations_manager.get_integration(tenant_id=context["tenantId"],
#                                                               user_id=context["userId"])
#     if error is not None:
#         return error
#     data = integration.issue_handler.get_projects()
#     if "errors" in data:
#         return data
#     return {"data": data}
#
#
# @app.route('/integrations/issues/{integrationProjectId}', methods=['GET'])
# def get_integration_metadata(integrationProjectId, context):
#     error, integration = integrations_manager.get_integration(tenant_id=context["tenantId"],
#                                                               user_id=context["userId"])
#     if error is not None:
#         return error
#     data = integration.issue_handler.get_metas(integrationProjectId)
#     if "errors" in data.keys():
#         return data
#     return {"data": data}
#
#
# @app.route('/{projectId}/assignments', methods=['GET'])
# def get_all_assignments(projectId, context):
#     data = sessions_assignments.get_all(project_id=projectId, user_id=context["userId"])
#     return {
#         'data': data
#     }
#
#
# @app.route('/{projectId}/sessions2/{sessionId}/assign/projects/{integrationProjectId}', methods=['POST', 'PUT'])
# def create_issue_assignment(projectId, sessionId, integrationProjectId, context):
#     data = app.current_request.json_body
#     data = sessions_assignments.create_new_assignment(tenant_id=context['tenantId'], project_id=projectId,
#                                                       session_id=sessionId,
#                                                       creator_id=context["userId"], assignee=data["assignee"],
#                                                       description=data["description"], title=data["title"],
#                                                       issue_type=data["issueType"],
#                                                       integration_project_id=integrationProjectId)
#     if "errors" in data.keys():
#         return data
#     return {
#         'data': data
#     }
#
#
# @app.route('/{projectId}/gdpr', methods=['GET'])
# def get_gdpr(projectId, context):
#     return {"data": projects.get_gdpr(project_id=projectId)}
#
#
# @app.route('/{projectId}/gdpr', methods=['POST', 'PUT'])
# def edit_gdpr(projectId, context):
#     data = app.current_request.json_body
#
#     return {"data": projects.edit_gdpr(project_id=projectId, gdpr=data)}
#
#
# @app.route('/password/reset/{step}', methods=['PUT', 'POST'], authorizer=None)
# def reset_password_handler(step):
#     data = app.current_request.json_body
#     if step == "1":
#         if "email" not in data or len(data["email"]) < 5:
#             return {"errors": ["please provide a valid email address"]}
#         return reset_password.step1(data)
#     # elif step == "2":
#     #     return reset_password.step2(data)
#
#
# @app.route('/{projectId}/metadata', methods=['GET'])
# def get_metadata(projectId, context):
#     return {"data": metadata.get(project_id=projectId)}
#
#
# @app.route('/{projectId}/metadata/list', methods=['POST', 'PUT'])
# def add_edit_delete_metadata(projectId, context):
#     data = app.current_request.json_body
#
#     return metadata.add_edit_delete(tenant_id=context["tenantId"], project_id=projectId, new_metas=data["list"])
#
#
# @app.route('/{projectId}/metadata', methods=['POST', 'PUT'])
# def add_metadata(projectId, context):
#     data = app.current_request.json_body
#
#     return metadata.add(tenant_id=context["tenantId"], project_id=projectId, new_name=data["key"])
#
#
# @app.route('/{projectId}/metadata/{index}', methods=['POST', 'PUT'])
# def edit_metadata(projectId, index, context):
#     data = app.current_request.json_body
#
#     return metadata.edit(tenant_id=context["tenantId"], project_id=projectId, index=int(index),
#                          new_name=data["key"])
#
#
# @app.route('/{projectId}/metadata/{index}', methods=['DELETE'])
# def delete_metadata(projectId, index, context):
#     return metadata.delete(tenant_id=context["tenantId"], project_id=projectId, index=index)
#
#
# @app.route('/{projectId}/metadata/search', methods=['GET'])
# def search_metadata(projectId, context):
#     params = app.current_request.query_params
#     q = params.get('q', '')
#     key = params.get('key', '')
#     if len(q) == 0 and len(key) == 0:
#         return {"data": []}
#     if len(q) == 0:
#         return {"errors": ["please provide a value for search"]}
#     if len(key) == 0:
#         return {"errors": ["please provide a key for search"]}
#     return metadata.search(tenant_id=context["tenantId"], project_id=projectId, value=q, key=key)
#
#
# @app.route('/{projectId}/integration/sources', methods=['GET'])
# def search_integrations(projectId, context):
#     return log_tools.search(project_id=projectId)
#
#
# @app.route('/async/email_assignment', methods=['POST', 'PUT'], authorizer=None)
# def async_send_signup_emails():
#     data = app.current_request.json_body
#     if data.pop("auth") != environ["async_Token"]:
#         return {}
#     email_helper.send_assign_session(recipient=data["email"], link=data["link"], message=data["message"])
#
#
# @app.route('/async/funnel/weekly_report2', methods=['POST', 'PUT'], authorizer=None)
# def async_weekly_report():
#     print("=========================> Sending weekly report")
#     data = app.current_request.json_body
#     if data.pop("auth") != environ["async_Token"]:
#         return {}
#     email_helper.weekly_report2(recipients=data["email"], data=data.get("data", None))
#
#
# @app.route('/async/basic/{step}', methods=['POST', 'PUT'], authorizer=None)
# def async_basic_emails(step):
#     data = app.current_request.json_body
#     if data.pop("auth") != environ["async_Token"]:
#         return {}
#     if step.lower() == "member_invitation":
#         email_helper.send_team_invitation(recipient=data["email"], invitation_link=data["invitationLink"],
#                                           client_id=data["clientId"], sender_name=data["senderName"])
#
#
# @app.route('/{projectId}/sample_rate', methods=['GET'])
# def get_capture_status(projectId, context):
#     return {"data": projects.get_capture_status(project_id=projectId)}
#
#
# @app.route('/{projectId}/sample_rate', methods=['POST', 'PUT'])
# def update_capture_status(projectId, context):
#     data = app.current_request.json_body
#
#     return {"data": projects.update_capture_status(project_id=projectId, changes=data)}
#
#
# @app.route('/announcements', methods=['GET'])
# def get_all_announcements(context):
#     return {"data": announcements.get_all(context["userId"])}
#
#
# @app.route('/announcements/view', methods=['GET'])
# def get_all_announcements(context):
#     return {"data": announcements.view(user_id=context["userId"])}
#
#
# @app.route('/{projectId}/errors/{errorId}/{action}', methods=['GET'])
# def add_remove_favorite_error(projectId, errorId, action, context):
#     if action == "favorite":
#         return errors_favorite_viewed.favorite_error(project_id=projectId, user_id=context['userId'], error_id=errorId)
#     elif action == "sessions":
#         params = app.current_request.query_params
#         if params is None:
#             params = {}
#         start_date = params.get("startDate")
#         end_date = params.get("endDate")
#         return {
#             "data": errors.get_sessions(project_id=projectId, user_id=context['userId'], error_id=errorId,
#                                         start_date=start_date, end_date=end_date)}
#     elif action in list(errors.ACTION_STATE.keys()):
#         return errors.change_state(project_id=projectId, user_id=context['userId'], error_id=errorId, action=action)
#     else:
#         return {"errors": ["undefined action"]}
#
#
# @app.route('/{projectId}/errors/merge', methods=['POST'])
# def errors_merge(projectId, context):
#     data = app.current_request.json_body
#
#     data = errors.merge(error_ids=data.get("errors", []))
#     return data
#
#
# @app.route('/show_banner', methods=['GET'])
# def errors_merge(context):
#     return {"data": False}
#
#
# @app.route('/{projectId}/alerts', methods=['POST', 'PUT'])
# def create_alert(projectId, context):
#     data = app.current_request.json_body
#     return alerts.create(projectId, data)
#
#
# @app.route('/{projectId}/alerts', methods=['GET'])
# def get_all_alerts(projectId, context):
#     return {"data": alerts.get_all(projectId)}
#
#
# @app.route('/{projectId}/alerts/{alertId}', methods=['GET'])
# def get_alert(projectId, alertId, context):
#     return {"data": alerts.get(alertId)}
#
#
# @app.route('/{projectId}/alerts/{alertId}', methods=['POST', 'PUT'])
# def update_alert(projectId, alertId, context):
#     data = app.current_request.json_body
#     return alerts.update(alertId, data)
#
#
# @app.route('/{projectId}/alerts/{alertId}', methods=['DELETE'])
# def delete_alert(projectId, alertId, context):
#     return alerts.delete(projectId, alertId)
#
#
# @app.route('/{projectId}/funnels', methods=['POST', 'PUT'])
# def add_funnel(projectId, context):
#     data = app.current_request.json_body
#     return funnels.create(project_id=projectId,
#                           user_id=context['userId'],
#                           name=data["name"],
#                           filter=data["filter"],
#                           is_public=data.get("isPublic", False))
#
#
# @app.route('/{projectId}/funnels', methods=['GET'])
# def get_funnels(projectId, context):
#     params = app.current_request.query_params
#     if params is None:
#         params = {}
#
#     return {"data": funnels.get_by_user(project_id=projectId,
#                                         user_id=context['userId'],
#                                         range_value=None,
#                                         start_date=None,
#                                         end_date=None,
#                                         details=False)}
#
#
# @app.route('/{projectId}/funnels/details', methods=['GET'])
# def get_funnels_with_details(projectId, context):
#     params = app.current_request.query_params
#     if params is None:
#         params = {}
#
#     return {"data": funnels.get_by_user(project_id=projectId,
#                                         user_id=context['userId'],
#                                         range_value=params.get("rangeValue", None),
#                                         start_date=params.get('startDate', None),
#                                         end_date=params.get('endDate', None),
#                                         details=True)}
#
#
# @app.route('/{projectId}/funnels/issue_types', methods=['GET'])
# def get_possible_issue_types(projectId, context):
#     params = app.current_request.query_params
#     if params is None:
#         params = {}
#
#     return {"data": funnels.get_possible_issue_types(project_id=projectId)}
#
#
# @app.route('/{projectId}/funnels/{funnelId}/insights', methods=['GET'])
# def get_funnel_insights(projectId, funnelId, context):
#     params = app.current_request.query_params
#     if params is None:
#         params = {}
#
#     return funnels.get_top_insights(funnel_id=funnelId, project_id=projectId,
#                                     range_value=params.get("range_value", None),
#                                     start_date=params.get('startDate', None),
#                                     end_date=params.get('endDate', None))
#
#
# @app.route('/{projectId}/funnels/{funnelId}/insights', methods=['POST', 'PUT'])
# def get_funnel_insights_on_the_fly(projectId, funnelId, context):
#     params = app.current_request.query_params
#     if params is None:
#         params = {}
#     data = app.current_request.json_body
#     if data is None:
#         data = {}
#
#     return funnels.get_top_insights_on_the_fly(funnel_id=funnelId, project_id=projectId, data={**params, **data})
#
#
# @app.route('/{projectId}/funnels/{funnelId}/issues', methods=['GET'])
# def get_funnel_issues(projectId, funnelId, context):
#     params = app.current_request.query_params
#     if params is None:
#         params = {}
#
#     return funnels.get_issues(funnel_id=funnelId, project_id=projectId,
#                               range_value=params.get("range_value", None),
#                               start_date=params.get('startDate', None), end_date=params.get('endDate', None))
#
#
# @app.route('/{projectId}/funnels/{funnelId}/issues', methods=['POST', 'PUT'])
# def get_funnel_issues_on_the_fly(projectId, funnelId, context):
#     params = app.current_request.query_params
#     if params is None:
#         params = {}
#     data = app.current_request.json_body
#     if data is None:
#         data = {}
#
#     return {"data": funnels.get_issues_on_the_fly(funnel_id=funnelId, project_id=projectId, data={**params, **data})}
#
#
# @app.route('/{projectId}/funnels/{funnelId}/sessions', methods=['GET'])
# def get_funnel_sessions(projectId, funnelId, context):
#     params = app.current_request.query_params
#     if params is None:
#         params = {}
#
#     return {"data": funnels.get_sessions(funnel_id=funnelId, user_id=context['userId'], project_id=projectId,
#                                          range_value=params.get("range_value", None),
#                                          start_date=params.get('startDate', None),
#                                          end_date=params.get('endDate', None))}
#
#
# @app.route('/{projectId}/funnels/{funnelId}/sessions', methods=['POST', 'PUT'])
# def get_funnel_sessions_on_the_fly(projectId, funnelId, context):
#     params = app.current_request.query_params
#     if params is None:
#         params = {}
#     data = app.current_request.json_body
#     if data is None:
#         data = {}
#     return {"data": funnels.get_sessions_on_the_fly(funnel_id=funnelId, user_id=context['userId'], project_id=projectId,
#                                                     data={**params, **data})}
#
#
# @app.route('/{projectId}/funnels/issues/{issueId}/sessions', methods=['GET'])
# def get_issue_sessions(projectId, issueId, context):
#     params = app.current_request.query_params
#     if params is None:
#         params = {}
#
#     issue = issues.get(project_id=projectId, issue_id=issueId)
#     return {
#         "data": {"sessions": sessions.search_by_issue(user_id=context["userId"], project_id=projectId, issue=issue,
#                                                       start_date=params.get('startDate', None),
#                                                       end_date=params.get('endDate', None)),
#                  "issue": issue}}
#
#
# @app.route('/{projectId}/funnels/{funnelId}/issues/{issueId}/sessions', methods=['POST', 'PUT'])
# def get_funnel_issue_sessions(projectId, funnelId, issueId, context):
#     data = app.current_request.json_body
#
#     data = funnels.search_by_issue(project_id=projectId, user_id=context["userId"], issue_id=issueId,
#                                    funnel_id=funnelId, data=data)
#     if "errors" in data:
#         return data
#     if data.get("issue") is None:
#         data["issue"] = issues.get(project_id=projectId, issue_id=issueId)
#     return {
#         "data": data
#     }
#
#
# @app.route('/{projectId}/funnels/{funnelId}', methods=['GET'])
# def get_funnel(projectId, funnelId, context):
#     data = funnels.get(funnel_id=funnelId,
#                        project_id=projectId)
#     if data is None:
#         return {"errors": ["funnel not found"]}
#     return data
#
#
# @app.route('/{projectId}/funnels/{funnelId}', methods=['POST', 'PUT'])
# def edit_funnel(projectId, funnelId, context):
#     data = app.current_request.json_body
#     return funnels.update(funnel_id=funnelId,
#                           user_id=context['userId'],
#                           name=data.get("name"),
#                           filter=data.get("filter"),
#                           is_public=data.get("isPublic"))
#
#
# @app.route('/{projectId}/funnels/{funnelId}', methods=['DELETE'])
# def delete_filter(projectId, funnelId, context):
#     return funnels.delete(user_id=context['userId'], funnel_id=funnelId, project_id=projectId)
#
#
# @app.route('/{projectId}/sourcemaps', methods=['PUT'], authorizer=bp_authorizers.api_key_authorizer)
# def sign_sourcemap_for_upload(projectId, context):
#     data = app.current_request.json_body
#     project_id = projects.get_internal_project_id(projectId)
#     if project_id is None:
#         return Response(status_code=400, body='invalid projectId')
#
#     return {"data": sourcemaps.presign_upload_urls(project_id=project_id, urls=data["URL"])}
#
#
# @app.route('/config/weekly_report', methods=['GET'])
# def get_weekly_report_config(context):
#     return {"data": weekly_report.get_config(user_id=context['userId'])}
#
#
# @app.route('/config/weekly_report', methods=['POST', 'PUT'])
# def get_weekly_report_config(context):
#     data = app.current_request.json_body
#     return {"data": weekly_report.edit_config(user_id=context['userId'], weekly_report=data.get("weeklyReport", True))}
#
#
# @app.route('/{projectId}/issue_types', methods=['GET'])
# def issue_types(projectId, context):
#     # return {"data": issues.get_types_by_project(project_id=projectId)}
#     return {"data": issues.get_all_types()}
#
#
# @app.route('/issue_types', methods=['GET'])
# def all_issue_types(context):
#     return {"data": issues.get_all_types()}
#
#
# @app.route('/flows', methods=['GET', 'PUT', 'POST', 'DELETE'])
# @app.route('/{projectId}/flows', methods=['GET', 'PUT', 'POST', 'DELETE'])
# def removed_endpoints(projectId=None, context=None):
#     return Response(body={"errors": ["Endpoint no longer available"]}, status_code=410)
#
#
# @app.route('/{projectId}/assist/sessions', methods=['GET'])
# def sessions_live(projectId, context):
#     data = assist.get_live_sessions(projectId)
#     return {'data': data}
#
#
# @app.route('/{projectId}/heatmaps/url', methods=['POST'])
# def get_heatmaps_by_url(projectId, context):
#     data = app.current_request.json_body
#     return {"data": heatmaps.get_by_url(project_id=projectId, data=data)}
