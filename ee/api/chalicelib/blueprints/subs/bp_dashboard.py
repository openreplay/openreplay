from chalice import Blueprint
from chalicelib.utils import helper
from chalicelib import _overrides

from chalicelib.core import dashboard

from chalicelib.core import metadata

app = Blueprint(__name__)
_overrides.chalice_app(app)


@app.route('/{projectId}/dashboard/metadata', methods=['GET'])
def get_metadata_map(projectId, context):
    metamap = []
    for m in metadata.get(project_id=projectId):
        metamap.append({"name": m["key"], "key": f"metadata{m['index']}"})
    return {"data": metamap}


@app.route('/{projectId}/dashboard/sessions', methods=['GET', 'POST'])
def get_dashboard_processed_sessions(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_processed_sessions(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/dashboard/errors', methods=['GET', 'POST'])
def get_dashboard_errors(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_errors(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/dashboard/errors_trend', methods=['GET', 'POST'])
def get_dashboard_errors_trend(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_errors_trend(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/dashboard/application_activity', methods=['GET', 'POST'])
def get_dashboard_application_activity(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_application_activity(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/dashboard/page_metrics', methods=['GET', 'POST'])
def get_dashboard_page_metrics(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_page_metrics(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/dashboard/user_activity', methods=['GET', 'POST'])
def get_dashboard_user_activity(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_user_activity(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/dashboard/performance', methods=['GET', 'POST'])
def get_dashboard_performance(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_performance(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/dashboard/slowest_images', methods=['GET', 'POST'])
def get_dashboard_slowest_images(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_slowest_images(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/dashboard/missing_resources', methods=['GET', 'POST'])
def get_performance_sessions(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_missing_resources_trend(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/dashboard/network', methods=['GET', 'POST'])
def get_network_widget(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_network(project_id=projectId, **{**data, **args})}


@app.route('/{projectId}/dashboard/{widget}/search', methods=['GET'])
def get_dashboard_autocomplete(projectId, widget, context):
    params = app.current_request.query_params
    if params is None:
        return {"data": []}

    if widget in ['performance']:
        data = dashboard.search(params.get('q', ''), params.get('type', ''), project_id=projectId,
                                platform=params.get('platform', None), performance=True)
    elif widget in ['pages', 'pages_dom_buildtime', 'top_metrics', 'time_to_render',
                    'impacted_sessions_by_slow_pages', 'pages_response_time']:
        data = dashboard.search(params.get('q', ''), params.get('type', ''), project_id=projectId,
                                platform=params.get('platform', None), pages_only=True)
    elif widget in ['resources_loading_time']:
        data = dashboard.search(params.get('q', ''), params.get('type', ''), project_id=projectId,
                                platform=params.get('platform', None), performance=False)
    elif widget in ['time_between_events', 'events']:
        data = dashboard.search(params.get('q', ''), params.get('type', ''), project_id=projectId,
                                platform=params.get('platform', None), performance=False, events_only=True)
    elif widget in ['metadata']:
        data = dashboard.search(params.get('q', ''), None, project_id=projectId,
                                platform=params.get('platform', None), metadata=True, key=params.get("key"))
    else:
        return {"errors": [f"unsupported widget: {widget}"]}
    return {'data': data}


# 1
@app.route('/{projectId}/dashboard/slowest_resources', methods=['GET', 'POST'])
def get_dashboard_slowest_resources(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_slowest_resources(project_id=projectId, **{**data, **args})}


# 2
@app.route('/{projectId}/dashboard/resources_loading_time', methods=['GET', 'POST'])
def get_dashboard_resources(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_resources_loading_time(project_id=projectId, **{**data, **args})}


# 3
@app.route('/{projectId}/dashboard/pages_dom_buildtime', methods=['GET', 'POST'])
def get_dashboard_pages_dom(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_pages_dom_build_time(project_id=projectId, **{**data, **args})}


# 4
@app.route('/{projectId}/dashboard/busiest_time_of_day', methods=['GET', 'POST'])
def get_dashboard_busiest_time_of_day(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_busiest_time_of_day(project_id=projectId, **{**data, **args})}


# 5
@app.route('/{projectId}/dashboard/sessions_location', methods=['GET', 'POST'])
def get_dashboard_sessions_location(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_sessions_location(project_id=projectId, **{**data, **args})}


# 6
@app.route('/{projectId}/dashboard/speed_location', methods=['GET', 'POST'])
def get_dashboard_speed_location(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_speed_index_location(project_id=projectId, **{**data, **args})}


# 7
@app.route('/{projectId}/dashboard/pages_response_time', methods=['GET', 'POST'])
def get_dashboard_pages_response_time(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_pages_response_time(project_id=projectId, **{**data, **args})}


# 8
@app.route('/{projectId}/dashboard/pages_response_time_distribution', methods=['GET', 'POST'])
def get_dashboard_pages_response_time_distribution(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_pages_response_time_distribution(project_id=projectId, **{**data, **args})}


# 9
@app.route('/{projectId}/dashboard/top_metrics', methods=['GET', 'POST'])
def get_dashboard_top_metrics(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_top_metrics(project_id=projectId, **{**data, **args})}


# 10
@app.route('/{projectId}/dashboard/time_to_render', methods=['GET', 'POST'])
def get_dashboard_time_to_render(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_time_to_render(project_id=projectId, **{**data, **args})}


# 11
@app.route('/{projectId}/dashboard/impacted_sessions_by_slow_pages', methods=['GET', 'POST'])
def get_dashboard_impacted_sessions_by_slow_pages(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_impacted_sessions_by_slow_pages(project_id=projectId, **{**data, **args})}


# 12
@app.route('/{projectId}/dashboard/memory_consumption', methods=['GET', 'POST'])
def get_dashboard_memory_consumption(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_memory_consumption(project_id=projectId, **{**data, **args})}


# 12.1
@app.route('/{projectId}/dashboard/fps', methods=['GET', 'POST'])
def get_dashboard_avg_fps(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_avg_fps(project_id=projectId, **{**data, **args})}


# 12.2
@app.route('/{projectId}/dashboard/cpu', methods=['GET', 'POST'])
def get_dashboard_avg_cpu(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_avg_cpu(project_id=projectId, **{**data, **args})}


# 13
@app.route('/{projectId}/dashboard/crashes', methods=['GET', 'POST'])
def get_dashboard_impacted_sessions_by_slow_pages(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_crashes(project_id=projectId, **{**data, **args})}


# 14
@app.route('/{projectId}/dashboard/domains_errors', methods=['GET', 'POST'])
def get_dashboard_domains_errors(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_domains_errors(project_id=projectId, **{**data, **args})}


# 14.1
@app.route('/{projectId}/dashboard/domains_errors_4xx', methods=['GET', 'POST'])
def get_dashboard_domains_errors_4xx(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_domains_errors_4xx(project_id=projectId, **{**data, **args})}


# 14.2
@app.route('/{projectId}/dashboard/domains_errors_5xx', methods=['GET', 'POST'])
def get_dashboard_domains_errors_5xx(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_domains_errors_5xx(project_id=projectId, **{**data, **args})}


# 15
@app.route('/{projectId}/dashboard/slowest_domains', methods=['GET', 'POST'])
def get_dashboard_slowest_domains(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_slowest_domains(project_id=projectId, **{**data, **args})}


# 16
@app.route('/{projectId}/dashboard/errors_per_domains', methods=['GET', 'POST'])
def get_dashboard_errors_per_domains(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_errors_per_domains(project_id=projectId, **{**data, **args})}


# 17
@app.route('/{projectId}/dashboard/sessions_per_browser', methods=['GET', 'POST'])
def get_dashboard_sessions_per_browser(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_sessions_per_browser(project_id=projectId, **{**data, **args})}


# 18
@app.route('/{projectId}/dashboard/calls_errors', methods=['GET', 'POST'])
def get_dashboard_calls_errors(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_calls_errors(project_id=projectId, **{**data, **args})}


# 18.1
@app.route('/{projectId}/dashboard/calls_errors_4xx', methods=['GET', 'POST'])
def get_dashboard_calls_errors_4xx(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_calls_errors_4xx(project_id=projectId, **{**data, **args})}


# 18.2
@app.route('/{projectId}/dashboard/calls_errors_5xx', methods=['GET', 'POST'])
def get_dashboard_calls_errors_5xx(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_calls_errors_5xx(project_id=projectId, **{**data, **args})}


# 19
@app.route('/{projectId}/dashboard/errors_per_type', methods=['GET', 'POST'])
def get_dashboard_errors_per_type(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_errors_per_type(project_id=projectId, **{**data, **args})}


# 20
@app.route('/{projectId}/dashboard/resources_by_party', methods=['GET', 'POST'])
def get_dashboard_resources_by_party(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_resources_by_party(project_id=projectId, **{**data, **args})}


# 21
@app.route('/{projectId}/dashboard/resource_type_vs_response_end', methods=['GET', 'POST'])
def get_dashboard_errors_per_resource_type(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.resource_type_vs_response_end(project_id=projectId, **{**data, **args})}


# 22
@app.route('/{projectId}/dashboard/resources_vs_visually_complete', methods=['GET', 'POST'])
def get_dashboard_resources_vs_visually_complete(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_resources_vs_visually_complete(project_id=projectId, **{**data, **args})}


# 23
@app.route('/{projectId}/dashboard/impacted_sessions_by_js_errors', methods=['GET', 'POST'])
def get_dashboard_impacted_sessions_by_js_errors(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_impacted_sessions_by_js_errors(project_id=projectId, **{**data, **args})}


# 24
@app.route('/{projectId}/dashboard/resources_count_by_type', methods=['GET', 'POST'])
def get_dashboard_resources_count_by_type(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": dashboard.get_resources_count_by_type(project_id=projectId, **{**data, **args})}


# 25
@app.route('/{projectId}/dashboard/time_between_events', methods=['GET'])
def get_dashboard_resources_count_by_type(projectId, context):
    return {"errors": ["please choose 2 events"]}


@app.route('/{projectId}/dashboard/overview', methods=['GET', 'POST'])
def get_dashboard_group(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": [
        *helper.explode_widget(key="count_sessions",
                               data=dashboard.get_processed_sessions(project_id=projectId, **{**data, **args})),
        *helper.explode_widget(data={**dashboard.get_application_activity(project_id=projectId, **{**data, **args}),
                                     "chart": dashboard.get_performance(project_id=projectId, **{**data, **args})
                               .get("chart", [])}),
        *helper.explode_widget(data=dashboard.get_page_metrics(project_id=projectId, **{**data, **args})),
        *helper.explode_widget(data=dashboard.get_user_activity(project_id=projectId, **{**data, **args})),
        *helper.explode_widget(data=dashboard.get_pages_dom_build_time(project_id=projectId, **{**data, **args}),
                               key="avg_pages_dom_buildtime"),
        *helper.explode_widget(data=dashboard.get_pages_response_time(project_id=projectId, **{**data, **args}),
                               key="avg_pages_response_time"),
        *helper.explode_widget(dashboard.get_top_metrics(project_id=projectId, **{**data, **args})),
        *helper.explode_widget(data=dashboard.get_time_to_render(project_id=projectId, **{**data, **args}),
                               key="avg_time_to_render"),
        *helper.explode_widget(dashboard.get_memory_consumption(project_id=projectId, **{**data, **args})),
        *helper.explode_widget(dashboard.get_avg_cpu(project_id=projectId, **{**data, **args})),
        *helper.explode_widget(dashboard.get_avg_fps(project_id=projectId, **{**data, **args})),
    ]}


@app.route('/{projectId}/dashboard/errors_crashes', methods=['GET', 'POST'])
def get_dashboard_group(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": [
        {"key": "errors",
         "data": dashboard.get_errors(project_id=projectId, **{**data, **args})},
        {"key": "errors_trend",
         "data": dashboard.get_errors_trend(project_id=projectId, **{**data, **args})},
        {"key": "crashes",
         "data": dashboard.get_crashes(project_id=projectId, **{**data, **args})},
        {"key": "domains_errors",
         "data": dashboard.get_domains_errors(project_id=projectId, **{**data, **args})},
        {"key": "errors_per_domains",
         "data": dashboard.get_errors_per_domains(project_id=projectId, **{**data, **args})},
        {"key": "calls_errors",
         "data": dashboard.get_calls_errors(project_id=projectId, **{**data, **args})},
        {"key": "errors_per_type",
         "data": dashboard.get_errors_per_type(project_id=projectId, **{**data, **args})},
        {"key": "impacted_sessions_by_js_errors",
         "data": dashboard.get_impacted_sessions_by_js_errors(project_id=projectId, **{**data, **args})}
    ]}


@app.route('/{projectId}/dashboard/resources', methods=['GET', 'POST'])
def get_dashboard_group(projectId, context):
    data = app.current_request.json_body
    if data is None:
        data = {}
    params = app.current_request.query_params
    args = dashboard.dashboard_args(params)

    return {"data": [
        {"key": "slowest_images",
         "data": dashboard.get_slowest_images(project_id=projectId, **{**data, **args})},
        {"key": "missing_resources",
         "data": dashboard.get_missing_resources_trend(project_id=projectId, **{**data, **args})},
        {"key": "slowest_resources",
         "data": dashboard.get_slowest_resources(project_id=projectId, type='all', **{**data, **args})},
        {"key": "resources_loading_time",
         "data": dashboard.get_resources_loading_time(project_id=projectId, **{**data, **args})},
        {"key": "resources_by_party",
         "data": dashboard.get_resources_by_party(project_id=projectId, **{**data, **args})},
        {"key": "resource_type_vs_response_end",
         "data": dashboard.resource_type_vs_response_end(project_id=projectId, **{**data, **args})},
        {"key": "resources_vs_visually_complete",
         "data": dashboard.get_resources_vs_visually_complete(project_id=projectId, **{**data, **args})},
        {"key": "resources_count_by_type",
         "data": dashboard.get_resources_count_by_type(project_id=projectId, **{**data, **args})}
    ]}
