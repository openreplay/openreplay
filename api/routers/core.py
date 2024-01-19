from typing import Union

from decouple import config
from fastapi import Depends, Body

import schemas
from chalicelib.core import log_tool_rollbar, sourcemaps, events, sessions_assignments, projects, \
    alerts, issues, integrations_manager, metadata, \
    log_tool_elasticsearch, log_tool_datadog, \
    log_tool_stackdriver, reset_password, log_tool_cloudwatch, log_tool_sentry, log_tool_sumologic, log_tools, sessions, \
    log_tool_newrelic, announcements, log_tool_bugsnag, weekly_report, integration_jira_cloud, integration_github, \
    assist, mobile, tenants, boarding, notifications, webhook, users, \
    custom_metrics, saved_search, integrations_global, tags
from chalicelib.core.collaboration_msteams import MSTeams
from chalicelib.core.collaboration_slack import Slack
from or_dependencies import OR_context, OR_role
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app.get('/{projectId}/events/search', tags=["events"])
def events_search(projectId: int, q: str,
                  type: Union[schemas.FilterType, schemas.EventType,
                  schemas.PerformanceEventType, schemas.FetchFilterType,
                  schemas.GraphqlFilterType, str] = None,
                  key: str = None, source: str = None, live: bool = False,
                  context: schemas.CurrentContext = Depends(OR_context)):
    if len(q) == 0:
        return {"data": []}
    if live:
        return assist.autocomplete(project_id=projectId, q=q,
                                   key=key if key is not None else type)
    if type in [schemas.FetchFilterType._url]:
        type = schemas.EventType.request
    elif type in [schemas.GraphqlFilterType._name]:
        type = schemas.EventType.graphql
    elif isinstance(type, schemas.PerformanceEventType):
        if type in [schemas.PerformanceEventType.location_dom_complete,
                    schemas.PerformanceEventType.location_largest_contentful_paint_time,
                    schemas.PerformanceEventType.location_ttfb,
                    schemas.PerformanceEventType.location_avg_cpu_load,
                    schemas.PerformanceEventType.location_avg_memory_usage
                    ]:
            type = schemas.EventType.location
        elif type in [schemas.PerformanceEventType.fetch_failed]:
            type = schemas.EventType.request
        else:
            return {"data": []}

    result = events.search(text=q, event_type=type, project_id=projectId, source=source, key=key)
    return result


@app.get('/{projectId}/integrations', tags=["integrations"])
def get_integrations_status(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = integrations_global.get_global_integrations_status(tenant_id=context.tenant_id,
                                                              user_id=context.user_id,
                                                              project_id=projectId)
    return {"data": data}


@app.post('/{projectId}/integrations/{integration}/notify/{webhookId}/{source}/{sourceId}', tags=["integrations"])
def integration_notify(projectId: int, integration: str, webhookId: int, source: str, sourceId: str,
                       data: schemas.IntegrationNotificationSchema = Body(...),
                       context: schemas.CurrentContext = Depends(OR_context)):
    comment = None
    if data.comment:
        comment = data.comment

    args = {"tenant_id": context.tenant_id,
            "user": context.email, "comment": comment, "project_id": projectId,
            "integration_id": webhookId,
            "project_name": context.project.name}
    if integration == schemas.WebhookType.slack:
        if source == "sessions":
            return Slack.share_session(session_id=sourceId, **args)
        elif source == "errors":
            return Slack.share_error(error_id=sourceId, **args)
    elif integration == schemas.WebhookType.msteams:
        if source == "sessions":
            return MSTeams.share_session(session_id=sourceId, **args)
        elif source == "errors":
            return MSTeams.share_error(error_id=sourceId, **args)
    return {"data": None}


@app.get('/integrations/sentry', tags=["integrations"])
def get_all_sentry(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_sentry.get_all(tenant_id=context.tenant_id)}


@app.get('/{projectId}/integrations/sentry', tags=["integrations"])
def get_sentry(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_sentry.get(project_id=projectId)}


@app.post('/{projectId}/integrations/sentry', tags=["integrations"])
def add_edit_sentry(projectId: int, data: schemas.IntegrationSentrySchema = Body(...),
                    context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_sentry.add_edit(tenant_id=context.tenant_id, project_id=projectId, data=data)}


@app.delete('/{projectId}/integrations/sentry', tags=["integrations"])
def delete_sentry(projectId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_sentry.delete(tenant_id=context.tenant_id, project_id=projectId)}


@app.get('/{projectId}/integrations/sentry/events/{eventId}', tags=["integrations"])
def proxy_sentry(projectId: int, eventId: str, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_sentry.proxy_get(tenant_id=context.tenant_id, project_id=projectId, event_id=eventId)}


@app.get('/integrations/datadog', tags=["integrations"])
def get_all_datadog(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_datadog.get_all(tenant_id=context.tenant_id)}


@app.get('/{projectId}/integrations/datadog', tags=["integrations"])
def get_datadog(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_datadog.get(project_id=projectId)}


@app.post('/{projectId}/integrations/datadog', tags=["integrations"])
def add_edit_datadog(projectId: int, data: schemas.IntegrationDatadogSchema = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_datadog.add_edit(tenant_id=context.tenant_id, project_id=projectId, data=data)}


@app.delete('/{projectId}/integrations/datadog', tags=["integrations"])
def delete_datadog(projectId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_datadog.delete(tenant_id=context.tenant_id, project_id=projectId)}


@app.get('/integrations/stackdriver', tags=["integrations"])
def get_all_stackdriver(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_stackdriver.get_all(tenant_id=context.tenant_id)}


@app.get('/{projectId}/integrations/stackdriver', tags=["integrations"])
def get_stackdriver(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_stackdriver.get(project_id=projectId)}


@app.post('/{projectId}/integrations/stackdriver', tags=["integrations"])
def add_edit_stackdriver(projectId: int, data: schemas.IntegartionStackdriverSchema = Body(...),
                         context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_stackdriver.add_edit(tenant_id=context.tenant_id, project_id=projectId, data=data)}


@app.delete('/{projectId}/integrations/stackdriver', tags=["integrations"])
def delete_stackdriver(projectId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_stackdriver.delete(tenant_id=context.tenant_id, project_id=projectId)}


@app.get('/integrations/newrelic', tags=["integrations"])
def get_all_newrelic(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_newrelic.get_all(tenant_id=context.tenant_id)}


@app.get('/{projectId}/integrations/newrelic', tags=["integrations"])
def get_newrelic(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_newrelic.get(project_id=projectId)}


@app.post('/{projectId}/integrations/newrelic', tags=["integrations"])
def add_edit_newrelic(projectId: int, data: schemas.IntegrationNewrelicSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_newrelic.add_edit(tenant_id=context.tenant_id, project_id=projectId, data=data)}


@app.delete('/{projectId}/integrations/newrelic', tags=["integrations"])
def delete_newrelic(projectId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_newrelic.delete(tenant_id=context.tenant_id, project_id=projectId)}


@app.get('/integrations/rollbar', tags=["integrations"])
def get_all_rollbar(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_rollbar.get_all(tenant_id=context.tenant_id)}


@app.get('/{projectId}/integrations/rollbar', tags=["integrations"])
def get_rollbar(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_rollbar.get(project_id=projectId)}


@app.post('/{projectId}/integrations/rollbar', tags=["integrations"])
def add_edit_rollbar(projectId: int, data: schemas.IntegrationRollbarSchema = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_rollbar.add_edit(tenant_id=context.tenant_id, project_id=projectId, data=data)}


@app.delete('/{projectId}/integrations/rollbar', tags=["integrations"])
def delete_datadog(projectId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_rollbar.delete(tenant_id=context.tenant_id, project_id=projectId)}


@app.post('/integrations/bugsnag/list_projects', tags=["integrations"])
def list_projects_bugsnag(data: schemas.IntegrationBugsnagBasicSchema = Body(...),
                          context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_bugsnag.list_projects(auth_token=data.authorization_token)}


@app.get('/integrations/bugsnag', tags=["integrations"])
def get_all_bugsnag(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_bugsnag.get_all(tenant_id=context.tenant_id)}


@app.get('/{projectId}/integrations/bugsnag', tags=["integrations"])
def get_bugsnag(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_bugsnag.get(project_id=projectId)}


@app.post('/{projectId}/integrations/bugsnag', tags=["integrations"])
def add_edit_bugsnag(projectId: int, data: schemas.IntegrationBugsnagSchema = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_bugsnag.add_edit(tenant_id=context.tenant_id, project_id=projectId, data=data)}


@app.delete('/{projectId}/integrations/bugsnag', tags=["integrations"])
def delete_bugsnag(projectId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_bugsnag.delete(tenant_id=context.tenant_id, project_id=projectId)}


@app.post('/integrations/cloudwatch/list_groups', tags=["integrations"])
def list_groups_cloudwatch(data: schemas.IntegrationCloudwatchBasicSchema = Body(...),
                           context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_cloudwatch.list_log_groups(aws_access_key_id=data.awsAccessKeyId,
                                                        aws_secret_access_key=data.awsSecretAccessKey,
                                                        region=data.region)}


@app.get('/integrations/cloudwatch', tags=["integrations"])
def get_all_cloudwatch(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_cloudwatch.get_all(tenant_id=context.tenant_id)}


@app.get('/{projectId}/integrations/cloudwatch', tags=["integrations"])
def get_cloudwatch(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_cloudwatch.get(project_id=projectId)}


@app.post('/{projectId}/integrations/cloudwatch', tags=["integrations"])
def add_edit_cloudwatch(projectId: int, data: schemas.IntegrationCloudwatchSchema = Body(...),
                        context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_cloudwatch.add_edit(tenant_id=context.tenant_id, project_id=projectId, data=data)}


@app.delete('/{projectId}/integrations/cloudwatch', tags=["integrations"])
def delete_cloudwatch(projectId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_cloudwatch.delete(tenant_id=context.tenant_id, project_id=projectId)}


@app.get('/integrations/elasticsearch', tags=["integrations"])
def get_all_elasticsearch(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_elasticsearch.get_all(tenant_id=context.tenant_id)}


@app.get('/{projectId}/integrations/elasticsearch', tags=["integrations"])
def get_elasticsearch(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_elasticsearch.get(project_id=projectId)}


@app.post('/integrations/elasticsearch/test', tags=["integrations"])
def test_elasticsearch_connection(data: schemas.IntegrationElasticsearchTestSchema = Body(...),
                                  context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_elasticsearch.ping(tenant_id=context.tenant_id, data=data)}


@app.post('/{projectId}/integrations/elasticsearch', tags=["integrations"])
def add_edit_elasticsearch(projectId: int, data: schemas.IntegrationElasticsearchSchema = Body(...),
                           context: schemas.CurrentContext = Depends(OR_context)):
    return {
        "data": log_tool_elasticsearch.add_edit(tenant_id=context.tenant_id, project_id=projectId, data=data)}


@app.delete('/{projectId}/integrations/elasticsearch', tags=["integrations"])
def delete_elasticsearch(projectId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_elasticsearch.delete(tenant_id=context.tenant_id, project_id=projectId)}


@app.get('/integrations/sumologic', tags=["integrations"])
def get_all_sumologic(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_sumologic.get_all(tenant_id=context.tenant_id)}


@app.get('/{projectId}/integrations/sumologic', tags=["integrations"])
def get_sumologic(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_sumologic.get(project_id=projectId)}


@app.post('/{projectId}/integrations/sumologic', tags=["integrations"])
def add_edit_sumologic(projectId: int, data: schemas.IntegrationSumologicSchema = Body(...),
                       context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_sumologic.add_edit(tenant_id=context.tenant_id, project_id=projectId, data=data)}


@app.delete('/{projectId}/integrations/sumologic', tags=["integrations"])
def delete_sumologic(projectId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": log_tool_sumologic.delete(tenant_id=context.tenant_id, project_id=projectId)}


@app.get('/integrations/issues', tags=["integrations"])
def get_integration_status(context: schemas.CurrentContext = Depends(OR_context)):
    error, integration = integrations_manager.get_integration(tenant_id=context.tenant_id,
                                                              user_id=context.user_id)
    if error is not None and integration is None:
        return {"data": {}}
    return {"data": integration.get_obfuscated()}


@app.get('/integrations/jira', tags=["integrations"])
def get_integration_status_jira(context: schemas.CurrentContext = Depends(OR_context)):
    error, integration = integrations_manager.get_integration(tenant_id=context.tenant_id,
                                                              user_id=context.user_id,
                                                              tool=integration_jira_cloud.PROVIDER)
    if error is not None and integration is None:
        return error
    return {"data": integration.get_obfuscated()}


@app.get('/integrations/github', tags=["integrations"])
def get_integration_status_github(context: schemas.CurrentContext = Depends(OR_context)):
    error, integration = integrations_manager.get_integration(tenant_id=context.tenant_id,
                                                              user_id=context.user_id,
                                                              tool=integration_github.PROVIDER)
    if error is not None and integration is None:
        return error
    return {"data": integration.get_obfuscated()}


@app.post('/integrations/jira', tags=["integrations"])
def add_edit_jira_cloud(data: schemas.IssueTrackingJiraSchema = Body(...),
                        context: schemas.CurrentContext = Depends(OR_context)):
    if not str(data.url).rstrip('/').endswith('atlassian.net'):
        return {"errors": ["url must be a valid JIRA URL (example.atlassian.net)"]}
    error, integration = integrations_manager.get_integration(tool=integration_jira_cloud.PROVIDER,
                                                              tenant_id=context.tenant_id,
                                                              user_id=context.user_id)
    if error is not None and integration is None:
        return error
    return {"data": integration.add_edit(data=data)}


@app.post('/integrations/github', tags=["integrations"])
def add_edit_github(data: schemas.IssueTrackingGithubSchema = Body(...),
                    context: schemas.CurrentContext = Depends(OR_context)):
    error, integration = integrations_manager.get_integration(tool=integration_github.PROVIDER,
                                                              tenant_id=context.tenant_id,
                                                              user_id=context.user_id)
    if error is not None:
        return error
    return {"data": integration.add_edit(data=data)}


@app.delete('/integrations/issues', tags=["integrations"])
def delete_default_issue_tracking_tool(_=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    error, integration = integrations_manager.get_integration(tenant_id=context.tenant_id,
                                                              user_id=context.user_id)
    if error is not None and integration is None:
        return error
    return {"data": integration.delete()}


@app.delete('/integrations/jira', tags=["integrations"])
def delete_jira_cloud(_=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    error, integration = integrations_manager.get_integration(tool=integration_jira_cloud.PROVIDER,
                                                              tenant_id=context.tenant_id,
                                                              user_id=context.user_id,
                                                              for_delete=True)
    if error is not None:
        return error
    return {"data": integration.delete()}


@app.delete('/integrations/github', tags=["integrations"])
def delete_github(_=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    error, integration = integrations_manager.get_integration(tool=integration_github.PROVIDER,
                                                              tenant_id=context.tenant_id,
                                                              user_id=context.user_id,
                                                              for_delete=True)
    if error is not None:
        return error
    return {"data": integration.delete()}


@app.get('/integrations/issues/list_projects', tags=["integrations"])
def get_all_issue_tracking_projects(context: schemas.CurrentContext = Depends(OR_context)):
    error, integration = integrations_manager.get_integration(tenant_id=context.tenant_id,
                                                              user_id=context.user_id)
    if error is not None:
        return error
    data = integration.issue_handler.get_projects()
    if "errors" in data:
        return data
    return {"data": data}


@app.get('/integrations/issues/{integrationProjectId}', tags=["integrations"])
def get_integration_metadata(integrationProjectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    error, integration = integrations_manager.get_integration(tenant_id=context.tenant_id,
                                                              user_id=context.user_id)
    if error is not None:
        return error
    data = integration.issue_handler.get_metas(integrationProjectId)
    if "errors" in data.keys():
        return data
    return {"data": data}


@app.get('/{projectId}/assignments', tags=["assignment"])
def get_all_assignments(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_assignments.get_all(project_id=projectId, user_id=context.user_id)
    return {
        'data': data
    }


@app.post('/{projectId}/sessions/{sessionId}/assign/projects/{integrationProjectId}', tags=["assignment"])
def create_issue_assignment(projectId: int, sessionId: int, integrationProjectId,
                            data: schemas.AssignmentSchema = Body(...),
                            context: schemas.CurrentContext = Depends(OR_context)):
    data = sessions_assignments.create_new_assignment(tenant_id=context.tenant_id, project_id=projectId,
                                                      session_id=sessionId,
                                                      creator_id=context.user_id, assignee=data.assignee,
                                                      description=data.description, title=data.title,
                                                      issue_type=data.issue_type,
                                                      integration_project_id=integrationProjectId)
    if "errors" in data.keys():
        return data
    return {
        'data': data
    }


@app.get('/{projectId}/gdpr', tags=["projects", "gdpr"])
def get_gdpr(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": projects.get_gdpr(project_id=projectId)}


@app.post('/{projectId}/gdpr', tags=["projects", "gdpr"])
def edit_gdpr(projectId: int, data: schemas.GdprSchema = Body(...),
              context: schemas.CurrentContext = Depends(OR_context)):
    result = projects.edit_gdpr(project_id=projectId, gdpr=data)
    if "errors" in result:
        return result
    return {"data": result}


@public_app.post('/password/reset-link', tags=["reset password"])
def reset_password_handler(data: schemas.ForgetPasswordPayloadSchema = Body(...)):
    if len(data.email) < 5:
        return {"errors": ["please provide a valid email address"]}
    return reset_password.reset(data=data)


@app.get('/{projectId}/metadata', tags=["metadata"])
def get_metadata(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": metadata.get(project_id=projectId)}


# @app.post('/{projectId}/metadata/list', tags=["metadata"])
# def add_edit_delete_metadata(projectId: int, data: schemas.MetadataListSchema = Body(...),
#                              context: schemas.CurrentContext = Depends(OR_context)):
#     return metadata.add_edit_delete(tenant_id=context.tenant_id, project_id=projectId, new_metas=data.list)


@app.post('/{projectId}/metadata', tags=["metadata"])
def add_metadata(projectId: int, data: schemas.MetadataSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return metadata.add(tenant_id=context.tenant_id, project_id=projectId, new_name=data.key)


@app.post('/{projectId}/metadata/{index}', tags=["metadata"])
def edit_metadata(projectId: int, index: int, data: schemas.MetadataSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    return metadata.edit(tenant_id=context.tenant_id, project_id=projectId, index=index,
                         new_name=data.key)


@app.delete('/{projectId}/metadata/{index}', tags=["metadata"])
def delete_metadata(projectId: int, index: int, _=Body(None),
                    context: schemas.CurrentContext = Depends(OR_context)):
    return metadata.delete(tenant_id=context.tenant_id, project_id=projectId, index=index)


@app.get('/{projectId}/metadata/search', tags=["metadata"])
def search_metadata(projectId: int, q: str, key: str, context: schemas.CurrentContext = Depends(OR_context)):
    if len(q) == 0 and len(key) == 0:
        return {"data": []}
    if len(q) == 0:
        return {"errors": ["please provide a value for search"]}
    if len(key) == 0:
        return {"errors": ["please provide a key for search"]}
    return metadata.search(tenant_id=context.tenant_id, project_id=projectId, value=q, key=key)


@app.get('/{projectId}/integration/sources', tags=["integrations"])
def search_integrations(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return log_tools.search(project_id=projectId)


@app.get('/{projectId}/sample_rate', tags=["projects"])
def get_capture_status(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": projects.get_capture_status(project_id=projectId)}


@app.post('/{projectId}/sample_rate', tags=["projects"])
def update_capture_status(projectId: int, data: schemas.SampleRateSchema = Body(...),
                          context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": projects.update_capture_status(project_id=projectId, changes=data)}


@app.post('/{projectId}/conditions', tags=["projects"])
def update_conditions(projectId: int, data: schemas.ProjectSettings = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": projects.update_conditions(project_id=projectId, changes=data)}


@app.get('/{projectId}/conditions', tags=["projects"])
def get_conditions(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": projects.get_conditions(project_id=projectId)}


@app.get('/announcements', tags=["announcements"])
def get_all_announcements(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": announcements.get_all(user_id=context.user_id)}


@app.get('/announcements/view', tags=["announcements"])
def get_all_announcements(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": announcements.view(user_id=context.user_id)}


@app.get('/show_banner', tags=["banner"])
def errors_merge(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": False}


@app.post('/{projectId}/alerts', tags=["alerts"])
def create_alert(projectId: int, data: schemas.AlertSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return alerts.create(project_id=projectId, data=data)


@app.get('/{projectId}/alerts', tags=["alerts"])
def get_all_alerts(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": alerts.get_all(project_id=projectId)}


@app.get('/{projectId}/alerts/triggers', tags=["alerts", "customMetrics"])
def get_alerts_triggers(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": alerts.get_predefined_values() \
                    + custom_metrics.get_series_for_alert(project_id=projectId, user_id=context.user_id)}


@app.get('/{projectId}/alerts/{alertId}', tags=["alerts"])
def get_alert(projectId: int, alertId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": alerts.get(id=alertId)}


@app.post('/{projectId}/alerts/{alertId}', tags=["alerts"])
def update_alert(projectId: int, alertId: int, data: schemas.AlertSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return alerts.update(id=alertId, data=data)


@app.delete('/{projectId}/alerts/{alertId}', tags=["alerts"])
def delete_alert(projectId: int, alertId: int, _=Body(None),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return alerts.delete(project_id=projectId, alert_id=alertId)


@app_apikey.put('/{projectKey}/sourcemaps/', tags=["sourcemaps"])
@app_apikey.put('/{projectKey}/sourcemaps', tags=["sourcemaps"])
def sign_sourcemap_for_upload(projectKey: str, data: schemas.SourcemapUploadPayloadSchema = Body(...),
                              context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": sourcemaps.presign_upload_urls(project_id=context.project.project_id, urls=data.urls)}


@app.get('/config/weekly_report', tags=["weekly report config"])
def get_weekly_report_config(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": weekly_report.get_config(user_id=context.user_id)}


@app.post('/config/weekly_report', tags=["weekly report config"])
def edit_weekly_report_config(data: schemas.WeeklyReportConfigSchema = Body(...),
                              context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": weekly_report.edit_config(user_id=context.user_id, weekly_report=data.weekly_report)}


@app.get('/{projectId}/issue_types', tags=["issues"])
def issue_types(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": issues.get_all_types()}


@app.get('/issue_types', tags=["issues"])
def all_issue_types(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": issues.get_all_types()}


@app.get('/{projectId}/assist/sessions', tags=["assist"])
def get_sessions_live(projectId: int, userId: str = None, context: schemas.CurrentContext = Depends(OR_context)):
    data = assist.get_live_sessions_ws_user_id(projectId, user_id=userId)
    return {'data': data}


@app.post('/{projectId}/assist/sessions', tags=["assist"])
def sessions_live(projectId: int, data: schemas.LiveSessionsSearchPayloadSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    data = assist.get_live_sessions_ws(projectId, body=data)
    return {'data': data}


@app.post('/{projectId}/mobile/{sessionId}/urls', tags=['mobile'])
def mobile_signe(projectId: int, sessionId: int, data: schemas.MobileSignPayloadSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": mobile.sign_keys(project_id=projectId, session_id=sessionId, keys=data.keys)}


@app.post('/projects', tags=['projects'], dependencies=[OR_role("owner", "admin")])
def create_project(data: schemas.CreateProjectSchema = Body(...),
                   context: schemas.CurrentContext = Depends(OR_context)):
    return projects.create(tenant_id=context.tenant_id, user_id=context.user_id, data=data)


@app.get('/projects/{projectId}', tags=['projects'])
def get_project(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = projects.get_project(tenant_id=context.tenant_id, project_id=projectId, include_last_session=True,
                                include_gdpr=True)
    if data is None:
        return {"errors": ["project not found"]}
    return {"data": data}


@app.put('/projects/{projectId}', tags=['projects'], dependencies=[OR_role("owner", "admin")])
def edit_project(projectId: int, data: schemas.CreateProjectSchema = Body(...),
                 context: schemas.CurrentContext = Depends(OR_context)):
    return projects.edit(tenant_id=context.tenant_id, user_id=context.user_id, data=data, project_id=projectId)


@app.delete('/projects/{projectId}', tags=['projects'], dependencies=[OR_role("owner", "admin")])
def delete_project(projectId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return projects.delete(tenant_id=context.tenant_id, user_id=context.user_id, project_id=projectId)


@app.get('/client/new_api_key', tags=['client'])
def generate_new_tenant_token(context: schemas.CurrentContext = Depends(OR_context)):
    return {
        'data': tenants.generate_new_api_key(context.tenant_id)
    }


@app.post('/users/modules', tags=['users'])
def update_user_module(context: schemas.CurrentContext = Depends(OR_context),
                       data: schemas.ModuleStatus = Body(...)):
    return {"data": users.update_user_module(context.user_id, data)}


@app.get('/notifications', tags=['notifications'])
def get_notifications(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": notifications.get_all(tenant_id=context.tenant_id, user_id=context.user_id)}


@app.get('/notifications/count', tags=['notifications'])
def get_notifications_count(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": notifications.get_all_count(tenant_id=context.tenant_id, user_id=context.user_id)}


@app.get('/notifications/{notificationId}/view', tags=['notifications'])
def view_notifications(notificationId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": notifications.view_notification(notification_ids=[notificationId], user_id=context.user_id)}


@app.post('/notifications/view', tags=['notifications'])
def batch_view_notifications(data: schemas.NotificationsViewSchema,
                             context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": notifications.view_notification(notification_ids=data.ids,
                                                    startTimestamp=data.startTimestamp,
                                                    endTimestamp=data.endTimestamp,
                                                    user_id=context.user_id,
                                                    tenant_id=context.tenant_id)}


@app.get('/boarding', tags=['boarding'])
def get_boarding_state(context: schemas.CurrentContext = Depends(OR_context)):
    if config("LOCAL_DEV", cast=bool, default=False):
        return {"data": ""}
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


@app.get('/integrations/slack/channels', tags=["integrations"])
def get_slack_channels(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": webhook.get_by_type(tenant_id=context.tenant_id, webhook_type=schemas.WebhookType.slack)}


@app.get('/integrations/slack/{integrationId}', tags=["integrations"])
def get_slack_webhook(integrationId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": Slack.get_integration(tenant_id=context.tenant_id, integration_id=integrationId)}


@app.delete('/integrations/slack/{integrationId}', tags=["integrations"])
def delete_slack_integration(integrationId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return webhook.delete(tenant_id=context.tenant_id, webhook_id=integrationId)


@app.put('/webhooks', tags=["webhooks"])
def add_edit_webhook(data: schemas.WebhookSchema = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": webhook.add_edit(tenant_id=context.tenant_id, data=data, replace_none=True)}


@app.get('/webhooks', tags=["webhooks"])
def get_webhooks(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": webhook.get_by_tenant(tenant_id=context.tenant_id, replace_none=True)}


@app.delete('/webhooks/{webhookId}', tags=["webhooks"])
def delete_webhook(webhookId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return webhook.delete(tenant_id=context.tenant_id, webhook_id=webhookId)


@app.get('/client/members', tags=["client"], dependencies=[OR_role("owner", "admin")])
def get_members(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": users.get_members(tenant_id=context.tenant_id)}


@app.get('/client/members/{memberId}/reset', tags=["client"], dependencies=[OR_role("owner", "admin")])
def reset_reinvite_member(memberId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return users.reset_member(tenant_id=context.tenant_id, editor_id=context.user_id, user_id_to_update=memberId)


@app.delete('/client/members/{memberId}', tags=["client"], dependencies=[OR_role("owner", "admin")])
def delete_member(memberId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    return users.delete_member(tenant_id=context.tenant_id, user_id=context.user_id, id_to_delete=memberId)


@app.get('/account/new_api_key', tags=["account"], dependencies=[OR_role("owner", "admin")])
def generate_new_user_token(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": users.generate_new_api_key(user_id=context.user_id)}


@app.post('/account/password', tags=["account"])
def change_client_password(data: schemas.EditUserPasswordSchema = Body(...),
                           context: schemas.CurrentContext = Depends(OR_context)):
    return users.change_password(email=context.email, old_password=data.old_password.get_secret_value(),
                                 new_password=data.new_password.get_secret_value(), tenant_id=context.tenant_id,
                                 user_id=context.user_id)


@app.post('/{projectId}/saved_search', tags=["savedSearch"])
def add_saved_search(projectId: int, data: schemas.SavedSearchSchema = Body(...),
                     context: schemas.CurrentContext = Depends(OR_context)):
    return saved_search.create(project_id=projectId, user_id=context.user_id, data=data)


@app.get('/{projectId}/saved_search', tags=["savedSearch"])
def get_saved_searches(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": saved_search.get_all(project_id=projectId, user_id=context.user_id, details=True)}


@app.get('/{projectId}/saved_search/{search_id}', tags=["savedSearch"])
def get_saved_search(projectId: int, search_id: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": saved_search.get(project_id=projectId, search_id=search_id, user_id=context.user_id)}


@app.post('/{projectId}/saved_search/{search_id}', tags=["savedSearch"])
def update_saved_search(projectId: int, search_id: int, data: schemas.SavedSearchSchema = Body(...),
                        context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": saved_search.update(user_id=context.user_id, search_id=search_id, data=data, project_id=projectId)}


@app.delete('/{projectId}/saved_search/{search_id}', tags=["savedSearch"])
def delete_saved_search(projectId: int, search_id: int, _=Body(None),
                        context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": saved_search.delete(project_id=projectId, user_id=context.user_id, search_id=search_id)}


@app.get('/limits', tags=['accounts'])
def get_limits(context: schemas.CurrentContext = Depends(OR_context)):
    return {
        'data': {
            "teamMember": -1,
            "projects": -1,
        }
    }


@app.get('/integrations/msteams/channels', tags=["integrations"])
def get_msteams_channels(context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": webhook.get_by_type(tenant_id=context.tenant_id, webhook_type=schemas.WebhookType.msteams)}


@app.post('/integrations/msteams', tags=['integrations'])
def add_msteams_integration(data: schemas.AddCollaborationSchema,
                            context: schemas.CurrentContext = Depends(OR_context)):
    n = MSTeams.add(tenant_id=context.tenant_id, data=data)
    if n is None:
        return {
            "errors": [
                "We couldn't send you a test message on your Microsoft Teams channel. Please verify your webhook url."]
        }
    return {"data": n}


@app.post('/integrations/msteams/{webhookId}', tags=['integrations'])
def edit_msteams_integration(webhookId: int, data: schemas.EditCollaborationSchema = Body(...),
                             context: schemas.CurrentContext = Depends(OR_context)):
    if len(data.url.unicode_string()) > 0:
        old = MSTeams.get_integration(tenant_id=context.tenant_id, integration_id=webhookId)
        if not old:
            return {"errors": ["MsTeams integration not found."]}
        if old["endpoint"] != data.url.unicode_string():
            if not MSTeams.say_hello(data.url.unicode_string()):
                return {
                    "errors": [
                        "We couldn't send you a test message on your Microsoft Teams channel. Please verify your webhook url."]
                }
    return {"data": webhook.update(tenant_id=context.tenant_id, webhook_id=webhookId,
                                   changes={"name": data.name, "endpoint": data.url.unicode_string()})}


@app.delete('/integrations/msteams/{webhookId}', tags=["integrations"])
def delete_msteams_integration(webhookId: int, _=Body(None),
                               context: schemas.CurrentContext = Depends(OR_context)):
    return webhook.delete(tenant_id=context.tenant_id, webhook_id=webhookId)


@app.get('/{project_id}/check-recording-status', tags=["sessions"])
async def check_recording_status(project_id: int):
    """
    Check the recording status and sessions count for a given project ID.

    Args:
        project_id (int): The ID of the project to check.

    Returns:
        dict: A dictionary containing the recording status and sessions count.
              The dictionary has the following structure:
              {
                  "recording_status": int,   # The recording status:
                                            # 0 - No sessions
                                            # 1 - Processing
                                            # 2 - Ready
                  "sessions_count": int      # The total count of sessions
              }
    """
    return {"data": sessions.check_recording_status(project_id=project_id)}


@public_app.get('/', tags=["health"])
def health_check():
    return {}

# tags

@app.post('/{projectId}/tags', tags=["tags"])
def tags_create(projectId: int, data: schemas.TagCreate = Body(), context: schemas.CurrentContext = Depends(OR_context)):
    data = tags.create_tag(project_id=projectId, data=data)
    return {'data': data}


@app.put('/{projectId}/tags/{tagId}', tags=["tags"])
def tags_update(projectId: int, tagId: int, data: schemas.TagUpdate = Body(), context: schemas.CurrentContext = Depends(OR_context)):
    data = tags.update_tag(project_id=projectId, tag_id=tagId, data=data)
    return {'data': data}


@app.get('/{projectId}/tags', tags=["tags"])
def tags_list(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = tags.list_tags(project_id=projectId)
    return {'data': data}


@app.delete('/{projectId}/tags/{tagId}', tags=["tags"])
def tags_delete(projectId: int, tagId: int, context: schemas.CurrentContext = Depends(OR_context)):
    data = tags.delete_tag(projectId, tag_id=tagId)
    return {'data': data}
