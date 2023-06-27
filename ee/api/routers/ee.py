from chalicelib.core import roles, traces, assist_records, sessions
from chalicelib.core import unlock, signals
from chalicelib.core import sessions_insights
from chalicelib.utils import assist_helper

unlock.check()

from or_dependencies import OR_context
from routers.base import get_routers
import schemas_ee
from fastapi import Depends, Body

public_app, app, app_apikey = get_routers()


@app.get('/client/roles', tags=["client", "roles"])
def get_roles(context: schemas_ee.CurrentContext = Depends(OR_context)):
    return {
        'data': roles.get_roles(tenant_id=context.tenant_id)
    }


@app.post('/client/roles', tags=["client", "roles"])
@app.put('/client/roles', tags=["client", "roles"])
def add_role(data: schemas_ee.RolePayloadSchema = Body(...),
             context: schemas_ee.CurrentContext = Depends(OR_context)):
    data = roles.create(tenant_id=context.tenant_id, user_id=context.user_id, data=data)
    if "errors" in data:
        return data

    return {
        'data': data
    }


@app.post('/client/roles/{roleId}', tags=["client", "roles"])
@app.put('/client/roles/{roleId}', tags=["client", "roles"])
def edit_role(roleId: int, data: schemas_ee.RolePayloadSchema = Body(...),
              context: schemas_ee.CurrentContext = Depends(OR_context)):
    data = roles.update(tenant_id=context.tenant_id, user_id=context.user_id, role_id=roleId, data=data)
    if "errors" in data:
        return data

    return {
        'data': data
    }


@app.delete('/client/roles/{roleId}', tags=["client", "roles"])
def delete_role(roleId: int, _=Body(None), context: schemas_ee.CurrentContext = Depends(OR_context)):
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


@app.post('/trails', tags=["traces", "trails"])
def get_trails(data: schemas_ee.TrailSearchPayloadSchema = Body(...),
               context: schemas_ee.CurrentContext = Depends(OR_context)):
    return {
        'data': traces.get_all(tenant_id=context.tenant_id, data=data)
    }


@app.post('/trails/actions', tags=["traces", "trails"])
def get_available_trail_actions(context: schemas_ee.CurrentContext = Depends(OR_context)):
    return {'data': traces.get_available_actions(tenant_id=context.tenant_id)}


@app.put('/{projectId}/assist/save', tags=["assist"])
def sign_record_for_upload(projectId: int, data: schemas_ee.AssistRecordPayloadSchema = Body(...),
                           context: schemas_ee.CurrentContext = Depends(OR_context)):
    if not sessions.session_exists(project_id=projectId, session_id=data.session_id):
        return {"errors": ["Session not found"]}
    return {"data": assist_records.presign_record(project_id=projectId, data=data, context=context)}


@app.put('/{projectId}/assist/save/done', tags=["assist"])
def save_record_after_upload(projectId: int, data: schemas_ee.AssistRecordSavePayloadSchema = Body(...),
                             context: schemas_ee.CurrentContext = Depends(OR_context)):
    if not sessions.session_exists(project_id=projectId, session_id=data.session_id):
        return {"errors": ["Session not found"]}
    return {"data": {"URL": assist_records.save_record(project_id=projectId, data=data, context=context)}}


@app.post('/{projectId}/assist/records', tags=["assist"])
def search_records(projectId: int, data: schemas_ee.AssistRecordSearchPayloadSchema = Body(...),
                   context: schemas_ee.CurrentContext = Depends(OR_context)):
    return {"data": assist_records.search_records(project_id=projectId, data=data, context=context)}


@app.get('/{projectId}/assist/records/{recordId}', tags=["assist"])
def get_record(projectId: int, recordId: int, context: schemas_ee.CurrentContext = Depends(OR_context)):
    return {"data": assist_records.get_record(project_id=projectId, record_id=recordId, context=context)}


@app.post('/{projectId}/assist/records/{recordId}', tags=["assist"])
def update_record(projectId: int, recordId: int, data: schemas_ee.AssistRecordUpdatePayloadSchema = Body(...),
                  context: schemas_ee.CurrentContext = Depends(OR_context)):
    result = assist_records.update_record(project_id=projectId, record_id=recordId, data=data, context=context)
    if "errors" in result:
        return result
    return {"data": result}


@app.delete('/{projectId}/assist/records/{recordId}', tags=["assist"])
def delete_record(projectId: int, recordId: int, _=Body(None),
                  context: schemas_ee.CurrentContext = Depends(OR_context)):
    result = assist_records.delete_record(project_id=projectId, record_id=recordId, context=context)
    if "errors" in result:
        return result
    return {"data": result}


@app.post('/{projectId}/signals', tags=['signals'])
def send_interactions(projectId: int, data: schemas_ee.SignalsSchema = Body(...),
                      context: schemas_ee.CurrentContext = Depends(OR_context)):
    data = signals.handle_frontend_signals_queued(project_id=projectId, user_id=context.user_id, data=data)

    if "errors" in data:
        return data
    return {'data': data}


@app.post('/{projectId}/dashboard/insights', tags=["insights"])
@app.post('/{projectId}/dashboard/insights', tags=["insights"])
def sessions_search(projectId: int, data: schemas_ee.GetInsightsSchema = Body(...),
                    context: schemas_ee.CurrentContext = Depends(OR_context)):
    return {'data': sessions_insights.fetch_selected(data=data, project_id=projectId)}
