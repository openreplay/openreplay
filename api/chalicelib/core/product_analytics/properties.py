import schemas
from chalicelib.utils import helper, exp_ch_helper
from chalicelib.utils.ch_client import ClickHouseClient

PREDEFINED_PROPERTIES = {
    "label": {"type": "String", "displayName": "Label",
              "isPredefined": False, "possibleValues": []},
    "hesitation_time": {"type": "UInt32", "displayName": "Hesitation Time",
                        "isPredefined": False, "possibleValues": []},
    "name": {"type": "String", "displayName": "Name",
             "isPredefined": False, "possibleValues": []},
    "payload": {"type": "String", "displayName": "Payload",
                "isPredefined": False, "possibleValues": []},
    "level": {"type": "Enum8", "displayName": "Level",
              "isPredefined": False, "possibleValues": []},
    "source": {"type": "Enum8", "displayName": "Source",
               "isPredefined": False, "possibleValues": []},
    "message": {"type": "String", "displayName": "Message",
                "isPredefined": False, "possibleValues": []},
    "duration": {"type": "UInt16", "displayName": "Duration",
                 "isPredefined": False, "possibleValues": []},
    "context": {"type": "Enum8", "displayName": "Context",
                "isPredefined": False, "possibleValues": []},
    "url_host": {"type": "String", "displayName": "URL Host",
                 "isPredefined": False, "possibleValues": []},
    "url_path": {"type": "String", "displayName": "URL Path",
                 "isPredefined": False, "possibleValues": []},
    "url_hostpath": {"type": "String", "displayName": "URL Host and Path",
                     "isPredefined": False, "possibleValues": []},
    "request_start": {"type": "UInt16", "displayName": "Request Start",
                      "isPredefined": False, "possibleValues": []},
    "response_start": {"type": "UInt16", "displayName": "Response Start",
                       "isPredefined": False, "possibleValues": []},
    "response_end": {"type": "UInt16", "displayName": "Response End",
                     "isPredefined": False, "possibleValues": []},
    "dom_content_loaded_event_start": {"type": "UInt16", "displayName": "DOM Content Loaded Event Start",
                                       "isPredefined": False, "possibleValues": []},
    "dom_content_loaded_event_end": {"type": "UInt16", "displayName": "DOM Content Loaded Event End",
                                     "isPredefined": False, "possibleValues": []},
    "load_event_start": {"type": "UInt16", "displayName": "Load Event Start",
                         "isPredefined": False, "possibleValues": []},
    "load_event_end": {"type": "UInt16", "displayName": "Load Event End",
                       "isPredefined": False, "possibleValues": []},
    "first_paint": {"type": "UInt16", "displayName": "First Paint",
                    "isPredefined": False, "possibleValues": []},
    "first_contentful_paint_time": {"type": "UInt16", "displayName": "First Contentful-paint Time",
                                    "isPredefined": False, "possibleValues": []},
    "speed_index": {"type": "UInt16", "displayName": "Speed Index",
                    "isPredefined": False, "possibleValues": []},
    "visually_complete": {"type": "UInt16", "displayName": "Visually Complete",
                          "isPredefined": False, "possibleValues": []},
    "time_to_interactive": {"type": "UInt16", "displayName": "Time To Interactive",
                            "isPredefined": False, "possibleValues": []},
    "ttfb": {"type": "UInt16", "displayName": "Time To First Byte",
             "isPredefined": False, "possibleValues": []},
    "ttlb": {"type": "UInt16", "displayName": "Time To Last Byte",
             "isPredefined": False, "possibleValues": []},
    "response_time": {"type": "UInt16", "displayName": "Response Time",
                      "isPredefined": False, "possibleValues": []},
    "dom_building_time": {"type": "UInt16", "displayName": "DOM Building Time",
                          "isPredefined": False, "possibleValues": []},
    "dom_content_loaded_event_time": {"type": "UInt16", "displayName": "DOM Content Loaded Event Time",
                                      "isPredefined": False, "possibleValues": []},
    "load_event_time": {"type": "UInt16", "displayName": "Load Event Time",
                        "isPredefined": False, "possibleValues": []},
    "min_fps": {"type": "UInt8", "displayName": "Minimum Frame Rate",
                "isPredefined": False, "possibleValues": []},
    "avg_fps": {"type": "UInt8", "displayName": "Average Frame Rate",
                "isPredefined": False, "possibleValues": []},
    "max_fps": {"type": "UInt8", "displayName": "Maximum Frame Rate",
                "isPredefined": False, "possibleValues": []},
    "min_cpu": {"type": "UInt8", "displayName": "Minimum CPU",
                "isPredefined": False, "possibleValues": []},
    "avg_cpu": {"type": "UInt8", "displayName": "Average CPU",
                "isPredefined": False, "possibleValues": []},
    "max_cpu": {"type": "UInt8", "displayName": "Maximum CPU",
                "isPredefined": False, "possibleValues": []},
    "min_total_js_heap_size": {"type": "UInt64", "displayName": "Minimum Total JS Heap Size",
                               "isPredefined": False, "possibleValues": []},
    "avg_total_js_heap_size": {"type": "UInt64", "displayName": "Average Total JS Heap Size",
                               "isPredefined": False, "possibleValues": []},
    "max_total_js_heap_size": {"type": "UInt64", "displayName": "Maximum Total JS Heap Size",
                               "isPredefined": False, "possibleValues": []},
    "min_used_js_heap_size": {"type": "UInt64", "displayName": "Minimum Used JS Heap Size",
                              "isPredefined": False, "possibleValues": []},
    "avg_used_js_heap_size": {"type": "UInt64", "displayName": "Average Used JS Heap Size",
                              "isPredefined": False, "possibleValues": []},
    "max_used_js_heap_size": {"type": "UInt64", "displayName": "Maximum Used JS Heap Size",
                              "isPredefined": False, "possibleValues": []},
    "method": {"type": "Enum8", "displayName": "Method",
               "isPredefined": False, "possibleValues": []},
    "status": {"type": "UInt16", "displayName": "Status",
               "isPredefined": False, "possibleValues": []},
    "success": {"type": "UInt8", "displayName": "Success",
                "isPredefined": False, "possibleValues": []},
    "request_body": {"type": "String", "displayName": "Request Body",
                     "isPredefined": False, "possibleValues": []},
    "response_body": {"type": "String", "displayName": "Response Body",
                      "isPredefined": False, "possibleValues": []},
    "transfer_size": {"type": "UInt32", "displayName": "Transfer Size",
                      "isPredefined": False, "possibleValues": []},
    "selector": {"type": "String", "displayName": "Selector",
                 "isPredefined": False, "possibleValues": []},
    "normalized_x": {"type": "Float32", "displayName": "Normalized X",
                     "isPredefined": False, "possibleValues": []},
    "normalized_y": {"type": "Float32", "displayName": "Normalized Y",
                     "isPredefined": False, "possibleValues": []},
}

EXCLUDED_PROPERTIES = ["message_id", "error_id"]

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


def get_all_properties(project_id: int):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT COUNT(1)                                           OVER () AS total, property_name AS name,
                      display_name,
                      event_properties.auto_captured,
                      array_agg(DISTINCT event_properties.value_type) AS possible_types
               FROM product_analytics.all_properties
                        LEFT JOIN product_analytics.event_properties USING (project_id, property_name)
               WHERE all_properties.project_id = %(project_id)s
               GROUP BY ALL
               ORDER BY display_name, property_name;""",
            parameters={"project_id": project_id})
        properties = ch_client.execute(r)
        if len(properties) == 0:
            return {"total": 0, "list": []}
        total = properties[0]["total"]
        properties = helper.list_to_camel_case([p for p in properties if p["name"] not in EXCLUDED_PROPERTIES])
        for i, p in enumerate(properties):
            p["id"] = f"prop_{i}"
            p["possibleTypes"] = list(set(exp_ch_helper.simplify_clickhouse_types(p["possibleTypes"])))
            p["_foundInPredefinedList"] = p["name"] in PREDEFINED_PROPERTIES
            if p["_foundInPredefinedList"]:
                p["dataType"] = exp_ch_helper.simplify_clickhouse_type(PREDEFINED_PROPERTIES[p["name"]]["type"])
            else:
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
                })
        return {
            "total": total,
            "displayName": "Event Properties",
            "list": properties
        }


def get_event_properties(project_id: int, event_name: str, auto_captured: bool):
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
               GROUP BY ALL
               ORDER BY 1;""",
            parameters={"project_id": project_id, "event_name": event_name, "auto_captured": auto_captured})
        properties = ch_client.execute(r)
        properties = helper.list_to_camel_case(properties)
        for i, p in enumerate(properties):
            p["id"] = f"prop_{i}"
            p["category"] = "events"
            p["_foundInPredefinedList"] = False
            if p["name"] in PREDEFINED_PROPERTIES:
                p["dataType"] = exp_ch_helper.simplify_clickhouse_type(PREDEFINED_PROPERTIES[p["name"]]["type"])
                p["_foundInPredefinedList"] = True
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
