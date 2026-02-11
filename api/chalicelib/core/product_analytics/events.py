import logging

from cachetools import TTLCache, cached

import schemas
from chalicelib.utils import helper
from chalicelib.utils import sql_helper as sh
from chalicelib.utils.ch_client import ClickHouseClient
from chalicelib.utils.exp_ch_helper import get_col_cast, get_sub_condition

logger = logging.getLogger(__name__)
PREDEFINED_EVENTS = {
    "CLICK": {
        "displayName": "Click",
        "description": 'Represents a user click on a webpage element. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "CLICK".\n\nContains element selector, text content, …, timestamp.',
    },
    "INPUT": {
        "displayName": "Text Input",
        "description": 'Represents text input by a user in form fields or editable elements. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "INPUT".\n\nContains the element selector, ….. and timestamp (actual text content may be masked for privacy).',
    },
    "LOCATION": {
        "displayName": "Page View",
        "description": 'Represents a page navigation or URL change within your application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "LOCATION".\n\nContains the full URL, …. referrer information, UTM parameters and timestamp.',
    },
    "ERROR": {
        "displayName": "Error",
        "description": 'Represents JavaScript errors and console error messages captured from the application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "error".\n\nContains error message,…., and timestamp.',
    },
    "REQUEST": {
        "displayName": "Network Request",
        "description": 'Represents HTTP/HTTPS network activity from the application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "fetch".\n\nContains URL, method, status code, duration, and timestamp',
    },
    "ISSUE": {
        "displayName": "Issue",
        "description": 'Represents issues and errors captured from the application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "ISSUE".\n\nContains issue message,…., and timestamp.',
    },
    "PERFORMANCE": {
        "displayName": "Performance",
        "description": '',
    },
}

PREDEFINED_EVENTS_MOBILE = {
    "TAP": {
        "displayName": "Tap",
        "description": 'Represents a user tap on a mobile element. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "TAP".\n\nContains element label, …, timestamp.',
    },
    "INPUT": {
        "displayName": "Text Input",
        "description": 'Represents text input by a user in mobile form fields or editable elements. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "INPUT".\n\nContains the element label, ….. and timestamp (actual text content may be masked for privacy).',
    },
    "SWIPE": {
        "displayName": "Swipe",
        "description": 'Represents a swipe gesture on a mobile element. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "SWIPE".\n\nContains element label, direction, …, timestamp.',
    },
    "REQUEST": {
        "displayName": "Network Request",
        "description": 'Represents HTTP/HTTPS network activity from the mobile application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "REQUEST".\n\nContains URL, method, status code, duration, and timestamp',
    },
    "CRASH": {
        "displayName": "Crash",
        "description": 'Represents application crashes captured from the mobile application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "CRASH".\n\nContains crash message,…., and timestamp.',
    },
    "ISSUE": {
        "displayName": "Issue",
        "description": 'Represents issues and errors captured from the mobile application. Tracked automatically with property $auto_captured set to TRUE and $event_name set to "ISSUE".\n\nContains issue message,…., and timestamp.',
    },
}

EXCLUDED_EVENTS = ["CUSTOM"]

cache = TTLCache(maxsize=1000, ttl=60)


def __is_mobile_platform(platform):
    return platform in ("ios", "android")


@cached(cache)
def get_events(project_id: int, include_all: bool = False, platform: str = "web"):
    predefined_events = (
        PREDEFINED_EVENTS_MOBILE
        if __is_mobile_platform(platform)
        else PREDEFINED_EVENTS
    )

    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            f"""\
            SELECT DISTINCT
            ON(event_name,auto_captured)
                COUNT (1) OVER () AS total,
                event_name AS name, aec.display_name, 
                --aec.description,
                auto_captured
            FROM product_analytics.all_events 
                LEFT JOIN product_analytics.all_events_customized AS aec USING (project_id, auto_captured, event_name) 
            WHERE project_id=%(project_id)s
                {"" if include_all else "AND (aec.status = 'visible' OR aec.status='')"}
            ORDER BY auto_captured, aec.display_name, all_events.event_name;""",
            parameters={"project_id": project_id},
        )
        rows = ch_client.execute(r)
    if len(rows) == 0:
        return {
            "total": len(predefined_events),
            "displayName": "Events",
            "scope": ["sessions", "events", "users"],
            "list": [
                {
                    "name": e,
                    "displayName": predefined_events[e]["displayName"],
                    # "description": predefined_events[e]["description"],
                    "autoCaptured": True,
                    "id": helper.string_to_id(f"event_{e}"),
                    "dataType": "string",
                    "possibleTypes": ["string"],
                    "_foundInPredefinedList": False,
                }
                for i, e in enumerate(predefined_events)
            ],
        }
    total = rows[0]["total"]
    rows = helper.list_to_camel_case(rows)
    rows = [r for r in rows if not (r["autoCaptured"] and r["eventName"] in EXCLUDED_EVENTS)]

    is_mobile = __is_mobile_platform(platform)
    mobile_only_events = {"TAP", "SWIPE", "CRASH"}
    web_only_events = {"CLICK", "LOCATION", "ERROR"}

    filtered_rows = []
    keys = []
    for row in rows:
        event_name = row["name"]
        keys.append(event_name)
        if event_name in predefined_events and row["displayName"] is None:
            row["displayName"] = predefined_events[event_name]["displayName"]
        if is_mobile:
            if event_name not in web_only_events:
                row["id"] = helper.string_to_id(f"event_{row['name']}")
                row["dataType"] = "string"
                row["possibleTypes"] = ["string"]
                row["isConditional"] = True
                row["_foundInPredefinedList"] = True
                row.pop("total")
                filtered_rows.append(row)
        elif event_name not in mobile_only_events:
            row["id"] = helper.string_to_id(f"event_{row['name']}")
            row["dataType"] = "string"
            row["possibleTypes"] = ["string"]
            row["isConditional"] = True
            row["_foundInPredefinedList"] = True
            row.pop("total")
            filtered_rows.append(row)

    rows = filtered_rows
    for e in predefined_events:
        if e not in keys:
            total += 1
            rows.append(
                {
                    "name": e,
                    "displayName": predefined_events[e]["displayName"],
                    # "description": predefined_events[e]["description"],
                    "autoCaptured": True,
                    "id": helper.string_to_id(f"event_{e}"),
                    "dataType": "string",
                    "possibleTypes": ["string"],
                    "isConditional": True,
                    "_foundInPredefinedList": False,
                }
            )
    return {
        "total": total,
        "displayName": "Events",
        "scope": ["sessions", "events", "users"],
        "list": rows,
    }


def search_events(project_id: int, data: schemas.EventsSearchPayloadSchema):
    with ClickHouseClient() as ch_client:
        full_args = {
            "project_id": project_id,
            "startDate": data.startTimestamp,
            "endDate": data.endTimestamp,
            "projectId": project_id,
            "limit": data.limit,
            "offset": (data.page - 1) * data.limit,
        }

        constraints = [
            "project_id = %(projectId)s",
            "created_at >= toDateTime(%(startDate)s/1000)",
            "created_at <= toDateTime(%(endDate)s/1000)",
        ]
        ev_constraints = []
        for i, f in enumerate(data.filters):
            if not f.is_event:
                f.value = helper.values_for_operator(value=f.value, op=f.operator)
                f_k = f"f_value{i}"
                full_args = {
                    **full_args,
                    f_k: sh.single_value(f.value),
                    **sh.multi_values(f.value, value_key=f_k),
                }
                is_any = sh.isAny_opreator(f.operator)
                is_undefined = sh.isUndefined_operator(f.operator)
                full_args = {
                    **full_args,
                    f_k: sh.single_value(f.value),
                    **sh.multi_values(f.value, value_key=f_k),
                }
                if f.auto_captured and f.is_predefined:
                    column = f.name
                elif f.auto_captured:
                    column = f"`$properties`.`{f.name}`"
                else:
                    column = f"properties.`{f.name}`"

                if is_any:
                    condition = f"notEmpty{column})"
                elif is_undefined:
                    condition = f"empty({column})"
                else:
                    condition = sh.multi_conditions(
                        get_sub_condition(
                            col_name=column, val_name=f_k, operator=f.operator
                        ),
                        values=f.value,
                        value_key=f_k,
                    )
                constraints.append(condition)

            else:
                e_k = f"e_value{i}"
                full_args = {**full_args, e_k: f.name}
                condition = f"`$event_name` = %({e_k})s"
                sub_conditions = []
                for j, ef in enumerate(f.properties.filters):
                    p_k = f"e_{i}_p_{j}"
                    full_args = {
                        **full_args,
                        **sh.multi_values(
                            ef.value, value_key=p_k, data_type=ef.data_type
                        ),
                    }
                    cast = get_col_cast(data_type=ef.data_type, value=ef.value)
                    if ef.auto_captured and ef.is_predefined:
                        sub_condition = get_sub_condition(
                            col_name=f"accurateCastOrNull(`{ef.name}`,'{cast}')",
                            val_name=p_k,
                            operator=ef.operator,
                        )
                    elif ef.auto_captured:
                        sub_condition = get_sub_condition(
                            col_name=f"accurateCastOrNull(`$properties`.`{ef.name}`,{cast})",
                            val_name=p_k,
                            operator=ef.operator,
                        )
                    else:
                        sub_condition = get_sub_condition(
                            col_name=f"accurateCastOrNull(properties.`{ef.name}`,{cast})",
                            val_name=p_k,
                            operator=ef.operator,
                        )
                    sub_conditions.append(
                        sh.multi_conditions(sub_condition, ef.value, value_key=p_k)
                    )
                if len(sub_conditions) > 0:
                    condition += (
                            " AND ("
                            + (" " + f.properties.operator + " ").join(sub_conditions)
                            + ")"
                    )

                ev_constraints.append(condition)

        constraints.append("(" + " OR ".join(ev_constraints) + ")")
        query = ch_client.format(
            f"""SELECT COUNT(1) OVER () AS total, 
                            event_id,
                           `$event_name`,
                           created_at,
                           `distinct_id`,
                           `$browser`,
                           `$import`,
                           `$os`,
                           `$country`,
                           `$state`,
                           `$city`,
                           `$screen_height`,
                           `$screen_width`,
                           `$source`,
                           `$user_id`,
                           `$device` 
                      FROM product_analytics.events 
                      WHERE {" AND ".join(constraints)} 
                      ORDER BY created_at
                      LIMIT %(limit)s OFFSET %(offset)s;""",
            parameters=full_args,
        )
        rows = ch_client.execute(query)
        if len(rows) == 0:
            return {"total": 0, "rows": [], "_src": 2}
        total = rows[0]["total"]
        for r in rows:
            r.pop("total")
        return {"total": total, "rows": rows, "_src": 2}


def get_lexicon(project_id: int, page: schemas.PaginatedSchema):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """ \
            SELECT COUNT(1)                OVER () AS total, all_events.event_name AS name,
                   all_events.*,
                   sumMerge(data_count) AS row_count
            FROM product_analytics.all_events
                     LEFT JOIN product_analytics.autocomplete_events_grouped AS aeg
                               ON (all_events.event_name = aeg.value)
            WHERE all_events.project_id = %(project_id)s
              AND (aeg.project_id = 0 OR aeg.project_id = %(project_id)s)
            GROUP BY ALL
            ORDER BY display_name
                LIMIT %(limit)s
            OFFSET %(offset)s;""",
            parameters={
                "project_id": project_id,
                "limit": page.limit,
                "offset": (page.page - 1) * page.limit,
            },
        )
        rows = ch_client.execute(r)
    if len(rows) == 0:
        return {"total": 0, "list": []}
    total = rows[0]["total"]
    rows = helper.list_to_camel_case(rows)
    for row in rows:
        row["id"] = helper.string_to_id(f"event_{row['name']}")
        row["dataType"] = "string"
        row["possibleTypes"] = ["string"]
        row["_foundInPredefinedList"] = True
        row.pop("total")
    return {"total": total, "list": rows}
