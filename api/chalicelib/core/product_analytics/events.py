from chalicelib.utils import helper
from chalicelib.utils.ch_client import ClickHouseClient


def get_events(project_id: int):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT event_name, display_name
                      FROM product_analytics.all_events 
                      WHERE project_id=%(project_id)s
                      ORDER BY display_name;""",
            parameters={"project_id": project_id})
        x = ch_client.execute(r)

        return helper.list_to_camel_case(x)


def search_events(project_id: int, data: dict):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT * 
                      FROM product_analytics.events 
                      WHERE project_id=%(project_id)s
                      ORDER BY created_at;""",
            parameters={"project_id": project_id})
        x = ch_client.execute(r)

        return helper.list_to_camel_case(x)
