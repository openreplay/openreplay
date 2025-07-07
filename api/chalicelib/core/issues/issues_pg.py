from chalicelib.utils import pg_client, helper


def get(project_id, issue_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """ \
            SELECT *
            FROM public.issues
            WHERE project_id = %(project_id)s
              AND issue_id = %(issue_id)s;""",
            {"project_id": project_id, "issue_id": issue_id}
        )
        cur.execute(query=query)
        data = cur.fetchone()
        if data is not None:
            data["title"] = helper.get_issue_title(data["type"])
    return helper.dict_to_camel_case(data)


def get_by_session_id(session_id, project_id, issue_type=None):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                    SELECT *
                    FROM events_common.issues
                             INNER JOIN public.issues USING (issue_id)
                    WHERE session_id = %(session_id)s 
                        AND project_id= %(project_id)s
                        {"AND type = %(type)s" if issue_type is not None else ""}
                    ORDER BY timestamp;""",
                        {"session_id": session_id, "project_id": project_id, "type": issue_type})
        )
        return helper.list_to_camel_case(cur.fetchall())


# To reduce the number of issues in the replay;
# will be removed once we agree on how to show issues
def reduce_issues(issues_list):
    if issues_list is None:
        return None
    i = 0
    # remove same-type issues if the time between them is <2s
    while i < len(issues_list) - 1:
        for j in range(i + 1, len(issues_list)):
            if issues_list[i]["type"] == issues_list[j]["type"]:
                break
        else:
            i += 1
            break

        if issues_list[i]["timestamp"] - issues_list[j]["timestamp"] < 2000:
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


def get_issues_categories():
    issues = get_all_types()
    response = []
    for i, issue in enumerate(issues):
        response.append({
            "id": f"issue_{i}",
            "name": issue["type"],
            "displayName": issue["name"],
            "possibleTypes": ["string"],
            "dataType": "string",
            "autoCaptured": issue["autoCaptured"]
        })
    return {
        "total": len(response),
        "displayName": "Issues",
        "list": response
    }
