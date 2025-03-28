import logging
import re
from typing import Union

import schemas

logger = logging.getLogger(__name__)


def get_main_events_table(timestamp=0, platform="web"):
    if platform == "web":
        return "product_analytics.events"
    else:
        return "experimental.ios_events"


def get_main_sessions_table(timestamp=0):
    return "experimental.sessions"


def get_user_favorite_sessions_table(timestamp=0):
    return "experimental.user_favorite_sessions"


def get_user_viewed_sessions_table(timestamp=0):
    return "experimental.user_viewed_sessions"


def get_user_viewed_errors_table(timestamp=0):
    return "experimental.user_viewed_errors"


def get_main_js_errors_sessions_table(timestamp=0):
    return get_main_events_table(timestamp=timestamp)


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


# AI generated
def simplify_clickhouse_type(ch_type: str) -> str:
    """
    Simplify a ClickHouse data type name to a broader category like:
    int, float, decimal, datetime, string, uuid, enum, array, tuple, map, nested, etc.
    """

    # 1) Strip out common wrappers like Nullable(...) or LowCardinality(...)
    #    Possibly multiple wrappers: e.g. "LowCardinality(Nullable(Int32))"
    pattern_wrappers = re.compile(r'(Nullable|LowCardinality)\((.*)\)')
    while True:
        match = pattern_wrappers.match(ch_type)
        if match:
            ch_type = match.group(2)
        else:
            break

    # 2) Normalize (lowercase) for easier checks
    normalized_type = ch_type.lower()

    # 3) Use pattern matching or direct checks for known categories
    #    (You can adapt this as you see fit for your environment.)

    # Integers: Int8, Int16, Int32, Int64, Int128, Int256, UInt8, UInt16, ...
    if re.match(r'^(u?int)(8|16|32|64|128|256)$', normalized_type):
        return "int"

    # Floats: Float32, Float64
    if re.match(r'^float(32|64)$', normalized_type):
        return "float"

    # Decimal: Decimal(P, S)
    if normalized_type.startswith("decimal"):
        return "decimal"

    # Date/DateTime
    if normalized_type.startswith("date"):
        return "datetime"
    if normalized_type.startswith("datetime"):
        return "datetime"

    # Strings: String, FixedString(N)
    if normalized_type.startswith("string"):
        return "string"
    if normalized_type.startswith("fixedstring"):
        return "string"

    # UUID
    if normalized_type.startswith("uuid"):
        return "uuid"

    # Enums: Enum8(...) or Enum16(...)
    if normalized_type.startswith("enum8") or normalized_type.startswith("enum16"):
        return "enum"

    # Arrays: Array(T)
    if normalized_type.startswith("array"):
        return "array"

    # Tuples: Tuple(T1, T2, ...)
    if normalized_type.startswith("tuple"):
        return "tuple"

    # Map(K, V)
    if normalized_type.startswith("map"):
        return "map"

    # Nested(...)
    if normalized_type.startswith("nested"):
        return "nested"

    # If we didn't match above, just return the original type in lowercase
    return normalized_type


def simplify_clickhouse_types(ch_types: list[str]) -> list[str]:
    """
    Takes a list of ClickHouse types and returns a list of simplified types
    by calling `simplify_clickhouse_type` on each.
    """
    return list(set([simplify_clickhouse_type(t) for t in ch_types]))
