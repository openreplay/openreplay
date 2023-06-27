from fastapi import Body

import schemas
from chalicelib.core import insights
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app.post('/{projectId}/insights/journey', tags=["insights"])
@app.get('/{projectId}/insights/journey', tags=["insights"])
def get_insights_journey(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.journey(project_id=projectId, **data.dict())}


@app.post('/{projectId}/insights/users_acquisition', tags=["insights"])
@app.get('/{projectId}/insights/users_acquisition', tags=["insights"])
def get_users_acquisition(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.users_acquisition(project_id=projectId, **data.dict())}


@app.post('/{projectId}/insights/users_retention', tags=["insights"])
@app.get('/{projectId}/insights/users_retention', tags=["insights"])
def get_users_retention(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.users_retention(project_id=projectId, **data.dict())}


@app.post('/{projectId}/insights/feature_retention', tags=["insights"])
@app.get('/{projectId}/insights/feature_retention', tags=["insights"])
def get_feature_rentention(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.feature_retention(project_id=projectId, **data.dict())}


@app.post('/{projectId}/insights/feature_acquisition', tags=["insights"])
@app.get('/{projectId}/insights/feature_acquisition', tags=["insights"])
def get_feature_acquisition(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.feature_acquisition(project_id=projectId, **data.dict())}


@app.post('/{projectId}/insights/feature_popularity_frequency', tags=["insights"])
@app.get('/{projectId}/insights/feature_popularity_frequency', tags=["insights"])
def get_feature_popularity_frequency(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.feature_popularity_frequency(project_id=projectId, **data.dict())}


@app.post('/{projectId}/insights/feature_intensity', tags=["insights"])
@app.get('/{projectId}/insights/feature_intensity', tags=["insights"])
def get_feature_intensity(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.feature_intensity(project_id=projectId, **data.dict())}


@app.post('/{projectId}/insights/feature_adoption', tags=["insights"])
@app.get('/{projectId}/insights/feature_adoption', tags=["insights"])
def get_feature_adoption(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.feature_adoption(project_id=projectId, **data.dict())}


@app.post('/{projectId}/insights/feature_adoption_top_users', tags=["insights"])
@app.get('/{projectId}/insights/feature_adoption_top_users', tags=["insights"])
def get_feature_adoption(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.feature_adoption_top_users(project_id=projectId, **data.dict())}


@app.post('/{projectId}/insights/users_active', tags=["insights"])
@app.get('/{projectId}/insights/users_active', tags=["insights"])
def get_users_active(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.users_active(project_id=projectId, **data.dict())}


@app.post('/{projectId}/insights/users_power', tags=["insights"])
@app.get('/{projectId}/insights/users_power', tags=["insights"])
def get_users_power(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.users_power(project_id=projectId, **data.dict())}


@app.post('/{projectId}/insights/users_slipping', tags=["insights"])
@app.get('/{projectId}/insights/users_slipping', tags=["insights"])
def get_users_slipping(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": insights.users_slipping(project_id=projectId, **data.dict())}

#
#
# @app.route('/{projectId}/dashboard/{widget}/search', methods=['GET'])
# def get_dashboard_autocomplete(projectId:int, widget):
#     params = app.current_request.query_params
#     if params is None or params.get('q') is None or len(params.get('q')) == 0:
#         return {"data": []}
#     params['q'] = '^' + params['q']
#
#     if widget in ['performance']:
#         data = dashboard.search(params.get('q', ''), params.get('type', ''), project_id=projectId,
#                                 platform=params.get('platform', None), performance=True)
#     elif widget in ['pages', 'pages_dom_buildtime', 'top_metrics', 'time_to_render',
#                     'impacted_sessions_by_slow_pages', 'pages_response_time']:
#         data = dashboard.search(params.get('q', ''), params.get('type', ''), project_id=projectId,
#                                 platform=params.get('platform', None), pages_only=True)
#     elif widget in ['resources_loading_time']:
#         data = dashboard.search(params.get('q', ''), params.get('type', ''), project_id=projectId,
#                                 platform=params.get('platform', None), performance=False)
#     elif widget in ['time_between_events', 'events']:
#         data = dashboard.search(params.get('q', ''), params.get('type', ''), project_id=projectId,
#                                 platform=params.get('platform', None), performance=False, events_only=True)
#     elif widget in ['metadata']:
#         data = dashboard.search(params.get('q', ''), None, project_id=projectId,
#                                 platform=params.get('platform', None), metadata=True, key=params.get("key"))
#     else:
#         return {"errors": [f"unsupported widget: {widget}"]}
#     return {'data': data}
