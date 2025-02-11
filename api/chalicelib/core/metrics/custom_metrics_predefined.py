import logging
from typing import Union

import schemas
from chalicelib.core.metrics import metrics

logger = logging.getLogger(__name__)


def get_metric(key: Union[schemas.MetricOfWebVitals, schemas.MetricOfErrors], project_id: int, data: dict):
    supported = {
        schemas.MetricOfWebVitals.AVG_VISITED_PAGES: metrics.get_user_activity_avg_visited_pages,
        schemas.MetricOfErrors.IMPACTED_SESSIONS_BY_JS_ERRORS: metrics.get_impacted_sessions_by_js_errors,
        schemas.MetricOfErrors.RESOURCES_BY_PARTY: metrics.get_resources_by_party,
        schemas.MetricOfWebVitals.COUNT_USERS: metrics.get_unique_users,
        schemas.MetricOfWebVitals.SPEED_LOCATION: metrics.get_speed_index_location,
    }

    return supported.get(key, lambda *args: None)(project_id=project_id, **data)
