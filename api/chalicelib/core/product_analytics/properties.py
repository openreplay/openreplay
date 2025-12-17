from cachetools import TTLCache, cached

import schemas
from chalicelib.core import tags
from chalicelib.utils import helper, exp_ch_helper
from chalicelib.utils.ch_client import ClickHouseClient

PREDEFINED_PROPERTIES = {
    "label": {
        "type": "String",
        "displayName": "Label",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": True,
    },
    "hesitation_time": {
        "type": "UInt32",
        "displayName": "Hesitation Time",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "name": {
        "type": "String",
        "displayName": "Name",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": True,
    },
    "payload": {
        "type": "String",
        "displayName": "Payload",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "level": {
        "type": "Enum8",
        "displayName": "Level",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "message": {
        "type": "String",
        "displayName": "Message",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "context": {
        "type": "Enum8",
        "displayName": "Context",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "url_host": {
        "type": "String",
        "displayName": "Hostname",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": True,
    },
    "url_path": {
        "type": "String",
        "displayName": "Path",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": True,
    },
    "first_contentful_paint_time": {
        "type": "UInt16",
        "displayName": "First Contentful-paint Time",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "speed_index": {
        "type": "UInt16",
        "displayName": "Speed Index",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "min_fps": {
        "type": "UInt8",
        "displayName": "Minimum Frame Rate",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "max_fps": {
        "type": "UInt8",
        "displayName": "Maximum Frame Rate",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "min_cpu": {
        "type": "UInt8",
        "displayName": "Minimum CPU",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "max_cpu": {
        "type": "UInt8",
        "displayName": "Maximum CPU",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "min_used_js_heap_size": {
        "type": "UInt64",
        "displayName": "Minimum Used JS Heap Size",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "max_used_js_heap_size": {
        "type": "UInt64",
        "displayName": "Maximum Used JS Heap Size",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "method": {
        "type": "Enum8",
        "displayName": "Method",
        "isPredefined": True,
        "possibleValues": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTION"],
        "isConditional": True,
    },
    "status": {
        "type": "UInt16",
        "displayName": "Status",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": True,
    },
    "success": {
        "type": "UInt8",
        "displayName": "Success",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "request_body": {
        "type": "String",
        "displayName": "Request Body",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "response_body": {
        "type": "String",
        "displayName": "Response Body",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": False,
    },
    "selector": {
        "type": "String",
        "displayName": "CSS Selector",
        "isPredefined": False,
        "possibleValues": [],
        "isConditional": True,
    },
    "duration": {"type": "UInt16", "displayName": "Duration",
                 "isPredefined": False, "possibleValues": [], "isConditional": True},
    "normalized_x": {"type": "UInt16", "displayName": "Normalized X",
                     "isPredefined": False, "possibleValues": [], "isConditional": True},
    "normalized_y": {"type": "UInt16", "displayName": "Normalized Y",
                     "isPredefined": False, "possibleValues": [], "isConditional": True},
}

EXCLUDED_PROPERTIES = ["message_id", "error_id", "tag_id", "web_vitals"]

EVENT_DEFAULT_PROPERTIES = {
    "CLICK": "label",
    "INPUT": "label",
    "LOCATION": "url_path",
    "ERROR": "name",
    "REQUEST": "url_path",
    "TAG_TRIGGER": "tag_id",
    "ISSUE": "issue_type",
    "PERFORMANCE": "max_fps",
}
# properties to add to auto-captured event's properies if they are not available
EVENTS_EXTRA_PROPERTIES = {
    "REQUEST": {
        "duration": {
            "name": "duration",
            "displayName": "Duration",
            "autoCaptured": True,
            "possibleTypes": [
                "int"
            ],
            "id": helper.string_to_id('prop_duration'),
            "category": "events",
            "_foundInPredefinedList": True,
            "isPredefined": False,
            "possibleValues": [],
            "dataType": "int",
            "defaultProperty": False
        },
    }
}

cache = TTLCache(maxsize=1000, ttl=60)


@cached(cache)
def get_all_properties(project_id: int, include_all: bool = False) -> dict:
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            f"""\
            SELECT COUNT(1) OVER () AS total,
                 property_name AS name,
                 display_name,
                 event_properties.auto_captured_property AS auto_captured,
                 possible_types
            FROM product_analytics.all_properties
            LEFT ANY JOIN (
                SELECT property_name,
                       auto_captured_property,
                       array_agg(DISTINCT event_properties.value_type) AS possible_types
                FROM product_analytics.event_properties
                WHERE event_properties.project_id = %(project_id)s
                GROUP BY ALL
            ) AS event_properties USING (property_name)
            WHERE project_id = %(project_id)s
                {"" if include_all else "AND status = 'visible'"}
            GROUP BY ALL
            ORDER BY display_name, property_name;""",
            parameters={"project_id": project_id},
        )
        properties = ch_client.execute(r)
        if len(properties) == 0:
            return {"total": 0, "list": []}
        total = properties[0]["total"]
        properties = helper.list_to_camel_case(
            [p for p in properties if p["name"] not in EXCLUDED_PROPERTIES]
        )
        for p in properties:
            snake_case_name = helper.key_to_snake_case(p["name"])
            if snake_case_name in PREDEFINED_PROPERTIES:
                p["name"] = helper.key_to_camel_case(p["name"])
            p["id"] = helper.string_to_id(f'prop_{p["name"]}')
            p["possibleTypes"] = list(
                set(exp_ch_helper.simplify_clickhouse_types(p["possibleTypes"]))
            )
            if snake_case_name in PREDEFINED_PROPERTIES:
                p["_foundInPredefinedList"] = True
                p["isConditional"] = PREDEFINED_PROPERTIES[snake_case_name][
                    "isConditional"
                ]
                p["dataType"] = exp_ch_helper.simplify_clickhouse_type(
                    PREDEFINED_PROPERTIES[snake_case_name]["type"]
                )
            else:
                p["_foundInPredefinedList"] = False
                p["dataType"] = next(iter(p["possibleTypes"]), "string")

            p.pop("total")
        keys = [helper.key_to_snake_case(p["name"]) for p in properties]
        for p in PREDEFINED_PROPERTIES.keys():
            camel_case_name = helper.key_to_camel_case(p)
            if p not in keys:
                total += 1
                properties.append(
                    {
                        "name": camel_case_name,
                        "displayName": PREDEFINED_PROPERTIES[p]["displayName"],
                        "possibleTypes": [PREDEFINED_PROPERTIES[p]["type"]],
                        "id": helper.string_to_id(f'prop_{camel_case_name}'),
                        "_foundInPredefinedList": False,
                        "dataType": PREDEFINED_PROPERTIES[p]["type"],
                        "autoCaptured": True,
                        "isPredefined": PREDEFINED_PROPERTIES[p]["isPredefined"],
                        "possibleValues": PREDEFINED_PROPERTIES[p]["possibleValues"],
                        "isConditional": PREDEFINED_PROPERTIES[p]["isConditional"],
                    }
                )
        return {
            "total": total,
            "displayName": "Event Properties",
            "scope": ["sessions", "events"],
            "list": properties
        }


@cached(TTLCache(maxsize=1000, ttl=180))
def get_event_properties(project_id: int, event_name: str, auto_captured: bool):
    if auto_captured and event_name == "TAG_TRIGGER":
        return [
            {
                "name": "tagId",
                "displayName": "Name",
                "autoCaptured": True,
                "possibleTypes": ["string"],
                "id": helper.string_to_id(f'prop_tagId'),
                "category": "events",
                "_foundInPredefinedList": False,
                "defaultProperty": True,
                "isPredefined": True,
                "possibleValues": [
                    {"id": t["tagId"], "name": t["name"], "autoCaptured": False}
                    for t in tags.list_tags(project_id=project_id, all_details=False)
                ],
            }
        ]
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT all_properties.property_name                    AS name,
                      all_properties.display_name,
                      event_properties.auto_captured_property         AS auto_captured,
                      array_agg(DISTINCT event_properties.value_type) AS possible_types
               FROM product_analytics.event_properties
                        INNER JOIN product_analytics.all_properties USING (property_name)
               WHERE event_properties.project_id = %(project_id)s
                 AND all_properties.project_id = %(project_id)s
                 AND event_properties.event_name = %(event_name)s
                 AND event_properties.auto_captured_property = %(auto_captured)s
                 AND all_properties.status = 'visible'
               GROUP BY ALL
               ORDER BY 1;""",
            parameters={
                "project_id": project_id,
                "event_name": event_name,
                "auto_captured": auto_captured,
            },
        )
        properties = ch_client.execute(r)
        properties = helper.list_to_camel_case(properties)
        for i, p in enumerate(properties):
            snake_case_name = helper.key_to_snake_case(p["name"])
            if snake_case_name in PREDEFINED_PROPERTIES:
                p["name"] = helper.key_to_camel_case(p["name"])
            p["id"] = helper.string_to_id(f'prop_{p["name"]}')
            p["category"] = "events"
            p["_foundInPredefinedList"] = False
            p["isPredefined"] = False
            p["possibleValues"] = []
            if snake_case_name in PREDEFINED_PROPERTIES:
                p["dataType"] = exp_ch_helper.simplify_clickhouse_type(
                    PREDEFINED_PROPERTIES[snake_case_name]["type"]
                )
                p["_foundInPredefinedList"] = True
                p["isPredefined"] = PREDEFINED_PROPERTIES[snake_case_name][
                    "isPredefined"
                ]
                p["possibleValues"] = PREDEFINED_PROPERTIES[snake_case_name][
                    "possibleValues"
                ]
            p["possibleTypes"] = list(
                set(exp_ch_helper.simplify_clickhouse_types(p["possibleTypes"]))
            )
            p["defaultProperty"] = (
                    auto_captured
                    and event_name in EVENT_DEFAULT_PROPERTIES
                    and snake_case_name == EVENT_DEFAULT_PROPERTIES[event_name]
            )

        if event_name in EVENTS_EXTRA_PROPERTIES:
            for p in EVENTS_EXTRA_PROPERTIES[event_name]:
                for prop in properties:
                    if prop["name"] == p:
                        break
                else:
                    properties.append(EVENTS_EXTRA_PROPERTIES[event_name][p])

        if not auto_captured and properties:
            has_default = any(p.get("defaultProperty") for p in properties)
            if not has_default:
                properties[0]["defaultProperty"] = True

        return properties


def get_lexicon(project_id: int, page: schemas.PaginatedSchema):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT COUNT(1)                  OVER ()       AS total, all_properties.property_name AS name,
                      all_properties.*,
                      possible_types.values  AS possible_types,
                      possible_values.values AS sample_values
               FROM product_analytics.all_properties
                        LEFT JOIN (SELECT project_id, property_name, array_agg(DISTINCT value_type) AS
                                   values
                                   FROM product_analytics.event_properties
                                   WHERE project_id=%(project_id)s
                                   GROUP BY 1, 2) AS possible_types
                                  USING (project_id, property_name)
                        LEFT JOIN (SELECT project_id, property_name, array_agg(DISTINCT value) AS
                                   values
                                   FROM product_analytics.property_values_samples
                                   WHERE project_id=%(project_id)s
                                   GROUP BY 1, 2) AS possible_values USING (project_id, property_name)
               WHERE project_id = %(project_id)s
               ORDER BY display_name
                   LIMIT %(limit)s
               OFFSET %(offset)s;""",
            parameters={
                "project_id": project_id,
                "limit": page.limit,
                "offset": (page.page - 1) * page.limit,
            },
        )
        properties = ch_client.execute(r)
        if len(properties) == 0:
            return {"total": 0, "list": []}
        total = properties[0]["total"]
        properties = helper.list_to_camel_case(properties)
        for i, p in enumerate(properties):
            snake_case_name = helper.key_to_snake_case(p["name"])
            if snake_case_name in PREDEFINED_PROPERTIES:
                p["name"] = helper.key_to_camel_case(p["name"])
            p["id"] = helper.string_to_id(f'prop_{p["name"]}')
            p.pop("total")
        return {"total": total, "list": properties}
