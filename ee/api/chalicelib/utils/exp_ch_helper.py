import logging
import math
import re
import struct
from decimal import Decimal
from typing import Any, Union

from decouple import config

import schemas
from chalicelib.utils import sql_helper as sh
from chalicelib.utils.TimeUTC import TimeUTC
from schemas import SearchEventOperator

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
    if re.match(r'^float(32|64)|double$', normalized_type):
        return "float"

    # Decimal: Decimal(P, S)
    if normalized_type.startswith("decimal"):
        # return "decimal"
        return "float"

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
        # return "uuid"
        return "string"

    # Enums: Enum8(...) or Enum16(...)
    if normalized_type.startswith("enum8") or normalized_type.startswith("enum16"):
        # return "enum"
        return "string"

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


def get_sub_condition(col_name: str, val_name: str,
                      operator: Union[schemas.SearchEventOperator, schemas.MathOperator]) -> str:
    if operator == SearchEventOperator.PATTERN:
        return f"match({col_name}, %({val_name})s)"
    op = sh.get_sql_operator(operator)
    return f"{col_name} {op} %({val_name})s"


def get_col_cast(data_type: schemas.PropertyType, value: Any) -> str:
    if value is None or len(value) == 0:
        return ""
    if isinstance(value, list):
        value = value[0]
    if data_type in (schemas.PropertyType.INT, schemas.PropertyType.FLOAT):
        return best_clickhouse_type(value)
    return data_type.capitalize()


# (type_name, minimum, maximum) – ordered by increasing size
_INT_RANGES = [
    ("Int8", -128, 127),
    ("UInt8", 0, 255),
    ("Int16", -32_768, 32_767),
    ("UInt16", 0, 65_535),
    ("Int32", -2_147_483_648, 2_147_483_647),
    ("UInt32", 0, 4_294_967_295),
    ("Int64", -9_223_372_036_854_775_808, 9_223_372_036_854_775_807),
    ("UInt64", 0, 18_446_744_073_709_551_615),
]


def best_clickhouse_type(value):
    """
    Return the most compact ClickHouse numeric type that can store *value* loss-lessly.

    """
    # Treat bool like tiny int
    if isinstance(value, bool):
        value = int(value)

    # --- Integers ---
    if isinstance(value, int):
        for name, lo, hi in _INT_RANGES:
            if lo <= value <= hi:
                return name
        # Beyond UInt64: ClickHouse offers Int128 / Int256 or Decimal
        return "Int128"

    # --- Decimal.Decimal (exact) ---
    if isinstance(value, Decimal):
        # ClickHouse Decimal32/64/128 have 9 / 18 / 38 significant digits.
        digits = len(value.as_tuple().digits)
        if digits <= 9:
            return "Decimal32"
        elif digits <= 18:
            return "Decimal64"
        else:
            return "Decimal128"

    # --- Floats ---
    if isinstance(value, float):
        if not math.isfinite(value):
            return "Float64"  # inf / nan → always Float64

        # Check if a round-trip through 32-bit float preserves the bit pattern
        packed = struct.pack("f", value)
        if struct.unpack("f", packed)[0] == value:
            return "Float32"
        return "Float64"

    raise TypeError(f"Unsupported type: {type(value).__name__}")


def explode_dproperties(rows):
    for i in range(len(rows)):
        rows[i] = {**rows[i], **rows[i]["$properties"]}
        rows[i].pop("$properties")
    return rows


def add_timestamp(rows):
    for row in rows:
        row["timestamp"] = TimeUTC.datetime_to_timestamp(row["createdAt"])
    return rows
