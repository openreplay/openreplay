from typing import Optional

from chalicelib.core import roles, traces, assist_records, sessions
from chalicelib.core import sessions_insights, assist_stats
from chalicelib.core import unlock, signals
from chalicelib.utils import assist_helper

unlock.check()

from or_dependencies import OR_context, OR_role
from routers.base import get_routers
import schemas
from fastapi import Depends, Body, Query

public_app, app, app_apikey = get_routers()


@app.get('/client/roles', tags=["client", "roles"], dependencies=[OR_role("owner", "admin")])
def get_roles(context: schemas.CurrentContext = Depends(OR_context)):
    return {
        'data': roles.get_roles(tenant_id=context.tenant_id)
    }


@app.post('/client/roles', tags=["client", "roles"], dependencies=[OR_role("owner", "admin")])
@app.put('/client/roles', tags=["client", "roles"], dependencies=[OR_role("owner", "admin")])
def add_role(data: schemas.RolePayloadSchema = Body(...),
             context: schemas.CurrentContext = Depends(OR_context)):
    data = roles.create(tenant_id=context.tenant_id, user_id=context.user_id, data=data)
    if "errors" in data:
        return data

    return {
        'data': data
    }


@app.post('/client/roles/{roleId}', tags=["client", "roles"], dependencies=[OR_role("owner", "admin")])
@app.put('/client/roles/{roleId}', tags=["client", "roles"], dependencies=[OR_role("owner", "admin")])
def edit_role(roleId: int, data: schemas.RolePayloadSchema = Body(...),
              context: schemas.CurrentContext = Depends(OR_context)):
    data = roles.update(tenant_id=context.tenant_id, user_id=context.user_id, role_id=roleId, data=data)
    if "errors" in data:
        return data

    return {
        'data': data
    }


@app.delete('/client/roles/{roleId}', tags=["client", "roles"], dependencies=[OR_role("owner", "admin")])
def delete_role(roleId: int, _=Body(None), context: schemas.CurrentContext = Depends(OR_context)):
    data = roles.delete(tenant_id=context.tenant_id, user_id=context.user_id, role_id=roleId)
    if "errors" in data:
        return data
    return {
        'data': data
    }


@app.get('/config/assist/credentials', tags=["assist"])
@app.get('/assist/credentials', tags=["assist"])
def get_assist_credentials():
    return {"data": assist_helper.get_full_config()}


@app.post('/trails', tags=["traces", "trails"], dependencies=[OR_role("owner", "admin")])
def get_trails(data: schemas.TrailSearchPayloadSchema = Body(...),
               context: schemas.CurrentContext = Depends(OR_context)):
    return {
        'data': traces.get_all(tenant_id=context.tenant_id, data=data)
    }


@app.post('/trails/actions', tags=["traces", "trails"], dependencies=[OR_role("owner", "admin")])
def get_available_trail_actions(context: schemas.CurrentContext = Depends(OR_context)):
    return {'data': traces.get_available_actions(tenant_id=context.tenant_id)}


@app.put('/{projectId}/assist/save', tags=["assist"])
def sign_record_for_upload(projectId: int, data: schemas.AssistRecordPayloadSchema = Body(...),
                           context: schemas.CurrentContext = Depends(OR_context)):
    if not sessions.session_exists(project_id=projectId, session_id=data.session_id):
        return {"errors": ["Session not found"]}
    return {"data": assist_records.presign_record(project_id=projectId, data=data, context=context)}


@app.put('/{projectId}/assist/save/done', tags=["assist"])
def save_record_after_upload(projectId: int, data: schemas.AssistRecordSavePayloadSchema = Body(...),
                             context: schemas.CurrentContext = Depends(OR_context)):
    if not sessions.session_exists(project_id=projectId, session_id=data.session_id):
        return {"errors": ["Session not found"]}
    return {"data": {"URL": assist_records.save_record(project_id=projectId, data=data, context=context)}}


@app.post('/{projectId}/assist/records', tags=["assist"])
def search_records(projectId: int, data: schemas.AssistRecordSearchPayloadSchema = Body(...),
                   context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": assist_records.search_records(project_id=projectId, data=data, context=context)}


@app.get('/{projectId}/assist/records/{recordId}', tags=["assist"])
def get_record(projectId: int, recordId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": assist_records.get_record(project_id=projectId, record_id=recordId, context=context)}


@app.post('/{projectId}/assist/records/{recordId}', tags=["assist"])
def update_record(projectId: int, recordId: int, data: schemas.AssistRecordUpdatePayloadSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    result = assist_records.update_record(project_id=projectId, record_id=recordId, data=data, context=context)
    if "errors" in result:
        return result
    return {"data": result}


@app.delete('/{projectId}/assist/records/{recordId}', tags=["assist"])
def delete_record(projectId: int, recordId: int, _=Body(None),
                  context: schemas.CurrentContext = Depends(OR_context)):
    result = assist_records.delete_record(project_id=projectId, record_id=recordId, context=context)
    if "errors" in result:
        return result
    return {"data": result}


@app.post('/{projectId}/signals', tags=['signals'])
def send_interactions(projectId: int, data: schemas.SignalsSchema = Body(...),
                      context: schemas.CurrentContext = Depends(OR_context)):
    data = signals.handle_frontend_signals_queued(project_id=projectId, user_id=context.user_id, data=data)

    if "errors" in data:
        return data
    return {'data': data}


@app.post('/{projectId}/dashboard/insights', tags=["insights"])
@app.post('/{projectId}/dashboard/insights', tags=["insights"])
def sessions_search(projectId: int, data: schemas.GetInsightsSchema = Body(...),
                    context: schemas.CurrentContext = Depends(OR_context)):
    return {'data': sessions_insights.fetch_selected(data=data, project_id=projectId)}


@public_app.get('/{project_id}/assist-stats/avg', tags=["assist-stats"])
def get_assist_stats_avg(
        project_id: int,
        startTimestamp: int = None,
        endTimestamp: int = None,
        userId: str = None
):
    return assist_stats.get_averages(
        project_id=project_id,
        start_timestamp=startTimestamp,
        end_timestamp=endTimestamp,
        user_id=userId)


@public_app.get(
    '/{project_id}/assist-stats/top-members',
    tags=["assist-stats"],
    response_model=schemas.AssistStatsTopMembersResponse
)
def get_assist_stats_top_members(
        project_id: int,
        startTimestamp: int = None,
        endTimestamp: int = None,
        sort: Optional[str] = Query(default="sessionsAssisted",
                                    description="Sort options: " + ", ".join(assist_stats.event_type_mapping)),
        order: str = "desc",
        userId: int = None,
        page: int = 0,
        limit: int = 5
):
    return assist_stats.get_top_members(
        project_id=project_id,
        start_timestamp=startTimestamp,
        end_timestamp=endTimestamp,
        sort_by=sort,
        sort_order=order,
        user_id=userId,
        page=page,
        limit=limit
    )


@public_app.post(
    '/{project_id}/assist-stats/sessions',
    tags=["assist-stats"],
    response_model=schemas.AssistStatsSessionsResponse
)
def get_assist_stats_sessions(
        project_id: int,
        data: schemas.AssistStatsSessionsRequest = Body(...),
):
    return assist_stats.get_sessions(
        project_id=project_id,
        data=data
    )
