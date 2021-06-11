from chalice import Blueprint

from chalicelib import _overrides
from chalicelib.blueprints import bp_authorizers
from chalicelib.core import sessions, events, jobs
from chalicelib.utils.TimeUTC import TimeUTC

app = Blueprint(__name__)
_overrides.chalice_app(app)


@app.route('/app/{projectId}/users/{userId}/sessions', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_user_sessions(projectId, userId, context):
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


@app.route('/app/{projectId}/sessions/{sessionId}/events', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_session_events(projectId, sessionId, context):
    return {
        'data': events.get_by_sessionId2_pg(
            project_id=projectId,
            session_id=sessionId
        )
    }


@app.route('/app/{projectId}/users/{userId}', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_user_details(projectId, userId, context):
    return {
        'data': sessions.get_session_user(
            project_id=projectId,
            user_id=userId
        )
    }
    pass


@app.route('/app/{projectId}/users/{userId}', methods=['DELETE'], authorizer=bp_authorizers.api_key_authorizer)
def schedule_to_delete_user_data(projectId, userId, context):
    data = app.current_request.json_body

    data["action"] = "delete_user_data"
    data["reference_id"] = userId
    data["description"] = f"Delete user sessions of userId = {userId}"
    data["start_at"] = TimeUTC.to_human_readable(TimeUTC.midnight(1))
    record = jobs.create(project_id=projectId, data=data)
    return {
        'data': record
    }


@app.route('/app/{projectId}/jobs', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_jobs(projectId, context):
    return {
        'data': jobs.get_all(project_id=projectId)
    }
    pass


@app.route('/app/{projectId}/jobs/{jobId}', methods=['GET'], authorizer=bp_authorizers.api_key_authorizer)
def get_job(projectId, jobId, context):
    return {
        'data': jobs.get(job_id=jobId)
    }
    pass


@app.route('/app/{projectId}/jobs/{jobId}', methods=['DELETE'], authorizer=bp_authorizers.api_key_authorizer)
def cancel_job(projectId, jobId, context):
    job = jobs.get(job_id=jobId)
    job_not_found = len(job.keys()) == 0
    if job_not_found or job["status"] == jobs.JobStatus.COMPLETED:
        return {
            'errors': ["Job doesn't exists." if job_not_found else "Job is already completed."]
        }

    job["status"] = "cancelled"
    return {
        'data': jobs.update(job_id=jobId, job=job)
    }

