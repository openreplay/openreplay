from chalice import Blueprint, Response

from chalicelib import _overrides
from chalicelib.blueprints import bp_authorizers
from chalicelib.core import sessions, events, jobs, projects
from chalicelib.utils.TimeUTC import TimeUTC

app = Blueprint(__name__)
_overrides.chalice_app(app)


@app.route('/v1/{projectKey}/users/{userId}/sessions', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_user_sessions(projectKey, userId, context):
    projectId = projects.get_internal_project_id(projectKey)
    params = app.current_request.query_params

    if params is None:
        params = {}

    return {
        'data': sessions.get_user_sessions(
            project_id=projectId,
            user_id=userId,
            start_date=params.get('start_date'),
            end_date=params.get('end_date')
        )
    }


@app.route('/v1/{projectKey}/sessions/{sessionId}/events', methods=['GET'],
           authorizer=bp_authorizers.api_key_authorizer)
def get_session_events(projectKey, sessionId, context):
    projectId = projects.get_internal_project_id(projectKey)
    return {
        'data': events.get_by_sessionId2_pg(
            project_id=projectId,
            session_id=sessionId
        )
    }


@app.route('/v1/{projectKey}/users/{userId}', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_user_details(projectKey, userId, context):
    projectId = projects.get_internal_project_id(projectKey)
    return {
        'data': sessions.get_session_user(
            project_id=projectId,
            user_id=userId
        )
    }
    pass


@app.route('/v1/{projectKey}/users/{userId}', methods=['DELETE'], authorizer=bp_authorizers.api_key_authorizer)
def schedule_to_delete_user_data(projectKey, userId, context):
    projectId = projects.get_internal_project_id(projectKey)
    data = app.current_request.json_body

    data["action"] = "delete_user_data"
    data["reference_id"] = userId
    data["description"] = f"Delete user sessions of userId = {userId}"
    data["start_at"] = TimeUTC.to_human_readable(TimeUTC.midnight(1))
    record = jobs.create(project_id=projectId, data=data)
    return {
        'data': record
    }


@app.route('/v1/{projectKey}/jobs', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_jobs(projectKey, context):
    projectId = projects.get_internal_project_id(projectKey)
    return {
        'data': jobs.get_all(project_id=projectId)
    }
    pass


@app.route('/v1/{projectKey}/jobs/{jobId}', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_job(projectKey, jobId, context):
    return {
        'data': jobs.get(job_id=jobId)
    }
    pass


@app.route('/v1/{projectKey}/jobs/{jobId}', methods=['DELETE'], authorizer=bp_authorizers.api_key_authorizer)
def cancel_job(projectKey, jobId, context):
    job = jobs.get(job_id=jobId)
    job_not_found = len(job.keys()) == 0

    if job_not_found or job["status"] == jobs.JobStatus.COMPLETED or job["status"] == jobs.JobStatus.CANCELLED:
        return Response(status_code=501, body="The request job has already been canceled/completed (or was not found).")

    job["status"] = "cancelled"
    return {
        'data': jobs.update(job_id=jobId, job=job)
    }

@app.route('/v1/projects', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_projects(context):
    records = projects.get_projects(tenant_id=context['tenantId'])
    for record in records:
        del record['projectId']

    return {
        'data': records
    }


@app.route('/v1/projects/{projectKey}', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_project(projectKey, context):
    return {
        'data': projects.get_project_by_key(tenant_id=context['tenantId'], project_key=projectKey)
    }


@app.route('/v1/projects', methods=['POST'], authorizer=bp_authorizers.api_key_authorizer)
def create_project(context):
    data = app.current_request.json_body
    record = projects.create(
      tenant_id=context['tenantId'],
      user_id=None,
      data=data,
      skip_authorization=True
    )
    del record['data']['projectId']
    return record
