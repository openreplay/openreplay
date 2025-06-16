from chalicelib.utils import ch_client, helper
import datetime
from chalicelib.utils.exp_ch_helper import explode_dproperties, add_timestamp
from .issues_pg import get_issues_categories as _get_issues_categories


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
                            SELECT DISTINCT ON (events.created_at, issue_id) events.created_at,
                                                 issue_id,
                                                 issue_type,
                                                 context_string
                            FROM product_analytics.events
                                    INNER JOIN experimental.issues ON (events.issue_id = issues.issue_id)
                            WHERE session_id = %(session_id)s 
                                AND events.project_id= %(project_id)s
                                AND issues.project_id= %(project_id)s
                                AND `$event_name`='ISSUE'
                                {"AND events.issue_type = %(type)s AND issues.type = %(type)s" if issue_type is not None else ""}
                            ORDER BY created_at;""",
                           parameters={"session_id": session_id, "project_id": project_id, "type": issue_type})
        rows = cur.execute(query)
        # rows = explode_dproperties(rows)
        rows = helper.list_to_camel_case(rows)
        rows = add_timestamp(rows)
    return rows


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


def get_issues_categories():
    return _get_issues_categories()
