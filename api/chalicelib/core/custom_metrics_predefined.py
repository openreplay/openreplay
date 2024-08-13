import logging
from typing import Union

import schemas
from chalicelib.core import metrics

logger = logging.getLogger(__name__)


def get_metric(key: Union[schemas.MetricOfWebVitals, schemas.MetricOfErrors, \
        schemas.MetricOfPerformance, schemas.MetricOfResources], project_id: int, data: dict):
    supported = {schemas.MetricOfWebVitals.COUNT_SESSIONS: metrics.get_processed_sessions,
                 schemas.MetricOfWebVitals.AVG_IMAGE_LOAD_TIME: metrics.get_application_activity_avg_image_load_time,
                 schemas.MetricOfWebVitals.AVG_PAGE_LOAD_TIME: metrics.get_application_activity_avg_page_load_time,
                 schemas.MetricOfWebVitals.AVG_REQUEST_LOAD_TIME: metrics.get_application_activity_avg_request_load_time,
                 schemas.MetricOfWebVitals.AVG_DOM_CONTENT_LOAD_START: metrics.get_page_metrics_avg_dom_content_load_start,
                 schemas.MetricOfWebVitals.AVG_FIRST_CONTENTFUL_PIXEL: metrics.get_page_metrics_avg_first_contentful_pixel,
                 schemas.MetricOfWebVitals.AVG_VISITED_PAGES: metrics.get_user_activity_avg_visited_pages,
                 schemas.MetricOfWebVitals.AVG_SESSION_DURATION: metrics.get_user_activity_avg_session_duration,
                 schemas.MetricOfWebVitals.AVG_PAGES_DOM_BUILDTIME: metrics.get_pages_dom_build_time,
                 schemas.MetricOfWebVitals.AVG_PAGES_RESPONSE_TIME: metrics.get_pages_response_time,
                 schemas.MetricOfWebVitals.AVG_RESPONSE_TIME: metrics.get_top_metrics_avg_response_time,
                 schemas.MetricOfWebVitals.AVG_FIRST_PAINT: metrics.get_top_metrics_avg_first_paint,
                 schemas.MetricOfWebVitals.AVG_DOM_CONTENT_LOADED: metrics.get_top_metrics_avg_dom_content_loaded,
                 schemas.MetricOfWebVitals.AVG_TILL_FIRST_BYTE: metrics.get_top_metrics_avg_till_first_bit,
                 schemas.MetricOfWebVitals.AVG_TIME_TO_INTERACTIVE: metrics.get_top_metrics_avg_time_to_interactive,
                 schemas.MetricOfWebVitals.COUNT_REQUESTS: metrics.get_top_metrics_count_requests,
                 schemas.MetricOfWebVitals.AVG_TIME_TO_RENDER: metrics.get_time_to_render,
                 schemas.MetricOfWebVitals.AVG_USED_JS_HEAP_SIZE: metrics.get_memory_consumption,
                 schemas.MetricOfWebVitals.AVG_CPU: metrics.get_avg_cpu,
                 schemas.MetricOfWebVitals.AVG_FPS: metrics.get_avg_fps,
                 schemas.MetricOfErrors.IMPACTED_SESSIONS_BY_JS_ERRORS: metrics.get_impacted_sessions_by_js_errors,
                 schemas.MetricOfErrors.DOMAINS_ERRORS_4XX: metrics.get_domains_errors_4xx,
                 schemas.MetricOfErrors.DOMAINS_ERRORS_5XX: metrics.get_domains_errors_5xx,
                 schemas.MetricOfErrors.ERRORS_PER_DOMAINS: metrics.get_errors_per_domains,
                 schemas.MetricOfErrors.CALLS_ERRORS: metrics.get_calls_errors,
                 schemas.MetricOfErrors.ERRORS_PER_TYPE: metrics.get_errors_per_type,
                 schemas.MetricOfErrors.RESOURCES_BY_PARTY: metrics.get_resources_by_party,
                 schemas.MetricOfPerformance.SPEED_LOCATION: metrics.get_speed_index_location,
                 schemas.MetricOfPerformance.SLOWEST_DOMAINS: metrics.get_slowest_domains,
                 schemas.MetricOfPerformance.SESSIONS_PER_BROWSER: metrics.get_sessions_per_browser,
                 schemas.MetricOfPerformance.TIME_TO_RENDER: metrics.get_time_to_render,
                 schemas.MetricOfPerformance.IMPACTED_SESSIONS_BY_SLOW_PAGES: metrics.get_impacted_sessions_by_slow_pages,
                 schemas.MetricOfPerformance.MEMORY_CONSUMPTION: metrics.get_memory_consumption,
                 schemas.MetricOfPerformance.CPU: metrics.get_avg_cpu,
                 schemas.MetricOfPerformance.FPS: metrics.get_avg_fps,
                 schemas.MetricOfPerformance.CRASHES: metrics.get_crashes,
                 schemas.MetricOfPerformance.RESOURCES_VS_VISUALLY_COMPLETE: metrics.get_resources_vs_visually_complete,
                 schemas.MetricOfPerformance.PAGES_DOM_BUILDTIME: metrics.get_pages_dom_build_time,
                 schemas.MetricOfPerformance.PAGES_RESPONSE_TIME: metrics.get_pages_response_time,
                 schemas.MetricOfPerformance.PAGES_RESPONSE_TIME_DISTRIBUTION: metrics.get_pages_response_time_distribution,
                 schemas.MetricOfResources.MISSING_RESOURCES: metrics.get_missing_resources_trend,
                 schemas.MetricOfResources.SLOWEST_RESOURCES: metrics.get_slowest_resources,
                 schemas.MetricOfResources.RESOURCES_LOADING_TIME: metrics.get_resources_loading_time,
                 schemas.MetricOfResources.RESOURCE_TYPE_VS_RESPONSE_END: metrics.resource_type_vs_response_end,
                 schemas.MetricOfResources.RESOURCES_COUNT_BY_TYPE: metrics.get_resources_count_by_type,
                 schemas.MetricOfWebVitals.COUNT_USERS: metrics.get_unique_users, }

    return supported.get(key, lambda *args: None)(project_id=project_id, **data)
