import schemas
from chalicelib.utils import helper, exp_ch_helper
from chalicelib.utils.ch_client import ClickHouseClient
from chalicelib.core import tags

PREDEFINED_PROPERTIES = {
    "label": {"type": "String", "displayName": "Button Label",
              "isPredefined": False, "possibleValues": [], "isConditional": True},
    "hesitation_time": {"type": "UInt32", "displayName": "Hesitation Time",
                        "isPredefined": False, "possibleValues": [], "isConditional": False},
    "name": {"type": "String", "displayName": "Name",
             "isPredefined": False, "possibleValues": [], "isConditional": True},
    "payload": {"type": "String", "displayName": "Payload",
                "isPredefined": False, "possibleValues": [], "isConditional": False},
    "level": {"type": "Enum8", "displayName": "Level",
              "isPredefined": False, "possibleValues": [], "isConditional": False},
    "source": {"type": "Enum8", "displayName": "Source",
               "isPredefined": False, "possibleValues": [], "isConditional": False},
    "message": {"type": "String", "displayName": "Message",
                "isPredefined": False, "possibleValues": [], "isConditional": False},
    "duration": {"type": "UInt16", "displayName": "Duration",
                 "isPredefined": False, "possibleValues": [], "isConditional": True},
    "context": {"type": "Enum8", "displayName": "Context",
                "isPredefined": False, "possibleValues": [], "isConditional": False},
    "url_host": {"type": "String", "displayName": "Hostname",
                 "isPredefined": False, "possibleValues": [], "isConditional": True},
    "url_path": {"type": "String", "displayName": "Path",
                 "isPredefined": False, "possibleValues": [], "isConditional": True},
    "url_hostpath": {"type": "String", "displayName": "URL Host and Path",
                     "isPredefined": False, "possibleValues": [], "isConditional": True},
    "request_start": {"type": "UInt16", "displayName": "Request Start",
                      "isPredefined": False, "possibleValues": [], "isConditional": False},
    "response_start": {"type": "UInt16", "displayName": "Response Start",
                       "isPredefined": False, "possibleValues": [], "isConditional": False},
    "response_end": {"type": "UInt16", "displayName": "Response End",
                     "isPredefined": False, "possibleValues": [], "isConditional": False},
    "dom_content_loaded_event_start": {"type": "UInt16", "displayName": "DOM Content Loaded Event Start",
                                       "isPredefined": False, "possibleValues": [], "isConditional": False},
    "dom_content_loaded_event_end": {"type": "UInt16", "displayName": "DOM Content Loaded Event End",
                                     "isPredefined": False, "possibleValues": [], "isConditional": False},
    "load_event_start": {"type": "UInt16", "displayName": "Load Event Start",
                         "isPredefined": False, "possibleValues": [], "isConditional": False},
    "load_event_end": {"type": "UInt16", "displayName": "Load Event End",
                       "isPredefined": False, "possibleValues": [], "isConditional": False},
    "first_paint": {"type": "UInt16", "displayName": "First Paint",
                    "isPredefined": False, "possibleValues": [], "isConditional": False},
    "first_contentful_paint_time": {"type": "UInt16", "displayName": "First Contentful-paint Time",
                                    "isPredefined": False, "possibleValues": [], "isConditional": False},
    "speed_index": {"type": "UInt16", "displayName": "Speed Index",
                    "isPredefined": False, "possibleValues": [], "isConditional": False},
    "visually_complete": {"type": "UInt16", "displayName": "Visually Complete",
                          "isPredefined": False, "possibleValues": [], "isConditional": False},
    "time_to_interactive": {"type": "UInt16", "displayName": "Time To Interactive",
                            "isPredefined": False, "possibleValues": [], "isConditional": False},
    "TTFB": {"type": "UInt16", "displayName": "Time To First Byte",
             "isPredefined": False, "possibleValues": [], "isConditional": False},
    "TTLB": {"type": "UInt16", "displayName": "Time To Last Byte",
             "isPredefined": False, "possibleValues": [], "isConditional": False},
    "response_time": {"type": "UInt16", "displayName": "Response Time",
                      "isPredefined": False, "possibleValues": [], "isConditional": False},
    "dom_building_time": {"type": "UInt16", "displayName": "DOM Building Time",
                          "isPredefined": False, "possibleValues": [], "isConditional": False},
    "dom_content_loaded_event_time": {"type": "UInt16", "displayName": "DOM Content Loaded Event Time",
                                      "isPredefined": False, "possibleValues": [], "isConditional": False},
    "load_event_time": {"type": "UInt16", "displayName": "Load Event Time",
                        "isPredefined": False, "possibleValues": [], "isConditional": False},
    "min_fps": {"type": "UInt8", "displayName": "Minimum Frame Rate",
                "isPredefined": False, "possibleValues": [], "isConditional": False},
    "avg_fps": {"type": "UInt8", "displayName": "Average Frame Rate",
                "isPredefined": False, "possibleValues": [], "isConditional": False},
    "max_fps": {"type": "UInt8", "displayName": "Maximum Frame Rate",
                "isPredefined": False, "possibleValues": [], "isConditional": False},
    "min_cpu": {"type": "UInt8", "displayName": "Minimum CPU",
                "isPredefined": False, "possibleValues": [], "isConditional": False},
    "avg_cpu": {"type": "UInt8", "displayName": "Average CPU",
                "isPredefined": False, "possibleValues": [], "isConditional": False},
    "max_cpu": {"type": "UInt8", "displayName": "Maximum CPU",
                "isPredefined": False, "possibleValues": [], "isConditional": False},
    "min_total_js_heap_size": {"type": "UInt64", "displayName": "Minimum Total JS Heap Size",
                               "isPredefined": False, "possibleValues": [], "isConditional": False},
    "avg_total_js_heap_size": {"type": "UInt64", "displayName": "Average Total JS Heap Size",
                               "isPredefined": False, "possibleValues": [], "isConditional": False},
    "max_total_js_heap_size": {"type": "UInt64", "displayName": "Maximum Total JS Heap Size",
                               "isPredefined": False, "possibleValues": [], "isConditional": False},
    "min_used_js_heap_size": {"type": "UInt64", "displayName": "Minimum Used JS Heap Size",
                              "isPredefined": False, "possibleValues": [], "isConditional": False},
    "avg_used_js_heap_size": {"type": "UInt64", "displayName": "Average Used JS Heap Size",
                              "isPredefined": False, "possibleValues": [], "isConditional": False},
    "max_used_js_heap_size": {"type": "UInt64", "displayName": "Maximum Used JS Heap Size",
                              "isPredefined": False, "possibleValues": [], "isConditional": False},
    "method": {"type": "Enum8", "displayName": "Method",
               "isPredefined": True, "possibleValues": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTION"],
               "isConditional": True},
    "status": {"type": "UInt16", "displayName": "Status",
               "isPredefined": False, "possibleValues": [], "isConditional": True},
    "success": {"type": "UInt8", "displayName": "Success",
                "isPredefined": False, "possibleValues": [], "isConditional": False},
    "request_body": {"type": "String", "displayName": "Request Body",
                     "isPredefined": False, "possibleValues": [], "isConditional": False},
    "response_body": {"type": "String", "displayName": "Response Body",
                      "isPredefined": False, "possibleValues": [], "isConditional": False},
    "transfer_size": {"type": "UInt32", "displayName": "Transfer Size",
                      "isPredefined": False, "possibleValues": [], "isConditional": False},
    "selector": {"type": "String", "displayName": "CSS Selector",
                 "isPredefined": False, "possibleValues": [], "isConditional": True},
    "normalized_x": {"type": "Float32", "displayName": "Normalized X",
                     "isPredefined": False, "possibleValues": [], "isConditional": False},
    "normalized_y": {"type": "Float32", "displayName": "Normalized Y",
                     "isPredefined": False, "possibleValues": [], "isConditional": False},
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
    "PERFORMANCE": "avg_cpu"
}


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
            parameters={"project_id": project_id})
        properties = ch_client.execute(r)
        if len(properties) == 0:
            return {"total": 0, "list": []}
        total = properties[0]["total"]
        properties = helper.list_to_camel_case([p for p in properties if p["name"] in EXCLUDED_PROPERTIES])
        for i, p in enumerate(properties):
            p["id"] = f"prop_{i}"
            p["possibleTypes"] = list(set(exp_ch_helper.simplify_clickhouse_types(p["possibleTypes"])))
            if p["name"] in PREDEFINED_PROPERTIES:
                p["_foundInPredefinedList"] = True
                p["isConditional"] = PREDEFINED_PROPERTIES[p["name"]]["isConditional"]
                p["dataType"] = exp_ch_helper.simplify_clickhouse_type(PREDEFINED_PROPERTIES[p["name"]]["type"])
            else:
                p["_foundInPredefinedList"] = False
                p["dataType"] = p["possibleTypes"][0]

            p.pop("total")
        keys = [p["name"] for p in properties]
        for p in PREDEFINED_PROPERTIES.keys():
            if p not in keys:
                total += 1
                properties.append({
                    "name": p,
                    "displayName": PREDEFINED_PROPERTIES[p]["displayName"],
                    "possibleTypes": [PREDEFINED_PROPERTIES[p]["type"]],
                    "id": f"prop_{total}",
                    "_foundInPredefinedList": False,
                    "dataType": PREDEFINED_PROPERTIES[p]["type"],
                    "autoCaptured": True,
                    "isPredefined": PREDEFINED_PROPERTIES[p]["isPredefined"],
                    "possibleValues": PREDEFINED_PROPERTIES[p]["possibleValues"],
                    "isConditional": PREDEFINED_PROPERTIES[p]["isConditional"],
                })
        return {
            "total": total,
            "displayName": "Event Properties",
            "list": properties
        }


def get_event_properties(project_id: int, event_name: str, auto_captured: bool):
    if auto_captured and event_name == "TAG_TRIGGER":
        return [{
            "name": "tag_id",
            "displayName": "Name",
            "autoCaptured": True,
            "possibleTypes": [
                "string"
            ],
            "id": "prop_0",
            "category": "events",
            "_foundInPredefinedList": False,
            "defaultProperty": True,
            "isPredefined": True,
            "possibleValues": [
                {"id": t["tagId"], "name": t["name"], "autoCaptured": False} \
                for t in tags.list_tags(project_id=project_id, all_details=False)
            ]
        }]
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT all_properties.property_name                    AS name,
                      all_properties.display_name,
                      event_properties.auto_captured,
                      array_agg(DISTINCT event_properties.value_type) AS possible_types
               FROM product_analytics.event_properties
                        INNER JOIN product_analytics.all_properties USING (property_name)
               WHERE event_properties.project_id = %(project_id)s
                 AND all_properties.project_id = %(project_id)s
                 AND event_properties.event_name = %(event_name)s
                 AND event_properties.auto_captured = %(auto_captured)s
                 AND all_properties.status = 'visible'
               GROUP BY ALL
               ORDER BY 1;""",
            parameters={"project_id": project_id, "event_name": event_name, "auto_captured": auto_captured})
        properties = ch_client.execute(r)
        properties = helper.list_to_camel_case(properties)
        for i, p in enumerate(properties):
            p["id"] = f"prop_{i}"
            p["category"] = "events"
            p["_foundInPredefinedList"] = False
            p["isPredefined"] = False
            p["possibleValues"] = []
            if p["name"] in PREDEFINED_PROPERTIES:
                p["dataType"] = exp_ch_helper.simplify_clickhouse_type(PREDEFINED_PROPERTIES[p["name"]]["type"])
                p["_foundInPredefinedList"] = True
                p["isPredefined"] = PREDEFINED_PROPERTIES[p["name"]]["isPredefined"]
                p["possibleValues"] = PREDEFINED_PROPERTIES[p["name"]]["possibleValues"]
            p["possibleTypes"] = list(set(exp_ch_helper.simplify_clickhouse_types(p["possibleTypes"])))
            p["defaultProperty"] = auto_captured and event_name in EVENT_DEFAULT_PROPERTIES \
                                   and p["name"] == EVENT_DEFAULT_PROPERTIES[event_name]

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
            parameters={"project_id": project_id,
                        "limit": page.limit,
                        "offset": (page.page - 1) * page.limit})
        properties = ch_client.execute(r)
        if len(properties) == 0:
            return {"total": 0, "list": []}
        total = properties[0]["total"]
        for i, p in enumerate(properties):
            p["id"] = f"prop_{i}"
            p.pop("total")
        return {"total": total, "list": helper.list_to_camel_case(properties)}
