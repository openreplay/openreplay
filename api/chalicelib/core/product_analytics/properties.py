import re
from functools import cache

import schemas
from chalicelib.utils import helper, exp_ch_helper
from chalicelib.utils.ch_client import ClickHouseClient


@cache
def get_predefined_property_types():
    with ClickHouseClient() as ch_client:
        properties_type = ch_client.execute("""\
        SELECT type
        FROM system.columns
        WHERE database = 'product_analytics'
          AND table = 'events'
          AND name = '$properties';""")
    if len(properties_type) == 0:
        return {}
    properties_type = properties_type[0]["type"]

    pattern = r'(\w+)\s+(Enum8\([^\)]+\)|[A-Za-z0-9_]+(?:\([^\)]+\))?)'

    # Find all matches
    matches = re.findall(pattern, properties_type)

    # Create a dictionary of attribute names and types
    attributes = {match[0]: match[1] for match in matches}
    return attributes


def get_all_properties(project_id: int, page: schemas.PaginatedSchema):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT COUNT(1) OVER () AS total, 
                            property_name AS name, display_name,
                            array_agg(DISTINCT event_properties.value_type) AS possible_types
                      FROM product_analytics.all_properties
                        LEFT JOIN product_analytics.event_properties USING (project_id, property_name)
                      WHERE all_properties.project_id=%(project_id)s
                      GROUP BY property_name,display_name
                      ORDER BY display_name
                      LIMIT %(limit)s OFFSET %(offset)s;""",
            parameters={"project_id": project_id,
                        "limit": page.limit,
                        "offset": (page.page - 1) * page.limit})
        properties = ch_client.execute(r)
        if len(properties) == 0:
            return {"total": 0, "list": []}
        total = properties[0]["total"]
        properties = helper.list_to_camel_case(properties)
        predefined_properties = get_predefined_property_types()
        for i, p in enumerate(properties):
            p["id"] = f"prop_{i}"
            p["_foundInPredefinedList"] = False
            if p["name"] in predefined_properties:
                p["dataType"] = exp_ch_helper.simplify_clickhouse_type(predefined_properties[p["name"]])
                p["_foundInPredefinedList"] = True
            p["possibleTypes"] = list(set(exp_ch_helper.simplify_clickhouse_types(p["possibleTypes"])))
            p.pop("total")
        return {"total": total, "list": properties}


def get_event_properties(project_id: int, event_name):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT all_properties.property_name AS name,
                            all_properties.display_name,
                            array_agg(DISTINCT event_properties.value_type) AS possible_types
                      FROM product_analytics.event_properties 
                        INNER JOIN product_analytics.all_properties USING (property_name) 
                      WHERE event_properties.project_id=%(project_id)s
                        AND all_properties.project_id=%(project_id)s
                        AND event_properties.event_name=%(event_name)s
                      GROUP BY ALL
                      ORDER BY 1;""",
            parameters={"project_id": project_id, "event_name": event_name})
        properties = ch_client.execute(r)
        properties = helper.list_to_camel_case(properties)
        predefined_properties = get_predefined_property_types()
        for i, p in enumerate(properties):
            p["id"] = f"prop_{i}"
            p["_foundInPredefinedList"] = False
            if p["name"] in predefined_properties:
                p["dataType"] = exp_ch_helper.simplify_clickhouse_type(predefined_properties[p["name"]])
                p["_foundInPredefinedList"] = True
            p["possibleTypes"] = list(set(exp_ch_helper.simplify_clickhouse_types(p["possibleTypes"])))

        return properties


def get_lexicon(project_id: int, page: schemas.PaginatedSchema):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT COUNT(1) OVER ()       AS total,
                           all_properties.property_name AS name,
                           all_properties.*,
                           possible_types.values  AS possible_types,
                           possible_values.values AS sample_values
                    FROM product_analytics.all_properties
                             LEFT JOIN (SELECT project_id, property_name, array_agg(DISTINCT value_type) AS values
                                        FROM product_analytics.event_properties
                                        WHERE project_id=%(project_id)s
                                        GROUP BY 1, 2) AS possible_types
                                       USING (project_id, property_name)
                             LEFT JOIN (SELECT project_id, property_name, array_agg(DISTINCT value) AS values
                                        FROM product_analytics.property_values_samples
                                        WHERE project_id=%(project_id)s
                                        GROUP BY 1, 2) AS possible_values USING (project_id, property_name)
                    WHERE project_id=%(project_id)s
                    ORDER BY display_name
                    LIMIT %(limit)s OFFSET %(offset)s;""",
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
