from chalicelib.utils import ch_client, helper
import datetime
from chalicelib.utils.exp_ch_helper import add_timestamp


def get_issue(project_id, issue_id):
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
                                {"AND events.issue_type = %(type)s AND issues.type = %(type)s" if issue_type is not None else "issue_type = 'incident'"}
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


def get_all_types():
    return [
        {
            "type": "js_exception",
            "visible": True,
            "order": 0,
            "name": "Errors",
            "autoCaptured": True
        },
        {
            "type": "bad_request",
            "visible": True,
            "order": 1,
            "name": "Bad Requests",
            "autoCaptured": True
        },
        {
            "type": "missing_resource",
            "visible": True,
            "order": 2,
            "name": "Missing Images",
            "autoCaptured": True
        },
        {
            "type": "click_rage",
            "visible": True,
            "order": 3,
            "name": "Click Rage",
            "autoCaptured": True
        },
        {
            "type": "dead_click",
            "visible": True,
            "order": 4,
            "name": "Dead Clicks",
            "autoCaptured": True
        },
        {
            "type": "memory",
            "visible": True,
            "order": 5,
            "name": "High Memory",
            "autoCaptured": True
        },
        {
            "type": "cpu",
            "visible": True,
            "order": 6,
            "name": "High CPU",
            "autoCaptured": True
        },
        {
            "type": "crash",
            "visible": True,
            "order": 7,
            "name": "Crashes",
            "autoCaptured": True
        },
        {
            "type": "incident",
            "visible": True,
            "order": 8,
            "name": "Incident",
            "autoCaptured": False
        }
    ]
