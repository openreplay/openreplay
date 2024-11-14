import logging

import schemas
from chalicelib.core import metadata
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.metrics_helper import __get_step_size

logger = logging.getLogger(__name__)


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


def __get_neutral(rows, add_All_if_empty=True):
    neutral = {l: 0 for l in [i for k in [list(v.keys()) for v in rows] for i in k]}
    if add_All_if_empty and len(neutral.keys()) <= 1:
        neutral = {"All": 0}
    return neutral


def __merge_rows_with_neutral(rows, neutral):
    for i in range(len(rows)):
        rows[i] = {**neutral, **rows[i]}
    return rows


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
