import json
import logging
from typing import List

from chalicelib.core.sourcemaps import sourcemaps

from chalicelib.utils import ch_client, pg_client
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC

logger = logging.getLogger(__name__)


def get(error_id) -> dict | List[dict]:
    with ch_client.ClickHouseClient() as cur:
        query = """SELECT error_id,
                          project_id,
                          `$properties`.source  AS source,
                          'ERROR'               AS name,
                          `$properties`.message AS message,
                          `$properties`.payload AS payload,
                          stacktrace,
                          stacktrace_parsed_at
                   FROM product_analytics.events
                            LEFT JOIN experimental.parsed_errors USING (error_id)
                   WHERE "$event_name" = 'ERROR'
                     AND error_id = %(error_id)s LIMIT 1;"""
        rows = cur.execute(query, {"error_id": error_id})
        if len(rows) == 0:
            return None
    return helper.dict_to_camel_case(rows[0])


def __save_stacktrace(project_id, error_id, data):
    with ch_client.ClickHouseClient() as cur:
        query = f"""INSERT INTO experimental.parsed_errors(project_id, error_id, stacktrace) 
                    VALUES (%(project_id)s,%(error_id)s,%(data)s);"""
        params = {"project_id": project_id, "error_id": error_id, "data": json.dumps(data)}
        cur.execute(query=query, parameters=params)


def get_trace(project_id, error_id):
    error = get(error_id=error_id)
    if error is None:
        return {"errors": ["error not found"]}
    if error.get("source", "") != "js_exception":
        return {"errors": ["this source of errors doesn't have a sourcemap"]}
    if error.get("payload") is None or error.get("payload") == "":
        return {"errors": ["null payload"]}
    if error.get("stacktrace") is not None and error.get("stacktrace") != "":
        return {"sourcemapUploaded": True,
                "trace": json.loads(error.get("stacktrace")),
                "preparsed": True}

    payload = json.loads(error["payload"]) if isinstance(error["payload"], str) else error["payload"]
    trace, all_exists = sourcemaps.get_traces_group(project_id=project_id, payload=payload)
    if all_exists:
        __save_stacktrace(project_id=project_id, error_id=error_id, data=trace)
    return {"sourcemapUploaded": all_exists,
            "trace": trace,
            "preparsed": False}


# TODO: Delete this if UI is not calling the corresponding endpoint
def get_sessions(start_date, end_date, project_id, user_id, error_id):
    extra_constraints = ["s.project_id = %(project_id)s",
                         "s.start_ts >= %(startDate)s",
                         "s.start_ts <= %(endDate)s",
                         "e.error_id = %(error_id)s"]
    if start_date is None:
        start_date = TimeUTC.now(-7)
    if end_date is None:
        end_date = TimeUTC.now()

    params = {
        "startDate": start_date,
        "endDate": end_date,
        "project_id": project_id,
        "userId": user_id,
        "error_id": error_id}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            f"""SELECT s.project_id,
                       s.session_id::text AS session_id,
                       s.user_uuid,
                       s.user_id,
                       s.user_agent,
                       s.user_os,
                       s.user_browser,
                       s.user_device,
                       s.user_country,
                       s.start_ts,
                       s.duration,
                       s.events_count,
                       s.pages_count,
                       s.errors_count,
                       s.issue_types,
                        COALESCE((SELECT TRUE
                         FROM public.user_favorite_sessions AS fs
                         WHERE s.session_id = fs.session_id
                           AND fs.user_id = %(userId)s LIMIT 1), FALSE) AS favorite,
                        COALESCE((SELECT TRUE
                         FROM public.user_viewed_sessions AS fs
                         WHERE s.session_id = fs.session_id
                           AND fs.user_id = %(userId)s LIMIT 1), FALSE) AS viewed
                FROM public.sessions AS s INNER JOIN events.errors AS e USING (session_id)
                WHERE {" AND ".join(extra_constraints)}
                ORDER BY s.start_ts DESC;""",
            params)
        cur.execute(query=query)
        sessions_list = []
        total = cur.rowcount
        row = cur.fetchone()
        while row is not None and len(sessions_list) < 100:
            sessions_list.append(row)
            row = cur.fetchone()

    return {
        'total': total,
        'sessions': helper.list_to_camel_case(sessions_list)
    }
