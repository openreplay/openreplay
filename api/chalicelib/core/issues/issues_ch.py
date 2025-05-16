from chalicelib.utils import ch_client, helper
from .issues_pg import get_all_types


def get(project_id, issue_id):
    with ch_client.ClickHouseClient() as cur:
        query = cur.format(query=""" \
                                 SELECT *
                                 FROM product_analytics.events
                                 WHERE project_id = %(project_id)s
                                   AND issue_id = %(issue_id)s;""",
                           parameters={"project_id": project_id, "issue_id": issue_id})
        data = cur.execute(query=query)
        if data is not None and len(data) > 0:
            data = data[0]
            data["title"] = helper.get_issue_title(data["type"])
    return helper.dict_to_camel_case(data)


def get_by_session_id(session_id, project_id, issue_type=None):
    with ch_client.ClickHouseClient as cur:
        query = cur.format(query=f"""\
                            SELECT *
                            FROM product_analytics.events
                            WHERE session_id = %(session_id)s 
                                AND project_id= %(project_id)s
                                {"AND issue_type = %(type)s" if issue_type is not None else ""}
                            ORDER BY created_at;""",
                           parameters={"session_id": session_id, "project_id": project_id, "type": issue_type})
        data = cur.execute(query)
        return helper.list_to_camel_case(data)
