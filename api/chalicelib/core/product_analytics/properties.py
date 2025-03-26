from chalicelib.utils import helper
from chalicelib.utils.ch_client import ClickHouseClient
import schemas


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
        for i, p in enumerate(properties):
            p["id"] = f"prop_{i}"
            p["icon"] = None
            p.pop("total")
        return {"total": total, "list": helper.list_to_camel_case(properties)}


def get_event_properties(project_id: int, event_name):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT all_properties.property_name,
                            all_properties.display_name
                      FROM product_analytics.event_properties 
                        INNER JOIN product_analytics.all_properties USING (property_name) 
                      WHERE event_properties.project_id=%(project_id)s
                        AND all_properties.project_id=%(project_id)s
                        AND event_properties.event_name=%(event_name)s
                      ORDER BY created_at;""",
            parameters={"project_id": project_id, "event_name": event_name})
        properties = ch_client.execute(r)

        return helper.list_to_camel_case(properties)
