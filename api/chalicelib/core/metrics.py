import logging
import math

import schemas
from chalicelib.core import metadata
from chalicelib.utils import args_transformer
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.metrics_helper import __get_step_size

logger = logging.getLogger(__name__)


# Written by David Aznaurov, inspired by numpy.quantile
def __quantiles(a, q, interpolation='higher'):
    arr = a.copy()
    arr = sorted(arr)
    if isinstance(q, list):
        ind = [qi * (len(arr) - 1) for qi in q]
    else:
        ind = q * (len(arr) - 1)
    if interpolation == 'higher':
        if isinstance(q, list):
            ind = [math.ceil(i) for i in ind]
        else:
            ind = math.ceil(ind)
    if isinstance(q, list):
        return [arr[i] for i in ind]
    else:
        return arr[ind]


def __get_constraints(project_id, time_constraint=True, chart=False, duration=True, project=True,
                      project_identifier="project_id",
                      main_table="sessions", time_column="start_ts", data={}):
    pg_sub_query = []
    main_table = main_table + "." if main_table is not None and len(main_table) > 0 else ""
    if project:
        pg_sub_query.append(f"{main_table}{project_identifier} =%({project_identifier})s")
    if duration:
        pg_sub_query.append(f"{main_table}duration>0")
    if time_constraint:
        pg_sub_query.append(f"{main_table}{time_column} >= %(startTimestamp)s")
        pg_sub_query.append(f"{main_table}{time_column} < %(endTimestamp)s")
    if chart:
        pg_sub_query.append(f"{main_table}{time_column} >= generated_timestamp")
        pg_sub_query.append(f"{main_table}{time_column} < generated_timestamp + %(step_size)s")
    return pg_sub_query + __get_meta_constraint(project_id=project_id, data=data)


def __merge_charts(list1, list2, time_key="timestamp"):
    if len(list1) != len(list2):
        raise Exception("cannot merge unequal lists")
    result = []
    for i in range(len(list1)):
        timestamp = min(list1[i][time_key], list2[i][time_key])
        result.append({**list1[i], **list2[i], time_key: timestamp})
    return result


def __get_constraint_values(data):
    params = {}
    for i, f in enumerate(data.get("filters", [])):
        params[f"{f['key']}_{i}"] = f["value"]
    return params


METADATA_FIELDS = {"userId": "user_id",
                   "userAnonymousId": "user_anonymous_id",
                   "metadata1": "metadata_1",
                   "metadata2": "metadata_2",
                   "metadata3": "metadata_3",
                   "metadata4": "metadata_4",
                   "metadata5": "metadata_5",
                   "metadata6": "metadata_6",
                   "metadata7": "metadata_7",
                   "metadata8": "metadata_8",
                   "metadata9": "metadata_9",
                   "metadata10": "metadata_10"}


def __get_meta_constraint(project_id, data):
    if len(data.get("filters", [])) == 0:
        return []
    constraints = []
    meta_keys = metadata.get(project_id=project_id)
    meta_keys = {m["key"]: m["index"] for m in meta_keys}

    for i, f in enumerate(data.get("filters", [])):
        if f["key"] in meta_keys.keys():
            key = f"sessions.metadata_{meta_keys[f['key']]})"
            if f["value"] in ["*", ""]:
                constraints.append(f"{key} IS NOT NULL")
            else:
                constraints.append(f"{key} = %({f['key']}_{i})s")
        else:
            filter_type = f["key"].upper()
            filter_type = [filter_type, "USER" + filter_type, filter_type[4:]]
            if any(item in [schemas.FilterType.USER_BROWSER] \
                   for item in filter_type):
                constraints.append(f"sessions.user_browser = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.USER_OS, schemas.FilterType.USER_OS_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.user_os = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.USER_DEVICE, schemas.FilterType.USER_DEVICE_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.user_device = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.USER_COUNTRY, schemas.FilterType.USER_COUNTRY_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.user_country  = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.USER_ID, schemas.FilterType.USER_ID_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.user_id = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.USER_ANONYMOUS_ID, schemas.FilterType.USER_ANONYMOUS_ID_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.user_anonymous_id = %({f['key']}_{i})s")
            elif any(item in [schemas.FilterType.REV_ID, schemas.FilterType.REV_ID_MOBILE] \
                     for item in filter_type):
                constraints.append(f"sessions.rev_id = %({f['key']}_{i})s")
    return constraints


SESSIONS_META_FIELDS = {"revId": "rev_id",
                        "country": "user_country",
                        "os": "user_os",
                        "platform": "user_device_type",
                        "device": "user_device",
                        "browser": "user_browser"}


def get_processed_sessions(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(),
                           density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                               COALESCE(COUNT(sessions), 0) AS value
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL ( SELECT 1
                                                 FROM public.sessions
                                                 WHERE {" AND ".join(pg_sub_query_chart)}
                             ) AS sessions ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        results = {
            "value": sum([r["value"] for r in rows]),
            "chart": rows
        }

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff

        pg_query = f"""SELECT COUNT(sessions.session_id) AS count
                        FROM public.sessions
                        WHERE {" AND ".join(pg_sub_query)};"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
                  **__get_constraint_values(args)}

        cur.execute(cur.mogrify(pg_query, params))

        count = cur.fetchone()["count"]

        results["progress"] = helper.__progress(old_val=count, new_val=results["value"])
    results["unit"] = schemas.TemplatePredefinedUnits.COUNT
    return results


def get_errors(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
               density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)

    pg_sub_query_subset = __get_constraints(project_id=project_id, data=args, duration=False, main_table="m_errors",
                                            time_constraint=False)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False,
                                           chart=True, data=args, main_table="errors", time_column="timestamp",
                                           project=False, duration=False)
    pg_sub_query_subset.append("m_errors.source = 'js_exception'")
    pg_sub_query_subset.append("errors.timestamp>=%(startTimestamp)s")
    pg_sub_query_subset.append("errors.timestamp<%(endTimestamp)s")
    with pg_client.PostgresClient() as cur:
        pg_query = f"""WITH errors AS (SELECT DISTINCT session_id, timestamp
                                        FROM events.errors
                                                 INNER JOIN public.errors AS m_errors USING (error_id)
                                        WHERE {" AND ".join(pg_sub_query_subset)}
                        )
                        SELECT generated_timestamp          AS timestamp,
                               COALESCE(COUNT(sessions), 0) AS count
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                 LEFT JOIN LATERAL ( SELECT session_id
                                                     FROM errors
                                                     WHERE {" AND ".join(pg_sub_query_chart)}
                            ) AS sessions ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        results = {
            "count": 0 if len(rows) == 0 else \
                __count_distinct_errors(cur, project_id, startTimestamp, endTimestamp, pg_sub_query_subset),
            "impactedSessions": sum([r["count"] for r in rows]),
            "chart": rows
        }

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        count = __count_distinct_errors(cur, project_id, startTimestamp, endTimestamp, pg_sub_query_subset, **args)
        results["progress"] = helper.__progress(old_val=count, new_val=results["count"])
    return results


def __count_distinct_errors(cur, project_id, startTimestamp, endTimestamp, pg_sub_query, **args):
    pg_query = f"""WITH errors AS (SELECT DISTINCT error_id
                                FROM events.errors
                                         INNER JOIN public.errors AS m_errors USING (error_id)
                                WHERE {" AND ".join(pg_sub_query)})
                    SELECT COALESCE(COUNT(*), 0) AS count
                    FROM errors;"""
    cur.execute(cur.mogrify(pg_query, {"project_id": project_id, "startTimestamp": startTimestamp,
                                       "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
    return cur.fetchone()["count"]


def get_errors_trend(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                     endTimestamp=TimeUTC.now(),
                     density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)

    pg_sub_query_subset = __get_constraints(project_id=project_id, time_constraint=False,
                                            chart=False, data=args, main_table="m_errors", duration=False)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False, project=False,
                                           chart=True, data=args, main_table="errors_subsest", time_column="timestamp",
                                           duration=False)
    pg_sub_query_subset.append("errors.timestamp >= %(startTimestamp)s")
    pg_sub_query_subset.append("errors.timestamp < %(endTimestamp)s")

    pg_sub_query_chart.append("errors_subsest.error_id = top_errors.error_id")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""WITH errors_subsest AS (SELECT session_id, error_id, timestamp
                                        FROM events.errors
                                                 INNER JOIN public.errors AS m_errors USING (error_id)
                                        WHERE {" AND ".join(pg_sub_query_subset)}
                        )
                        SELECT *
                        FROM (SELECT error_id, COUNT(sub_errors) AS count, count(DISTINCT session_id) AS sessions_count
                              FROM (SELECT error_id, session_id
                                    FROM events.errors
                                             INNER JOIN public.errors AS m_errors USING (error_id)
                                    WHERE {" AND ".join(pg_sub_query_subset)}) AS sub_errors
                              GROUP BY error_id
                              ORDER BY sessions_count DESC, count DESC
                              LIMIT 10) AS top_errors
                                 INNER JOIN LATERAL (SELECT message AS error
                                                     FROM public.errors
                                                     WHERE project_id = %(project_id)s
                                                       AND errors.error_id = top_errors.error_id) AS errors_details ON(TRUE)
                                 INNER JOIN LATERAL (SELECT MAX(timestamp) AS last_occurrence_at,
                                                            MIN(timestamp) AS first_occurrence_at
                                                     FROM events.errors
                                                     WHERE error_id = top_errors.error_id
                                                     GROUP BY error_id) AS errors_time ON (TRUE)
                                 INNER JOIN LATERAL (SELECT jsonb_agg(chart) AS chart
                                                     FROM (SELECT generated_timestamp AS timestamp, COALESCE(COUNT(sessions), 0) AS count
                                                           FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                                                    LEFT JOIN LATERAL ( SELECT DISTINCT session_id
                                                                                        FROM errors_subsest
                                                                                        WHERE {" AND ".join(pg_sub_query_chart)}
                                                               ) AS sessions ON (TRUE)
                                                           GROUP BY generated_timestamp
                                                           ORDER BY generated_timestamp) AS chart) AS chart ON (TRUE);"""
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()

        for i in range(len(rows)):
            rows[i] = helper.dict_to_camel_case(rows[i])
            rows[i]["sessions"] = rows[i].pop("sessionsCount")
            rows[i]["error_id"] = rows[i]["errorId"]
            rows[i]["startTimestamp"] = startTimestamp
            rows[i]["endTimestamp"] = endTimestamp

    return rows


def get_page_metrics(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                     endTimestamp=TimeUTC.now(), **args):
    with pg_client.PostgresClient() as cur:
        rows = __get_page_metrics(cur, project_id, startTimestamp, endTimestamp, **args)
        if len(rows) > 0:
            results = helper.dict_to_camel_case(rows[0])
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        rows = __get_page_metrics(cur, project_id, startTimestamp, endTimestamp, **args)
        if len(rows) > 0:
            previous = helper.dict_to_camel_case(rows[0])
            for key in previous.keys():
                results[key + "Progress"] = helper.__progress(old_val=previous[key], new_val=results[key])
    return results


def __get_page_metrics(cur, project_id, startTimestamp, endTimestamp, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("pages.timestamp>=%(startTimestamp)s")
    pg_sub_query.append("pages.timestamp<%(endTimestamp)s")
    pg_sub_query.append("(pages.dom_content_loaded_time > 0 OR pages.first_contentful_paint_time > 0)")
    pg_query = f"""SELECT COALESCE(AVG(NULLIF(pages.dom_content_loaded_time, 0)), 0)     AS avg_dom_content_load_start,
                           COALESCE(AVG(NULLIF(pages.first_contentful_paint_time, 0)), 0) AS avg_first_contentful_pixel
                    FROM (SELECT pages.dom_content_loaded_time, pages.first_contentful_paint_time
                          FROM events.pages
                                   INNER JOIN public.sessions USING (session_id)
                          WHERE {" AND ".join(pg_sub_query)}
                         ) AS pages;"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}
    cur.execute(cur.mogrify(pg_query, params))
    rows = cur.fetchall()
    return rows


def get_user_activity(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                      endTimestamp=TimeUTC.now(), **args):
    with pg_client.PostgresClient() as cur:
        row = __get_user_activity(cur, project_id, startTimestamp, endTimestamp, **args)
        results = helper.dict_to_camel_case(row)
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        row = __get_user_activity(cur, project_id, startTimestamp, endTimestamp, **args)

        previous = helper.dict_to_camel_case(row)
        for key in previous:
            results[key + "Progress"] = helper.__progress(old_val=previous[key], new_val=results[key])
    return results


def __get_user_activity(cur, project_id, startTimestamp, endTimestamp, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("(sessions.pages_count>0 OR sessions.duration>0)")
    pg_query = f"""SELECT COALESCE(CEIL(AVG(NULLIF(sessions.pages_count,0))),0) AS avg_visited_pages,
                           COALESCE(AVG(NULLIF(sessions.duration,0)),0)         AS avg_session_duration
                    FROM public.sessions
                    WHERE {" AND ".join(pg_sub_query)};"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}

    cur.execute(cur.mogrify(pg_query, params))
    row = cur.fetchone()
    return row


RESOURCS_TYPE_TO_DB_TYPE = {
    "img": "IMG",
    "fetch": "REQUEST",
    "stylesheet": "STYLESHEET",
    "script": "SCRIPT",
    "other": "OTHER",
    "media": "MEDIA"
}


def __get_resource_type_from_db_type(db_type):
    db_type = db_type.lower()
    return RESOURCS_TYPE_TO_DB_TYPE.get(db_type, db_type)


def __get_resource_db_type_from_type(resource_type):
    resource_type = resource_type.upper()
    return {v: k for k, v in RESOURCS_TYPE_TO_DB_TYPE.items()}.get(resource_type, resource_type)


KEYS = {
    'startTimestamp': args_transformer.int_arg,
    'endTimestamp': args_transformer.int_arg,
    'density': args_transformer.int_arg,
    'performanceDensity': args_transformer.int_arg,
    'platform': args_transformer.string
}


def dashboard_args(params):
    args = {}
    if params is not None:
        for key in params.keys():
            if key in KEYS.keys():
                args[key] = KEYS[key](params.get(key))
    return args


def get_sessions_location(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                          endTimestamp=TimeUTC.now(), **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT user_country, COUNT(session_id) AS count
                        FROM public.sessions
                        WHERE {" AND ".join(pg_sub_query)} 
                        GROUP BY user_country
                        ORDER BY user_country;"""
        cur.execute(cur.mogrify(pg_query,
                                {"project_id": project_id,
                                 "startTimestamp": startTimestamp,
                                 "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
    return {"count": sum(i["count"] for i in rows), "chart": helper.list_to_camel_case(rows)}


def get_top_metrics(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                    endTimestamp=TimeUTC.now(), value=None, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)

    if value is not None:
        pg_sub_query.append("pages.path = %(value)s")
    with pg_client.PostgresClient() as cur:
        pg_query = f"""WITH pages AS (SELECT pages.response_time,
                              pages.first_paint_time,
                              pages.dom_content_loaded_time,
                              pages.ttfb,
                              pages.time_to_interactive
                       FROM events.pages
                                INNER JOIN public.sessions USING (session_id)
                       WHERE {" AND ".join(pg_sub_query)}
                         AND pages.timestamp >= %(startTimestamp)s
                         AND pages.timestamp < %(endTimestamp)s
                         AND (pages.response_time > 0
                           OR pages.first_paint_time > 0
                           OR pages.dom_content_loaded_time > 0
                           OR pages.ttfb > 0
                           OR pages.time_to_interactive > 0
                           ))
        SELECT (SELECT COALESCE(AVG(pages.response_time), 0)
                FROM pages
                WHERE pages.response_time > 0)           AS avg_response_time,
               (SELECT COALESCE(AVG(pages.first_paint_time), 0)
                FROM pages
                WHERE pages.first_paint_time > 0)        AS avg_first_paint,
               (SELECT COALESCE(AVG(pages.dom_content_loaded_time), 0)
                FROM pages
                WHERE pages.dom_content_loaded_time > 0) AS avg_dom_content_loaded,
               (SELECT COALESCE(AVG(pages.ttfb), 0)
                FROM pages
                WHERE pages.ttfb > 0)                    AS avg_till_first_bit,
               (SELECT COALESCE(AVG(pages.time_to_interactive), 0)
                FROM pages
                WHERE pages.time_to_interactive > 0)     AS avg_time_to_interactive,
               (SELECT COUNT(pages.session_id)
                FROM events.pages
                         INNER JOIN public.sessions USING (session_id)
                WHERE {" AND ".join(pg_sub_query)}) AS count_requests;"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp,
                                           "value": value, **__get_constraint_values(args)}))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


def __get_neutral(rows, add_All_if_empty=True):
    neutral = {l: 0 for l in [i for k in [list(v.keys()) for v in rows] for i in k]}
    if add_All_if_empty and len(neutral.keys()) <= 1:
        neutral = {"All": 0}
    return neutral


def __merge_rows_with_neutral(rows, neutral):
    for i in range(len(rows)):
        rows[i] = {**neutral, **rows[i]}
    return rows


def get_domains_errors(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                       endTimestamp=TimeUTC.now(), density=6, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_subset = __get_constraints(project_id=project_id, time_constraint=True, chart=False, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False, chart=True,
                                           data=args, main_table="requests", time_column="timestamp", project=False,
                                           duration=False)
    pg_sub_query_subset.append("requests.timestamp>=%(startTimestamp)s")
    pg_sub_query_subset.append("requests.timestamp<%(endTimestamp)s")
    pg_sub_query_subset.append("requests.status/100 = %(status_code)s")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""WITH requests AS(SELECT requests.host, timestamp 
                                         FROM events_common.requests INNER JOIN public.sessions USING (session_id)
                                         WHERE {" AND ".join(pg_sub_query_subset)}
                                        )
                        SELECT generated_timestamp AS timestamp,
                              COALESCE(JSONB_AGG(requests) FILTER ( WHERE requests IS NOT NULL ), '[]'::JSONB) AS keys
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                        LEFT JOIN LATERAL ( SELECT requests.host, COUNT(*) AS count
                                             FROM requests
                                             WHERE {" AND ".join(pg_sub_query_chart)}
                                             GROUP BY host
                                             ORDER BY count DESC
                                             LIMIT 5
                             ) AS requests ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "step_size": step_size,
                  "status_code": 4, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        rows = __nested_array_to_dict_array(rows, key="host")
        neutral = __get_neutral(rows)
        rows = __merge_rows_with_neutral(rows, neutral)

        result = {"4xx": rows}
        params["status_code"] = 5
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        rows = __nested_array_to_dict_array(rows, key="host")
        neutral = __get_neutral(rows)
        rows = __merge_rows_with_neutral(rows, neutral)
        result["5xx"] = rows
    return result


def __get_domains_errors_4xx_and_5xx(status, project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                     endTimestamp=TimeUTC.now(), density=6, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_subset = __get_constraints(project_id=project_id, time_constraint=True, chart=False, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False, chart=True,
                                           data=args, main_table="requests", time_column="timestamp", project=False,
                                           duration=False)
    pg_sub_query_subset.append("requests.status_code/100 = %(status_code)s")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""WITH requests AS (SELECT host, timestamp 
                                         FROM events_common.requests INNER JOIN public.sessions USING (session_id)
                                         WHERE {" AND ".join(pg_sub_query_subset)}
                     )
                        SELECT generated_timestamp AS timestamp,
                                      COALESCE(JSONB_AGG(requests) FILTER ( WHERE requests IS NOT NULL ), '[]'::JSONB) AS keys
                                FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                LEFT JOIN LATERAL ( SELECT requests.host, COUNT(*) AS count
                                                     FROM requests
                                                     WHERE {" AND ".join(pg_sub_query_chart)}
                                                     GROUP BY host
                                                     ORDER BY count DESC
                                                     LIMIT 5
                                     ) AS requests ON (TRUE)
                                GROUP BY generated_timestamp
                                ORDER BY generated_timestamp;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "step_size": step_size,
                  "status_code": status, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        rows = __nested_array_to_dict_array(rows, key="host")
        neutral = __get_neutral(rows)
        rows = __merge_rows_with_neutral(rows, neutral)

        return rows


def get_domains_errors_4xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), density=6, **args):
    return __get_domains_errors_4xx_and_5xx(status=4, project_id=project_id, startTimestamp=startTimestamp,
                                            endTimestamp=endTimestamp, density=density, **args)


def get_domains_errors_5xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), density=6, **args):
    return __get_domains_errors_4xx_and_5xx(status=5, project_id=project_id, startTimestamp=startTimestamp,
                                            endTimestamp=endTimestamp, density=density, **args)


def __nested_array_to_dict_array(rows, key="url_host", value="count"):
    for r in rows:
        for i in range(len(r["keys"])):
            r[r["keys"][i][key]] = r["keys"][i][value]
        r.pop("keys")
    return rows


def get_errors_per_domains(project_id, limit, page, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("requests.success = FALSE")
    params = {"project_id": project_id,
              "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp,
              "limit_s": (page - 1) * limit,
              "limit_e": page * limit,
              **__get_constraint_values(args)}

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT COALESCE(SUM(errors_count),0)::INT AS count,
                              COUNT(raw.domain) AS total,
                              jsonb_agg(raw) FILTER ( WHERE rn > %(limit_s)s 
                                                        AND rn <= %(limit_e)s ) AS values
                        FROM (SELECT requests.host                                                 AS domain,
                                     COUNT(requests.session_id)                                    AS errors_count,
                                     row_number() over (ORDER BY COUNT(requests.session_id) DESC ) AS rn
                              FROM events_common.requests
                                       INNER JOIN sessions USING (session_id)
                              WHERE {" AND ".join(pg_sub_query)}
                              GROUP BY requests.host
                              ORDER BY errors_count DESC) AS raw;"""
        pg_query = cur.mogrify(pg_query, params)
        logger.debug("-----------")
        logger.debug(pg_query)
        logger.debug("-----------")
        cur.execute(pg_query)
        row = cur.fetchone()
        if row:
            row["values"] = row["values"] or []
            for r in row["values"]:
                r.pop("rn")

    return helper.dict_to_camel_case(row)


def __get_calls_errors_4xx_or_5xx(status, project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                  endTimestamp=TimeUTC.now(),
                                  platform=None, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("requests.type = 'fetch'")
    pg_sub_query.append("requests.method IS NOT NULL")
    pg_sub_query.append(f"requests.status_code/100 = {status}")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT  requests.method,
                               requests.host,
                               requests.path,
                               COUNT(requests.session_id) AS all_requests
                        FROM events_common.requests INNER JOIN sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)}
                        GROUP BY requests.method, requests.host, requests.path
                        ORDER BY all_requests DESC
                        LIMIT 10;"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
        for r in rows:
            r["url_hostpath"] = r.pop("host") + r.pop("path")
    return helper.list_to_camel_case(rows)


def get_calls_errors_4xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                         platform=None, **args):
    return __get_calls_errors_4xx_or_5xx(status=4, project_id=project_id, startTimestamp=startTimestamp,
                                         endTimestamp=endTimestamp,
                                         platform=platform, **args)


def get_calls_errors_5xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                         platform=None, **args):
    return __get_calls_errors_4xx_or_5xx(status=5, project_id=project_id, startTimestamp=startTimestamp,
                                         endTimestamp=endTimestamp,
                                         platform=platform, **args)


def get_errors_per_type(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                        platform=None, density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)

    pg_sub_query_subset = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_subset.append("requests.timestamp>=%(startTimestamp)s")
    pg_sub_query_subset.append("requests.timestamp<%(endTimestamp)s")
    pg_sub_query_subset.append("requests.status_code > 200")

    pg_sub_query_subset_e = __get_constraints(project_id=project_id, data=args, duration=False, main_table="m_errors",
                                              time_constraint=False)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False,
                                           chart=True, data=args, main_table="", time_column="timestamp",
                                           project=False, duration=False)
    pg_sub_query_subset_e.append("timestamp>=%(startTimestamp)s")
    pg_sub_query_subset_e.append("timestamp<%(endTimestamp)s")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""WITH requests AS (SELECT status_code AS status, timestamp
                                       FROM events_common.requests
                                                INNER JOIN public.sessions USING (session_id)
                                       WHERE {" AND ".join(pg_sub_query_subset)}
                            ),
                         errors_integ AS (SELECT timestamp
                                          FROM events.errors
                                                   INNER JOIN public.errors AS m_errors USING (error_id)
                                          WHERE {" AND ".join(pg_sub_query_subset_e)}
                                            AND source != 'js_exception'
                         ),
                         errors_js AS (SELECT timestamp
                                       FROM events.errors
                                                INNER JOIN public.errors AS m_errors USING (error_id)
                                       WHERE {" AND ".join(pg_sub_query_subset_e)}
                                         AND source = 'js_exception'
                         )
                    SELECT generated_timestamp                                       AS timestamp,
                           COALESCE(SUM(CASE WHEN status / 100 = 4 THEN 1 ELSE 0 END), 0) AS _4xx,
                           COALESCE(SUM(CASE WHEN status / 100 = 5 THEN 1 ELSE 0 END), 0) AS _5xx,
                           COALESCE((SELECT COUNT(*)
                                     FROM errors_js
                                     WHERE {" AND ".join(pg_sub_query_chart)}
                                    ), 0)                                                 AS js,
                           COALESCE((SELECT COUNT(*)
                                     FROM errors_integ
                                     WHERE {" AND ".join(pg_sub_query_chart)}
                                    ), 0)                                                 AS integrations
                    FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL (SELECT status
                                                FROM requests
                                                WHERE {" AND ".join(pg_sub_query_chart)}
                        ) AS errors_partition ON (TRUE)
                    GROUP BY timestamp
                    ORDER BY timestamp;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        rows = helper.list_to_camel_case(rows)
    return rows


def get_impacted_sessions_by_js_errors(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                       endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)
    pg_sub_query.append("m_errors.source = 'js_exception'")
    pg_sub_query.append("m_errors.project_id = %(project_id)s")
    pg_sub_query.append("errors.timestamp >= %(startTimestamp)s")
    pg_sub_query.append("errors.timestamp <  %(endTimestamp)s")
    pg_sub_query_chart.append("m_errors.source = 'js_exception'")
    pg_sub_query_chart.append("m_errors.project_id = %(project_id)s")
    pg_sub_query_chart.append("errors.timestamp >= generated_timestamp")
    pg_sub_query_chart.append("errors.timestamp < generated_timestamp+ %(step_size)s")

    pg_sub_query_subset = __get_constraints(project_id=project_id, data=args, duration=False, main_table="m_errors",
                                            time_constraint=False)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False,
                                           chart=True, data=args, main_table="errors", time_column="timestamp",
                                           project=False, duration=False)
    pg_sub_query_subset.append("m_errors.source = 'js_exception'")
    pg_sub_query_subset.append("errors.timestamp>=%(startTimestamp)s")
    pg_sub_query_subset.append("errors.timestamp<%(endTimestamp)s")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""WITH errors AS (SELECT DISTINCT ON (session_id,timestamp) session_id, timestamp
                                        FROM events.errors
                                                 INNER JOIN public.errors AS m_errors USING (error_id)
                                        WHERE {" AND ".join(pg_sub_query_subset)}
                        )
                        SELECT *
                        FROM (SELECT COUNT(DISTINCT session_id) AS sessions_count
                              FROM errors) AS counts
                                 LEFT JOIN
                             (SELECT jsonb_agg(chart) AS chart
                              FROM (SELECT generated_timestamp            AS timestamp,
                                           COALESCE(COUNT(session_id), 0) AS sessions_count
                                    FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                             LEFT JOIN LATERAL ( SELECT DISTINCT session_id
                                                                 FROM errors
                                                                 WHERE {" AND ".join(pg_sub_query_chart)}
                                        ) AS sessions ON (TRUE)
                                    GROUP BY generated_timestamp
                                    ORDER BY generated_timestamp) AS chart) AS chart ON (TRUE);"""
        cur.execute(cur.mogrify(pg_query, {"step_size": step_size,
                                           "project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp,
                                           **__get_constraint_values(args)}))
        row_sessions = cur.fetchone()
        pg_query = f"""WITH errors AS ( SELECT DISTINCT ON(errors.error_id,timestamp) errors.error_id,timestamp
                                         FROM events.errors
                                                  INNER JOIN public.errors AS m_errors USING (error_id)
                                         WHERE {" AND ".join(pg_sub_query_subset)}
                                    )
                    SELECT *
                    FROM (SELECT COUNT(DISTINCT errors.error_id) AS errors_count
                          FROM errors) AS counts
                             LEFT JOIN
                         (SELECT jsonb_agg(chart) AS chart
                          FROM (SELECT generated_timestamp          AS timestamp,
                                       COALESCE(COUNT(error_id), 0) AS errors_count
                                FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                         LEFT JOIN LATERAL ( SELECT DISTINCT errors.error_id
                                                             FROM errors
                                                             WHERE {" AND ".join(pg_sub_query_chart)}
                                    ) AS errors ON (TRUE)
                                GROUP BY generated_timestamp
                                ORDER BY generated_timestamp) AS chart) AS chart ON (TRUE);"""
        cur.execute(cur.mogrify(pg_query, {"step_size": step_size,
                                           "project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp,
                                           **__get_constraint_values(args)}))
        row_errors = cur.fetchone()
        chart = __merge_charts(row_sessions.pop("chart"), row_errors.pop("chart"))
        row_sessions = helper.dict_to_camel_case(row_sessions)
        row_errors = helper.dict_to_camel_case(row_errors)
    return {**row_sessions, **row_errors, "chart": chart}


def get_resources_by_party(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_subset = __get_constraints(project_id=project_id, time_constraint=True,
                                            chart=False, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False, project=False,
                                           chart=True, data=args, main_table="requests", time_column="timestamp",
                                           duration=False)
    pg_sub_query_subset.append("requests.timestamp >= %(startTimestamp)s")
    pg_sub_query_subset.append("requests.timestamp < %(endTimestamp)s")
    # pg_sub_query_subset.append("resources.type IN ('fetch', 'script')")
    pg_sub_query_subset.append("requests.success = FALSE")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""WITH requests AS (
                            SELECT requests.host, timestamp
                            FROM events_common.requests
                                     INNER JOIN public.sessions USING (session_id)
                            WHERE {" AND ".join(pg_sub_query_subset)}
                        )
                        SELECT generated_timestamp                                                       AS timestamp,
                               SUM(CASE WHEN first.host = sub_requests.host THEN 1 ELSE 0 END)  AS first_party,
                               SUM(CASE WHEN first.host != sub_requests.host THEN 1 ELSE 0 END) AS third_party
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                 LEFT JOIN (
                            SELECT requests.host,
                                   COUNT(requests.session_id) AS count
                            FROM events_common.requests
                                     INNER JOIN public.sessions USING (session_id)
                            WHERE sessions.project_id = '1'
                              AND sessions.start_ts > (EXTRACT(EPOCH FROM now() - INTERVAL '31 days') * 1000)::BIGINT
                              AND sessions.start_ts < (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT
                              AND requests.timestamp > (EXTRACT(EPOCH FROM now() - INTERVAL '31 days') * 1000)::BIGINT
                              AND requests.timestamp < (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT
                            AND sessions.duration>0
                            GROUP BY requests.host
                            ORDER BY count DESC
                            LIMIT 1
                        ) AS first ON (TRUE)
                                 LEFT JOIN LATERAL (
                            SELECT requests.host
                            FROM requests
                            WHERE {" AND ".join(pg_sub_query_chart)}
                            ) AS sub_requests ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        cur.execute(cur.mogrify(pg_query, {"step_size": step_size,
                                           "project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))

        rows = cur.fetchall()
    return rows


def get_performance_avg_page_load_time(cur, project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                       endTimestamp=TimeUTC.now(),
                                       density=19, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density, factor=1)
    location_constraints = []
    location_constraints_vals = {}
    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}
    pg_sub_query_subset = __get_constraints(project_id=project_id, time_constraint=True,
                                            chart=False, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False, project=False,
                                           chart=True, data=args, main_table="pages", time_column="timestamp",
                                           duration=False)
    pg_sub_query_subset.append("pages.timestamp >= %(startTimestamp)s")
    pg_sub_query_subset.append("pages.timestamp < %(endTimestamp)s")
    pg_query = f"""WITH pages AS(SELECT pages.load_time, timestamp 
                                FROM events.pages INNER JOIN public.sessions USING (session_id)
                                WHERE {" AND ".join(pg_sub_query_subset)} AND pages.load_time>0 AND pages.load_time IS NOT NULL
                                  {(f' AND ({" OR ".join(location_constraints)})') if len(location_constraints) > 0 else ""}
                    )
                    SELECT generated_timestamp AS timestamp,
                         COALESCE(AVG(pages.load_time),0) AS value 
                    FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                    LEFT JOIN LATERAL ( SELECT pages.load_time
                                        FROM pages 
                                        WHERE {" AND ".join(pg_sub_query_chart)}  
                                          {(f' AND ({" OR ".join(location_constraints)})') if len(location_constraints) > 0 else ""}
                                        ) AS pages ON (TRUE)
                    GROUP BY generated_timestamp
                    ORDER BY generated_timestamp;"""
    cur.execute(cur.mogrify(pg_query, {**params, **location_constraints_vals, **__get_constraint_values(args)}))
    rows = cur.fetchall()
    return rows


def get_user_activity_avg_visited_pages(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                        endTimestamp=TimeUTC.now(), **args):
    with pg_client.PostgresClient() as cur:
        row = __get_user_activity_avg_visited_pages(cur, project_id, startTimestamp, endTimestamp, **args)
        results = helper.dict_to_camel_case(row)
        results["chart"] = __get_user_activity_avg_visited_pages_chart(cur, project_id, startTimestamp,
                                                                       endTimestamp, **args)

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        row = __get_user_activity_avg_visited_pages(cur, project_id, startTimestamp, endTimestamp, **args)

        previous = helper.dict_to_camel_case(row)
        results["progress"] = helper.__progress(old_val=previous["value"], new_val=results["value"])
    results["unit"] = schemas.TemplatePredefinedUnits.COUNT
    return results


def __get_user_activity_avg_visited_pages(cur, project_id, startTimestamp, endTimestamp, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("sessions.pages_count>0")
    pg_query = f"""SELECT COALESCE(CEIL(AVG(sessions.pages_count)),0) AS value
                    FROM public.sessions
                    WHERE {" AND ".join(pg_sub_query)};"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}

    cur.execute(cur.mogrify(pg_query, params))
    row = cur.fetchone()
    return row


def __get_user_activity_avg_visited_pages_chart(cur, project_id, startTimestamp, endTimestamp, density=20, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density, factor=1)
    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}
    pg_sub_query_subset = __get_constraints(project_id=project_id, time_constraint=True,
                                            chart=False, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False, project=False,
                                           chart=True, data=args, main_table="sessions", time_column="start_ts",
                                           duration=False)
    pg_sub_query_subset.append("sessions.duration IS NOT NULL")

    pg_query = f"""WITH sessions AS(SELECT sessions.pages_count, sessions.start_ts
                                    FROM public.sessions
                                    WHERE {" AND ".join(pg_sub_query_subset)}
                    )
                    SELECT generated_timestamp AS timestamp,
                         COALESCE(AVG(sessions.pages_count),0) AS value
                      FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                        LEFT JOIN LATERAL (
                                SELECT sessions.pages_count
                                FROM sessions
                                WHERE {" AND ".join(pg_sub_query_chart)}
                        ) AS sessions ON (TRUE)
                      GROUP BY generated_timestamp
                      ORDER BY generated_timestamp;"""
    cur.execute(cur.mogrify(pg_query, {**params, **__get_constraint_values(args)}))
    rows = cur.fetchall()
    return rows


def get_top_metrics_count_requests(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                   endTimestamp=TimeUTC.now(), value=None, density=20, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density, factor=1)
    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=False, project=False,
                                           chart=True, data=args, main_table="pages", time_column="timestamp",
                                           duration=False)

    if value is not None:
        pg_sub_query.append("pages.path = %(value)s")
        pg_sub_query_chart.append("pages.path = %(value)s")
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT COUNT(pages.session_id) AS value
                        FROM events.pages INNER JOIN public.sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)};"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp,
                                           "value": value, **__get_constraint_values(args)}))
        row = cur.fetchone()
        pg_query = f"""WITH pages AS(SELECT pages.timestamp
                                                FROM events.pages INNER JOIN public.sessions USING (session_id)
                                                WHERE {" AND ".join(pg_sub_query)}
                                )
                    SELECT generated_timestamp AS timestamp,
                         COUNT(pages.*) AS value
                      FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                        LEFT JOIN LATERAL (
                                SELECT 1
                                FROM pages
                                WHERE {" AND ".join(pg_sub_query_chart)}
                        ) AS pages ON (TRUE)
                      GROUP BY generated_timestamp
                      ORDER BY generated_timestamp;"""
        cur.execute(cur.mogrify(pg_query, {**params, **__get_constraint_values(args)}))
        rows = cur.fetchall()
        row["chart"] = rows
    row["unit"] = schemas.TemplatePredefinedUnits.COUNT
    return helper.dict_to_camel_case(row)


def get_unique_users(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                     endTimestamp=TimeUTC.now(),
                     density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)
    pg_sub_query.append("user_id IS NOT NULL")
    pg_sub_query.append("user_id != ''")
    pg_sub_query_chart.append("user_id IS NOT NULL")
    pg_sub_query_chart.append("user_id != ''")
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                               COALESCE(COUNT(sessions), 0) AS value
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL ( SELECT DISTINCT user_id
                                                 FROM public.sessions
                                                 WHERE {" AND ".join(pg_sub_query_chart)}
                             ) AS sessions ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        results = {
            "value": sum([r["value"] for r in rows]),
            "chart": rows
        }

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff

        pg_query = f"""SELECT COUNT(DISTINCT sessions.user_id) AS count
                        FROM public.sessions
                        WHERE {" AND ".join(pg_sub_query)};"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
                  **__get_constraint_values(args)}

        cur.execute(cur.mogrify(pg_query, params))

        count = cur.fetchone()["count"]

        results["progress"] = helper.__progress(old_val=count, new_val=results["value"])
    results["unit"] = schemas.TemplatePredefinedUnits.COUNT
    return results
