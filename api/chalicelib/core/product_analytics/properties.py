from chalicelib.utils import helper
from chalicelib.utils.ch_client import ClickHouseClient


def get_properties(project_id: int, event_name):
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
            parameters={"project_id": project_id,"event_name": event_name})
        properties = ch_client.execute(r)

        return helper.list_to_camel_case(properties)
