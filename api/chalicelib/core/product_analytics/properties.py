import schemas
from chalicelib.utils import helper, exp_ch_helper
from chalicelib.utils.ch_client import ClickHouseClient

PREDEFINED_PROPERTIES = {
    "label": "String",
    "hesitation_time": "UInt32",
    "name": "String",
    "payload": "String",
    "level": "Enum8",
    "source": "Enum8",
    "message": "String",
    "error_id": "String",
    "duration": "UInt16",
    "context": "Enum8",
    "url_host": "String",
    "url_path": "String",
    "url_hostpath": "String",
    "request_start": "UInt16",
    "response_start": "UInt16",
    "response_end": "UInt16",
    "dom_content_loaded_event_start": "UInt16",
    "dom_content_loaded_event_end": "UInt16",
    "load_event_start": "UInt16",
    "load_event_end": "UInt16",
    "first_paint": "UInt16",
    "first_contentful_paint_time": "UInt16",
    "speed_index": "UInt16",
    "visually_complete": "UInt16",
    "time_to_interactive": "UInt16",
    "ttfb": "UInt16",
    "ttlb": "UInt16",
    "response_time": "UInt16",
    "dom_building_time": "UInt16",
    "dom_content_loaded_event_time": "UInt16",
    "load_event_time": "UInt16",
    "min_fps": "UInt8",
    "avg_fps": "UInt8",
    "max_fps": "UInt8",
    "min_cpu": "UInt8",
    "avg_cpu": "UInt8",
    "max_cpu": "UInt8",
    "min_total_js_heap_size": "UInt64",
    "avg_total_js_heap_size": "UInt64",
    "max_total_js_heap_size": "UInt64",
    "min_used_js_heap_size": "UInt64",
    "avg_used_js_heap_size": "UInt64",
    "max_used_js_heap_size": "UInt64",
    "method": "Enum8",
    "status": "UInt16",
    "success": "UInt8",
    "request_body": "String",
    "response_body": "String",
    "transfer_size": "UInt32",
    "selector": "String",
    "normalized_x": "Float32",
    "normalized_y": "Float32",
    "message_id": "UInt64"
}

EVENT_DEFAULT_PROPERTIES = {
    "CLICK": "label",
    "INPUT": "label",
    "LOCATION": "url_path",
    "ERROR": "name",
    "REQUEST": "url_path"
}


def get_all_properties(project_id: int, page: schemas.PaginatedSchema):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT COUNT(1)                                           OVER () AS total, property_name AS name,
                      display_name,
                      array_agg(DISTINCT event_properties.value_type) AS possible_types
               FROM product_analytics.all_properties
                        LEFT JOIN product_analytics.event_properties USING (project_id, property_name)
               WHERE all_properties.project_id = %(project_id)s
               GROUP BY property_name, display_name
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
        properties = helper.list_to_camel_case(properties)
        for i, p in enumerate(properties):
            p["id"] = f"prop_{i}"
            p["_foundInPredefinedList"] = False
            if p["name"] in PREDEFINED_PROPERTIES:
                p["dataType"] = exp_ch_helper.simplify_clickhouse_type(PREDEFINED_PROPERTIES[p["name"]])
                p["_foundInPredefinedList"] = True
            p["possibleTypes"] = list(set(exp_ch_helper.simplify_clickhouse_types(p["possibleTypes"])))
            p.pop("total")
        keys = [p["name"] for p in properties]
        for p in PREDEFINED_PROPERTIES:
            if p not in keys:
                total += 1
                properties.append({
                    "name": p,
                    "displayName": "",
                    "possibleTypes": [
                    ],
                    "id": f"prop_{len(properties) + 1}",
                    "_foundInPredefinedList": False,
                    "dataType": PREDEFINED_PROPERTIES[p]
                })
        return {"total": total, "list": properties}


def get_event_properties(project_id: int, event_name: str, auto_captured: bool):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT all_properties.property_name                    AS name,
                      all_properties.display_name,
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
            p["_foundInPredefinedList"] = False
            if p["name"] in PREDEFINED_PROPERTIES:
                p["dataType"] = exp_ch_helper.simplify_clickhouse_type(PREDEFINED_PROPERTIES[p["name"]])
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
