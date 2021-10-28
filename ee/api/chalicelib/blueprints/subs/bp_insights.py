from chalice import Blueprint
from chalicelib.utils import helper
from chalicelib import _overrides

from chalicelib.core import dashboard, insights
from chalicelib.core import metadata

app = Blueprint(__name__)
_overrides.chalice_app(app)


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


@app.route('/{projectId}/insights/feature_adoption', methods=['GET', 'POST'])
def get_feature_adoption(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.feature_adoption(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/insights/feature_adoption_top_users', methods=['GET', 'POST'])
def get_feature_adoption(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.feature_adoption_top_users(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/insights/feature_adoption_daily_usage', methods=['GET', 'POST'])
def get_feature_adoption_daily_usage(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": insights.feature_adoption_daily_usage(project_id=projectId, **{**data, **args})}


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


@app.route('/{projectId}/insights/search', methods=['GET'])
def get_insights_autocomplete(projectId, context):
    params = app.current_request.query_params
    if params is None or params.get('q') is None or len(params.get('q')) == 0:
        return {"data": []}
    # params['q'] = '^' + params['q']

    return {'data': insights.search(params.get('q', ''), project_id=projectId,
                                    platform=params.get('platform', None), feature_type=params.get("key"))}
