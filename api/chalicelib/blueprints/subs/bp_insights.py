from chalice import Blueprint
from chalicelib.utils import helper
from chalicelib import _overrides

from chalicelib.core import dashboard, insights
from chalicelib.core import metadata

app = Blueprint(__name__)
_overrides.chalice_app(app)


#
# @app.route('/{projectId}/dashboard/metadata', methods=['GET'])
# def get_metadata_map(projectId, context):
#     metamap = []
#     for m in metadata.get(project_id=projectId):
#         metamap.append({"name": m["key"], "key": f"metadata{m['index']}"})
#     return {"data": metamap}
#
#
@app.route('/{projectId}/insights/journey', methods=['GET', 'POST'])
def get_insights_journey(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.journey(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/insights/users_acquisition', methods=['GET', 'POST'])
def get_users_acquisition(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.users_acquisition(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/insights/users_retention', methods=['GET', 'POST'])
def get_users_retention(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.users_retention(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/insights/feature_retention', methods=['GET', 'POST'])
def get_feature_rentention(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.feature_retention(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/insights/feature_acquisition', methods=['GET', 'POST'])
def get_feature_acquisition(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.feature_acquisition(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/insights/feature_popularity_frequency', methods=['GET', 'POST'])
def get_feature_popularity_frequency(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.feature_popularity_frequency(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/insights/feature_intensity', methods=['GET', 'POST'])
def get_feature_intensity(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.feature_intensity(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/insights/users_active', methods=['GET', 'POST'])
def get_users_active(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.users_active(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/insights/users_power', methods=['GET', 'POST'])
def get_users_power(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.users_power(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/insights/users_slipping', methods=['GET', 'POST'])
def get_users_slipping(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.users_slipping(project_id=projectId, **{**data, **args})}

#
#
# @app.route('/{projectId}/dashboard/{widget}/search', methods=['GET'])
# def get_dashboard_autocomplete(projectId, widget, context):
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
