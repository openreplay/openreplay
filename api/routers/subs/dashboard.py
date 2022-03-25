from fastapi import Body

import schemas
from chalicelib.core import dashboard
from chalicelib.core import metadata
from chalicelib.utils import helper
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app.get('/{projectId}/dashboard/metadata', tags=["dashboard", "metrics"])
def get_metadata_map(projectId: int):
    metamap = []
    for m in metadata.get(project_id=projectId):
        metamap.append({"name": m["key"], "key": f"metadata{m['index']}"})
    return {"data": metamap}


@app.post('/{projectId}/dashboard/sessions', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/sessions', tags=["dashboard", "metrics"])
def get_dashboard_processed_sessions(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_processed_sessions(project_id=projectId, **data.dict())}


@app.post('/{projectId}/dashboard/errors', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/errors', tags=["dashboard", "metrics"])
def get_dashboard_errors(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_errors(project_id=projectId, **data.dict())}


@app.post('/{projectId}/dashboard/errors_trend', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/errors_trend', tags=["dashboard", "metrics"])
def get_dashboard_errors_trend(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_errors_trend(project_id=projectId, **data.dict())}


@app.post('/{projectId}/dashboard/application_activity', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/application_activity', tags=["dashboard", "metrics"])
def get_dashboard_application_activity(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_application_activity(project_id=projectId, **data.dict())}


@app.post('/{projectId}/dashboard/page_metrics', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/page_metrics', tags=["dashboard", "metrics"])
def get_dashboard_page_metrics(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_page_metrics(project_id=projectId, **data.dict())}


@app.post('/{projectId}/dashboard/user_activity', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/user_activity', tags=["dashboard", "metrics"])
def get_dashboard_user_activity(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_user_activity(project_id=projectId, **data.dict())}


@app.post('/{projectId}/dashboard/performance', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/performance', tags=["dashboard", "metrics"])
def get_dashboard_performance(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_performance(project_id=projectId, **data.dict())}


@app.post('/{projectId}/dashboard/slowest_images', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/slowest_images', tags=["dashboard", "metrics"])
def get_dashboard_slowest_images(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_slowest_images(project_id=projectId, **data.dict())}


@app.post('/{projectId}/dashboard/missing_resources', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/missing_resources', tags=["dashboard", "metrics"])
def get_performance_sessions(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_missing_resources_trend(project_id=projectId, **data.dict())}


@app.post('/{projectId}/dashboard/network', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/network', tags=["dashboard", "metrics"])
def get_network_widget(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_network(project_id=projectId, **data.dict())}


@app.get('/{projectId}/dashboard/{widget}/search', tags=["dashboard", "metrics"])
def get_dashboard_autocomplete(projectId: int, widget: str, q: str, type: str = "", platform: str = None,
                               key: str = ""):
    if q is None or len(q) == 0:
        return {"data": []}
    q = '^' + q

    if widget in ['performance']:
        data = dashboard.search(q, type, project_id=projectId,
                                platform=platform, performance=True)
    elif widget in ['pages', 'pages_dom_buildtime', 'top_metrics', 'time_to_render',
                    'impacted_sessions_by_slow_pages', 'pages_response_time']:
        data = dashboard.search(q, type, project_id=projectId,
                                platform=platform, pages_only=True)
    elif widget in ['resources_loading_time']:
        data = dashboard.search(q, type, project_id=projectId,
                                platform=platform, performance=False)
    elif widget in ['time_between_events', 'events']:
        data = dashboard.search(q, type, project_id=projectId,
                                platform=platform, performance=False, events_only=True)
    elif widget in ['metadata']:
        data = dashboard.search(q, None, project_id=projectId,
                                platform=platform, metadata=True, key=key)
    else:
        return {"errors": [f"unsupported widget: {widget}"]}
    return {'data': data}


# 1
@app.post('/{projectId}/dashboard/slowest_resources', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/slowest_resources', tags=["dashboard", "metrics"])
def get_dashboard_slowest_resources(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_slowest_resources(project_id=projectId, **data.dict())}


# 2
@app.post('/{projectId}/dashboard/resources_loading_time', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/resources_loading_time', tags=["dashboard", "metrics"])
def get_dashboard_resources(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_resources_loading_time(project_id=projectId, **data.dict())}


# 3
@app.post('/{projectId}/dashboard/pages_dom_buildtime', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/pages_dom_buildtime', tags=["dashboard", "metrics"])
def get_dashboard_pages_dom(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_pages_dom_build_time(project_id=projectId, **data.dict())}


# 4
@app.post('/{projectId}/dashboard/busiest_time_of_day', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/busiest_time_of_day', tags=["dashboard", "metrics"])
def get_dashboard_busiest_time_of_day(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_busiest_time_of_day(project_id=projectId, **data.dict())}


# 5
@app.post('/{projectId}/dashboard/sessions_location', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/sessions_location', tags=["dashboard", "metrics"])
def get_dashboard_sessions_location(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_sessions_location(project_id=projectId, **data.dict())}


# 6
@app.post('/{projectId}/dashboard/speed_location', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/speed_location', tags=["dashboard", "metrics"])
def get_dashboard_speed_location(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_speed_index_location(project_id=projectId, **data.dict())}


# 7
@app.post('/{projectId}/dashboard/pages_response_time', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/pages_response_time', tags=["dashboard", "metrics"])
def get_dashboard_pages_response_time(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_pages_response_time(project_id=projectId, **data.dict())}


# 8
@app.post('/{projectId}/dashboard/pages_response_time_distribution', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/pages_response_time_distribution', tags=["dashboard", "metrics"])
def get_dashboard_pages_response_time_distribution(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_pages_response_time_distribution(project_id=projectId, **data.dict())}


# 9
@app.post('/{projectId}/dashboard/top_metrics', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/top_metrics', tags=["dashboard", "metrics"])
def get_dashboard_top_metrics(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_top_metrics(project_id=projectId, **data.dict())}


# 10
@app.post('/{projectId}/dashboard/time_to_render', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/time_to_render', tags=["dashboard", "metrics"])
def get_dashboard_time_to_render(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_time_to_render(project_id=projectId, **data.dict())}


# 11
@app.post('/{projectId}/dashboard/impacted_sessions_by_slow_pages', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/impacted_sessions_by_slow_pages', tags=["dashboard", "metrics"])
def get_dashboard_impacted_sessions_by_slow_pages(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_impacted_sessions_by_slow_pages(project_id=projectId, **data.dict())}


# 12
@app.post('/{projectId}/dashboard/memory_consumption', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/memory_consumption', tags=["dashboard", "metrics"])
def get_dashboard_memory_consumption(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_memory_consumption(project_id=projectId, **data.dict())}


# 12.1
@app.post('/{projectId}/dashboard/fps', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/fps', tags=["dashboard", "metrics"])
def get_dashboard_avg_fps(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_avg_fps(project_id=projectId, **data.dict())}


# 12.2
@app.post('/{projectId}/dashboard/cpu', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/cpu', tags=["dashboard", "metrics"])
def get_dashboard_avg_cpu(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_avg_cpu(project_id=projectId, **data.dict())}


# 13
@app.post('/{projectId}/dashboard/crashes', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/crashes', tags=["dashboard", "metrics"])
def get_dashboard_impacted_sessions_by_slow_pages(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_crashes(project_id=projectId, **data.dict())}


# 14
@app.post('/{projectId}/dashboard/domains_errors', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/domains_errors', tags=["dashboard", "metrics"])
def get_dashboard_domains_errors(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_domains_errors(project_id=projectId, **data.dict())}


# 14.1
@app.post('/{projectId}/dashboard/domains_errors_4xx', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/domains_errors_4xx', tags=["dashboard", "metrics"])
def get_dashboard_domains_errors_4xx(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_domains_errors_4xx(project_id=projectId, **data.dict())}


# 14.2
@app.post('/{projectId}/dashboard/domains_errors_5xx', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/domains_errors_5xx', tags=["dashboard", "metrics"])
def get_dashboard_domains_errors_5xx(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_domains_errors_5xx(project_id=projectId, **data.dict())}


# 15
@app.post('/{projectId}/dashboard/slowest_domains', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/slowest_domains', tags=["dashboard", "metrics"])
def get_dashboard_slowest_domains(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_slowest_domains(project_id=projectId, **data.dict())}


# 16
@app.post('/{projectId}/dashboard/errors_per_domains', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/errors_per_domains', tags=["dashboard", "metrics"])
def get_dashboard_errors_per_domains(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_errors_per_domains(project_id=projectId, **data.dict())}


# 17
@app.post('/{projectId}/dashboard/sessions_per_browser', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/sessions_per_browser', tags=["dashboard", "metrics"])
def get_dashboard_sessions_per_browser(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_sessions_per_browser(project_id=projectId, **data.dict())}


# 18
@app.post('/{projectId}/dashboard/calls_errors', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/calls_errors', tags=["dashboard", "metrics"])
def get_dashboard_calls_errors(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_calls_errors(project_id=projectId, **data.dict())}


# 18.1
@app.post('/{projectId}/dashboard/calls_errors_4xx', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/calls_errors_4xx', tags=["dashboard", "metrics"])
def get_dashboard_calls_errors_4xx(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_calls_errors_4xx(project_id=projectId, **data.dict())}


# 18.2
@app.post('/{projectId}/dashboard/calls_errors_5xx', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/calls_errors_5xx', tags=["dashboard", "metrics"])
def get_dashboard_calls_errors_5xx(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_calls_errors_5xx(project_id=projectId, **data.dict())}


# 19
@app.post('/{projectId}/dashboard/errors_per_type', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/errors_per_type', tags=["dashboard", "metrics"])
def get_dashboard_errors_per_type(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_errors_per_type(project_id=projectId, **data.dict())}


# 20
@app.post('/{projectId}/dashboard/resources_by_party', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/resources_by_party', tags=["dashboard", "metrics"])
def get_dashboard_resources_by_party(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_resources_by_party(project_id=projectId, **data.dict())}


# 21
@app.post('/{projectId}/dashboard/resource_type_vs_response_end', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/resource_type_vs_response_end', tags=["dashboard", "metrics"])
def get_dashboard_errors_per_resource_type(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.resource_type_vs_response_end(project_id=projectId, **data.dict())}


# 22
@app.post('/{projectId}/dashboard/resources_vs_visually_complete', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/resources_vs_visually_complete', tags=["dashboard", "metrics"])
def get_dashboard_resources_vs_visually_complete(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_resources_vs_visually_complete(project_id=projectId, **data.dict())}


# 23
@app.post('/{projectId}/dashboard/impacted_sessions_by_js_errors', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/impacted_sessions_by_js_errors', tags=["dashboard", "metrics"])
def get_dashboard_impacted_sessions_by_js_errors(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_impacted_sessions_by_js_errors(project_id=projectId, **data.dict())}


# 24
@app.post('/{projectId}/dashboard/resources_count_by_type', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/resources_count_by_type', tags=["dashboard", "metrics"])
def get_dashboard_resources_count_by_type(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": dashboard.get_resources_count_by_type(project_id=projectId, **data.dict())}


# # 25
# @app.post('/{projectId}/dashboard/time_between_events', tags=["dashboard", "metrics"])
# @app.get('/{projectId}/dashboard/time_between_events', tags=["dashboard", "metrics"])
# def get_dashboard_resources_count_by_type(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
#     return {"errors": ["please choose 2 events"]}


@app.post('/{projectId}/dashboard/overview', tags=["dashboard", "metrics"])
@app.get('/{projectId}/dashboard/overview', tags=["dashboard", "metrics"])
def get_dashboard_group(projectId: int, data: schemas.MetricPayloadSchema = Body(...)):
    return {"data": [
        *helper.explode_widget(key="count_sessions",
                               data=dashboard.get_processed_sessions(project_id=projectId, **data.dict())),
        *helper.explode_widget(data={**dashboard.get_application_activity(project_id=projectId, **data.dict()),
                                     "chart": dashboard.get_performance(project_id=projectId, **data.dict())
                               .get("chart", [])}),
        *helper.explode_widget(data=dashboard.get_page_metrics(project_id=projectId, **data.dict())),
        *helper.explode_widget(data=dashboard.get_user_activity(project_id=projectId, **data.dict())),
        *helper.explode_widget(data=dashboard.get_pages_dom_build_time(project_id=projectId, **data.dict()),
                               key="avg_pages_dom_buildtime"),
        *helper.explode_widget(data=dashboard.get_pages_response_time(project_id=projectId, **data.dict()),
                               key="avg_pages_response_time"),
        *helper.explode_widget(dashboard.get_top_metrics(project_id=projectId, **data.dict())),
        *helper.explode_widget(data=dashboard.get_time_to_render(project_id=projectId, **data.dict()),
                               key="avg_time_to_render"),
        *helper.explode_widget(dashboard.get_memory_consumption(project_id=projectId, **data.dict())),
        *helper.explode_widget(dashboard.get_avg_cpu(project_id=projectId, **data.dict())),
        *helper.explode_widget(dashboard.get_avg_fps(project_id=projectId, **data.dict())),
    ]}
