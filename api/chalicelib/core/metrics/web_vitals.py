import logging
import math
import schemas
from chalicelib.core.metrics.modules import sessions
from chalicelib.utils import helper, ch_client

logger = logging.getLogger(__name__)

STATUS = {
    # DOM Building Time
    "dom_building_time": {
        "good": [0, 300],  # ms
        "medium": [301, 600],
        "bad": [601]
    },
    # Largest Contentful Paint
    "Largest Contentful Paint": {
        "good": [0, 2500],  # ms
        "medium": [2501, 4000],
        "bad": [4001]
    },
    # Time To First Byte
    "ttfb": {
        "good": [0, 200],  # ms
        "medium": [201, 600],
        "bad": [601]
    },
    # Speed Index
    "speed_index": {
        "good": [0, 3400],  # s
        "medium": [3401, 5800],
        "bad": [5801]
    },
    # First Contentful Paint
    "first_contentful_paint_time": {
        "good": [0, 1800],  # s
        "medium": [1801, 3000],
        "bad": [3001]
    },
    "Cumulative Layout Shift": {
        "good": [0, 100],  # ms
        "medium": [101, 250],
        "bad": [251]
    }
}


def get_web_vitals(data: schemas.HeatMapSessionsSearch, project_id, user_id):
    full_args, query_part = sessions.search_query_parts_ch(data=data, error_status=None, errors_only=False,
                                                           favorite_only=data.bookmarked, issue=None,
                                                           project_id=project_id, user_id=user_id)
    with ch_client.ClickHouseClient() as cur:
        main_query = cur.format(query=f"""\
                SELECT min(events.`$properties`.dom_building_time::Int64) AS dom_building_time_min,
                       avg(events.`$properties`.dom_building_time::Int64) AS dom_building_time_avg,
                       max(events.`$properties`.dom_building_time::Int64) AS dom_building_time_max,
                       median(events.`$properties`.dom_building_time::Int64) AS dom_building_time_p50,
                       quantile(0.75)(events.`$properties`.dom_building_time::Int64) AS dom_building_time_p75,
                       quantile(0.90)(events.`$properties`.dom_building_time::Int64) AS dom_building_time_p90,
                       min(events.`$properties`.ttfb::Int64)              AS ttfb_min,
                       avg(events.`$properties`.ttfb::Int64)              AS ttfb_avg,
                       max(events.`$properties`.ttfb::Int64)              AS ttfb_max,
                       median(events.`$properties`.ttfb::Int64)              AS ttfb_p50,
                       quantile(0.75)(events.`$properties`.ttfb::Int64)              AS ttfb_p75,
                       quantile(0.90)(events.`$properties`.ttfb::Int64)              AS ttfb_p90,
                       min(events.`$properties`.speed_index::Int64)       AS speed_index_min,
                       avg(events.`$properties`.speed_index::Int64)       AS speed_index_avg,
                       max(events.`$properties`.speed_index::Int64)       AS speed_index_max,
                       median(events.`$properties`.speed_index::Int64)       AS speed_index_p50,
                       quantile(0.75)(events.`$properties`.speed_index::Int64)       AS speed_index_p75,
                       quantile(0.90)(events.`$properties`.speed_index::Int64)       AS speed_index_p90,
                       min(events.`$properties`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_min,
                       avg(events.`$properties`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_avg,
                       max(events.`$properties`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_max,
                       median(events.`$properties`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_p50,
                       quantile(0.75)(events.`$properties`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_p75,
                       quantile(0.90)(events.`$properties`.first_contentful_paint_time::Int64) AS first_contentful_paint_time_p90
                FROM (SELECT session_id
                        {query_part}
                      ) AS raw
                       INNER JOIN product_analytics.events USING (session_id)
                WHERE events.project_id = %(projectId)s
                  AND events.created_at >= toDateTime(%(startDate)s / 1000)
                  AND events.created_at <= toDateTime(%(endDate)s / 1000)
                  AND events.`$event_name` = 'LOCATION'
                  AND events.`$auto_captured`
                  AND (
                    isNotNull(events.`$properties`.dom_building_time)
                        OR isNotNull(events.`$properties`.ttfb)
                        OR isNotNull(events.`$properties`.speed_index)
                        OR isNotNull(events.`$properties`.first_contentful_paint_time)
                    );""",
                                parameters=full_args)
        logger.debug("--------------------")
        logger.debug(main_query)
        logger.debug("--------------------")
        try:
            results = cur.execute(query=main_query)
        except Exception as err:
            logger.warning("--------- WEB VITALS QUERY EXCEPTION CH -----------")
            logger.warning(main_query)
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(data.model_dump_json())
            logger.warning("--------------------")
            raise err
    if len(results) == 0:
        return {}

    for k in list(results[0].keys()):
        results[0][k[:-4] + "_key"] = k[:-4]
        if math.isnan(results[0][k]):
            results[0][k] = None
            continue
        if k[:-4] in STATUS and results[0][k] is not None:
            s = STATUS[k[:-4]]
            results[0][k[:-4] + "_good"] = s["good"]
            results[0][k[:-4] + "_medium"] = s["medium"]
            results[0][k[:-4] + "_bad"] = s["bad"]
            if s["good"][0] <= results[0][k] <= s["good"][1]:
                results[0][k + "_status"] = "good"
            elif s["medium"][0] <= results[0][k] <= s["medium"][1]:
                results[0][k + "_status"] = "medium"
            else:
                results[0][k + "_status"] = "bad"
    return helper.dict_to_camel_case(results[0])
