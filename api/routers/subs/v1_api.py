from fastapi import Depends, Body

import schemas
from chalicelib.core import sessions, events, jobs, projects
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app_apikey.get('/v1/{projectKey}/users/{userId}/sessions', tags=["api"])
def get_user_sessions(projectKey: str, userId: str, start_date: int = None, end_date: int = None):
    projectId = projects.get_internal_project_id(projectKey)
    if projectId is None:
        return {"errors": ["invalid projectKey"]}
    return {
        "data": sessions.get_user_sessions(
            project_id=projectId,
            user_id=userId,
            start_date=start_date,
            end_date=end_date
        )
    }


@app_apikey.get('/v1/{projectKey}/sessions/{sessionId}/events', tags=["api"])
def get_session_events(projectKey: str, sessionId: int):
    projectId = projects.get_internal_project_id(projectKey)
    if projectId is None:
        return {"errors": ["invalid projectKey"]}
    return {
        "data": events.get_by_session_id(
            project_id=projectId,
            session_id=sessionId
        )
    }


@app_apikey.get('/v1/{projectKey}/users/{userId}', tags=["api"])
def get_user_details(projectKey: str, userId: str):
    projectId = projects.get_internal_project_id(projectKey)
    if projectId is None:
        return {"errors": ["invalid projectKey"]}
    return {
        "data": sessions.get_session_user(
            project_id=projectId,
            user_id=userId
        )
    }


@app_apikey.delete('/v1/{projectKey}/users/{userId}', tags=["api"])
def schedule_to_delete_user_data(projectKey: str, userId: str, _=Body(None)):
    projectId = projects.get_internal_project_id(projectKey)
    if projectId is None:
        return {"errors": ["invalid projectKey"]}
    record = jobs.create(project_id=projectId, user_id=userId)
    return {"data": record}


@app_apikey.get('/v1/{projectKey}/jobs', tags=["api"])
def get_jobs(projectKey: str):
    projectId = projects.get_internal_project_id(projectKey)
    if projectId is None:
        return {"errors": ["invalid projectKey"]}
    return {"data": jobs.get_all(project_id=projectId)}


@app_apikey.get('/v1/{projectKey}/jobs/{jobId}', tags=["api"])
def get_job(projectKey: str, jobId: int):
    return {"data": jobs.get(job_id=jobId)}


@app_apikey.delete('/v1/{projectKey}/jobs/{jobId}', tags=["api"])
def cancel_job(projectKey: str, jobId: int, _=Body(None)):
    job = jobs.get(job_id=jobId)
    job_not_found = len(job.keys()) == 0

    if job_not_found:
        return {"errors": ["Job not found."]}
    if job["status"] == jobs.JobStatus.COMPLETED or job["status"] == jobs.JobStatus.CANCELLED:
        return {"errors": ["The request job has already been canceled/completed."]}

    job["status"] = "cancelled"
    return {"data": jobs.update(job_id=jobId, job=job)}


@app_apikey.get('/v1/projects', tags=["api"])
def get_projects(context: schemas.CurrentContext = Depends(OR_context)):
    records = projects.get_projects(tenant_id=context.tenant_id)
    for record in records:
        del record['projectId']

    return {"data": records}


@app_apikey.get('/v1/projects/{projectKey}', tags=["api"])
def get_project(projectKey: str, context: schemas.CurrentContext = Depends(OR_context)):
    return {
        "data": projects.get_project_by_key(tenant_id=context.tenant_id, project_key=projectKey)
    }


@app_apikey.post('/v1/projects', tags=["api"])
def create_project(data: schemas.CreateProjectSchema = Body(...),
                   context: schemas.CurrentContext = Depends(OR_context)):
    record = projects.create(
        tenant_id=context.tenant_id,
        user_id=None,
        data=data,
        skip_authorization=True
    )
    del record["data"]['projectId']
    return record
