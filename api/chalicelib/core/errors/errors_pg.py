import json
from typing import List

import schemas
from chalicelib.core.errors.modules import errors_helper
from chalicelib.core.sessions import sessions_search
from chalicelib.core.sourcemaps import sourcemaps
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.metrics_helper import get_step_size


def get(error_id, family=False) -> dict | List[dict]:
    if family:
        return get_batch([error_id])
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """SELECT * 
               FROM public.errors 
               WHERE error_id = %(error_id)s 
               LIMIT 1;""",
            {"error_id": error_id})
        cur.execute(query=query)
        result = cur.fetchone()
        if result is not None:
            result["stacktrace_parsed_at"] = TimeUTC.datetime_to_timestamp(result["stacktrace_parsed_at"])
        return helper.dict_to_camel_case(result)


def get_batch(error_ids):
    if len(error_ids) == 0:
        return []
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """
            WITH RECURSIVE error_family AS (
                SELECT *
                FROM public.errors
                WHERE error_id IN %(error_ids)s
                UNION
                SELECT child_errors.*
                FROM public.errors AS child_errors
                         INNER JOIN error_family ON error_family.error_id = child_errors.parent_error_id OR error_family.parent_error_id = child_errors.error_id
            )
            SELECT *
            FROM error_family;""",
            {"error_ids": tuple(error_ids)})
        cur.execute(query=query)
        errors = cur.fetchall()
        for e in errors:
            e["stacktrace_parsed_at"] = TimeUTC.datetime_to_timestamp(e["stacktrace_parsed_at"])
        return helper.list_to_camel_case(errors)


def __get_sort_key(key):
    return {
        schemas.ErrorSort.OCCURRENCE: "max_datetime",
        schemas.ErrorSort.USERS_COUNT: "users",
        schemas.ErrorSort.SESSIONS_COUNT: "sessions"
    }.get(key, 'max_datetime')


def search(data: schemas.SearchErrorsSchema, project: schemas.ProjectContext, user_id):
    empty_response = {
        'total': 0,
        'errors': []
    }

    platform = None
    for f in data.filters:
        if f.type == schemas.FilterType.PLATFORM and len(f.value) > 0:
            platform = f.value[0]
    pg_sub_query = errors_helper.__get_basic_constraints(platform, project_key="sessions.project_id")
    pg_sub_query += ["sessions.start_ts>=%(startDate)s", "sessions.start_ts<%(endDate)s", "source ='js_exception'",
                     "pe.project_id=%(project_id)s"]
    # To ignore Script error
    pg_sub_query.append("pe.message!='Script error.'")
    pg_sub_query_chart = errors_helper.__get_basic_constraints(platform, time_constraint=False, chart=True,
                                                               project_key=None)
    if platform:
        pg_sub_query_chart += ["start_ts>=%(startDate)s", "start_ts<%(endDate)s", "project_id=%(project_id)s"]
    pg_sub_query_chart.append("errors.error_id =details.error_id")
    statuses = []
    error_ids = None
    if data.startTimestamp is None:
        data.startTimestamp = TimeUTC.now(-30)
    if data.endTimestamp is None:
        data.endTimestamp = TimeUTC.now(1)
    if len(data.events) > 0 or len(data.filters) > 0:
        print("-- searching for sessions before errors")
        statuses = sessions_search.search_sessions(data=data, project=project, user_id=user_id, errors_only=True,
                                                   error_status=data.status)
        if len(statuses) == 0:
            return empty_response
        error_ids = [e["errorId"] for e in statuses]
    with pg_client.PostgresClient() as cur:
        step_size = get_step_size(data.startTimestamp, data.endTimestamp, data.density, factor=1)
        sort = __get_sort_key('datetime')
        if data.sort is not None:
            sort = __get_sort_key(data.sort)
        order = schemas.SortOrderType.DESC
        if data.order is not None:
            order = data.order
        extra_join = ""

        params = {
            "startDate": data.startTimestamp,
            "endDate": data.endTimestamp,
            "project_id": project.project_id,
            "userId": user_id,
            "step_size": step_size}
        if data.status != schemas.ErrorStatus.ALL:
            pg_sub_query.append("status = %(error_status)s")
            params["error_status"] = data.status
        if data.limit is not None and data.page is not None:
            params["errors_offset"] = (data.page - 1) * data.limit
            params["errors_limit"] = data.limit
        else:
            params["errors_offset"] = 0
            params["errors_limit"] = 200

        if error_ids is not None:
            params["error_ids"] = tuple(error_ids)
            pg_sub_query.append("error_id IN %(error_ids)s")
        # if data.bookmarked:
        #     pg_sub_query.append("ufe.user_id = %(userId)s")
        #     extra_join += " INNER JOIN public.user_favorite_errors AS ufe USING (error_id)"
        if data.query is not None and len(data.query) > 0:
            pg_sub_query.append("(pe.name ILIKE %(error_query)s OR pe.message ILIKE %(error_query)s)")
            params["error_query"] = helper.values_for_operator(value=data.query,
                                                               op=schemas.SearchEventOperator.CONTAINS)

        main_pg_query = f"""SELECT full_count,
                                   error_id,
                                   name,
                                   message,
                                   users,
                                   sessions,
                                   last_occurrence,
                                   first_occurrence,
                                   chart
                            FROM (SELECT COUNT(details) OVER () AS full_count, details.*
                                    FROM (SELECT error_id,
                                             name,
                                             message,
                                             COUNT(DISTINCT COALESCE(user_id,user_uuid::text))  AS users,
                                             COUNT(DISTINCT session_id) AS sessions,
                                             MAX(timestamp)             AS max_datetime,
                                             MIN(timestamp)             AS min_datetime
                                          FROM events.errors
                                                   INNER JOIN public.errors AS pe USING (error_id)
                                                   INNER JOIN public.sessions USING (session_id)
                                                   {extra_join}
                                          WHERE {" AND ".join(pg_sub_query)}
                                          GROUP BY error_id, name, message
                                          ORDER BY {sort} {order}) AS details
                                    LIMIT %(errors_limit)s OFFSET %(errors_offset)s
                                  ) AS details
                                     INNER JOIN LATERAL (SELECT MAX(timestamp) AS last_occurrence,
                                                                MIN(timestamp) AS first_occurrence
                                                         FROM events.errors
                                                         WHERE errors.error_id = details.error_id) AS time_details ON (TRUE)
                                     INNER JOIN LATERAL (SELECT jsonb_agg(chart_details) AS chart
                                                         FROM (SELECT generated_timestamp AS timestamp,
                                                                      COUNT(session_id)   AS count
                                                               FROM generate_series(%(startDate)s, %(endDate)s, %(step_size)s) AS generated_timestamp
                                                                        LEFT JOIN LATERAL (SELECT DISTINCT session_id
                                                                                           FROM events.errors 
                                                                                                {"INNER JOIN public.sessions USING(session_id)" if platform else ""}
                                                                                           WHERE {" AND ".join(pg_sub_query_chart)}
                                                                            ) AS sessions ON (TRUE)
                                                               GROUP BY timestamp
                                                               ORDER BY timestamp) AS chart_details) AS chart_details ON (TRUE);"""

        # print("--------------------")
        # print(cur.mogrify(main_pg_query, params))
        # print("--------------------")

        cur.execute(cur.mogrify(main_pg_query, params))
        rows = cur.fetchall()
        total = 0 if len(rows) == 0 else rows[0]["full_count"]

        if total == 0:
            rows = []
        else:
            if len(statuses) == 0:
                query = cur.mogrify(
                    """SELECT error_id
                        FROM public.errors 
                        WHERE project_id = %(project_id)s AND error_id IN %(error_ids)s;""",
                    {"project_id": project.project_id, "error_ids": tuple([r["error_id"] for r in rows]),
                     "user_id": user_id})
                cur.execute(query=query)
                statuses = helper.list_to_camel_case(cur.fetchall())
    statuses = {
        s["errorId"]: s for s in statuses
    }

    for r in rows:
        r.pop("full_count")

    return {
        'total': total,
        'errors': helper.list_to_camel_case(rows)
    }


def __save_stacktrace(error_id, data):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """UPDATE public.errors 
                SET stacktrace=%(data)s::jsonb, stacktrace_parsed_at=timezone('utc'::text, now())
                WHERE error_id = %(error_id)s;""",
            {"error_id": error_id, "data": json.dumps(data)})
        cur.execute(query=query)


def get_trace(project_id, error_id):
    error = get(error_id=error_id, family=False)
    if error is None:
        return {"errors": ["error not found"]}
    if error.get("source", "") != "js_exception":
        return {"errors": ["this source of errors doesn't have a sourcemap"]}
    if error.get("payload") is None:
        return {"errors": ["null payload"]}
    if error.get("stacktrace") is not None:
        return {"sourcemapUploaded": True,
                "trace": error.get("stacktrace"),
                "preparsed": True}
    trace, all_exists = sourcemaps.get_traces_group(project_id=project_id, payload=error["payload"])
    if all_exists:
        __save_stacktrace(error_id=error_id, data=trace)
    return {"sourcemapUploaded": all_exists,
            "trace": trace,
            "preparsed": False}


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
