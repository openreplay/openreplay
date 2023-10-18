import logging
from typing import Union

import logging
from typing import Union

import schemas
from chalicelib.core import metrics

logger = logging.getLogger(__name__)


def get_metric(key: Union[schemas.MetricOfWebVitals, schemas.MetricOfErrors, \
        schemas.MetricOfPerformance, schemas.MetricOfResources], project_id: int, data: dict):
    supported = {schemas.MetricOfWebVitals.count_sessions: metrics.get_processed_sessions,
                 schemas.MetricOfWebVitals.avg_image_load_time: metrics.get_application_activity_avg_image_load_time,
                 schemas.MetricOfWebVitals.avg_page_load_time: metrics.get_application_activity_avg_page_load_time,
                 schemas.MetricOfWebVitals.avg_request_load_time: metrics.get_application_activity_avg_request_load_time,
                 schemas.MetricOfWebVitals.avg_dom_content_load_start: metrics.get_page_metrics_avg_dom_content_load_start,
                 schemas.MetricOfWebVitals.avg_first_contentful_pixel: metrics.get_page_metrics_avg_first_contentful_pixel,
                 schemas.MetricOfWebVitals.avg_visited_pages: metrics.get_user_activity_avg_visited_pages,
                 schemas.MetricOfWebVitals.avg_session_duration: metrics.get_user_activity_avg_session_duration,
                 schemas.MetricOfWebVitals.avg_pages_dom_buildtime: metrics.get_pages_dom_build_time,
                 schemas.MetricOfWebVitals.avg_pages_response_time: metrics.get_pages_response_time,
                 schemas.MetricOfWebVitals.avg_response_time: metrics.get_top_metrics_avg_response_time,
                 schemas.MetricOfWebVitals.avg_first_paint: metrics.get_top_metrics_avg_first_paint,
                 schemas.MetricOfWebVitals.avg_dom_content_loaded: metrics.get_top_metrics_avg_dom_content_loaded,
                 schemas.MetricOfWebVitals.avg_till_first_byte: metrics.get_top_metrics_avg_till_first_bit,
                 schemas.MetricOfWebVitals.avg_time_to_interactive: metrics.get_top_metrics_avg_time_to_interactive,
                 schemas.MetricOfWebVitals.count_requests: metrics.get_top_metrics_count_requests,
                 schemas.MetricOfWebVitals.avg_time_to_render: metrics.get_time_to_render,
                 schemas.MetricOfWebVitals.avg_used_js_heap_size: metrics.get_memory_consumption,
                 schemas.MetricOfWebVitals.avg_cpu: metrics.get_avg_cpu,
                 schemas.MetricOfWebVitals.avg_fps: metrics.get_avg_fps,
                 schemas.MetricOfErrors.impacted_sessions_by_js_errors: metrics.get_impacted_sessions_by_js_errors,
                 schemas.MetricOfErrors.domains_errors_4xx: metrics.get_domains_errors_4xx,
                 schemas.MetricOfErrors.domains_errors_5xx: metrics.get_domains_errors_5xx,
                 schemas.MetricOfErrors.errors_per_domains: metrics.get_errors_per_domains,
                 schemas.MetricOfErrors.calls_errors: metrics.get_calls_errors,
                 schemas.MetricOfErrors.errors_per_type: metrics.get_errors_per_type,
                 schemas.MetricOfErrors.resources_by_party: metrics.get_resources_by_party,
                 schemas.MetricOfPerformance.speed_location: metrics.get_speed_index_location,
                 schemas.MetricOfPerformance.slowest_domains: metrics.get_slowest_domains,
                 schemas.MetricOfPerformance.sessions_per_browser: metrics.get_sessions_per_browser,
                 schemas.MetricOfPerformance.time_to_render: metrics.get_time_to_render,
                 schemas.MetricOfPerformance.impacted_sessions_by_slow_pages: metrics.get_impacted_sessions_by_slow_pages,
                 schemas.MetricOfPerformance.memory_consumption: metrics.get_memory_consumption,
                 schemas.MetricOfPerformance.cpu: metrics.get_avg_cpu,
                 schemas.MetricOfPerformance.fps: metrics.get_avg_fps,
                 schemas.MetricOfPerformance.crashes: metrics.get_crashes,
                 schemas.MetricOfPerformance.resources_vs_visually_complete: metrics.get_resources_vs_visually_complete,
                 schemas.MetricOfPerformance.pages_dom_buildtime: metrics.get_pages_dom_build_time,
                 schemas.MetricOfPerformance.pages_response_time: metrics.get_pages_response_time,
                 schemas.MetricOfPerformance.pages_response_time_distribution: metrics.get_pages_response_time_distribution,
                 schemas.MetricOfResources.missing_resources: metrics.get_missing_resources_trend,
                 schemas.MetricOfResources.slowest_resources: metrics.get_slowest_resources,
                 schemas.MetricOfResources.resources_loading_time: metrics.get_resources_loading_time,
                 schemas.MetricOfResources.resource_type_vs_response_end: metrics.resource_type_vs_response_end,
                 schemas.MetricOfResources.resources_count_by_type: metrics.get_resources_count_by_type, }

    return supported.get(key, lambda *args: None)(project_id=project_id, **data)
