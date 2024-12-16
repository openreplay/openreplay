from chalicelib.utils.ch_client import ClickHouseClient


def search_events(project_id: int, data: dict):
    with ClickHouseClient() as ch_client:
        r = ch_client.format(
            """SELECT * 
                      FROM taha.events 
                      WHERE project_id=%(project_id)s
                      ORDER BY created_at;""",
            params={"project_id": project_id})
        x = ch_client.execute(r)

        return x
