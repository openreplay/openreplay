from typing import Union

import schemas
from chalicelib.utils.TimeUTC import TimeUTC
from decouple import config
import logging

logger = logging.getLogger(__name__)

if config("EXP_7D_MV", cast=bool, default=True):
    logger.info(">>> Using experimental last 7 days materialized views")


def get_main_events_table(timestamp=0, platform="web"):
    if platform == "web":
        return "product_analytics.events"
        # return "experimental.events_l7d_mv" \
        #     if config("EXP_7D_MV", cast=bool, default=True) \
        #        and timestamp and timestamp >= TimeUTC.now(delta_days=-7) else "experimental.events"
    else:
        return "experimental.ios_events"


def get_main_sessions_table(timestamp=0):
    return "experimental.sessions_l7d_mv" \
        if config("EXP_7D_MV", cast=bool, default=True) \
           and timestamp and timestamp >= TimeUTC.now(delta_days=-7) else "experimental.sessions"


def get_user_favorite_sessions_table(timestamp=0):
    return "experimental.user_favorite_sessions"


def get_user_viewed_sessions_table(timestamp=0):
    return "experimental.user_viewed_sessions"


def get_user_viewed_errors_table(timestamp=0):
    return "experimental.user_viewed_errors"


def get_main_js_errors_sessions_table(timestamp=0):
    return get_main_events_table(timestamp=timestamp)
    # enable this when js_errors_sessions_mv is fixed
    # return "experimental.js_errors_sessions_mv"  # \
    # if config("EXP_7D_MV", cast=bool, default=True) \
    #    and timestamp >= TimeUTC.now(delta_days=-7) else "experimental.events"


def get_event_type(event_type: Union[schemas.EventType, schemas.PerformanceEventType], platform="web"):
    defs = {
        schemas.EventType.CLICK: "CLICK",
        schemas.EventType.INPUT: "INPUT",
        schemas.EventType.LOCATION: "LOCATION",
        schemas.PerformanceEventType.LOCATION_DOM_COMPLETE: "LOCATION",
        schemas.PerformanceEventType.LOCATION_LARGEST_CONTENTFUL_PAINT_TIME: "LOCATION",
        schemas.PerformanceEventType.LOCATION_TTFB: "LOCATION",
        schemas.EventType.CUSTOM: "CUSTOM",
        schemas.EventType.REQUEST: "REQUEST",
        schemas.EventType.REQUEST_DETAILS: "REQUEST",
        schemas.PerformanceEventType.FETCH_FAILED: "REQUEST",
        schemas.GraphqlFilterType.GRAPHQL_NAME: "GRAPHQL",
        schemas.EventType.STATE_ACTION: "STATEACTION",
        schemas.EventType.ERROR: "ERROR",
        schemas.PerformanceEventType.LOCATION_AVG_CPU_LOAD: 'PERFORMANCE',
        schemas.PerformanceEventType.LOCATION_AVG_MEMORY_USAGE: 'PERFORMANCE',
        schemas.FetchFilterType.FETCH_URL: 'REQUEST'
    }
    defs_mobile = {
        schemas.EventType.CLICK_MOBILE: "TAP",
        schemas.EventType.INPUT_MOBILE: "INPUT",
        schemas.EventType.CUSTOM_MOBILE: "CUSTOM",
        schemas.EventType.REQUEST_MOBILE: "REQUEST",
        schemas.EventType.ERROR_MOBILE: "CRASH",
        schemas.EventType.VIEW_MOBILE: "VIEW",
        schemas.EventType.SWIPE_MOBILE: "SWIPE"
    }
    if platform != "web" and event_type in defs_mobile:
        return defs_mobile.get(event_type)
    if event_type not in defs:
        raise Exception(f"unsupported EventType:{event_type}")
    return defs.get(event_type)
