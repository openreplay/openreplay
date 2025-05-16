from chalicelib.utils import pg_client, helper


def get(project_id, issue_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """\
            SELECT
                *
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


def get_all_types():
    return [
        {
            "type": "js_exception",
            "visible": True,
            "order": 0,
            "name": "Errors"
        },
        {
            "type": "bad_request",
            "visible": True,
            "order": 1,
            "name": "Bad Requests"
        },
        {
            "type": "missing_resource",
            "visible": True,
            "order": 2,
            "name": "Missing Images"
        },
        {
            "type": "click_rage",
            "visible": True,
            "order": 3,
            "name": "Click Rage"
        },
        {
            "type": "dead_click",
            "visible": True,
            "order": 4,
            "name": "Dead Clicks"
        },
        {
            "type": "memory",
            "visible": True,
            "order": 5,
            "name": "High Memory"
        },
        {
            "type": "cpu",
            "visible": True,
            "order": 6,
            "name": "High CPU"
        },
        {
            "type": "crash",
            "visible": True,
            "order": 7,
            "name": "Crashes"
        }
    ]
