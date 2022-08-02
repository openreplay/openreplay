from typing import List, Union

import schemas
import schemas_ee
from chalicelib.core import events, metadata, events_ios, \
    sessions_mobs, issues, projects, errors, resources, assist, performance_event
from chalicelib.utils import pg_client, helper, metrics_helper, ch_client
from chalicelib.utils.TimeUTC import TimeUTC

SESSION_PROJECTION_COLS = """\
s.project_id,
s.session_id::text AS session_id,
s.user_uuid,
s.user_id,
s.user_os,
s.user_browser,
s.user_device,
s.user_device_type,
s.user_country,
s.start_ts,
s.duration,
s.events_count,
s.pages_count,
s.errors_count,
s.user_anonymous_id,
s.platform,
s.issue_score,
to_jsonb(s.issue_types) AS issue_types,
favorite_sessions.session_id NOTNULL            AS favorite,
COALESCE((SELECT TRUE
 FROM public.user_viewed_sessions AS fs
 WHERE s.session_id = fs.session_id
   AND fs.user_id = %(userId)s LIMIT 1), FALSE) AS viewed 
   """

SESSION_PROJECTION_COLS_CH = """\
s.project_id,
s.session_id AS session_id,
s.user_uuid AS user_uuid,
s.user_id AS user_id,
s.user_os AS user_os,
s.user_browser AS user_browser,
s.user_device AS user_device,
s.user_device_type AS user_device_type,
s.user_country AS user_country,
toUnixTimestamp(s.datetime)*1000 AS start_ts,
s.duration AS duration,
s.events_count AS events_count,
s.pages_count AS pages_count,
s.errors_count AS errors_count,
s.user_anonymous_id AS user_anonymous_id,
s.platform AS platform,
0 AS issue_score,
s.issue_types AS issue_types,
-- ,
-- to_jsonb(s.issue_types) AS issue_types,
isNotNull(favorite_sessions.session_id) AS favorite,
-- COALESCE((SELECT TRUE
--  FROM public.user_viewed_sessions AS fs
--  WHERE s.session_id = fs.session_id
--    AND fs.user_id = %(userId)s LIMIT 1), FALSE) AS viewed 
   """

SESSION_PROJECTION_COLS_CH_MAP = """\
'project_id',        toString(%(project_id)s),
'session_id',        toString(s.session_id),
'user_uuid',         toString(s.user_uuid),
'user_id',           toString(s.user_id),
'user_os',           toString(s.user_os),
'user_browser',      toString(s.user_browser),
'user_device',       toString(s.user_device),
'user_device_type',  toString(s.user_device_type),
'user_country',      toString(s.user_country),
'start_ts',          toString(toUnixTimestamp(s.datetime)*1000),
'duration',          toString(s.duration),
'events_count',      toString(s.events_count),
'pages_count',       toString(s.pages_count),
'errors_count',      toString(s.errors_count),
'user_anonymous_id', toString(s.user_anonymous_id),
'platform',          toString(s.platform),
'issue_score',       '0',
'favorite',          toString(isNotNull(favorite_sessions.session_id))
"""


def __group_metadata(session, project_metadata):
    meta = {}
    for m in project_metadata.keys():
        if project_metadata[m] is not None and session.get(m) is not None:
            meta[project_metadata[m]] = session[m]
        session.pop(m)
    return meta


def get_by_id2_pg(project_id, session_id, user_id, full_data=False, include_fav_viewed=False, group_metadata=False,
                  live=True):
    with pg_client.PostgresClient() as cur:
        extra_query = []
        if include_fav_viewed:
            extra_query.append("""COALESCE((SELECT TRUE
                                 FROM public.user_favorite_sessions AS fs
                                 WHERE s.session_id = fs.session_id
                                   AND fs.user_id = %(userId)s), FALSE) AS favorite""")
            extra_query.append("""COALESCE((SELECT TRUE
                                 FROM public.user_viewed_sessions AS fs
                                 WHERE s.session_id = fs.session_id
                                   AND fs.user_id = %(userId)s), FALSE) AS viewed""")
        query = cur.mogrify(
            f"""\
            SELECT
                s.*,
                s.session_id::text AS session_id,
                (SELECT project_key FROM public.projects WHERE project_id = %(project_id)s LIMIT 1) AS project_key
                {"," if len(extra_query) > 0 else ""}{",".join(extra_query)}
                {(",json_build_object(" + ",".join([f"'{m}',p.{m}" for m in metadata._get_column_names()]) + ") AS project_metadata") if group_metadata else ''}
            FROM public.sessions AS s {"INNER JOIN public.projects AS p USING (project_id)" if group_metadata else ""}
            WHERE s.project_id = %(project_id)s
                AND s.session_id = %(session_id)s;""",
            {"project_id": project_id, "session_id": session_id, "userId": user_id}
        )
        # print("===============")
        # print(query)
        cur.execute(query=query)

        data = cur.fetchone()
        if data is not None:
            data = helper.dict_to_camel_case(data)
            if full_data:
                if data["platform"] == 'ios':
                    data['events'] = events_ios.get_by_sessionId(project_id=project_id, session_id=session_id)
                    for e in data['events']:
                        if e["type"].endswith("_IOS"):
                            e["type"] = e["type"][:-len("_IOS")]
                    data['crashes'] = events_ios.get_crashes_by_session_id(session_id=session_id)
                    data['userEvents'] = events_ios.get_customs_by_sessionId(project_id=project_id,
                                                                             session_id=session_id)
                    data['mobsUrl'] = sessions_mobs.get_ios(sessionId=session_id)
                else:
                    data['events'] = events.get_by_sessionId2_pg(project_id=project_id, session_id=session_id,
                                                                 group_clickrage=True)
                    all_errors = events.get_errors_by_session_id(session_id=session_id, project_id=project_id)
                    data['stackEvents'] = [e for e in all_errors if e['source'] != "js_exception"]
                    # to keep only the first stack
                    data['errors'] = [errors.format_first_stack_frame(e) for e in all_errors if
                                      e['source'] == "js_exception"][
                                     :500]  # limit the number of errors to reduce the response-body size
                    data['userEvents'] = events.get_customs_by_sessionId2_pg(project_id=project_id,
                                                                             session_id=session_id)
                    data['mobsUrl'] = sessions_mobs.get_web(sessionId=session_id)
                    data['resources'] = resources.get_by_session_id(session_id=session_id, project_id=project_id,
                                                                    start_ts=data["startTs"],
                                                                    duration=data["duration"])

                data['metadata'] = __group_metadata(project_metadata=data.pop("projectMetadata"), session=data)
                data['issues'] = issues.get_by_session_id(session_id=session_id, project_id=project_id)
                data['live'] = live and assist.is_live(project_id=project_id,
                                                       session_id=session_id,
                                                       project_key=data["projectKey"])
            data["inDB"] = True
            return data
        elif live:
            return assist.get_live_session_by_id(project_id=project_id, session_id=session_id)
        else:
            return None


def __get_sql_operator(op: schemas.SearchEventOperator):
    return {
        schemas.SearchEventOperator._is: "=",
        schemas.SearchEventOperator._is_any: "IN",
        schemas.SearchEventOperator._on: "=",
        schemas.SearchEventOperator._on_any: "IN",
        schemas.SearchEventOperator._is_not: "!=",
        schemas.SearchEventOperator._not_on: "!=",
        schemas.SearchEventOperator._contains: "ILIKE",
        schemas.SearchEventOperator._not_contains: "NOT ILIKE",
        schemas.SearchEventOperator._starts_with: "ILIKE",
        schemas.SearchEventOperator._ends_with: "ILIKE",
    }.get(op, "=")


def __is_negation_operator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator._is_not,
                  schemas.SearchEventOperator._not_on,
                  schemas.SearchEventOperator._not_contains]


def __reverse_sql_operator(op):
    return "=" if op == "!=" else "!=" if op == "=" else "ILIKE" if op == "NOT ILIKE" else "NOT ILIKE"


def __get_sql_operator_multiple(op: schemas.SearchEventOperator):
    return " IN " if op not in [schemas.SearchEventOperator._is_not, schemas.SearchEventOperator._not_on,
                                schemas.SearchEventOperator._not_contains] else " NOT IN "


def __get_sql_value_multiple(values):
    if isinstance(values, tuple):
        return values
    return tuple(values) if isinstance(values, list) else (values,)


def _multiple_conditions(condition, values, value_key="value", is_not=False):
    query = []
    for i in range(len(values)):
        k = f"{value_key}_{i}"
        query.append(condition.replace(value_key, k))
    return "(" + (" AND " if is_not else " OR ").join(query) + ")"


def _multiple_values(values, value_key="value"):
    query_values = {}
    if values is not None and isinstance(values, list):
        for i in range(len(values)):
            k = f"{value_key}_{i}"
            query_values[k] = values[i]
    return query_values


def _isAny_opreator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator._on_any, schemas.SearchEventOperator._is_any]


def _isUndefined_operator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator._is_undefined]


def search2_pg(data: schemas.SessionsSearchPayloadSchema, project_id, user_id, errors_only=False,
               error_status=schemas.ErrorStatus.all, count_only=False, issue=None):
    full_args, query_part = search_query_parts(data=data, error_status=error_status, errors_only=errors_only,
                                               favorite_only=data.bookmarked, issue=issue, project_id=project_id,
                                               user_id=user_id)
    if data.limit is not None and data.page is not None:
        full_args["sessions_limit_s"] = (data.page - 1) * data.limit
        full_args["sessions_limit_e"] = data.page * data.limit
    else:
        full_args["sessions_limit_s"] = 1
        full_args["sessions_limit_e"] = 200

    meta_keys = []
    with pg_client.PostgresClient() as cur:
        if errors_only:
            main_query = cur.mogrify(f"""SELECT DISTINCT er.error_id, ser.status, ser.parent_error_id, ser.payload,
                                        COALESCE((SELECT TRUE
                                         FROM public.user_favorite_sessions AS fs
                                         WHERE s.session_id = fs.session_id
                                           AND fs.user_id = %(userId)s), FALSE)   AS favorite,
                                        COALESCE((SELECT TRUE
                                                     FROM public.user_viewed_errors AS ve
                                                     WHERE er.error_id = ve.error_id
                                                       AND ve.user_id = %(userId)s LIMIT 1), FALSE) AS viewed
                                {query_part};""", full_args)

        elif count_only:
            main_query = cur.mogrify(f"""SELECT COUNT(DISTINCT s.session_id) AS count_sessions, 
                                                COUNT(DISTINCT s.user_uuid) AS count_users
                                        {query_part};""", full_args)
        elif data.group_by_user:
            g_sort = "count(full_sessions)"
            if data.order is None:
                data.order = schemas.SortOrderType.desc
            else:
                data.order = data.order.upper()
            if data.sort is not None and data.sort != 'sessionsCount':
                sort = helper.key_to_snake_case(data.sort)
                g_sort = f"{'MIN' if data.order == schemas.SortOrderType.desc else 'MAX'}({sort})"
            else:
                sort = 'start_ts'

            meta_keys = metadata.get(project_id=project_id)
            main_query = cur.mogrify(f"""SELECT COUNT(*) AS count,
                                                COALESCE(JSONB_AGG(users_sessions) 
                                                    FILTER (WHERE rn>%(sessions_limit_s)s AND rn<=%(sessions_limit_e)s), '[]'::JSONB) AS sessions
                                        FROM (SELECT user_id,
                                                 count(full_sessions)                                   AS user_sessions_count,
                                                 jsonb_agg(full_sessions) FILTER (WHERE rn <= 1)        AS last_session,
                                                 MIN(full_sessions.start_ts)                            AS first_session_ts,
                                                 ROW_NUMBER() OVER (ORDER BY {g_sort} {data.order}) AS rn
                                            FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY {sort} {data.order}) AS rn 
                                                FROM (SELECT DISTINCT ON(s.session_id) {SESSION_PROJECTION_COLS} 
                                                                    {"," if len(meta_keys) > 0 else ""}{",".join([f'metadata_{m["index"]}' for m in meta_keys])}
                                                    {query_part}
                                                    ) AS filtred_sessions
                                                ) AS full_sessions
                                                GROUP BY user_id
                                            ) AS users_sessions;""",
                                     full_args)
        else:
            if data.order is None:
                data.order = schemas.SortOrderType.desc
            sort = 'session_id'
            if data.sort is not None and data.sort != "session_id":
                # sort += " " + data.order + "," + helper.key_to_snake_case(data.sort)
                sort = helper.key_to_snake_case(data.sort)

            meta_keys = metadata.get(project_id=project_id)
            main_query = cur.mogrify(f"""SELECT COUNT(full_sessions) AS count, 
                                                COALESCE(JSONB_AGG(full_sessions) 
                                                    FILTER (WHERE rn>%(sessions_limit_s)s AND rn<=%(sessions_limit_e)s), '[]'::JSONB) AS sessions
                                            FROM (SELECT *, ROW_NUMBER() OVER (ORDER BY {sort} {data.order}, issue_score DESC) AS rn
                                            FROM (SELECT DISTINCT ON(s.session_id) {SESSION_PROJECTION_COLS}
                                                                {"," if len(meta_keys) > 0 else ""}{",".join([f'metadata_{m["index"]}' for m in meta_keys])}
                                            {query_part}
                                            ORDER BY s.session_id desc) AS filtred_sessions
                                            ORDER BY {sort} {data.order}, issue_score DESC) AS full_sessions;""",
                                     full_args)
        print("--------------------")
        print(main_query)
        print("--------------------")
        try:
            cur.execute(main_query)
        except Exception as err:
            print("--------- SESSIONS SEARCH QUERY EXCEPTION -----------")
            print(main_query.decode('UTF-8'))
            print("--------- PAYLOAD -----------")
            print(data.json())
            print("--------------------")
            raise err
        if errors_only:
            return helper.list_to_camel_case(cur.fetchall())

        sessions = cur.fetchone()
        if count_only:
            return helper.dict_to_camel_case(sessions)

        total = sessions["count"]
        sessions = sessions["sessions"]

    if data.group_by_user:
        for i, s in enumerate(sessions):
            sessions[i] = {**s.pop("last_session")[0], **s}
            sessions[i].pop("rn")
            sessions[i]["metadata"] = {k["key"]: sessions[i][f'metadata_{k["index"]}'] for k in meta_keys \
                                       if sessions[i][f'metadata_{k["index"]}'] is not None}
    else:
        for i, s in enumerate(sessions):
            sessions[i]["metadata"] = {k["key"]: sessions[i][f'metadata_{k["index"]}'] for k in meta_keys \
                                       if sessions[i][f'metadata_{k["index"]}'] is not None}
    # if not data.group_by_user and data.sort is not None and data.sort != "session_id":
    #     sessions = sorted(sessions, key=lambda s: s[helper.key_to_snake_case(data.sort)],
    #                       reverse=data.order.upper() == "DESC")
    return {
        'total': total,
        'sessions': helper.list_to_camel_case(sessions)
    }


def search2_ch(data: schemas.SessionsSearchPayloadSchema, project_id, user_id, errors_only=False,
               error_status=schemas.ErrorStatus.all, count_only=False, issue=None):
    print("------ search2_ch")
    full_args, query_part = search_query_parts_ch(data=data, error_status=error_status, errors_only=errors_only,
                                                  favorite_only=data.bookmarked, issue=issue, project_id=project_id,
                                                  user_id=user_id)
    if data.sort == "startTs":
        data.sort = "datetime"
    if data.limit is not None and data.page is not None:
        full_args["sessions_limit_s"] = (data.page - 1) * data.limit
        full_args["sessions_limit_e"] = data.page * data.limit
        full_args["sessions_limit"] = data.limit
    else:
        full_args["sessions_limit_s"] = 1
        full_args["sessions_limit_e"] = 200
        full_args["sessions_limit"] = 200

    meta_keys = []
    with ch_client.ClickHouseClient() as cur:
        if errors_only:
            main_query = cur.mogrify(f"""SELECT DISTINCT er.error_id, ser.status, ser.parent_error_id, ser.payload,
                                        COALESCE((SELECT TRUE
                                         FROM public.user_favorite_sessions AS fs
                                         WHERE s.session_id = fs.session_id
                                           AND fs.user_id = %(userId)s), FALSE)   AS favorite,
                                        COALESCE((SELECT TRUE
                                                     FROM public.user_viewed_errors AS ve
                                                     WHERE er.error_id = ve.error_id
                                                       AND ve.user_id = %(userId)s LIMIT 1), FALSE) AS viewed
                                {query_part};""", full_args)

        elif count_only:
            main_query = cur.mogrify(f"""SELECT COUNT(DISTINCT s.session_id) AS count_sessions, 
                                                COUNT(DISTINCT s.user_uuid) AS count_users
                                        {query_part};""", full_args)
        elif data.group_by_user:
            g_sort = "count(full_sessions)"
            if data.order is None:
                data.order = schemas.SortOrderType.desc
            else:
                data.order = data.order.upper()
            if data.sort is not None and data.sort != 'sessionsCount':
                sort = helper.key_to_snake_case(data.sort)
                g_sort = f"{'MIN' if data.order == schemas.SortOrderType.desc else 'MAX'}({sort})"
            else:
                sort = 'start_ts'

            meta_keys = metadata.get(project_id=project_id)
            main_query = cur.mogrify(f"""SELECT COUNT(*) AS count,
                                                COALESCE(JSONB_AGG(users_sessions) 
                                                    FILTER (WHERE rn>%(sessions_limit_s)s AND rn<=%(sessions_limit_e)s), '[]'::JSONB) AS sessions
                                        FROM (SELECT user_id,
                                                 count(full_sessions)                                   AS user_sessions_count,
                                                 jsonb_agg(full_sessions) FILTER (WHERE rn <= 1)        AS last_session,
                                                 MIN(full_sessions.start_ts)                            AS first_session_ts,
                                                 ROW_NUMBER() OVER (ORDER BY {g_sort} {data.order}) AS rn
                                            FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY {sort} {data.order}) AS rn 
                                                FROM (SELECT DISTINCT ON(s.session_id) {SESSION_PROJECTION_COLS} 
                                                                    {"," if len(meta_keys) > 0 else ""}{",".join([f'metadata_{m["index"]}' for m in meta_keys])}
                                                    {query_part}
                                                    ) AS filtred_sessions
                                                ) AS full_sessions
                                                GROUP BY user_id
                                            ) AS users_sessions;""",
                                     full_args)
        else:
            if data.order is None:
                data.order = schemas.SortOrderType.desc
            sort = 'session_id'
            if data.sort is not None and data.sort != "session_id":
                # sort += " " + data.order + "," + helper.key_to_snake_case(data.sort)
                sort = helper.key_to_snake_case(data.sort)

            meta_keys = metadata.get(project_id=project_id)
            main_query = cur.format(f"""SELECT any(total) AS count, groupArray(%(sessions_limit)s)(details) AS sessions
                                        FROM (SELECT COUNT() OVER () AS total,
                                                    rowNumberInAllBlocks() AS rn,
                                                    map({SESSION_PROJECTION_COLS_CH_MAP}) AS details
                                             {query_part}
--                                              ORDER BY {sort} {data.order}
                                             ) AS raw
                                        WHERE rn>%(sessions_limit_s)s AND rn<=%(sessions_limit_e)s;""", full_args)
        print("--------------------")
        print(main_query)
        print("--------------------")
        try:
            sessions = cur.execute(main_query)
        except Exception as err:
            print("--------- SESSIONS SEARCH QUERY EXCEPTION -----------")
            print(main_query)
            print("--------- PAYLOAD -----------")
            print(data.json())
            print("--------------------")
            raise err
        if errors_only:
            return helper.list_to_camel_case(cur.fetchall())

        if len(sessions) > 0:
            sessions = sessions[0]
        # if count_only:
        #     return helper.dict_to_camel_case(sessions)
        # for s in sessions:
        #     print(s)
        #     s["session_id"] = str(s["session_id"])
        total = sessions["count"]
        sessions = sessions["sessions"]

    if data.group_by_user:
        for i, s in enumerate(sessions):
            sessions[i] = {**s.pop("last_session")[0], **s}
            sessions[i].pop("rn")
            sessions[i]["metadata"] = {k["key"]: sessions[i][f'metadata_{k["index"]}'] for k in meta_keys \
                                       if sessions[i][f'metadata_{k["index"]}'] is not None}
    else:
        for i in range(len(sessions)):
            sessions[i]["metadata"] = {k["key"]: sessions[i][f'metadata_{k["index"]}'] for k in meta_keys \
                                       if sessions[i].get(f'metadata_{k["index"]}') is not None}
            sessions[i] = schemas_ee.SessionModel.parse_obj(helper.dict_to_camel_case(sessions[i]))

    # if not data.group_by_user and data.sort is not None and data.sort != "session_id":
    #     sessions = sorted(sessions, key=lambda s: s[helper.key_to_snake_case(data.sort)],
    #                       reverse=data.order.upper() == "DESC")
    return {
        'total': total,
        'sessions': sessions
    }


def search2_series(data: schemas.SessionsSearchPayloadSchema, project_id: int, density: int,
                   view_type: schemas.MetricTimeseriesViewType, metric_type: schemas.MetricType,
                   metric_of: schemas.TableMetricOfType, metric_value: List):
    step_size = int(metrics_helper.__get_step_size(endTimestamp=data.endDate, startTimestamp=data.startDate,
                                                   density=density, factor=1, decimal=True))
    extra_event = None
    if metric_of == schemas.TableMetricOfType.visited_url:
        extra_event = "events.pages"
    elif metric_of == schemas.TableMetricOfType.issues and len(metric_value) > 0:
        data.filters.append(schemas.SessionSearchFilterSchema(value=metric_value, type=schemas.FilterType.issue,
                                                              operator=schemas.SearchEventOperator._is))
    full_args, query_part = search_query_parts(data=data, error_status=None, errors_only=False,
                                               favorite_only=False, issue=None, project_id=project_id,
                                               user_id=None, extra_event=extra_event)
    full_args["step_size"] = step_size
    sessions = []
    with pg_client.PostgresClient() as cur:
        if metric_type == schemas.MetricType.timeseries:
            if view_type == schemas.MetricTimeseriesViewType.line_chart:
                main_query = cur.mogrify(f"""WITH full_sessions AS (SELECT DISTINCT ON(s.session_id) s.session_id, s.start_ts
                                                                {query_part})
                                            SELECT generated_timestamp AS timestamp,
                                                   COUNT(s)            AS count
                                            FROM generate_series(%(startDate)s, %(endDate)s, %(step_size)s) AS generated_timestamp
                                                     LEFT JOIN LATERAL ( SELECT 1 AS s
                                                                         FROM full_sessions
                                                                         WHERE start_ts >= generated_timestamp
                                                                           AND start_ts <= generated_timestamp + %(step_size)s) AS sessions ON (TRUE)
                                            GROUP BY generated_timestamp
                                            ORDER BY generated_timestamp;""", full_args)
            else:
                main_query = cur.mogrify(f"""SELECT count(DISTINCT s.session_id) AS count
                                            {query_part};""", full_args)

            # print("--------------------")
            # print(main_query)
            # print("--------------------")
            cur.execute(main_query)
            if view_type == schemas.MetricTimeseriesViewType.line_chart:
                sessions = cur.fetchall()
            else:
                sessions = cur.fetchone()["count"]
        elif metric_type == schemas.MetricType.table:
            if isinstance(metric_of, schemas.TableMetricOfType):
                main_col = "user_id"
                extra_col = ""
                extra_where = ""
                pre_query = ""
                if metric_of == schemas.TableMetricOfType.user_country:
                    main_col = "user_country"
                elif metric_of == schemas.TableMetricOfType.user_device:
                    main_col = "user_device"
                elif metric_of == schemas.TableMetricOfType.user_browser:
                    main_col = "user_browser"
                elif metric_of == schemas.TableMetricOfType.issues:
                    main_col = "issue"
                    extra_col = f", UNNEST(s.issue_types) AS {main_col}"
                    if len(metric_value) > 0:
                        extra_where = []
                        for i in range(len(metric_value)):
                            arg_name = f"selected_issue_{i}"
                            extra_where.append(f"{main_col} = %({arg_name})s")
                            full_args[arg_name] = metric_value[i]
                        extra_where = f"WHERE ({' OR '.join(extra_where)})"
                elif metric_of == schemas.TableMetricOfType.visited_url:
                    main_col = "path"
                    extra_col = ", path"
                main_query = cur.mogrify(f"""{pre_query}
                                             SELECT COUNT(*) AS count, COALESCE(JSONB_AGG(users_sessions) FILTER ( WHERE rn <= 200 ), '[]'::JSONB) AS values
                                                        FROM (SELECT {main_col} AS name,
                                                                 count(full_sessions)                                   AS session_count,
                                                                 ROW_NUMBER() OVER (ORDER BY count(full_sessions) DESC) AS rn
                                                            FROM (SELECT *
                                                            FROM (SELECT DISTINCT ON(s.session_id) s.session_id, s.user_uuid, 
                                                                        s.user_id, s.user_os, 
                                                                        s.user_browser, s.user_device, 
                                                                        s.user_device_type, s.user_country, s.issue_types{extra_col}
                                                            {query_part}
                                                            ORDER BY s.session_id desc) AS filtred_sessions
                                                            ) AS full_sessions
                                                            {extra_where}
                                                            GROUP BY {main_col}
                                                            ORDER BY session_count DESC) AS users_sessions;""",
                                         full_args)
            # print("--------------------")
            # print(main_query)
            # print("--------------------")
            cur.execute(main_query)
            sessions = cur.fetchone()
            for s in sessions["values"]:
                s.pop("rn")
            sessions["values"] = helper.list_to_camel_case(sessions["values"])

        return sessions


def __is_valid_event(is_any: bool, event: schemas._SessionSearchEventSchema):
    return not (not is_any and len(event.value) == 0 and event.type not in [schemas.EventType.request_details,
                                                                            schemas.EventType.graphql] \
                or event.type in [schemas.PerformanceEventType.location_dom_complete,
                                  schemas.PerformanceEventType.location_largest_contentful_paint_time,
                                  schemas.PerformanceEventType.location_ttfb,
                                  schemas.PerformanceEventType.location_avg_cpu_load,
                                  schemas.PerformanceEventType.location_avg_memory_usage
                                  ] and (event.source is None or len(event.source) == 0) \
                or event.type in [schemas.EventType.request_details, schemas.EventType.graphql] and (
                        event.filters is None or len(event.filters) == 0))


def search_query_parts(data, error_status, errors_only, favorite_only, issue, project_id, user_id, extra_event=None):
    ss_constraints = []
    full_args = {"project_id": project_id, "startDate": data.startDate, "endDate": data.endDate,
                 "projectId": project_id, "userId": user_id}
    extra_constraints = [
        "s.project_id = %(project_id)s",
        "s.duration IS NOT NULL"
    ]
    extra_from = ""
    events_query_part = ""
    if len(data.filters) > 0:
        meta_keys = None
        for i, f in enumerate(data.filters):
            if not isinstance(f.value, list):
                f.value = [f.value]
            filter_type = f.type
            f.value = helper.values_for_operator(value=f.value, op=f.operator)
            f_k = f"f_value{i}"
            full_args = {**full_args, **_multiple_values(f.value, value_key=f_k)}
            op = __get_sql_operator(f.operator) \
                if filter_type not in [schemas.FilterType.events_count] else f.operator
            is_any = _isAny_opreator(f.operator)
            is_undefined = _isUndefined_operator(f.operator)
            if not is_any and not is_undefined and len(f.value) == 0:
                continue
            is_not = False
            if __is_negation_operator(f.operator):
                is_not = True
            if filter_type == schemas.FilterType.user_browser:
                if is_any:
                    extra_constraints.append('s.user_browser IS NOT NULL')
                    ss_constraints.append('ms.user_browser IS NOT NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.user_os, schemas.FilterType.user_os_ios]:
                if is_any:
                    extra_constraints.append('s.user_os IS NOT NULL')
                    ss_constraints.append('ms.user_os IS NOT NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.user_device, schemas.FilterType.user_device_ios]:
                if is_any:
                    extra_constraints.append('s.user_device IS NOT NULL')
                    ss_constraints.append('ms.user_device IS NOT NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.user_country, schemas.FilterType.user_country_ios]:
                if is_any:
                    extra_constraints.append('s.user_country IS NOT NULL')
                    ss_constraints.append('ms.user_country IS NOT NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.utm_source]:
                if is_any:
                    extra_constraints.append('s.utm_source IS NOT NULL')
                    ss_constraints.append('ms.utm_source  IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.utm_source IS NULL')
                    ss_constraints.append('ms.utm_source  IS NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.utm_source {op} %({f_k})s::text', f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_source {op} %({f_k})s::text', f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type in [schemas.FilterType.utm_medium]:
                if is_any:
                    extra_constraints.append('s.utm_medium IS NOT NULL')
                    ss_constraints.append('ms.utm_medium IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.utm_medium IS NULL')
                    ss_constraints.append('ms.utm_medium IS NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.utm_medium {op} %({f_k})s::text', f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_medium {op} %({f_k})s::text', f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type in [schemas.FilterType.utm_campaign]:
                if is_any:
                    extra_constraints.append('s.utm_campaign IS NOT NULL')
                    ss_constraints.append('ms.utm_campaign IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.utm_campaign IS NULL')
                    ss_constraints.append('ms.utm_campaign IS NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.utm_campaign {op} %({f_k})s::text', f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_campaign {op} %({f_k})s::text', f.value, is_not=is_not,
                                             value_key=f_k))

            elif filter_type == schemas.FilterType.duration:
                if len(f.value) > 0 and f.value[0] is not None:
                    extra_constraints.append("s.duration >= %(minDuration)s")
                    ss_constraints.append("ms.duration >= %(minDuration)s")
                    full_args["minDuration"] = f.value[0]
                if len(f.value) > 1 and f.value[1] is not None and int(f.value[1]) > 0:
                    extra_constraints.append("s.duration <= %(maxDuration)s")
                    ss_constraints.append("ms.duration <= %(maxDuration)s")
                    full_args["maxDuration"] = f.value[1]
            elif filter_type == schemas.FilterType.referrer:
                extra_from += f"INNER JOIN {events.event_type.LOCATION.table} AS p USING(session_id)"
                if is_any:
                    extra_constraints.append('p.base_referrer IS NOT NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f"p.base_referrer {op} %({f_k})s", f.value, is_not=is_not, value_key=f_k))
            elif filter_type == events.event_type.METADATA.ui_type:
                # get metadata list only if you need it
                if meta_keys is None:
                    meta_keys = metadata.get(project_id=project_id)
                    meta_keys = {m["key"]: m["index"] for m in meta_keys}
                if f.source in meta_keys.keys():
                    if is_any:
                        extra_constraints.append(f"s.{metadata.index_to_colname(meta_keys[f.source])} IS NOT NULL")
                        ss_constraints.append(f"ms.{metadata.index_to_colname(meta_keys[f.source])} IS NOT NULL")
                    elif is_undefined:
                        extra_constraints.append(f"s.{metadata.index_to_colname(meta_keys[f.source])} IS NULL")
                        ss_constraints.append(f"ms.{metadata.index_to_colname(meta_keys[f.source])} IS NULL")
                    else:
                        extra_constraints.append(
                            _multiple_conditions(
                                f"s.{metadata.index_to_colname(meta_keys[f.source])} {op} %({f_k})s::text",
                                f.value, is_not=is_not, value_key=f_k))
                        ss_constraints.append(
                            _multiple_conditions(
                                f"ms.{metadata.index_to_colname(meta_keys[f.source])} {op} %({f_k})s::text",
                                f.value, is_not=is_not, value_key=f_k))
            elif filter_type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
                if is_any:
                    extra_constraints.append('s.user_id IS NOT NULL')
                    ss_constraints.append('ms.user_id IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.user_id IS NULL')
                    ss_constraints.append('ms.user_id IS NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f"s.user_id {op} %({f_k})s::text", f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"ms.user_id {op} %({f_k})s::text", f.value, is_not=is_not, value_key=f_k))
            elif filter_type in [schemas.FilterType.user_anonymous_id,
                                 schemas.FilterType.user_anonymous_id_ios]:
                if is_any:
                    extra_constraints.append('s.user_anonymous_id IS NOT NULL')
                    ss_constraints.append('ms.user_anonymous_id IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.user_anonymous_id IS NULL')
                    ss_constraints.append('ms.user_anonymous_id IS NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f"s.user_anonymous_id {op} %({f_k})s::text", f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"ms.user_anonymous_id {op} %({f_k})s::text", f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type in [schemas.FilterType.rev_id, schemas.FilterType.rev_id_ios]:
                if is_any:
                    extra_constraints.append('s.rev_id IS NOT NULL')
                    ss_constraints.append('ms.rev_id IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.rev_id IS NULL')
                    ss_constraints.append('ms.rev_id IS NULL')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f"s.rev_id {op} %({f_k})s::text", f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"ms.rev_id {op} %({f_k})s::text", f.value, is_not=is_not, value_key=f_k))
            elif filter_type == schemas.FilterType.platform:
                # op = __get_sql_operator(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f"s.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"ms.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
            elif filter_type == schemas.FilterType.issue:
                if is_any:
                    extra_constraints.append("array_length(s.issue_types, 1) > 0")
                    ss_constraints.append("array_length(ms.issue_types, 1) > 0")
                else:
                    extra_constraints.append(
                        _multiple_conditions(f"%({f_k})s {op} ANY (s.issue_types)", f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"%({f_k})s {op} ANY (ms.issue_types)", f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type == schemas.FilterType.events_count:
                extra_constraints.append(
                    _multiple_conditions(f"s.events_count {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"ms.events_count {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
    # ---------------------------------------------------------------------------
    if len(data.events) > 0:
        valid_events_count = 0
        for event in data.events:
            is_any = _isAny_opreator(event.operator)
            if not isinstance(event.value, list):
                event.value = [event.value]
            if __is_valid_event(is_any=is_any, event=event):
                valid_events_count += 1
        events_query_from = []
        event_index = 0
        or_events = data.events_order == schemas.SearchEventOrder._or
        # events_joiner = " FULL JOIN " if or_events else " INNER JOIN LATERAL "
        events_joiner = " UNION " if or_events else " INNER JOIN LATERAL "
        for i, event in enumerate(data.events):
            event_type = event.type
            is_any = _isAny_opreator(event.operator)
            if not isinstance(event.value, list):
                event.value = [event.value]
            if not __is_valid_event(is_any=is_any, event=event):
                continue
            op = __get_sql_operator(event.operator)
            is_not = False
            if __is_negation_operator(event.operator):
                is_not = True
                op = __reverse_sql_operator(op)
            if event_index == 0 or or_events:
                event_from = "%s INNER JOIN public.sessions AS ms USING (session_id)"
                event_where = ["ms.project_id = %(projectId)s", "main.timestamp >= %(startDate)s",
                               "main.timestamp <= %(endDate)s", "ms.start_ts >= %(startDate)s",
                               "ms.start_ts <= %(endDate)s", "ms.duration IS NOT NULL"]
                if favorite_only and not errors_only:
                    event_from += "INNER JOIN public.user_favorite_sessions AS fs USING(session_id)"
                    event_where.append("fs.user_id = %(userId)s")
            else:
                event_from = "%s"
                event_where = ["main.timestamp >= %(startDate)s", "main.timestamp <= %(endDate)s",
                               "main.session_id=event_0.session_id"]
                if data.events_order == schemas.SearchEventOrder._then:
                    event_where.append(f"event_{event_index - 1}.timestamp <= main.timestamp")
            e_k = f"e_value{i}"
            s_k = e_k + "_source"
            if event.type != schemas.PerformanceEventType.time_between_events:
                event.value = helper.values_for_operator(value=event.value, op=event.operator)
                full_args = {**full_args,
                             **_multiple_values(event.value, value_key=e_k),
                             **_multiple_values(event.source, value_key=s_k)}

            if event_type == events.event_type.CLICK.ui_type:
                event_from = event_from % f"{events.event_type.CLICK.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.CLICK.column} {op} %({e_k})s", event.value,
                                             value_key=e_k))

            elif event_type == events.event_type.INPUT.ui_type:
                event_from = event_from % f"{events.event_type.INPUT.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.INPUT.column} {op} %({e_k})s", event.value,
                                             value_key=e_k))
                if event.source is not None and len(event.source) > 0:
                    event_where.append(_multiple_conditions(f"main.value ILIKE %(custom{i})s", event.source,
                                                            value_key=f"custom{i}"))
                    full_args = {**full_args, **_multiple_values(event.source, value_key=f"custom{i}")}

            elif event_type == events.event_type.LOCATION.ui_type:
                event_from = event_from % f"{events.event_type.LOCATION.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.LOCATION.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
            elif event_type == events.event_type.CUSTOM.ui_type:
                event_from = event_from % f"{events.event_type.CUSTOM.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.CUSTOM.column} {op} %({e_k})s", event.value,
                                             value_key=e_k))
            elif event_type == events.event_type.REQUEST.ui_type:
                event_from = event_from % f"{events.event_type.REQUEST.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.REQUEST.column} {op} %({e_k})s", event.value,
                                             value_key=e_k))
            elif event_type == events.event_type.GRAPHQL.ui_type:
                event_from = event_from % f"{events.event_type.GRAPHQL.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.GRAPHQL.column} {op} %({e_k})s", event.value,
                                             value_key=e_k))
            elif event_type == events.event_type.STATEACTION.ui_type:
                event_from = event_from % f"{events.event_type.STATEACTION.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.STATEACTION.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
            elif event_type == events.event_type.ERROR.ui_type:
                event_from = event_from % f"{events.event_type.ERROR.table} AS main INNER JOIN public.errors AS main1 USING(error_id)"
                event.source = tuple(event.source)
                if not is_any and event.value not in [None, "*", ""]:
                    event_where.append(
                        _multiple_conditions(f"(main1.message {op} %({e_k})s OR main1.name {op} %({e_k})s)",
                                             event.value, value_key=e_k))
                if len(event.source) > 0 and event.source[0] not in [None, "*", ""]:
                    event_where.append(_multiple_conditions(f"main1.source = %({s_k})s", event.source, value_key=s_k))


            # ----- IOS
            elif event_type == events.event_type.CLICK_IOS.ui_type:
                event_from = event_from % f"{events.event_type.CLICK_IOS.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.CLICK_IOS.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))

            elif event_type == events.event_type.INPUT_IOS.ui_type:
                event_from = event_from % f"{events.event_type.INPUT_IOS.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.INPUT_IOS.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
                if event.source is not None and len(event.source) > 0:
                    event_where.append(_multiple_conditions(f"main.value ILIKE %(custom{i})s", event.source,
                                                            value_key="custom{i}"))
                    full_args = {**full_args, **_multiple_values(event.source, f"custom{i}")}
            elif event_type == events.event_type.VIEW_IOS.ui_type:
                event_from = event_from % f"{events.event_type.VIEW_IOS.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.VIEW_IOS.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
            elif event_type == events.event_type.CUSTOM_IOS.ui_type:
                event_from = event_from % f"{events.event_type.CUSTOM_IOS.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.CUSTOM_IOS.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
            elif event_type == events.event_type.REQUEST_IOS.ui_type:
                event_from = event_from % f"{events.event_type.REQUEST_IOS.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.REQUEST_IOS.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
            elif event_type == events.event_type.ERROR_IOS.ui_type:
                event_from = event_from % f"{events.event_type.ERROR_IOS.table} AS main INNER JOIN public.crashes_ios AS main1 USING(crash_id)"
                if not is_any and event.value not in [None, "*", ""]:
                    event_where.append(
                        _multiple_conditions(f"(main1.reason {op} %({e_k})s OR main1.name {op} %({e_k})s)",
                                             event.value, value_key=e_k))
            elif event_type == schemas.PerformanceEventType.fetch_failed:
                event_from = event_from % f"{events.event_type.REQUEST.table} AS main "
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.REQUEST.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
                col = performance_event.get_col(event_type)
                colname = col["column"]
                event_where.append(f"main.{colname} = FALSE")
            # elif event_type == schemas.PerformanceEventType.fetch_duration:
            #     event_from = event_from % f"{events.event_type.REQUEST.table} AS main "
            #     if not is_any:
            #         event_where.append(
            #             _multiple_conditions(f"main.{events.event_type.REQUEST.column} {op} %({e_k})s",
            #                                  event.value, value_key=e_k))
            #     col = performance_event.get_col(event_type)
            #     colname = col["column"]
            #     tname = "main"
            #     e_k += "_custom"
            #     full_args = {**full_args, **_multiple_values(event.source, value_key=e_k)}
            #     event_where.append(f"{tname}.{colname} IS NOT NULL AND {tname}.{colname}>0 AND " +
            #                        _multiple_conditions(f"{tname}.{colname} {event.sourceOperator} %({e_k})s",
            #                                             event.source, value_key=e_k))
            elif event_type in [schemas.PerformanceEventType.location_dom_complete,
                                schemas.PerformanceEventType.location_largest_contentful_paint_time,
                                schemas.PerformanceEventType.location_ttfb,
                                schemas.PerformanceEventType.location_avg_cpu_load,
                                schemas.PerformanceEventType.location_avg_memory_usage
                                ]:
                event_from = event_from % f"{events.event_type.LOCATION.table} AS main "
                col = performance_event.get_col(event_type)
                colname = col["column"]
                tname = "main"
                if col.get("extraJoin") is not None:
                    tname = "ej"
                    event_from += f" INNER JOIN {col['extraJoin']} AS {tname} USING(session_id)"
                    event_where += [f"{tname}.timestamp >= main.timestamp", f"{tname}.timestamp >= %(startDate)s",
                                    f"{tname}.timestamp <= %(endDate)s"]
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.LOCATION.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
                e_k += "_custom"
                full_args = {**full_args, **_multiple_values(event.source, value_key=e_k)}

                event_where.append(f"{tname}.{colname} IS NOT NULL AND {tname}.{colname}>0 AND " +
                                   _multiple_conditions(f"{tname}.{colname} {event.sourceOperator} %({e_k})s",
                                                        event.source, value_key=e_k))
            elif event_type == schemas.PerformanceEventType.time_between_events:
                event_from = event_from % f"{getattr(events.event_type, event.value[0].type).table} AS main INNER JOIN {getattr(events.event_type, event.value[1].type).table} AS main2 USING(session_id) "
                if not isinstance(event.value[0].value, list):
                    event.value[0].value = [event.value[0].value]
                if not isinstance(event.value[1].value, list):
                    event.value[1].value = [event.value[1].value]
                event.value[0].value = helper.values_for_operator(value=event.value[0].value,
                                                                  op=event.value[0].operator)
                event.value[1].value = helper.values_for_operator(value=event.value[1].value,
                                                                  op=event.value[0].operator)
                e_k1 = e_k + "_e1"
                e_k2 = e_k + "_e2"
                full_args = {**full_args,
                             **_multiple_values(event.value[0].value, value_key=e_k1),
                             **_multiple_values(event.value[1].value, value_key=e_k2)}
                s_op = __get_sql_operator(event.value[0].operator)
                event_where += ["main2.timestamp >= %(startDate)s", "main2.timestamp <= %(endDate)s"]
                if event_index > 0 and not or_events:
                    event_where.append("main2.session_id=event_0.session_id")
                is_any = _isAny_opreator(event.value[0].operator)
                if not is_any:
                    event_where.append(
                        _multiple_conditions(
                            f"main.{getattr(events.event_type, event.value[0].type).column} {s_op} %({e_k1})s",
                            event.value[0].value, value_key=e_k1))
                s_op = __get_sql_operator(event.value[1].operator)
                is_any = _isAny_opreator(event.value[1].operator)
                if not is_any:
                    event_where.append(
                        _multiple_conditions(
                            f"main2.{getattr(events.event_type, event.value[1].type).column} {s_op} %({e_k2})s",
                            event.value[1].value, value_key=e_k2))

                e_k += "_custom"
                full_args = {**full_args, **_multiple_values(event.source, value_key=e_k)}
                event_where.append(
                    _multiple_conditions(f"main2.timestamp - main.timestamp {event.sourceOperator} %({e_k})s",
                                         event.source, value_key=e_k))

            elif event_type == schemas.EventType.request_details:
                event_from = event_from % f"{events.event_type.REQUEST.table} AS main "
                apply = False
                for j, f in enumerate(event.filters):
                    is_any = _isAny_opreator(f.operator)
                    if is_any or len(f.value) == 0:
                        continue
                    f.value = helper.values_for_operator(value=f.value, op=f.operator)
                    op = __get_sql_operator(f.operator)
                    e_k_f = e_k + f"_fetch{j}"
                    full_args = {**full_args, **_multiple_values(f.value, value_key=e_k_f)}
                    if f.type == schemas.FetchFilterType._url:
                        event_where.append(
                            _multiple_conditions(f"main.{events.event_type.REQUEST.column} {op} %({e_k_f})s::text",
                                                 f.value, value_key=e_k_f))
                        apply = True
                    elif f.type == schemas.FetchFilterType._status_code:
                        event_where.append(
                            _multiple_conditions(f"main.status_code {f.operator} %({e_k_f})s::integer", f.value,
                                                 value_key=e_k_f))
                        apply = True
                    elif f.type == schemas.FetchFilterType._method:
                        event_where.append(
                            _multiple_conditions(f"main.method {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        apply = True
                    elif f.type == schemas.FetchFilterType._duration:
                        event_where.append(
                            _multiple_conditions(f"main.duration {f.operator} %({e_k_f})s::integer", f.value,
                                                 value_key=e_k_f))
                        apply = True
                    elif f.type == schemas.FetchFilterType._request_body:
                        event_where.append(
                            _multiple_conditions(f"main.request_body {op} %({e_k_f})s::text", f.value, value_key=e_k_f))
                        apply = True
                    elif f.type == schemas.FetchFilterType._response_body:
                        event_where.append(
                            _multiple_conditions(f"main.response_body {op} %({e_k_f})s::text", f.value,
                                                 value_key=e_k_f))
                        apply = True
                    else:
                        print(f"undefined FETCH filter: {f.type}")
                if not apply:
                    continue
            elif event_type == schemas.EventType.graphql:
                event_from = event_from % f"{events.event_type.GRAPHQL.table} AS main "
                for j, f in enumerate(event.filters):
                    is_any = _isAny_opreator(f.operator)
                    if is_any or len(f.value) == 0:
                        continue
                    f.value = helper.values_for_operator(value=f.value, op=f.operator)
                    op = __get_sql_operator(f.operator)
                    e_k_f = e_k + f"_graphql{j}"
                    full_args = {**full_args, **_multiple_values(f.value, value_key=e_k_f)}
                    if f.type == schemas.GraphqlFilterType._name:
                        event_where.append(
                            _multiple_conditions(f"main.{events.event_type.GRAPHQL.column} {op} %({e_k_f})s", f.value,
                                                 value_key=e_k_f))
                    elif f.type == schemas.GraphqlFilterType._method:
                        event_where.append(
                            _multiple_conditions(f"main.method {op} %({e_k_f})s", f.value, value_key=e_k_f))
                    elif f.type == schemas.GraphqlFilterType._request_body:
                        event_where.append(
                            _multiple_conditions(f"main.request_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
                    elif f.type == schemas.GraphqlFilterType._response_body:
                        event_where.append(
                            _multiple_conditions(f"main.response_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
                    else:
                        print(f"undefined GRAPHQL filter: {f.type}")
            else:
                continue
            if event_index == 0 or or_events:
                event_where += ss_constraints
            if is_not:
                if event_index == 0 or or_events:
                    events_query_from.append(f"""\
                                    (SELECT
                                        session_id, 
                                        0 AS timestamp
                                      FROM sessions
                                      WHERE EXISTS(SELECT session_id 
                                                    FROM {event_from} 
                                                    WHERE {" AND ".join(event_where)} 
                                                        AND sessions.session_id=ms.session_id) IS FALSE
                                        AND project_id = %(projectId)s 
                                        AND start_ts >= %(startDate)s
                                        AND start_ts <= %(endDate)s
                                        AND duration IS NOT NULL
                                    ) {"" if or_events else (f"AS event_{event_index}" + ("ON(TRUE)" if event_index > 0 else ""))}\
                                    """)
                else:
                    events_query_from.append(f"""\
            (SELECT
                event_0.session_id, 
                event_{event_index - 1}.timestamp AS timestamp
              WHERE EXISTS(SELECT session_id FROM {event_from} WHERE {" AND ".join(event_where)}) IS FALSE
            ) AS event_{event_index} {"ON(TRUE)" if event_index > 0 else ""}\
            """)
            else:
                events_query_from.append(f"""\
            (SELECT main.session_id, {"MIN" if event_index < (valid_events_count - 1) else "MAX"}(main.timestamp) AS timestamp
              FROM {event_from}
              WHERE {" AND ".join(event_where)}
              GROUP BY 1
            ) {"" if or_events else (f"AS event_{event_index} " + ("ON(TRUE)" if event_index > 0 else ""))}\
            """)
            event_index += 1
        if event_index > 0:
            if or_events:
                events_query_part = f"""SELECT
                                            session_id, 
                                            MIN(timestamp) AS first_event_ts, 
                                            MAX(timestamp) AS last_event_ts
                                        FROM ({events_joiner.join(events_query_from)}) AS u
                                        GROUP BY 1"""
            else:
                events_query_part = f"""SELECT
                                        event_0.session_id,
                                        MIN(event_0.timestamp) AS first_event_ts,
                                        MAX(event_{event_index - 1}.timestamp) AS last_event_ts
                                    FROM {events_joiner.join(events_query_from)}
                                    GROUP BY 1"""
    else:
        data.events = []
    # ---------------------------------------------------------------------------
    if data.startDate is not None:
        extra_constraints.append("s.start_ts >= %(startDate)s")
    if data.endDate is not None:
        extra_constraints.append("s.start_ts <= %(endDate)s")
    # if data.platform is not None:
    #     if data.platform == schemas.PlatformType.mobile:
    #         extra_constraints.append(b"s.user_os in ('Android','BlackBerry OS','iOS','Tizen','Windows Phone')")
    #     elif data.platform == schemas.PlatformType.desktop:
    #         extra_constraints.append(
    #             b"s.user_os in ('Chrome OS','Fedora','Firefox OS','Linux','Mac OS X','Ubuntu','Windows')")

    if errors_only:
        extra_from += f" INNER JOIN {events.event_type.ERROR.table} AS er USING (session_id) INNER JOIN public.errors AS ser USING (error_id)"
        extra_constraints.append("ser.source = 'js_exception'")
        extra_constraints.append("ser.project_id = %(project_id)s")
        if error_status != schemas.ErrorStatus.all:
            extra_constraints.append("ser.status = %(error_status)s")
            full_args["error_status"] = error_status
        if favorite_only:
            extra_from += " INNER JOIN public.user_favorite_errors AS ufe USING (error_id)"
            extra_constraints.append("ufe.user_id = %(userId)s")
    # extra_constraints = [extra.decode('UTF-8') + "\n" for extra in extra_constraints]
    if favorite_only and not errors_only and user_id is not None:
        extra_from += """INNER JOIN (SELECT user_id, session_id
                                    FROM public.user_favorite_sessions
                                    WHERE user_id = %(userId)s) AS favorite_sessions
                                    USING (session_id)"""
    elif not favorite_only and not errors_only and user_id is not None:
        extra_from += """LEFT JOIN (SELECT user_id, session_id
                                    FROM public.user_favorite_sessions
                                    WHERE user_id = %(userId)s) AS favorite_sessions
                                    USING (session_id)"""
    extra_join = ""
    if issue is not None:
        extra_join = """
                INNER JOIN LATERAL(SELECT TRUE FROM events_common.issues INNER JOIN public.issues AS p_issues USING (issue_id)
                WHERE issues.session_id=f.session_id 
                    AND p_issues.type=%(issue_type)s 
                    AND p_issues.context_string=%(issue_contextString)s
                    AND timestamp >= f.first_event_ts
                    AND timestamp <= f.last_event_ts) AS issues ON(TRUE)
                """
        full_args["issue_contextString"] = issue["contextString"]
        full_args["issue_type"] = issue["type"]
    if extra_event:
        extra_join += f"""INNER JOIN {extra_event} AS ev USING(session_id)"""
        extra_constraints.append("ev.timestamp>=%(startDate)s")
        extra_constraints.append("ev.timestamp<=%(endDate)s")
    query_part = f"""\
                        FROM {f"({events_query_part}) AS f" if len(events_query_part) > 0 else "public.sessions AS s"}
                        {extra_join}
                        {"INNER JOIN public.sessions AS s USING(session_id)" if len(events_query_part) > 0 else ""}
                        {extra_from}
                        WHERE 
                          {" AND ".join(extra_constraints)}"""
    return full_args, query_part


def __get_event_type(event_type: Union[schemas.EventType, schemas.PerformanceEventType]):
    defs = {
        schemas.EventType.click: "CLICK",
        schemas.EventType.input: "INPUT",
        schemas.EventType.location: "LOCATION",
        schemas.PerformanceEventType.location_dom_complete: "LOCATION",
        schemas.PerformanceEventType.location_largest_contentful_paint_time: "LOCATION",
        schemas.PerformanceEventType.location_ttfb: "LOCATION",
        schemas.EventType.custom: "CUSTOM",
        schemas.EventType.request: "REQUEST",
        schemas.EventType.request_details: "REQUEST",
        schemas.PerformanceEventType.fetch_failed: "REQUEST",
        schemas.EventType.state_action: "STATEACTION",
        schemas.EventType.error: "ERROR",
        schemas.PerformanceEventType.location_avg_cpu_load: 'PERFORMANCE',
        schemas.PerformanceEventType.location_avg_memory_usage: 'PERFORMANCE',
    }

    if event_type not in defs:
        raise Exception(f"unsupported event_type:{event_type}")
    return defs.get(event_type)


def search_query_parts_ch(data, error_status, errors_only, favorite_only, issue, project_id, user_id, extra_event=None):
    ss_constraints = []
    full_args = {"project_id": project_id, "startDate": data.startDate, "endDate": data.endDate,
                 "projectId": project_id, "userId": user_id}

    MAIN_EVENTS_TABLE = "final.events"
    MAIN_SESSIONS_TABLE = "final.sessions"
    if data.startDate >= TimeUTC.now(delta_days=-7):
        MAIN_EVENTS_TABLE = "final.events_l7d_mv"
        MAIN_SESSIONS_TABLE = "final.sessions_l7d_mv"

    extra_constraints = [
        "s.project_id = %(project_id)s",
        "isNotNull(s.duration)"
    ]
    if favorite_only:
        extra_constraints.append("""s.session_id IN (SELECT session_id
                                                        FROM final.user_favorite_sessions
                                                        WHERE user_id = %(userId)s)""")
    extra_from = ""
    events_query_part = ""
    __events_where_basic = ["project_id = %(projectId)s",
                            "datetime >= toDateTime(%(startDate)s/1000)",
                            "datetime <= toDateTime(%(endDate)s/1000)"]
    events_conditions_where = ["main.project_id = %(projectId)s",
                               "main.datetime >= toDateTime(%(startDate)s/1000)",
                               "main.datetime <= toDateTime(%(endDate)s/1000)"]
    if len(data.filters) > 0:
        meta_keys = None
        # to reduce include a sub-query of sessions inside events query, in order to reduce the selected data
        include_in_events = False
        for i, f in enumerate(data.filters):
            if not isinstance(f.value, list):
                f.value = [f.value]
            filter_type = f.type
            f.value = helper.values_for_operator(value=f.value, op=f.operator)
            f_k = f"f_value{i}"
            full_args = {**full_args, f_k: f.value, **_multiple_values(f.value, value_key=f_k)}
            op = __get_sql_operator(f.operator) \
                if filter_type not in [schemas.FilterType.events_count] else f.operator
            is_any = _isAny_opreator(f.operator)
            is_undefined = _isUndefined_operator(f.operator)
            if not is_any and not is_undefined and len(f.value) == 0:
                continue
            is_not = False
            if __is_negation_operator(f.operator):
                is_not = True
            if filter_type == schemas.FilterType.user_browser:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_browser)')
                    ss_constraints.append('isNotNull(ms.user_browser)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.user_os, schemas.FilterType.user_os_ios]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_os)')
                    ss_constraints.append('isNotNull(ms.user_os)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.user_device, schemas.FilterType.user_device_ios]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_device)')
                    ss_constraints.append('isNotNull(ms.user_device)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.user_country, schemas.FilterType.user_country_ios]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_country)')
                    ss_constraints.append('isNotNull(ms.user_country)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.utm_source]:
                if is_any:
                    extra_constraints.append('isNotNull(s.utm_source)')
                    ss_constraints.append('isNotNull(ms.utm_source)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.utm_source)')
                    ss_constraints.append('isNull(ms.utm_source)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.utm_source {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_source {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type in [schemas.FilterType.utm_medium]:
                if is_any:
                    extra_constraints.append('isNotNull(s.utm_medium)')
                    ss_constraints.append('isNotNull(ms.utm_medium)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.utm_medium)')
                    ss_constraints.append('isNull(ms.utm_medium')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.utm_medium {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_medium {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type in [schemas.FilterType.utm_campaign]:
                if is_any:
                    extra_constraints.append('isNotNull(s.utm_campaign)')
                    ss_constraints.append('isNotNull(ms.utm_campaign)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.utm_campaign)')
                    ss_constraints.append('isNull(ms.utm_campaign)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.utm_campaign {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_campaign {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))

            elif filter_type == schemas.FilterType.duration:
                if len(f.value) > 0 and f.value[0] is not None:
                    extra_constraints.append("s.duration >= %(minDuration)s")
                    ss_constraints.append("ms.duration >= %(minDuration)s")
                    full_args["minDuration"] = f.value[0]
                if len(f.value) > 1 and f.value[1] is not None and int(f.value[1]) > 0:
                    extra_constraints.append("s.duration <= %(maxDuration)s")
                    ss_constraints.append("ms.duration <= %(maxDuration)s")
                    full_args["maxDuration"] = f.value[1]
            elif filter_type == schemas.FilterType.referrer:
                # extra_from += f"INNER JOIN {events.event_type.LOCATION.table} AS p USING(session_id)"
                if is_any:
                    referrer_constraint = 'isNotNull(r.base_referrer)'
                else:
                    referrer_constraint = _multiple_conditions(f"r.base_referrer {op} %({f_k})s", f.value,
                                                               is_not=is_not, value_key=f_k)
                referrer_constraint = f"""(SELECT DISTINCT session_id
                                                  FROM {MAIN_EVENTS_TABLE} AS r
                                                  WHERE {" AND ".join([f"r.{b}" for b in __events_where_basic])}
                                                    AND event_type='{__get_event_type(schemas.EventType.location)}'
                                                    AND {referrer_constraint})"""
                # events_conditions_where.append(f"""main.session_id IN {referrer_constraint}""")
                # extra_constraints.append(f"""s.session_id IN {referrer_constraint}""")
                extra_from += f"\nINNER JOIN {referrer_constraint} AS referred ON(referred.session_id=s.session_id)"
            elif filter_type == events.event_type.METADATA.ui_type:
                # get metadata list only if you need it
                if meta_keys is None:
                    meta_keys = metadata.get(project_id=project_id)
                    meta_keys = {m["key"]: m["index"] for m in meta_keys}
                if f.source in meta_keys.keys():
                    if is_any:
                        extra_constraints.append(f"isNotNull(s.{metadata.index_to_colname(meta_keys[f.source])})")
                        ss_constraints.append(f"isNotNull(ms.{metadata.index_to_colname(meta_keys[f.source])})")
                    elif is_undefined:
                        extra_constraints.append(f"isNull(s.{metadata.index_to_colname(meta_keys[f.source])})")
                        ss_constraints.append(f"isNull(ms.{metadata.index_to_colname(meta_keys[f.source])})")
                    else:
                        extra_constraints.append(
                            _multiple_conditions(
                                f"s.{metadata.index_to_colname(meta_keys[f.source])} {op} toString(%({f_k})s)",
                                f.value, is_not=is_not, value_key=f_k))
                        ss_constraints.append(
                            _multiple_conditions(
                                f"ms.{metadata.index_to_colname(meta_keys[f.source])} {op} toString(%({f_k})s)",
                                f.value, is_not=is_not, value_key=f_k))
            elif filter_type in [schemas.FilterType.user_id, schemas.FilterType.user_id_ios]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_id)')
                    ss_constraints.append('isNotNull(ms.user_id)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.user_id)')
                    ss_constraints.append('isNull(ms.user_id)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f"s.user_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"ms.user_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type in [schemas.FilterType.user_anonymous_id,
                                 schemas.FilterType.user_anonymous_id_ios]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_anonymous_id)')
                    ss_constraints.append('isNotNull(ms.user_anonymous_id)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.user_anonymous_id)')
                    ss_constraints.append('isNull(ms.user_anonymous_id)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f"s.user_anonymous_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"ms.user_anonymous_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type in [schemas.FilterType.rev_id, schemas.FilterType.rev_id_ios]:
                if is_any:
                    extra_constraints.append('isNotNull(s.rev_id)')
                    ss_constraints.append('isNotNull(ms.rev_id)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.rev_id)')
                    ss_constraints.append('isNull(ms.rev_id)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f"s.rev_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"ms.rev_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type == schemas.FilterType.platform:
                # op = __get_sql_operator(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f"s.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"ms.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
            elif filter_type == schemas.FilterType.issue:
                if is_any:
                    extra_constraints.append("notEmpty(s.issue_types)")
                    ss_constraints.append("notEmpty(ms.issue_types)")
                else:
                    extra_constraints.append(f"hasAny(s.issue_types,%({f_k})s)")
                    # _multiple_conditions(f"%({f_k})s {op} ANY (s.issue_types)", f.value, is_not=is_not,
                    #                      value_key=f_k))
                    ss_constraints.append(f"hasAny(ms.issue_types,%({f_k})s)")
                    #     _multiple_conditions(f"%({f_k})s {op} ANY (ms.issue_types)", f.value, is_not=is_not,
                    #                          value_key=f_k))
                    if is_not:
                        extra_constraints[-1] = f"not({extra_constraints[-1]})"
                        ss_constraints[-1] = f"not({ss_constraints[-1]})"
            elif filter_type == schemas.FilterType.events_count:
                extra_constraints.append(
                    _multiple_conditions(f"s.events_count {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"ms.events_count {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
            else:
                continue
            include_in_events = True

        if include_in_events:
            events_conditions_where.append(f"""main.session_id IN (SELECT s.session_id 
                                                FROM {MAIN_SESSIONS_TABLE} AS s
                                                WHERE {" AND ".join(extra_constraints)})""")
    # ---------------------------------------------------------------------------
    events_extra_join = ""
    if len(data.events) > 0:
        valid_events_count = 0
        for event in data.events:
            is_any = _isAny_opreator(event.operator)
            if not isinstance(event.value, list):
                event.value = [event.value]
            if __is_valid_event(is_any=is_any, event=event):
                valid_events_count += 1
        events_query_from = []
        events_conditions = []
        events_conditions_not = []
        event_index = 0
        or_events = data.events_order == schemas.SearchEventOrder._or
        # events_joiner = " UNION " if or_events else " INNER JOIN LATERAL "
        for i, event in enumerate(data.events):
            event_type = event.type
            is_any = _isAny_opreator(event.operator)
            if not isinstance(event.value, list):
                event.value = [event.value]
            if not __is_valid_event(is_any=is_any, event=event):
                continue
            op = __get_sql_operator(event.operator)
            is_not = False
            if __is_negation_operator(event.operator):
                is_not = True
                op = __reverse_sql_operator(op)
            # if event_index == 0 or or_events:
            # event_from = f"%s INNER JOIN {MAIN_SESSIONS_TABLE} AS ms USING (session_id)"
            event_from = "%s"
            event_where = ["main.project_id = %(projectId)s",
                           "main.datetime >= toDateTime(%(startDate)s/1000)",
                           "main.datetime <= toDateTime(%(endDate)s/1000)"]
            if favorite_only and not errors_only:
                event_from += "INNER JOIN final.user_favorite_sessions AS fs USING(session_id)"
                event_where.append("fs.user_id = %(userId)s")
            # else:
            #     event_from = "%s"
            #     event_where = ["main.datetime >= toDateTime(%(startDate)s/1000)",
            #                    "main.datetime <= toDateTime(%(endDate)s/1000)",
            #                    "main.session_id=event_0.session_id"]
            #     if data.events_order == schemas.SearchEventOrder._then:
            #         event_where.append(f"event_{event_index - 1}.datetime <= main.datetime")
            e_k = f"e_value{i}"
            s_k = e_k + "_source"
            if event.type != schemas.PerformanceEventType.time_between_events:
                event.value = helper.values_for_operator(value=event.value, op=event.operator)
                full_args = {**full_args,
                             **_multiple_values(event.value, value_key=e_k),
                             **_multiple_values(event.source, value_key=s_k)}

            if event_type == events.event_type.CLICK.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = events.event_type.CLICK.column
                event_where.append(f"main.event_type='{__get_event_type(event_type)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append({"type": f"sub.event_type='{__get_event_type(event_type)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]

            elif event_type == events.event_type.INPUT.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = events.event_type.INPUT.column
                event_where.append(f"main.event_type='{__get_event_type(event_type)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append({"type": f"sub.event_type='{__get_event_type(event_type)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
                if event.source is not None and len(event.source) > 0:
                    event_where.append(_multiple_conditions(f"main.value ILIKE %(custom{i})s", event.source,
                                                            value_key=f"custom{i}"))
                    full_args = {**full_args, **_multiple_values(event.source, value_key=f"custom{i}")}

            elif event_type == events.event_type.LOCATION.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = events.event_type.LOCATION.column
                event_where.append(f"main.event_type='{__get_event_type(event_type)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append({"type": f"sub.event_type='{__get_event_type(event_type)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s",
                                                                event.value, value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.event_type.CUSTOM.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = events.event_type.CUSTOM.column
                event_where.append(f"main.event_type='{__get_event_type(event_type)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append({"type": f"sub.event_type='{__get_event_type(event_type)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.event_type.REQUEST.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = events.event_type.REQUEST.column
                event_where.append(f"main.event_type='{__get_event_type(event_type)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append({"type": f"sub.event_type='{__get_event_type(event_type)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            # elif event_type == events.event_type.GRAPHQL.ui_type:
            #     event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main"
            #     event_where.append(f"main.event_type='GRAPHQL'")
            #     events_conditions.append({"type": event_where[-1]})
            #     if not is_any:
            #         event_where.append(
            #             _multiple_conditions(f"main.{events.event_type.GRAPHQL.column} {op} %({e_k})s", event.value,
            #                                  value_key=e_k))
            #         events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.event_type.STATEACTION.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = events.event_type.STATEACTION.column
                event_where.append(f"main.event_type='{__get_event_type(event_type)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append({"type": f"sub.event_type='{__get_event_type(event_type)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s",
                                                                event.value, value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            # TODO: isNot for ERROR
            elif event_type == events.event_type.ERROR.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main"
                events_extra_join = "SELECT * FROM final.errors AS main1 WHERE main1.project_id=%(project_id)s"
                event_where.append(f"main.event_type='{__get_event_type(event_type)}'")
                events_conditions.append({"type": event_where[-1]})
                event.source = tuple(event.source)
                events_conditions[-1]["condition"] = []
                if not is_any and event.value not in [None, "*", ""]:
                    event_where.append(
                        _multiple_conditions(f"(main1.message {op} %({e_k})s OR main1.name {op} %({e_k})s)",
                                             event.value, value_key=e_k))
                    events_conditions[-1]["condition"].append(event_where[-1])
                    events_extra_join += f" AND {event_where[-1]}"
                if len(event.source) > 0 and event.source[0] not in [None, "*", ""]:
                    event_where.append(_multiple_conditions(f"main1.source = %({s_k})s", event.source, value_key=s_k))
                    events_conditions[-1]["condition"].append(event_where[-1])
                    events_extra_join += f" AND {event_where[-1]}"

                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])

            elif event_type == schemas.PerformanceEventType.fetch_failed:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = events.event_type.REQUEST.column
                event_where.append(f"main.event_type='{__get_event_type(event_type)}'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append({"type": f"sub.event_type='{__get_event_type(event_type)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s",
                                                                event.value, value_key=e_k))
                        events_conditions[-1]["condition"].append(event_where[-1])
                col = performance_event.get_col(event_type)
                colname = col["column"]
                event_where.append(f"main.{colname} = 0")
                events_conditions[-1]["condition"].append(event_where[-1])
                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])

            # elif event_type == schemas.PerformanceEventType.fetch_duration:
            #     event_from = event_from % f"{events.event_type.REQUEST.table} AS main "
            #     if not is_any:
            #         event_where.append(
            #             _multiple_conditions(f"main.{events.event_type.REQUEST.column} {op} %({e_k})s",
            #                                  event.value, value_key=e_k))
            #     col = performance_event.get_col(event_type)
            #     colname = col["column"]
            #     tname = "main"
            #     e_k += "_custom"
            #     full_args = {**full_args, **_multiple_values(event.source, value_key=e_k)}
            #     event_where.append(f"{tname}.{colname} IS NOT NULL AND {tname}.{colname}>0 AND " +
            #                        _multiple_conditions(f"{tname}.{colname} {event.sourceOperator} %({e_k})s",
            #                                             event.source, value_key=e_k))
            # TODO: isNot for PerformanceEvent
            elif event_type in [schemas.PerformanceEventType.location_dom_complete,
                                schemas.PerformanceEventType.location_largest_contentful_paint_time,
                                schemas.PerformanceEventType.location_ttfb]:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                event_where.append(f"main.event_type='{__get_event_type(event_type)}'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                col = performance_event.get_col(event_type)
                colname = col["column"]
                tname = "main"
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.LOCATION.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
                    events_conditions[-1]["condition"].append(event_where[-1])
                e_k += "_custom"
                full_args = {**full_args, **_multiple_values(event.source, value_key=e_k)}

                event_where.append(f"isNotNull({tname}.{colname}) AND {tname}.{colname}>0 AND " +
                                   _multiple_conditions(f"{tname}.{colname} {event.sourceOperator} %({e_k})s",
                                                        event.source, value_key=e_k))
                events_conditions[-1]["condition"].append(event_where[-1])
                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])
            # TODO: isNot for PerformanceEvent
            elif event_type in [schemas.PerformanceEventType.location_avg_cpu_load,
                                schemas.PerformanceEventType.location_avg_memory_usage]:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                event_where.append(f"main.event_type='{__get_event_type(event_type)}'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                col = performance_event.get_col(event_type)
                colname = col["column"]
                tname = "main"
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.{events.event_type.LOCATION.column} {op} %({e_k})s",
                                             event.value, value_key=e_k))
                    events_conditions[-1]["condition"].append(event_where[-1])
                e_k += "_custom"
                full_args = {**full_args, **_multiple_values(event.source, value_key=e_k)}

                event_where.append(f"isNotNull({tname}.{colname}) AND {tname}.{colname}>0 AND " +
                                   _multiple_conditions(f"{tname}.{colname} {event.sourceOperator} %({e_k})s",
                                                        event.source, value_key=e_k))
                events_conditions[-1]["condition"].append(event_where[-1])
                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])
            # TODO: no isNot for TimeBetweenEvents
            elif event_type == schemas.PerformanceEventType.time_between_events:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                # event_from = event_from % f"{getattr(events.event_type, event.value[0].type).table} AS main INNER JOIN {getattr(events.event_type, event.value[1].type).table} AS main2 USING(session_id) "
                event_where.append(f"main.event_type='{__get_event_type(event.value[0].type)}'")
                events_conditions.append({"type": event_where[-1]})
                event_where.append(f"main.event_type='{__get_event_type(event.value[0].type)}'")
                events_conditions.append({"type": event_where[-1]})

                if not isinstance(event.value[0].value, list):
                    event.value[0].value = [event.value[0].value]
                if not isinstance(event.value[1].value, list):
                    event.value[1].value = [event.value[1].value]
                event.value[0].value = helper.values_for_operator(value=event.value[0].value,
                                                                  op=event.value[0].operator)
                event.value[1].value = helper.values_for_operator(value=event.value[1].value,
                                                                  op=event.value[0].operator)
                e_k1 = e_k + "_e1"
                e_k2 = e_k + "_e2"
                full_args = {**full_args,
                             **_multiple_values(event.value[0].value, value_key=e_k1),
                             **_multiple_values(event.value[1].value, value_key=e_k2)}
                s_op = __get_sql_operator(event.value[0].operator)
                # event_where += ["main2.timestamp >= %(startDate)s", "main2.timestamp <= %(endDate)s"]
                # if event_index > 0 and not or_events:
                #     event_where.append("main2.session_id=event_0.session_id")
                is_any = _isAny_opreator(event.value[0].operator)
                if not is_any:
                    event_where.append(
                        _multiple_conditions(
                            f"main.{getattr(events.event_type, event.value[0].type).column} {s_op} %({e_k1})s",
                            event.value[0].value, value_key=e_k1))
                    events_conditions[-2]["condition"] = event_where[-1]
                s_op = __get_sql_operator(event.value[1].operator)
                is_any = _isAny_opreator(event.value[1].operator)
                if not is_any:
                    event_where.append(
                        _multiple_conditions(
                            f"main.{getattr(events.event_type, event.value[1].type).column} {s_op} %({e_k2})s",
                            event.value[1].value, value_key=e_k2))
                    events_conditions[-1]["condition"] = event_where[-1]

                e_k += "_custom"
                full_args = {**full_args, **_multiple_values(event.source, value_key=e_k)}
                # event_where.append(
                #     _multiple_conditions(f"main2.timestamp - main.timestamp {event.sourceOperator} %({e_k})s",
                #                          event.source, value_key=e_k))
                # events_conditions[-2]["time"] = f"(?t{event.sourceOperator} %({e_k})s)"
                events_conditions[-2]["time"] = _multiple_conditions(f"?t{event.sourceOperator}%({e_k})s", event.source,
                                                                     value_key=e_k)
                event_index += 1
            # TODO: no isNot for RequestDetails
            elif event_type == schemas.EventType.request_details:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                event_where.append(f"main.event_type='{__get_event_type(event_type)}'")
                events_conditions.append({"type": event_where[-1]})
                apply = False
                events_conditions[-1]["condition"] = []
                for j, f in enumerate(event.filters):
                    is_any = _isAny_opreator(f.operator)
                    if is_any or len(f.value) == 0:
                        continue
                    f.value = helper.values_for_operator(value=f.value, op=f.operator)
                    op = __get_sql_operator(f.operator)
                    e_k_f = e_k + f"_fetch{j}"
                    full_args = {**full_args, **_multiple_values(f.value, value_key=e_k_f)}
                    if f.type == schemas.FetchFilterType._url:
                        event_where.append(
                            _multiple_conditions(f"main.{events.event_type.REQUEST.column} {op} %({e_k_f})s", f.value,
                                                 value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType._status_code:
                        event_where.append(
                            _multiple_conditions(f"main.status {f.operator} %({e_k_f})s", f.value,
                                                 value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType._method:
                        event_where.append(
                            _multiple_conditions(f"main.method {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType._duration:
                        event_where.append(
                            _multiple_conditions(f"main.duration {f.operator} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType._request_body:
                        event_where.append(
                            _multiple_conditions(f"main.request_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType._response_body:
                        event_where.append(
                            _multiple_conditions(f"main.response_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    else:
                        print(f"undefined FETCH filter: {f.type}")
                if not apply:
                    continue
                else:
                    events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])
            # TODO: no isNot for GraphQL
            elif event_type == schemas.EventType.graphql:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                event_where.append(f"main.event_type='GRAPHQL'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                for j, f in enumerate(event.filters):
                    is_any = _isAny_opreator(f.operator)
                    if is_any or len(f.value) == 0:
                        continue
                    f.value = helper.values_for_operator(value=f.value, op=f.operator)
                    op = __get_sql_operator(f.operator)
                    e_k_f = e_k + f"_graphql{j}"
                    full_args = {**full_args, **_multiple_values(f.value, value_key=e_k_f)}
                    if f.type == schemas.GraphqlFilterType._name:
                        event_where.append(
                            _multiple_conditions(f"main.{events.event_type.GRAPHQL.column} {op} %({e_k_f})s", f.value,
                                                 value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                    elif f.type == schemas.GraphqlFilterType._method:
                        event_where.append(
                            _multiple_conditions(f"main.method {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                    elif f.type == schemas.GraphqlFilterType._request_body:
                        event_where.append(
                            _multiple_conditions(f"main.request_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                    elif f.type == schemas.GraphqlFilterType._response_body:
                        event_where.append(
                            _multiple_conditions(f"main.response_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                    else:
                        print(f"undefined GRAPHQL filter: {f.type}")
                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])
            else:
                continue
            if event_index == 0 or or_events:
                event_where += ss_constraints
            if is_not:
                if event_index == 0 or or_events:
                    events_query_from.append(f"""\
                                    (SELECT
                                        session_id, 
                                        0 AS timestamp
                                      FROM sessions
                                      WHERE EXISTS(SELECT session_id 
                                                    FROM {event_from} 
                                                    WHERE {" AND ".join(event_where)} 
                                                        AND sessions.session_id=ms.session_id) IS FALSE
                                        AND project_id = %(projectId)s 
                                        AND start_ts >= %(startDate)s
                                        AND start_ts <= %(endDate)s
                                        AND duration IS NOT NULL
                                    ) {"" if or_events else (f"AS event_{event_index}" + ("ON(TRUE)" if event_index > 0 else ""))}\
                                    """)
                else:
                    events_query_from.append(f"""\
            (SELECT
                event_0.session_id, 
                event_{event_index - 1}.timestamp AS timestamp
              WHERE EXISTS(SELECT session_id FROM {event_from} WHERE {" AND ".join(event_where)}) IS FALSE
            ) AS event_{event_index} {"ON(TRUE)" if event_index > 0 else ""}\
            """)
            else:
                if data.events_order == schemas.SearchEventOrder._then:
                    pass
                else:
                    events_query_from.append(f"""\
            (SELECT main.session_id, {"MIN" if event_index < (valid_events_count - 1) else "MAX"}(main.datetime) AS datetime
              FROM {event_from}
              WHERE {" AND ".join(event_where)}
              GROUP BY session_id
            ) {"" if or_events else (f"AS event_{event_index} " + ("ON(TRUE)" if event_index > 0 else ""))}\
            """)
            event_index += 1

        if event_index < 2:
            data.events_order = schemas.SearchEventOrder._or
        if len(events_extra_join) > 0:
            if event_index < 2:
                events_extra_join = f"INNER JOIN ({events_extra_join}) AS main1 USING(error_id)"
            else:
                events_extra_join = f"LEFT JOIN ({events_extra_join}) AS main1 USING(error_id)"
        if favorite_only and user_id is not None:
            events_conditions_where.append("""main.session_id IN (SELECT session_id
                                                        FROM final.user_favorite_sessions
                                                        WHERE user_id = %(userId)s)""")

        if data.events_order in [schemas.SearchEventOrder._then, schemas.SearchEventOrder._and]:
            sequence_pattern = [f'(?{i + 1}){c.get("time", "")}' for i, c in enumerate(events_conditions)]
            sub_join = ""
            type_conditions = []
            value_conditions = []
            _value_conditions = []
            sequence_conditions = []
            for c in events_conditions:
                if c['type'] not in type_conditions:
                    type_conditions.append(c['type'])

                if c.get('condition') \
                        and c['condition'] not in value_conditions \
                        and c['condition'] % full_args not in _value_conditions:
                    value_conditions.append(c['condition'])
                    _value_conditions.append(c['condition'] % full_args)

                sequence_conditions.append(c['type'])
                if c.get('condition'):
                    sequence_conditions[-1] += " AND " + c["condition"]

            del _value_conditions
            events_conditions_where.append(f"({' OR '.join([c for c in type_conditions])})")
            del type_conditions
            if len(value_conditions) > 0:
                events_conditions_where.append(f"({' OR '.join([c for c in value_conditions])})")
            del value_conditions
            if len(events_conditions_not) > 0:
                _value_conditions_not = []
                value_conditions_not = []
                for c in events_conditions_not:
                    p = f"{c['type']} AND {c['condition']}"
                    _p = p % full_args
                    if _p not in _value_conditions_not:
                        _value_conditions_not.append(_p)
                        value_conditions_not.append(p)
                value_conditions_not = [f"sub.{c}" for c in __events_where_basic] + value_conditions_not
                sub_join = f"""LEFT ANTI JOIN ( SELECT DISTINCT sub.session_id
                                    FROM {MAIN_EVENTS_TABLE} AS sub
                                    WHERE {' AND '.join([c for c in value_conditions_not])}) AS sub USING(session_id)"""
                del _value_conditions_not
                del value_conditions_not

            if data.events_order == schemas.SearchEventOrder._then:
                having = f"""HAVING sequenceMatch('{''.join(sequence_pattern)}')(main.datetime,{','.join(sequence_conditions)})"""
            else:
                having = f"""HAVING {" AND ".join([f"countIf({c})>0" for c in list(set(sequence_conditions))])}"""

            events_query_part = f"""SELECT main.session_id,
                                        MIN(main.datetime) AS first_event_ts,
                                        MAX(main.datetime) AS last_event_ts
                                    FROM {MAIN_EVENTS_TABLE} AS main {events_extra_join}
                                        {sub_join}
                                    WHERE {" AND ".join(events_conditions_where)}
                                    GROUP BY session_id
                                    {having}"""
        else:
            print(">>>>> OR EVENTS")
            type_conditions = []
            sequence_conditions = []
            has_values = False
            for c in events_conditions:
                if c['type'] not in type_conditions:
                    type_conditions.append(c['type'])

                sequence_conditions.append(c['type'])
                if c.get('condition'):
                    has_values = True
                    sequence_conditions[-1] += " AND " + c["condition"]

            events_conditions_where.append(f"({' OR '.join([c for c in type_conditions])})")

            if len(events_conditions_not) > 0:
                has_values = True
                _value_conditions_not = []
                value_conditions_not = []
                for c in events_conditions_not:
                    p = f"{c['type']} AND not({c['condition']})".replace("sub.", "main.")
                    _p = p % full_args
                    if _p not in _value_conditions_not:
                        _value_conditions_not.append(_p)
                        value_conditions_not.append(p)
                del _value_conditions_not
                sequence_conditions += value_conditions_not

            if has_values:
                events_conditions = [c for c in list(set(sequence_conditions))]
                events_conditions_where.append(f"({' OR '.join(events_conditions)})")
            events_query_part = f"""SELECT main.session_id,
                                        MIN(main.datetime) AS first_event_ts,
                                        MAX(main.datetime) AS last_event_ts
                                    FROM {MAIN_EVENTS_TABLE} AS main {events_extra_join}
                                    WHERE {" AND ".join(events_conditions_where)}
                                    GROUP BY session_id"""
    else:
        data.events = []
    # ---------------------------------------------------------------------------
    if data.startDate is not None:
        extra_constraints.append("s.datetime >= toDateTime(%(startDate)s/1000)")
    if data.endDate is not None:
        extra_constraints.append("s.datetime <= toDateTime(%(endDate)s/1000)")
    # if data.platform is not None:
    #     if data.platform == schemas.PlatformType.mobile:
    #         extra_constraints.append(b"s.user_os in ('Android','BlackBerry OS','iOS','Tizen','Windows Phone')")
    #     elif data.platform == schemas.PlatformType.desktop:
    #         extra_constraints.append(
    #             b"s.user_os in ('Chrome OS','Fedora','Firefox OS','Linux','Mac OS X','Ubuntu','Windows')")

    if errors_only:
        extra_from += f" INNER JOIN {events.event_type.ERROR.table} AS er USING (session_id) INNER JOIN public.errors AS ser USING (error_id)"
        extra_constraints.append("ser.source = 'js_exception'")
        extra_constraints.append("ser.project_id = %(project_id)s")
        if error_status != schemas.ErrorStatus.all:
            extra_constraints.append("ser.status = %(error_status)s")
            full_args["error_status"] = error_status
        if favorite_only:
            extra_from += " INNER JOIN final.user_favorite_errors AS ufe USING (error_id)"
            extra_constraints.append("ufe.user_id = %(userId)s")
    # extra_constraints = [extra.decode('UTF-8') + "\n" for extra in extra_constraints]
    if favorite_only and not errors_only and user_id is not None:
        extra_from += """INNER JOIN (SELECT 1 AS session_id) AS favorite_sessions
                                ON (TRUE)"""
    elif not favorite_only and not errors_only and user_id is not None:
        extra_from += """LEFT JOIN (SELECT session_id
                                    FROM final.user_favorite_sessions
                                    WHERE user_id = %(userId)s) AS favorite_sessions
                                    ON (s.session_id=favorite_sessions.session_id)"""
    extra_join = ""
    if issue is not None:
        extra_join = """
                INNER JOIN LATERAL(SELECT TRUE FROM events_common.issues INNER JOIN public.issues AS p_issues USING (issue_id)
                WHERE issues.session_id=f.session_id 
                    AND p_issues.type=%(issue_type)s 
                    AND p_issues.context_string=%(issue_contextString)s
                    AND timestamp >= f.first_event_ts
                    AND timestamp <= f.last_event_ts) AS issues ON(TRUE)
                """
        full_args["issue_contextString"] = issue["contextString"]
        full_args["issue_type"] = issue["type"]
    if extra_event:
        extra_join += f"""INNER JOIN {extra_event} AS ev USING(session_id)"""
        extra_constraints.append("ev.timestamp>=%(startDate)s")
        extra_constraints.append("ev.timestamp<=%(endDate)s")
    if len(events_query_part) > 0:
        extra_join += f"""INNER JOIN (SELECT * 
                                FROM {MAIN_SESSIONS_TABLE} AS s 
                                WHERE {" AND ".join(extra_constraints)}) AS s ON(s.session_id=f.session_id)"""
    else:
        extra_join += f"""(SELECT * 
                            FROM {MAIN_SESSIONS_TABLE} AS s 
                            WHERE {" AND ".join(extra_constraints)}) AS s"""
    query_part = f"""\
                        FROM {f"({events_query_part}) AS f" if len(events_query_part) > 0 else ""}
                        {extra_join}
                        {extra_from}
                        """
    return full_args, query_part


def search_by_metadata(tenant_id, user_id, m_key, m_value, project_id=None):
    if project_id is None:
        all_projects = projects.get_projects(tenant_id=tenant_id, recording_state=False)
    else:
        all_projects = [
            projects.get_project(tenant_id=tenant_id, project_id=int(project_id), include_last_session=False,
                                 include_gdpr=False)]

    all_projects = {int(p["projectId"]): p["name"] for p in all_projects}
    project_ids = list(all_projects.keys())

    available_keys = metadata.get_keys_by_projects(project_ids)
    for i in available_keys:
        available_keys[i]["user_id"] = schemas.FilterType.user_id
        available_keys[i]["user_anonymous_id"] = schemas.FilterType.user_anonymous_id
    results = {}
    for i in project_ids:
        if m_key not in available_keys[i].values():
            available_keys.pop(i)
            results[i] = {"total": 0, "sessions": [], "missingMetadata": True}
    project_ids = list(available_keys.keys())
    if len(project_ids) > 0:
        with pg_client.PostgresClient() as cur:
            sub_queries = []
            for i in project_ids:
                col_name = list(available_keys[i].keys())[list(available_keys[i].values()).index(m_key)]
                sub_queries.append(cur.mogrify(
                    f"(SELECT COALESCE(COUNT(s.*)) AS count FROM public.sessions AS s WHERE s.project_id = %(id)s AND s.{col_name} = %(value)s) AS \"{i}\"",
                    {"id": i, "value": m_value}).decode('UTF-8'))
            query = f"""SELECT {", ".join(sub_queries)};"""
            cur.execute(query=query)

            rows = cur.fetchone()

            sub_queries = []
            for i in rows.keys():
                results[i] = {"total": rows[i], "sessions": [], "missingMetadata": False, "name": all_projects[int(i)]}
                if rows[i] > 0:
                    col_name = list(available_keys[int(i)].keys())[list(available_keys[int(i)].values()).index(m_key)]
                    sub_queries.append(
                        cur.mogrify(
                            f"""(
                                    SELECT *
                                    FROM (
                                            SELECT DISTINCT ON(favorite_sessions.session_id, s.session_id) {SESSION_PROJECTION_COLS}
                                            FROM public.sessions AS s LEFT JOIN (SELECT session_id
                                                                                    FROM public.user_favorite_sessions
                                                                                    WHERE user_favorite_sessions.user_id = %(userId)s
                                                                                ) AS favorite_sessions USING (session_id)
                                            WHERE s.project_id = %(id)s AND s.duration IS NOT NULL AND s.{col_name} = %(value)s
                                        ) AS full_sessions
                                    ORDER BY favorite DESC, issue_score DESC
                                    LIMIT 10
                                )""",
                            {"id": i, "value": m_value, "userId": user_id}).decode('UTF-8'))
            if len(sub_queries) > 0:
                cur.execute("\nUNION\n".join(sub_queries))
                rows = cur.fetchall()
                for i in rows:
                    results[str(i["project_id"])]["sessions"].append(helper.dict_to_camel_case(i))
    return results


def search_by_issue(user_id, issue, project_id, start_date, end_date):
    constraints = ["s.project_id = %(projectId)s",
                   "p_issues.context_string = %(issueContextString)s",
                   "p_issues.type = %(issueType)s"]
    if start_date is not None:
        constraints.append("start_ts >= %(startDate)s")
    if end_date is not None:
        constraints.append("start_ts <= %(endDate)s")
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT DISTINCT ON(favorite_sessions.session_id, s.session_id) {SESSION_PROJECTION_COLS}
            FROM public.sessions AS s
                                INNER JOIN events_common.issues USING (session_id)
                                INNER JOIN public.issues AS p_issues USING (issue_id)
                                LEFT JOIN (SELECT user_id, session_id
                                            FROM public.user_favorite_sessions
                                            WHERE user_id = %(userId)s) AS favorite_sessions
                                           USING (session_id)
            WHERE {" AND ".join(constraints)}
            ORDER BY s.session_id DESC;""",
                {
                    "issueContextString": issue["contextString"],
                    "issueType": issue["type"], "userId": user_id,
                    "projectId": project_id,
                    "startDate": start_date,
                    "endDate": end_date
                }))

        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)


def get_user_sessions(project_id, user_id, start_date, end_date):
    with pg_client.PostgresClient() as cur:
        constraints = ["s.project_id = %(projectId)s", "s.user_id = %(userId)s"]
        if start_date is not None:
            constraints.append("s.start_ts >= %(startDate)s")
        if end_date is not None:
            constraints.append("s.start_ts <= %(endDate)s")

        query_part = f"""\
            FROM public.sessions AS s
            WHERE {" AND ".join(constraints)}"""

        cur.execute(cur.mogrify(f"""\
                    SELECT s.project_id,
                           s.session_id::text AS session_id,
                           s.user_uuid,
                           s.user_id,
                           s.user_os,
                           s.user_browser,
                           s.user_device,
                           s.user_country,
                           s.start_ts,
                           s.duration,
                           s.events_count,
                           s.pages_count,
                           s.errors_count
                    {query_part}
                    ORDER BY s.session_id         
                    LIMIT 50;""", {
            "projectId": project_id,
            "userId": user_id,
            "startDate": start_date,
            "endDate": end_date
        }))

        sessions = cur.fetchall()
    return helper.list_to_camel_case(sessions)


def get_session_user(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """\
            SELECT
                user_id,
                count(*) as session_count,	
                max(start_ts) as last_seen,
                min(start_ts) as first_seen
            FROM
                "public".sessions
            WHERE
                project_id = %(project_id)s
                AND user_id = %(userId)s
                AND duration is not null
            GROUP BY user_id;
            """,
            {"project_id": project_id, "userId": user_id}
        )
        cur.execute(query=query)
        data = cur.fetchone()
    return helper.dict_to_camel_case(data)


def get_session_ids_by_user_ids(project_id, user_ids):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """\
            SELECT session_id FROM public.sessions
            WHERE
                project_id = %(project_id)s AND user_id IN %(userId)s;""",
            {"project_id": project_id, "userId": tuple(user_ids)}
        )
        ids = cur.execute(query=query)
    return ids


def delete_sessions_by_session_ids(session_ids):
    with pg_client.PostgresClient(unlimited_query=True) as cur:
        query = cur.mogrify(
            """\
            DELETE FROM public.sessions
            WHERE
                session_id IN %(session_ids)s;""",
            {"session_ids": tuple(session_ids)}
        )
        cur.execute(query=query)

    return True


def delete_sessions_by_user_ids(project_id, user_ids):
    with pg_client.PostgresClient(unlimited_query=True) as cur:
        query = cur.mogrify(
            """\
            DELETE FROM public.sessions
            WHERE
                project_id = %(project_id)s AND user_id IN %(userId)s;""",
            {"project_id": project_id, "userId": tuple(user_ids)}
        )
        cur.execute(query=query)

    return True


def count_all():
    with pg_client.PostgresClient(unlimited_query=True) as cur:
        row = cur.execute(query="SELECT COUNT(session_id) AS count FROM public.sessions")
    return row.get("count", 0)
