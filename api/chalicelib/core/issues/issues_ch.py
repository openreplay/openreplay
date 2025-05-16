from chalicelib.utils import ch_client, helper
import datetime
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
    with ch_client.ClickHouseClient() as cur:
        query = cur.format(query=f"""\
                            SELECT *
                            FROM product_analytics.events
                            WHERE session_id = %(session_id)s 
                                AND project_id= %(project_id)s
                                AND `$event_name`='ISSUE'
                                {"AND issue_type = %(type)s" if issue_type is not None else ""}
                            ORDER BY created_at;""",
                           parameters={"session_id": session_id, "project_id": project_id, "type": issue_type})
        data = cur.execute(query)
        return helper.list_to_camel_case(data)


# To reduce the number of issues in the replay;
# will be removed once we agree on how to show issues
def reduce_issues(issues_list):
    if issues_list is None:
        return None
    i = 0
    # remove same-type issues if the time between them is <2s
    while i < len(issues_list) - 1:
        for j in range(i + 1, len(issues_list)):
            if issues_list[i]["issueType"] == issues_list[j]["issueType"]:
                break
        else:
            i += 1
            break

        if issues_list[i]["createdAt"] - issues_list[j]["createdAt"] < datetime.timedelta(seconds=2):
            issues_list.pop(j)
        else:
            i += 1

    return issues_list
