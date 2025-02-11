import logging

import schemas
from chalicelib.core.metrics import metrics

logger = logging.getLogger(__name__)


def get_metric(key: schemas.MetricOfWebVitals, project_id: int, data: dict):
    supported = {
        schemas.MetricOfWebVitals.AVG_VISITED_PAGES: metrics.get_user_activity_avg_visited_pages,
        schemas.MetricOfWebVitals.COUNT_USERS: metrics.get_unique_users
    }

    return supported.get(key, lambda *args: None)(project_id=project_id, **data)
