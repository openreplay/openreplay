from chalicelib.core import metadata
from chalicelib.utils import args_transformer
from chalicelib.utils import helper, dev
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.metrics_helper import __get_step_size
import math


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
    if project:
        pg_sub_query.append(f"{main_table}.{project_identifier} =%({project_identifier})s")
    if duration:
        pg_sub_query.append(f"{main_table}.duration>0")
    if time_constraint:
        pg_sub_query.append(f"{main_table}.{time_column} >= %(startTimestamp)s")
        pg_sub_query.append(f"{main_table}.{time_column} < %(endTimestamp)s")
    if chart:
        pg_sub_query.append(f"{main_table}.{time_column} >= generated_timestamp")
        pg_sub_query.append(f"{main_table}.{time_column} < generated_timestamp + %(step_size)s")
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

from chalicelib.core import sessions_metas


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
            if any(item in [sessions_metas.meta_type.USERBROWSER] \
                   for item in filter_type):
                constraints.append(f"sessions.user_browser = %({f['key']}_{i})s")
            elif any(item in [sessions_metas.meta_type.USEROS, sessions_metas.meta_type.USEROS_IOS] \
                     for item in filter_type):
                constraints.append(f"sessions.user_os = %({f['key']}_{i})s")
            elif any(item in [sessions_metas.meta_type.USERDEVICE, sessions_metas.meta_type.USERDEVICE_IOS] \
                     for item in filter_type):
                constraints.append(f"sessions.user_device = %({f['key']}_{i})s")
            elif any(item in [sessions_metas.meta_type.USERCOUNTRY, sessions_metas.meta_type.USERCOUNTRY_IOS] \
                     for item in filter_type):
                constraints.append(f"sessions.user_country  = %({f['key']}_{i})s")
            elif any(item in [sessions_metas.meta_type.USERID, sessions_metas.meta_type.USERID_IOS] \
                     for item in filter_type):
                constraints.append(f"sessions.user_id = %({f['key']}_{i})s")
            elif any(item in [sessions_metas.meta_type.USERANONYMOUSID, sessions_metas.meta_type.USERANONYMOUSID_IOS] \
                     for item in filter_type):
                constraints.append(f"sessions.user_anonymous_id = %({f['key']}_{i})s")
            elif any(item in [sessions_metas.meta_type.REVID, sessions_metas.meta_type.REVID_IOS] \
                     for item in filter_type):
                constraints.append(f"sessions.rev_id = %({f['key']}_{i})s")
    return constraints


SESSIONS_META_FIELDS = {"revId": "rev_id",
                        "country": "user_country",
                        "os": "user_os",
                        "platform": "user_device_type",
                        "device": "user_device",
                        "browser": "user_browser"}


@dev.timed
def get_processed_sessions(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(),
                           density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)
    with pg_client.PostgresClient() as cur:
        pg_query = f"""\
                SELECT generated_timestamp AS timestamp,
                       COALESCE(COUNT(sessions), 0) AS count
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
            "count": sum([r["count"] for r in rows]),
            "chart": rows
        }

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff

        pg_query = f"""\
                        SELECT COUNT(sessions.session_id)                                                                            AS count
                        FROM public.sessions
                        WHERE {" AND ".join(pg_sub_query)};"""
        params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
                  **__get_constraint_values(args)}

        cur.execute(cur.mogrify(pg_query, params))

        count = cur.fetchone()["count"]

        results["countProgress"] = helper.__progress(old_val=count, new_val=results["count"])

    return results


@dev.timed
def get_errors(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
               density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)

    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("m_errors.source = 'js_exception'")
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)
    pg_sub_query_chart.append("m_errors.source = 'js_exception'")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""\
                    SELECT generated_timestamp AS timestamp,
                           COALESCE(COUNT(sessions), 0) AS count
                    FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                         LEFT JOIN LATERAL ( SELECT DISTINCT session_id
                                             FROM events.errors 
                                                    INNER JOIN public.errors AS m_errors USING(error_id)
                                                    INNER JOIN public.sessions USING(session_id)
                                             WHERE {" AND ".join(pg_sub_query_chart)}
                         ) AS sessions ON (TRUE)
                    GROUP BY generated_timestamp
                    ORDER BY generated_timestamp;"""
        params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        results = {
            "count": 0 if len(rows) == 0 else __count_distinct_errors(cur, project_id, startTimestamp, endTimestamp,
                                                                      pg_sub_query),
            "impactedSessions": sum([r["count"] for r in rows]),
            "chart": rows
        }

        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        count = __count_distinct_errors(cur, project_id, startTimestamp, endTimestamp, pg_sub_query, **args)
        results["progress"] = helper.__progress(old_val=count, new_val=results["count"])
    return results


def __count_distinct_errors(cur, project_id, startTimestamp, endTimestamp, pg_sub_query, **args):
    pg_query = f"""\
                SELECT COALESCE(COUNT(DISTINCT errors.error_id),0) AS count
                FROM events.errors 
                        INNER JOIN public.errors AS m_errors USING(error_id) 
                        INNER JOIN public.sessions USING(session_id)
                WHERE {" AND ".join(pg_sub_query)};"""
    cur.execute(cur.mogrify(pg_query, {"project_id": project_id, "startTimestamp": startTimestamp,
                                       "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
    return cur.fetchone()["count"]


@dev.timed
def get_errors_trend(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                     endTimestamp=TimeUTC.now(),
                     density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("m_errors.project_id = %(project_id)s")
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True, chart=True, duration=False,
                                           project=False, main_table="errors", time_column="timestamp", data=args)
    pg_sub_query_chart.append("error_id = errors_details.error_id")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""
                    SELECT *
                    FROM (SELECT errors.error_id                   AS error_id,
                                 m_errors.message                  AS error,
                                 COUNT(errors.session_id)          AS count,
                                 COUNT(DISTINCT errors.session_id) AS sessions_count
                          FROM events.errors
                                   INNER JOIN public.errors AS m_errors USING (error_id)
                                   INNER JOIN public.sessions USING (session_id)
                          WHERE {" AND ".join(pg_sub_query)}
                          GROUP BY errors.error_id, m_errors.message
                          ORDER BY sessions_count DESC, count DESC
                          LIMIT 10) AS errors_details
                             INNER JOIN LATERAL (SELECT MAX(timestamp) AS last_occurrence_at,
                                                        MIN(timestamp) AS first_occurrence_at
                                                 FROM events.errors
                                                 WHERE error_id = errors_details.error_id
                                                 GROUP BY error_id) AS errors_time ON (TRUE)
                            INNER JOIN LATERAL (SELECT jsonb_agg(chart) AS chart
                             FROM (SELECT generated_timestamp AS timestamp, COALESCE(COUNT(sessions), 0) AS count
                                   FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                            LEFT JOIN LATERAL ( SELECT DISTINCT session_id
                                                                FROM events.errors
                                                                WHERE {" AND ".join(pg_sub_query_chart)}) AS sessions
                                                      ON (TRUE)
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


@dev.timed
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

@dev.timed
def __get_page_metrics(cur, project_id, startTimestamp, endTimestamp, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)

    pg_query = f"""\
        SELECT COALESCE((SELECT AVG(pages.dom_content_loaded_time)
                 FROM events.pages
                          INNER JOIN public.sessions USING (session_id)
                 WHERE {" AND ".join(pg_sub_query)}
                   AND pages.dom_content_loaded_time > 0
                ), 0)                                             AS avg_dom_content_load_start,
       COALESCE((SELECT AVG(pages.first_contentful_paint_time)
                 FROM events.pages
                          INNER JOIN public.sessions USING (session_id)
                 WHERE {" AND ".join(pg_sub_query)}
                   AND pages.first_contentful_paint_time > 0), 0) AS avg_first_contentful_pixel;"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}
    cur.execute(cur.mogrify(pg_query, params))
    rows = cur.fetchall()
    return rows


@dev.timed
def get_application_activity(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                             endTimestamp=TimeUTC.now(), **args):
    with pg_client.PostgresClient() as cur:
        row = __get_application_activity(cur, project_id, startTimestamp, endTimestamp, **args)
        results = helper.dict_to_camel_case(row)
        diff = endTimestamp - startTimestamp
        endTimestamp = startTimestamp
        startTimestamp = endTimestamp - diff
        row = __get_application_activity(cur, project_id, startTimestamp, endTimestamp, **args)
        previous = helper.dict_to_camel_case(row)
        for key in previous.keys():
            results[key + "Progress"] = helper.__progress(old_val=previous[key], new_val=results[key])
    return results


def __get_application_activity(cur, project_id, startTimestamp, endTimestamp, **args):
    result = {}
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("pages.load_time > 0")
    pg_query = f"""\
                SELECT COALESCE(AVG(pages.load_time) ,0) AS avg_page_load_time
                FROM events.pages INNER JOIN public.sessions USING (session_id)
                WHERE {" AND ".join(pg_sub_query)};"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}

    cur.execute(cur.mogrify(pg_query, params))
    row = cur.fetchone()
    result = {**result, **row}

    pg_sub_query[-1] = "resources.duration > 0"
    pg_sub_query.append("resources.type= %(type)s")
    pg_query = f"""\
                SELECT COALESCE(AVG(resources.duration),0) AS avg 
                FROM events.resources INNER JOIN public.sessions USING (session_id)
                WHERE {" AND ".join(pg_sub_query)};"""

    cur.execute(cur.mogrify(pg_query, {"project_id": project_id, "type": 'img', "startTimestamp": startTimestamp,
                                       "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
    row = cur.fetchone()
    result = {**result, "avg_image_load_time": row["avg"]}
    cur.execute(cur.mogrify(pg_query, {"project_id": project_id, "type": 'fetch', "startTimestamp": startTimestamp,
                                       "endTimestamp": endTimestamp, **__get_constraint_values(args)}))

    row = cur.fetchone()
    result = {**result, "avg_request_load_time": row["avg"]}

    return result


@dev.timed
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

    pg_query = f"""\
        SELECT COALESCE(CEIL(AVG(NULLIF(sessions.pages_count,0))),0) AS avg_visited_pages,
               COALESCE(AVG(NULLIF(sessions.duration,0)),0)          AS avg_session_duration
        FROM public.sessions
        WHERE {" AND ".join(pg_sub_query)};"""
    params = {"project_id": project_id, "startTimestamp": startTimestamp, "endTimestamp": endTimestamp,
              **__get_constraint_values(args)}

    cur.execute(cur.mogrify(pg_query, params))
    row = cur.fetchone()
    return row


@dev.timed
def get_slowest_images(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                       endTimestamp=TimeUTC.now(),
                       density=7, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("resources.type = 'img'")
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)
    pg_sub_query_chart.append("resources.type = 'img'")
    pg_sub_query_chart.append("resources.url = %(url)s")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT resources.url,
                                COALESCE(AVG(NULLIF(resources.duration,0)),0) AS avg_duration,
                                COUNT(resources.session_id) AS sessions_count
                        FROM events.resources INNER JOIN sessions USING (session_id) 
                        WHERE {" AND ".join(pg_sub_query)} 
                        GROUP BY resources.url 
                        ORDER BY avg_duration DESC LIMIT 10;"""

        cur.execute(cur.mogrify(pg_query, {"project_id": project_id, "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
        urls = [row["url"] for row in rows]

        charts = {}
        for url in urls:
            pg_query = f"""SELECT generated_timestamp AS timestamp,
                                   COALESCE(AVG(duration), 0) AS avg_duration
                            FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                 LEFT JOIN LATERAL ( SELECT resources.duration
                                                     FROM events.resources INNER JOIN public.sessions USING (session_id)
                                                     WHERE {" AND ".join(pg_sub_query_chart)}
                                 ) AS sessions ON (TRUE)
                            GROUP BY generated_timestamp
                            ORDER BY generated_timestamp;"""
            params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
                      "endTimestamp": endTimestamp, "url": url, **__get_constraint_values(args)}
            cur.execute(cur.mogrify(pg_query, params))
            r = cur.fetchall()
            charts[url] = helper.list_to_camel_case(r)
        for i in range(len(rows)):
            rows[i]["sessions"] = rows[i].pop("sessions_count")
            rows[i] = helper.dict_to_camel_case(rows[i])
            rows[i]["chart"] = charts[rows[i]["url"]]

    return sorted(rows, key=lambda k: k["sessions"], reverse=True)


@dev.timed
def __get_performance_constraint(l):
    if len(l) == 0:
        return ""
    l = [s.decode('UTF-8').replace("%", "%%") for s in l]
    return f"AND ({' OR '.join(l)})"


@dev.timed
def get_performance(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                    density=19, resources=None, **args):
    step_size = __get_step_size(endTimestamp=endTimestamp, startTimestamp=startTimestamp, density=density, factor=1)
    location_constraints = []
    img_constraints = []
    request_constraints = []
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)

    img_constraints_vals = {}
    location_constraints_vals = {}
    request_constraints_vals = {}

    if resources and len(resources) > 0:
        for r in resources:
            if r["type"] == "IMG":
                img_constraints.append(f"resources.url = %(val_{len(img_constraints)})s")
                img_constraints_vals["val_" + str(len(img_constraints) - 1)] = r['value']
            elif r["type"] == "LOCATION":
                location_constraints.append(f"pages.path = %(val_{len(location_constraints)})s")
                location_constraints_vals["val_" + str(len(location_constraints) - 1)] = r['value']
            else:
                request_constraints.append(f"resources.url = %(val_{len(request_constraints)})s")
                request_constraints_vals["val_" + str(len(request_constraints) - 1)] = r['value']
    params = {"step_size": step_size, "project_id": project_id, "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp}
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT 
                             generated_timestamp AS timestamp,
                             COALESCE(AVG(resources.duration),0) AS avg_image_load_time 
                      FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                        LEFT JOIN LATERAL ( 
                                SELECT resources.duration
                                FROM events.resources INNER JOIN public.sessions USING (session_id)
                                WHERE {" AND ".join(pg_sub_query_chart)}
                                  AND resources.type = 'img' AND resources.duration>0
                                  {(f' AND ({" OR ".join(img_constraints)})') if len(img_constraints) > 0 else ""}
                        ) AS resources ON (TRUE)
                      GROUP BY timestamp
                      ORDER BY timestamp;"""
        cur.execute(cur.mogrify(pg_query, {**params, **img_constraints_vals, **__get_constraint_values(args)}))
        rows = cur.fetchall()
        images = helper.list_to_camel_case(rows)
        pg_query = f"""SELECT 
                             generated_timestamp AS timestamp,
                             COALESCE(AVG(resources.duration),0) AS avg_request_load_time 
                      FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                        LEFT JOIN LATERAL ( 
                                SELECT resources.duration
                                FROM events.resources INNER JOIN public.sessions USING (session_id)
                                WHERE {" AND ".join(pg_sub_query_chart)} 
                                AND resources.type = 'fetch' AND resources.duration>0  
                                {(f' AND ({" OR ".join(request_constraints)})') if len(request_constraints) > 0 else ""}
                        ) AS resources ON (TRUE)
                      GROUP BY generated_timestamp
                      ORDER BY generated_timestamp;"""
        cur.execute(cur.mogrify(pg_query, {**params, **request_constraints_vals, **__get_constraint_values(args)}))
        rows = cur.fetchall()
        requests = helper.list_to_camel_case(rows)

        pg_query = f"""SELECT 
                             generated_timestamp AS timestamp,
                             COALESCE(AVG(pages.load_time),0) AS avg_page_load_time 
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                        LEFT JOIN LATERAL ( SELECT pages.load_time
                        FROM events.pages INNER JOIN public.sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query_chart)} AND pages.load_time>0 
                          {(f' AND ({" OR ".join(location_constraints)})') if len(location_constraints) > 0 else ""}
                        ) AS pages ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        cur.execute(cur.mogrify(pg_query, {**params, **location_constraints_vals, **__get_constraint_values(args)}))
        rows = cur.fetchall()
        pages = helper.list_to_camel_case(rows)

        rows = helper.merge_lists_by_key(helper.merge_lists_by_key(pages, requests, "timestamp"), images, "timestamp")

    return {"chart": rows}


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


@dev.timed
def search(text, resource_type, project_id, performance=False, pages_only=False, events_only=False,
           metadata=False, key=None, platform=None):
    if not resource_type:
        data = []
        if metadata:
            resource_type = "METADATA"
        elif pages_only or performance:
            resource_type = "LOCATION"
        else:
            resource_type = "ALL"
        data.extend(search(text=text, resource_type=resource_type, project_id=project_id,
                           performance=performance, pages_only=pages_only, events_only=events_only, key=key,
                           platform=platform))
        return data

    pg_sub_query = __get_constraints(project_id=project_id, time_constraint=False, duration=True,
                                     data={} if platform is None else {"platform": platform})

    if resource_type == "ALL" and not pages_only and not events_only:
        pg_sub_query.append("url_hostpath ILIKE %(value)s")
        with pg_client.PostgresClient() as cur:
            pg_query = f"""SELECT key, value
                            FROM ( SELECT DISTINCT ON (url) ROW_NUMBER() OVER (PARTITION BY type ORDER BY url) AS r,
                                              url AS value,
                                              type AS key
                                  FROM events.resources INNER JOIN public.sessions USING (session_id)
                                  WHERE {" AND ".join(pg_sub_query)} 
                                  ORDER BY url, type ASC) AS ranked_values
                            WHERE ranked_values.r<=5;"""
            cur.execute(cur.mogrify(pg_query, {"project_id": project_id, "value": helper.string_to_sql_like(text)}))
            rows = cur.fetchall()
            rows = [{"value": i["value"], "type": __get_resource_type_from_db_type(i["key"])} for i in rows]
    elif resource_type == "ALL" and events_only:
        with pg_client.PostgresClient() as cur:
            pg_query = f"""(SELECT DISTINCT label AS value, 'INPUT' AS key
                             FROM events.inputs INNER JOIN public.sessions USING(session_id)
                             WHERE {" AND ".join(pg_sub_query)} AND positionUTF8(lowerUTF8(label), %(value)s) != 0
                             LIMIT 10)
                            UNION ALL
                            (SELECT DISTINCT label AS value, 'CLICK' AS key
                             FROM events.clicks INNER JOIN public.sessions USING(session_id)
                             WHERE {" AND ".join(pg_sub_query)} AND positionUTF8(lowerUTF8(label), %(value)s) != 0
                             LIMIT 10)
                            UNION ALL
                            (SELECT DISTINCT path AS value, 'LOCATION'   AS key
                             FROM events.pages INNER JOIN public.sessions USING(session_id)
                             WHERE {" AND ".join(pg_sub_query)} AND positionUTF8(url_path, %(value)s) != 0
                             LIMIT 10);"""
            cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                               "value": helper.string_to_sql_like(text.lower()),
                                               "platform_0": platform}))
            rows = cur.fetchall()
            rows = [{"value": i["value"], "type": i["key"]} for i in rows]
    elif resource_type in ['IMG', 'REQUEST', 'STYLESHEET', 'OTHER', 'SCRIPT'] and not pages_only:
        pg_sub_query.append("url_hostpath ILIKE %(value)s")
        pg_sub_query.append(f"resources.type = '{__get_resource_db_type_from_type(resource_type)}'")

        with pg_client.PostgresClient() as cur:
            pg_query = f"""SELECT 
                              DISTINCT url_hostpath AS value,
                              %(resource_type)s AS type
                          FROM events.resources INNER JOIN public.sessions USING (session_id) 
                          WHERE {" AND ".join(pg_sub_query)} 
                          LIMIT 10;"""
            cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                               "value": helper.string_to_sql_like(text),
                                               "resource_type": resource_type,
                                               "platform_0": platform}))
            rows = cur.fetchall()
    elif resource_type == 'LOCATION':
        with pg_client.PostgresClient() as cur:
            pg_sub_query.append("path ILIKE %(value)s")
            pg_query = f"""SELECT 
                             DISTINCT path AS value,
                             'LOCATION' AS type
                          FROM events.pages INNER JOIN public.sessions USING (session_id)
                          WHERE {" AND ".join(pg_sub_query)} 
                          LIMIT 10;"""
            cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                               "value": helper.string_to_sql_like(text),
                                               "platform_0": platform}))
            rows = cur.fetchall()
    elif resource_type == "INPUT":
        with pg_client.PostgresClient() as cur:
            pg_sub_query.append("label ILIKE %(value)s")
            pg_query = f"""SELECT DISTINCT label AS value, 'INPUT' AS type
                             FROM events.inputs INNER JOIN public.sessions USING (session_id)
                             WHERE {" AND ".join(pg_sub_query)}
                             LIMIT 10;"""
            cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                               "value": helper.string_to_sql_like(text),
                                               "platform_0": platform}))
            rows = cur.fetchall()
    elif resource_type == "CLICK":
        with pg_client.PostgresClient() as cur:
            pg_sub_query.append("label ILIKE %(value)s")
            pg_query = f"""SELECT DISTINCT label AS value, 'CLICK' AS key
                             FROM events.clicks INNER JOIN public.sessions USING (session_id)
                             WHERE {" AND ".join(pg_sub_query)}
                             LIMIT 10;"""
            cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                               "value": helper.string_to_sql_like(text),
                                               "platform_0": platform}))
            rows = cur.fetchall()
    elif resource_type == "METADATA":
        if key and len(key) > 0 and key in {**METADATA_FIELDS, **SESSIONS_META_FIELDS}.keys():
            if key in METADATA_FIELDS.keys():
                column = METADATA_FIELDS[key]
                pg_sub_query.append(f"{METADATA_FIELDS[key]} ILIKE %(value)s")
            else:
                column = SESSIONS_META_FIELDS[key]
                pg_sub_query.append(f"{SESSIONS_META_FIELDS[key]} ILIKE %(value)s")
            with pg_client.PostgresClient() as cur:
                pg_query = f"""SELECT  DISTINCT {column} AS value,
                                          %(key)s AS key
                                      FROM sessions
                                      WHERE {" AND ".join(pg_sub_query)} 
                                      LIMIT 10;"""
                cur.execute(cur.mogrify(pg_query,
                                        {"project_id": project_id, "value": helper.string_to_sql_like(text), "key": key,
                                         "platform_0": platform}))
                rows = cur.fetchall()
        else:
            with pg_client.PostgresClient() as cur:
                pg_query = []
                for k in METADATA_FIELDS.keys():
                    pg_query.append(f"""(SELECT DISTINCT sessions.{METADATA_FIELDS[k]} AS value,
                                          '{k}' AS key
                                      FROM public.sessions
                                      WHERE {" AND ".join(pg_sub_query)} 
                                            AND {METADATA_FIELDS[k]} ILIKE %(value)s 
                                      LIMIT 10)""")
                for k in SESSIONS_META_FIELDS.keys():
                    if k in ["platform", "country"]:
                        continue
                    pg_query.append(f"""(SELECT DISTINCT sessions.{SESSIONS_META_FIELDS[k]} AS value,
                                          '{k}' AS key
                                      FROM sessions
                                      WHERE {" AND ".join(pg_sub_query)} 
                                            AND sessions.{SESSIONS_META_FIELDS[k]} ILIKE %(value)s 
                                      LIMIT 10)""")
                pg_query = " UNION ALL ".join(pg_query)
                cur.execute(cur.mogrify(pg_query,
                                        {"project_id": project_id, "value": helper.string_to_sql_like(text),
                                         "key": key,
                                         "platform_0": platform}))
                rows = cur.fetchall()
    else:
        return []
    return [helper.dict_to_camel_case(row) for row in rows]


@dev.timed
def get_missing_resources_trend(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                endTimestamp=TimeUTC.now(),
                                density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True, chart=True, data=args)
    pg_sub_query.append("resources.success = FALSE")
    pg_sub_query_chart.append("resources.success = FALSE")
    pg_sub_query.append("resources.type != 'fetch'")
    pg_sub_query_chart.append("resources.type != 'fetch'")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT 
                             resources.url_hostpath AS url,
                             COUNT(resources.session_id) AS sessions
                        FROM events.resources INNER JOIN sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)}
                      GROUP BY url_hostpath
                      ORDER BY sessions DESC
                      LIMIT 10;"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id, "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))

        rows = cur.fetchall()
        # rows = [{"url": i["key"], "sessions": i["doc_count"]} for i in rows]
        if len(rows) == 0:
            return []
        pg_sub_query.append("resources.url_hostpath = %(value)s")
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                              COUNT(resources.session_id) AS count,
                              MAX(resources.timestamp) AS max_datatime
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL ( SELECT resources.session_id,
                                                        resources.timestamp
                                                 FROM events.resources INNER JOIN public.sessions USING (session_id)
                                                 WHERE {" AND ".join(pg_sub_query_chart)}
                             ) AS resources ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        for e in rows:
            e["startedAt"] = startTimestamp
            e["startTimestamp"] = startTimestamp
            e["endTimestamp"] = endTimestamp

            cur.execute(cur.mogrify(pg_query, {"step_size": step_size, "project_id": project_id,
                                               "startTimestamp": startTimestamp,
                                               "endTimestamp": endTimestamp,
                                               "value": e["url"],
                                               **__get_constraint_values(args)}))
            r = cur.fetchall()
            e["endedAt"] = r[-1]["max_datatime"]
            e["chart"] = [{"timestamp": i["timestamp"], "count": i["count"]} for i in r]
    return rows


@dev.timed
def get_network(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                endTimestamp=TimeUTC.now(),
                density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                              resources.url_hostpath, 
                              COUNT(resources.session_id) AS doc_count
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL ( SELECT resources.session_id,
                                                        resources.url_hostpath
                                                 FROM events.resources INNER JOIN public.sessions USING (session_id)
                                                 WHERE {" AND ".join(pg_sub_query_chart)}
                             ) AS resources ON (TRUE)
                        GROUP BY generated_timestamp, resources.url_hostpath
                        ORDER BY generated_timestamp;"""
        cur.execute(cur.mogrify(pg_query, {"step_size": step_size, "project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        r = cur.fetchall()
        results = []

        i = 0
        while i < len(r):
            results.append({"timestamp": r[i]["timestamp"], "domains": []})
            i += 1
            while i < len(r) and r[i]["timestamp"] == results[-1]["timestamp"]:
                results[-1]["domains"].append({r[i]["url_hostpath"]: r[i]["doc_count"]})
                i += 1

    return {"startTimestamp": startTimestamp, "endTimestamp": endTimestamp, "chart": results}


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


@dev.timed
def get_resources_loading_time(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                               endTimestamp=TimeUTC.now(),
                               density=19, type=None, url=None, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)
    if type is not None:
        pg_sub_query.append(f"resources.type = '{__get_resource_db_type_from_type(type)}'")
        pg_sub_query_chart.append(f"resources.type = '{__get_resource_db_type_from_type(type)}'")
    if url is not None:
        pg_sub_query.append(f"resources.url = %(value)s")
        pg_sub_query_chart.append(f"resources.url = %(value)s")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                              COALESCE(AVG(NULLIF(resources.duration,0)),0) AS avg
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL ( SELECT resources.duration
                                                 FROM events.resources INNER JOIN public.sessions USING (session_id)
                                                 WHERE {" AND ".join(pg_sub_query_chart)}
                             ) AS resources ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": url, "type": type, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        if len(rows) > 0:
            pg_query = f"""SELECT COALESCE(AVG(NULLIF(resources.duration,0)),0) AS avg 
                      FROM events.resources INNER JOIN sessions USING(session_id)
                      WHERE {" AND ".join(pg_sub_query)};"""
            cur.execute(cur.mogrify(pg_query, params))
            avg = cur.fetchone()["avg"]
        else:
            avg = 0
    return {"avg": avg, "chart": rows}


@dev.timed
def get_pages_dom_build_time(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                             endTimestamp=TimeUTC.now(), density=19, url=None, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)
    if url is not None:
        pg_sub_query.append(f"pages.path = %(value)s")
        pg_sub_query_chart.append(f"pages.path = %(value)s")
    pg_sub_query.append("pages.dom_building_time>0")
    pg_sub_query_chart.append("pages.dom_building_time>0")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT COALESCE(avg, 0) AS avg, chart
                        FROM (SELECT AVG(dom_building_time)
                              FROM public.sessions
                                       INNER JOIN events.pages USING (session_id)
                              WHERE {" AND ".join(pg_sub_query)}) AS avg
                                 LEFT JOIN
                             (SELECT jsonb_agg(chart) AS chart
                              FROM (
                                       SELECT generated_timestamp                 AS timestamp,
                                              COALESCE(AVG(dom_building_time), 0) AS avg
                                       FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                                LEFT JOIN LATERAL ( SELECT pages.dom_building_time
                                                                    FROM public.sessions
                                                                             INNER JOIN events.pages USING (session_id)
                                                                    WHERE {" AND ".join(pg_sub_query_chart)}
                                           ) AS sessionsBD ON (TRUE)
                                       GROUP BY generated_timestamp
                                       ORDER BY generated_timestamp) AS chart) AS chart ON (TRUE);"""
        params = {"step_size": step_size, "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": url, **__get_constraint_values(args)}

        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return row


@dev.timed
def get_slowest_resources(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                          endTimestamp=TimeUTC.now(), type="all", density=19, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)

    if type is not None and type.upper() != "ALL":
        sq = f"resources.type = '{__get_resource_db_type_from_type(type.upper())}'"
    else:
        sq = "resources.type != 'fetch'"
    pg_sub_query.append(sq)
    pg_sub_query_chart.append(sq)
    pg_sub_query_chart.append("resources.duration IS NOT NULL")
    pg_sub_query_chart.append("resources.duration>0")
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT *
                        FROM (SELECT regexp_replace(resources.url_hostpath, '^.*/', '') AS name,
                                     AVG(NULLIF(resources.duration, 0))                 AS avg
                              FROM events.resources
                                       INNER JOIN public.sessions USING (session_id)
                              WHERE {" AND ".join(pg_sub_query)}
                              GROUP BY name
                              ORDER BY avg DESC
                              LIMIT 10) AS main_list
                                 INNER JOIN LATERAL (
                            SELECT url, type
                            FROM events.resources
                                     INNER JOIN public.sessions USING (session_id)
                            WHERE {" AND ".join(pg_sub_query)}
                              AND resources.url_hostpath ILIKE '%%' || main_list.name
                            ORDER BY resources.duration DESC
                            LIMIT 1
                            ) AS resource_details ON (TRUE)
                                 INNER JOIN LATERAL (
                            SELECT JSONB_AGG(chart_details) AS chart
                            FROM (
                                     SELECT generated_timestamp                  AS timestamp,
                                            COALESCE(AVG(resources.duration), 0) AS avg
                                     FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                              LEFT JOIN LATERAL (
                                         SELECT resources.duration
                                         FROM events.resources
                                                  INNER JOIN public.sessions USING (session_id)
                                         WHERE {" AND ".join(pg_sub_query_chart)}
                                           AND resources.url_hostpath ILIKE '%%' || main_list.name
                                         ) AS resources ON (TRUE)
                                     GROUP BY generated_timestamp
                                     ORDER BY generated_timestamp
                                 ) AS chart_details
                            ) AS chart_details ON (TRUE);"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp,
                                           "step_size": step_size,
                                           **__get_constraint_values(args)}))
        rows = cur.fetchall()
        for r in rows:
            r["type"] = __get_resource_type_from_db_type(r["type"])
    return rows


@dev.timed
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


@dev.timed
def get_speed_index_location(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                             endTimestamp=TimeUTC.now(), **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("pages.speed_index IS NOT NULL")
    pg_sub_query.append("pages.speed_index>0")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT sessions.user_country, AVG(pages.speed_index) AS avg
                        FROM events.pages INNER JOIN public.sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)} 
                        GROUP BY sessions.user_country
                        ORDER BY avg,sessions.user_country;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        if len(rows) > 0:
            pg_query = f"""SELECT AVG(pages.speed_index) AS avg
                                FROM events.pages INNER JOIN public.sessions USING (session_id)
                                WHERE {" AND ".join(pg_sub_query)};"""
            cur.execute(cur.mogrify(pg_query, params))
            avg = cur.fetchone()["avg"]
        else:
            avg = 0
    return {"avg": avg, "chart": helper.list_to_camel_case(rows)}


@dev.timed
def get_pages_response_time(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                            endTimestamp=TimeUTC.now(), density=7, url=None, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("pages.response_time IS NOT NULL")
    pg_sub_query.append("pages.response_time>0")
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True, chart=True,
                                           data=args)
    pg_sub_query_chart.append("pages.response_time IS NOT NULL")
    pg_sub_query_chart.append("pages.response_time>0")

    if url is not None:
        pg_sub_query_chart.append(f"url = %(value)s")
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                                COALESCE(AVG(pages.response_time),0) AS avg
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL (
                                    SELECT response_time
                                    FROM events.pages INNER JOIN public.sessions USING (session_id)
                                    WHERE {" AND ".join(pg_sub_query_chart)}
                            ) AS pages ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "value": url, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        pg_query = f"""SELECT COALESCE(AVG(pages.response_time),0) AS avg
                        FROM events.pages INNER JOIN public.sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)};"""
        cur.execute(cur.mogrify(pg_query, params))
        avg = cur.fetchone()["avg"]
    return {"avg": avg, "chart": rows}


@dev.timed
def get_pages_response_time_distribution(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                         endTimestamp=TimeUTC.now(), density=20, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("pages.response_time IS NOT NULL")
    pg_sub_query.append("pages.response_time>0")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT pages.response_time AS response_time,
                              COUNT(pages.session_id) AS count
                        FROM events.pages INNER JOIN public.sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)} 
                        GROUP BY response_time
                        ORDER BY pages.response_time;"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
        pg_query = f"""SELECT COALESCE(AVG(pages.response_time),0) AS avg
                        FROM events.pages INNER JOIN public.sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)};"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        avg = cur.fetchone()["avg"]
        quantiles_keys = [50, 90, 95, 99]
        pg_query = f"""SELECT pages.response_time AS value
                        FROM events.pages INNER JOIN public.sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)};"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        response_times = cur.fetchall()
        response_times = [i["value"] for i in response_times]
        if len(response_times) > 0:
            quantiles = __quantiles(a=response_times,
                                    q=[i / 100 for i in quantiles_keys],
                                    interpolation='higher')
        else:
            quantiles = [0 for i in range(len(quantiles_keys))]
        result = {
            "avg": avg,
            "total": sum(r["count"] for r in rows),
            "chart": [],
            "percentiles": [{
                "percentile": float(v),
                "responseTime": int(quantiles[i])
            } for i, v in enumerate(quantiles_keys)
            ],
            "extremeValues": [{"count": 0}]
        }
        rows = helper.list_to_camel_case(rows)
        _99 = result["percentiles"][-1]["responseTime"]
        extreme_values_first_index = -1
        for i, r in enumerate(rows):
            if r["responseTime"] > _99:
                extreme_values_first_index = i
                break

        if extreme_values_first_index >= 0:
            extreme_values_first_index += 1
            result["extremeValues"][0]["count"] = sum(r["count"] for r in rows[extreme_values_first_index:])
            rows = rows[:extreme_values_first_index]

        # ------- Merge points to reduce chart length till density
        if density < len(quantiles_keys):
            density = len(quantiles_keys)

        while len(rows) > density:
            true_length = len(rows)
            rows_partitions = []
            offset = 0
            for p in result["percentiles"]:
                rows_partitions.append([])
                for r in rows[offset:]:
                    if r["responseTime"] < p["responseTime"]:
                        rows_partitions[-1].append(r)
                        offset += 1
                    else:
                        break
            rows_partitions.append(rows[offset:])

            largest_partition = 0
            for i in range(len(rows_partitions)):
                if len(rows_partitions[i]) > len(rows_partitions[largest_partition]):
                    largest_partition = i

            if len(rows_partitions[largest_partition]) <= 2:
                break
            # computing lowest merge diff
            diff = rows[-1]["responseTime"]
            for i in range(1, len(rows_partitions[largest_partition]) - 1, 1):
                v1 = rows_partitions[largest_partition][i]
                v2 = rows_partitions[largest_partition][i + 1]
                if (v2["responseTime"] - v1["responseTime"]) < diff:
                    diff = v2["responseTime"] - v1["responseTime"]

            i = 1
            while i < len(rows_partitions[largest_partition]) - 1 and true_length > density - 1:
                v1 = rows_partitions[largest_partition][i]
                v2 = rows_partitions[largest_partition][i + 1]
                if (v2["responseTime"] - v1["responseTime"]) == diff:
                    rows_partitions[largest_partition][i]["count"] += v2["count"]
                    rows_partitions[largest_partition][i]["responseTime"] = v2["responseTime"]
                    del rows_partitions[largest_partition][i + 1]
                    true_length -= 1
                else:
                    i += 1

            rows = [r for rp in rows_partitions for r in rp]

        if extreme_values_first_index == len(rows):
            rows.append({"count": 0, "responseTime": rows[-1]["responseTime"] + 10})

        result["chart"] = rows
    return result


@dev.timed
def get_busiest_time_of_day(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                            endTimestamp=TimeUTC.now(), **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT
                            (EXTRACT(HOUR FROM TO_TIMESTAMP(sessions.start_ts))::INTEGER / 2) * 2 AS hour,
                            COUNT(sessions.session_id) AS count
                        FROM public.sessions
                        WHERE {" AND ".join(pg_sub_query)}
                        GROUP BY hour
                        ORDER BY hour ASC;"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
    return rows


@dev.timed
def get_top_metrics(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                    endTimestamp=TimeUTC.now(), value=None, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)

    if value is not None:
        pg_sub_query.append("pages.path = %(value)s")
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT (SELECT COALESCE(AVG(pages.response_time),0) FROM events.pages INNER JOIN public.sessions USING (session_id) WHERE {" AND ".join(pg_sub_query)} AND pages.response_time>0) AS avg_response_time,
                            (SELECT COUNT(pages.session_id) FROM events.pages INNER JOIN public.sessions USING (session_id) WHERE {" AND ".join(pg_sub_query)}) AS count_requests,
                            (SELECT COALESCE(AVG(pages.first_paint_time),0) FROM events.pages INNER JOIN public.sessions USING (session_id) WHERE {" AND ".join(pg_sub_query)} AND pages.first_paint_time>0) AS avg_first_paint,
                            (SELECT COALESCE(AVG(pages.dom_content_loaded_time),0) FROM events.pages INNER JOIN public.sessions USING (session_id) WHERE {" AND ".join(pg_sub_query)} AND pages.dom_content_loaded_time>0) AS avg_dom_content_loaded,
                            (SELECT COALESCE(AVG(pages.ttfb),0) FROM events.pages INNER JOIN public.sessions USING (session_id) WHERE {" AND ".join(pg_sub_query)} AND pages.ttfb>0) AS avg_till_first_bit,
                            (SELECT COALESCE(AVG(pages.time_to_interactive),0) FROM events.pages INNER JOIN public.sessions USING (session_id) WHERE {" AND ".join(pg_sub_query)} AND pages.time_to_interactive >0) AS avg_time_to_interactive;"""
        print(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp,
                                           "value": value, **__get_constraint_values(args)}))
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp,
                                           "value": value, **__get_constraint_values(args)}))
        row = cur.fetchone()
    return helper.dict_to_camel_case(row)


@dev.timed
def get_time_to_render(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                       endTimestamp=TimeUTC.now(), density=7, url=None, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True,
                                           data=args)
    pg_sub_query.append("pages.visually_complete>0")
    pg_sub_query_chart.append("pages.visually_complete>0")
    if url is not None:
        pg_sub_query_chart.append("pages.path = %(value)s")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT COALESCE(avg,0) AS avg, chart
                        FROM (SELECT AVG(pages.visually_complete)
                                FROM events.pages INNER JOIN public.sessions USING (session_id)
                                WHERE {" AND ".join(pg_sub_query)}) AS avg
                        LEFT JOIN 
                        (SELECT jsonb_agg(chart) AS chart 
                        FROM (SELECT generated_timestamp AS timestamp,
                                       COALESCE(AVG(visually_complete), 0) AS avg
                                FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                     LEFT JOIN LATERAL ( SELECT pages.visually_complete
                                                         FROM events.pages INNER JOIN public.sessions USING (session_id)
                                                         WHERE {" AND ".join(pg_sub_query_chart)}
                                     ) AS pages ON (TRUE)
                                GROUP BY generated_timestamp
                                ORDER BY generated_timestamp) AS chart) AS chart ON(TRUE);"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, "value": url, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        row = cur.fetchone()
    return row


@dev.timed
def get_impacted_sessions_by_slow_pages(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                        endTimestamp=TimeUTC.now(), value=None, density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True, chart=True,
                                           data=args)
    pg_sub_query.append("pages.response_time IS NOT NULL")
    pg_sub_query_chart.append("pages.response_time IS NOT NULL")
    pg_sub_query.append("pages.response_time>0")
    pg_sub_query_chart.append("pages.response_time>0")
    if value is not None:
        pg_sub_query.append("pages.path = %(value)s")
        pg_sub_query_chart.append("pages.path = %(value)s")
    pg_sub_query_chart.append("avg_response_time>0")
    pg_sub_query_chart.append("pages.response_time>avg_response_time*2")
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                              COUNT(pages.session_id) AS count
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN ( SELECT AVG(pages.response_time) AS avg_response_time
                                         FROM events.pages INNER JOIN public.sessions USING (session_id)
                                         WHERE {" AND ".join(pg_sub_query)}
                             ) AS avg_response_time ON (avg_response_time>0)
                        LEFT JOIN LATERAL ( SELECT DISTINCT pages.session_id
                                             FROM events.pages INNER JOIN public.sessions USING (session_id)
                                             WHERE {" AND ".join(pg_sub_query_chart)}
                             ) AS pages ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        cur.execute(cur.mogrify(pg_query, {"step_size": step_size,
                                           "project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp,
                                           "value": value, **__get_constraint_values(args)}))
        rows = cur.fetchall()
    return rows


@dev.timed
def get_memory_consumption(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                            COALESCE(AVG(performance.avg_used_js_heap_size),0) AS avg_used_js_heap_size
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL (
                                SELECT avg_used_js_heap_size 
                                FROM events.performance INNER JOIN public.sessions USING (session_id)
                                WHERE {" AND ".join(pg_sub_query_chart)}
                            ) AS performance ON (TRUE) 
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp ASC;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        pg_query = f"""SELECT COALESCE(AVG(performance.avg_used_js_heap_size),0) AS avg
                        FROM events.performance INNER JOIN public.sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)};"""
        cur.execute(cur.mogrify(pg_query, params))
        avg = cur.fetchone()["avg"]
    return {"avgUsedJsHeapSize": avg, "chart": helper.list_to_camel_case(rows)}


@dev.timed
def get_avg_cpu(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                            COALESCE(AVG(performance.avg_cpu),0) AS avg_cpu
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL (
                                SELECT avg_cpu  
                                FROM events.performance INNER JOIN public.sessions USING (session_id)
                                WHERE {" AND ".join(pg_sub_query_chart)}
                        ) AS performance ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp ASC;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        pg_query = f"""SELECT COALESCE(AVG(performance.avg_cpu),0) AS avg
                        FROM events.performance INNER JOIN public.sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)};"""
        cur.execute(cur.mogrify(pg_query, params))
        avg = cur.fetchone()["avg"]
    return {"avgCpu": avg, "chart": helper.list_to_camel_case(rows)}


@dev.timed
def get_avg_fps(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                              COALESCE(AVG(NULLIF(performance.avg_fps,0)),0) AS avg_fps
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp 
                            LEFT JOIN LATERAL (
                                SELECT avg_fps 
                                FROM events.performance INNER JOIN public.sessions USING (session_id)
                                WHERE {" AND ".join(pg_sub_query_chart)}
                        ) AS performance ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp ASC;"""
        params = {"step_size": step_size,
                  "project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        pg_query = f"""SELECT COALESCE(AVG(NULLIF(performance.avg_fps,0)),0) AS avg
                        FROM events.performance INNER JOIN public.sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)};"""
        cur.execute(cur.mogrify(pg_query, params))
        avg = cur.fetchone()["avg"]
    return {"avgFps": avg, "chart": helper.list_to_camel_case(rows)}


@dev.timed
def get_crashes(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("m_issues.type = 'crash'")
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)
    pg_sub_query_chart.append("m_issues.type = 'crash'")
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                               COUNT(sessions) AS count
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                 LEFT JOIN LATERAL (
                            SELECT sessions.session_id
                            FROM public.sessions
                                     INNER JOIN events_common.issues USING (session_id)
                                     INNER JOIN public.issues AS m_issues USING (issue_id)
                            WHERE {" AND ".join(pg_sub_query_chart)}
                            ) AS sessions ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        cur.execute(cur.mogrify(pg_query, {"step_size": step_size,
                                           "project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp,
                                           **__get_constraint_values(args)}))
        rows = cur.fetchall()
        pg_query = f"""SELECT b.user_browser AS browser,
                                sum(bv.count) AS total,
                                JSONB_AGG(bv) AS versions
                        FROM (
                                 SELECT sessions.user_browser
                                 FROM public.sessions
                                     INNER JOIN events_common.issues USING (session_id)
                                     INNER JOIN public.issues AS m_issues USING (issue_id)
                                 WHERE {" AND ".join(pg_sub_query)}
                                 GROUP BY sessions.user_browser
                                 ORDER BY COUNT(sessions.session_id) DESC
                                 LIMIT 3
                             ) AS b
                                 INNER JOIN LATERAL 
                             (
                                 SELECT sessions.user_browser_version AS version,
                                        COUNT(sessions.session_id) AS count
                                 FROM sessions
                                     INNER JOIN events_common.issues USING (session_id)
                                     INNER JOIN public.issues AS m_issues USING (issue_id)
                                 WHERE {" AND ".join(pg_sub_query)}
                                        AND sessions.user_browser = b.user_browser
                                 GROUP BY sessions.user_browser_version
                                 ORDER BY count DESC
                             ) AS bv ON (TRUE)
                        GROUP BY b.user_browser
                        ORDER BY b.user_browser;"""
        cur.execute(cur.mogrify(pg_query, {"step_size": step_size,
                                           "project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp,
                                           **__get_constraint_values(args)}))
        browsers = cur.fetchall()
        total = sum(r["total"] for r in browsers)
        for r in browsers:
            r["percentage"] = r["total"] / (total / 100)
            versions = []
            for v in r["versions"][:3]:
                versions.append({v["version"]: v["count"] / (r["total"] / 100)})
            r["versions"] = versions

    return {"chart": rows, "browsers": browsers}


def __get_neutral(rows, add_All_if_empty=True):
    neutral = {l: 0 for l in [i for k in [list(v.keys()) for v in rows] for i in k]}
    if add_All_if_empty and len(neutral.keys()) == 0:
        neutral = {"All": 0}
    return neutral


def __merge_rows_with_neutral(rows, neutral):
    for i in range(len(rows)):
        rows[i] = {**neutral, **rows[i]}
    return rows


@dev.timed
def get_domains_errors(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                       endTimestamp=TimeUTC.now(), density=6, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True, chart=True,
                                           data=args)
    pg_sub_query_chart.append("resources.status/100 = %(status_code)s")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                              COALESCE(JSONB_AGG(resources) FILTER ( WHERE resources IS NOT NULL ), '[]'::JSONB) AS keys
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                        LEFT JOIN LATERAL ( SELECT resources.url_host, COUNT(resources.session_id) AS count
                                             FROM events.resources INNER JOIN public.sessions USING (session_id)
                                             WHERE {" AND ".join(pg_sub_query_chart)}
                                             GROUP BY url_host
                                             ORDER BY count DESC
                                             LIMIT 5
                             ) AS resources ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "step_size": step_size,
                  "status_code": 4, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        rows = __nested_array_to_dict_array(rows)
        neutral = __get_neutral(rows)
        rows = __merge_rows_with_neutral(rows, neutral)

        result = {"4xx": rows}
        params["status_code"] = 5
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        rows = __nested_array_to_dict_array(rows)
        neutral = __get_neutral(rows)
        rows = __merge_rows_with_neutral(rows, neutral)
        result["5xx"] = rows
    return result


@dev.timed
def get_domains_errors_4xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), density=6, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True, chart=True,
                                           data=args)
    pg_sub_query_chart.append("resources.status/100 = %(status_code)s")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                                      COALESCE(JSONB_AGG(resources) FILTER ( WHERE resources IS NOT NULL ), '[]'::JSONB) AS keys
                                FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                LEFT JOIN LATERAL ( SELECT resources.url_host, COUNT(resources.session_id) AS count
                                                     FROM events.resources INNER JOIN public.sessions USING (session_id)
                                                     WHERE {" AND ".join(pg_sub_query_chart)}
                                                     GROUP BY url_host
                                                     ORDER BY count DESC
                                                     LIMIT 5
                                     ) AS resources ON (TRUE)
                                GROUP BY generated_timestamp
                                ORDER BY generated_timestamp;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "step_size": step_size,
                  "status_code": 4, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        rows = __nested_array_to_dict_array(rows)
        neutral = __get_neutral(rows)
        rows = __merge_rows_with_neutral(rows, neutral)

        return rows


@dev.timed
def get_domains_errors_5xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), density=6, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True, chart=True,
                                           data=args)
    pg_sub_query_chart.append("resources.status/100 = %(status_code)s")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                                              COALESCE(JSONB_AGG(resources) FILTER ( WHERE resources IS NOT NULL ), '[]'::JSONB) AS keys
                                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                        LEFT JOIN LATERAL ( SELECT resources.url_host, COUNT(resources.session_id) AS count
                                                             FROM events.resources INNER JOIN public.sessions USING (session_id)
                                                             WHERE {" AND ".join(pg_sub_query_chart)}
                                                             GROUP BY url_host
                                                             ORDER BY count DESC
                                                             LIMIT 5
                                             ) AS resources ON (TRUE)
                                        GROUP BY generated_timestamp
                                        ORDER BY generated_timestamp;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp,
                  "step_size": step_size,
                  "status_code": 5, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        rows = __nested_array_to_dict_array(rows)
        neutral = __get_neutral(rows)
        rows = __merge_rows_with_neutral(rows, neutral)

        return rows


def __nested_array_to_dict_array(rows, key="url_host", value="count"):
    for r in rows:
        for i in range(len(r["keys"])):
            r[r["keys"][i][key]] = r["keys"][i][value]
        r.pop("keys")
    return rows


@dev.timed
def get_slowest_domains(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                        endTimestamp=TimeUTC.now(), **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("resources.duration IS NOT NULL")
    pg_sub_query.append("resources.duration>0")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT
                            resources.url_host AS domain,
                            AVG(resources.duration) AS avg
                        FROM events.resources INNER JOIN sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)}
                        GROUP BY resources.url_host
                        ORDER BY avg DESC
                        LIMIT 5;"""
        params = {"project_id": project_id,
                  "startTimestamp": startTimestamp,
                  "endTimestamp": endTimestamp, **__get_constraint_values(args)}
        cur.execute(cur.mogrify(pg_query, params))
        rows = cur.fetchall()
        if len(rows) > 0:
            pg_query = f"""SELECT AVG(resources.duration) AS avg
                            FROM events.resources INNER JOIN sessions USING (session_id)
                            WHERE {" AND ".join(pg_sub_query)};"""
            cur.execute(cur.mogrify(pg_query, params))
            avg = cur.fetchone()["avg"]
        else:
            avg = 0
    return {"avg": avg, "partition": rows}


@dev.timed
def get_errors_per_domains(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("resources.success = FALSE")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT
                            resources.url_host AS domain,
                            COUNT(resources.session_id) AS errors_count
                        FROM events.resources INNER JOIN sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)}
                        GROUP BY resources.url_host
                        ORDER BY errors_count DESC
                        LIMIT 10;"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)


@dev.timed
def get_sessions_per_browser(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                             platform=None, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query2 = pg_sub_query[:]
    pg_sub_query2.append("sessions.user_browser = b.user_browser")
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT b.user_browser AS browser,
                               b.count,
                               jsonb_agg(bv)  AS versions
                        FROM (
                                 SELECT sessions.user_browser,
                                        COUNT(sessions.session_id) AS count
                                 FROM sessions
                                 WHERE {" AND ".join(pg_sub_query)}
                                 GROUP BY sessions.user_browser
                                 ORDER BY count DESC
                                 LIMIT 3
                             ) AS b
                                 INNER JOIN LATERAL
                            (
                            SELECT sessions.user_browser_version,
                                   COUNT(sessions.session_id) AS count
                            FROM public.sessions
                            WHERE {" AND ".join(pg_sub_query2)}
                            GROUP BY sessions.user_browser,
                                     sessions.user_browser_version
                            ORDER BY count DESC
                            LIMIT 3
                            ) AS bv ON (TRUE)
                        GROUP BY b.user_browser, b.count
                        ORDER BY b.count DESC;"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
    for r in rows:
        for j in r["versions"]:
            r[j["user_browser_version"]] = j["count"]
        r.pop("versions")
    return {"count": sum(i["count"] for i in rows), "chart": rows}


@dev.timed
def get_calls_errors(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                     platform=None, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("resources.type = 'fetch'")
    pg_sub_query.append("resources.method IS NOT NULL")
    pg_sub_query.append("resources.status/100 != 2")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT  resources.method,
                               resources.url_hostpath,
                               COUNT(resources.session_id)                           AS all_requests,
                               SUM(CASE WHEN resources.status/100 = 4 THEN 1 ELSE 0 END) AS _4xx,
                               SUM(CASE WHEN resources.status/100 = 5 THEN 1 ELSE 0 END) AS _5xx
                        FROM events.resources INNER JOIN sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)}
                        GROUP BY resources.method, resources.url_hostpath
                        ORDER BY (4 + 5), 3 DESC
                        LIMIT 50;"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)


@dev.timed
def get_calls_errors_4xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                         platform=None, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("resources.type = 'fetch'")
    pg_sub_query.append("resources.method IS NOT NULL")
    pg_sub_query.append("resources.status/100 = 4")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT  resources.method,
                               resources.url_hostpath,
                               COUNT(resources.session_id)                           AS all_requests
                        FROM events.resources INNER JOIN sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)}
                        GROUP BY resources.method, resources.url_hostpath
                        ORDER BY all_requests DESC
                        LIMIT 10;"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)


@dev.timed
def get_calls_errors_5xx(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                         platform=None, **args):
    pg_sub_query = __get_constraints(project_id=project_id, data=args)
    pg_sub_query.append("resources.type = 'fetch'")
    pg_sub_query.append("resources.method IS NOT NULL")
    pg_sub_query.append("resources.status/100 = 5")

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT  resources.method,
                               resources.url_hostpath,
                               COUNT(resources.session_id)                           AS all_requests
                        FROM events.resources INNER JOIN sessions USING (session_id)
                        WHERE {" AND ".join(pg_sub_query)}
                        GROUP BY resources.method, resources.url_hostpath
                        ORDER BY all_requests DESC
                        LIMIT 10;"""
        cur.execute(cur.mogrify(pg_query, {"project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
    return helper.list_to_camel_case(rows)


@dev.timed
def get_errors_per_type(project_id, startTimestamp=TimeUTC.now(delta_days=-1), endTimestamp=TimeUTC.now(),
                        platform=None, density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                               COALESCE(SUM(CASE WHEN type = 'fetch' AND status / 100 = 4 THEN 1 ELSE 0 END), 0) AS _4xx,
                               COALESCE(SUM(CASE WHEN type = 'fetch' AND status / 100 = 5 THEN 1 ELSE 0 END), 0) AS _5xx,
                               COALESCE(SUM(CASE WHEN type = 'js_exception' THEN 1 ELSE 0 END), 0)                         AS js,
                               COALESCE(SUM(CASE WHEN type != 'fetch' AND type != 'js_exception' THEN 1 ELSE 0 END), 0)    AS integrations
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL ((SELECT status, 'fetch' AS type
                                                 FROM events.resources
                                                          INNER JOIN public.sessions USING (session_id)
                                                 WHERE {" AND ".join(pg_sub_query_chart)}
                                                   AND resources.timestamp >= %(startTimestamp)s - %(step_size)s
                                                   AND resources.timestamp < %(endTimestamp)s + %(step_size)s
                                                   AND resources.type = 'fetch'
                                                   AND resources.status > 200)
                                                UNION ALL
                                                (SELECT 0 AS status, m_errors.source::text AS type
                                                 FROM events.errors
                                                          INNER JOIN public.errors AS m_errors USING (error_id)
                                                          INNER JOIN public.sessions USING (session_id)
                                                 WHERE {" AND ".join(pg_sub_query_chart)}
                                                   AND errors.timestamp >= %(startTimestamp)s - %(step_size)s
                                                   AND errors.timestamp < %(endTimestamp)s + %(step_size)s)
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


@dev.timed
def resource_type_vs_response_end(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                  endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)

    params = {"step_size": step_size,
              "project_id": project_id,
              "startTimestamp": startTimestamp,
              "endTimestamp": endTimestamp, **__get_constraint_values(args)}
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                            COUNT(resources.session_id) AS total,
                            SUM(CASE WHEN resources.type='fetch' THEN 1 ELSE 0 END) AS xhr
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL (SELECT resources.session_id, resources.type 
                                                FROM events.resources INNER JOIN public.sessions USING (session_id)
                                                WHERE {" AND ".join(pg_sub_query_chart)}) AS resources ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        cur.execute(cur.mogrify(pg_query, params))
        actions = cur.fetchall()
        pg_sub_query_chart.append("pages.response_end IS NOT NULL")
        pg_sub_query_chart.append("pages.response_end>0")
        pg_query = f"""SELECT generated_timestamp AS timestamp, 
                            COALESCE(AVG(pages.response_end),0) AS avg_response_end
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                             LEFT JOIN LATERAL (SELECT pages.response_end 
                                                FROM events.pages INNER JOIN public.sessions USING (session_id)
                                                WHERE {" AND ".join(pg_sub_query_chart)}) AS pages ON(TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        cur.execute(cur.mogrify(pg_query, params))
        response_end = cur.fetchall()
    return helper.list_to_camel_case(__merge_charts(response_end, actions))


@dev.timed
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

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT *
                        FROM (SELECT   COUNT(DISTINCT errors.session_id) AS sessions_count
                                FROM events.errors 
                                        INNER JOIN public.errors AS m_errors USING (error_id)
                                        INNER JOIN public.sessions USING(session_id)
                                WHERE {" AND ".join(pg_sub_query)}) AS counts
                                LEFT JOIN
                                (SELECT jsonb_agg(chart) AS chart
                                FROM(SELECT generated_timestamp AS timestamp,
                                               COALESCE(COUNT(session_id), 0) AS sessions_count
                                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                             LEFT JOIN LATERAL ( SELECT DISTINCT errors.session_id
                                                                 FROM events.errors 
                                                                        INNER JOIN public.errors AS m_errors USING (error_id)
                                                                        INNER JOIN public.sessions USING (session_id)
                                                                 WHERE {" AND ".join(pg_sub_query_chart)}
                                             ) AS sessions ON (TRUE)
                                        GROUP BY generated_timestamp
                                        ORDER BY generated_timestamp) AS chart) AS chart ON(TRUE);"""
        cur.execute(cur.mogrify(pg_query, {"step_size": step_size,
                                           "project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp,
                                           **__get_constraint_values(args)}))
        row_sessions = cur.fetchone()
        pg_query = f"""SELECT *
                        FROM (SELECT   COUNT(DISTINCT errors.error_id) AS errors_count
                                FROM events.errors 
                                        INNER JOIN public.errors AS m_errors USING (error_id)
                                        INNER JOIN public.sessions USING(session_id)
                                WHERE {" AND ".join(pg_sub_query)}) AS counts
                                LEFT JOIN
                                (SELECT jsonb_agg(chart) AS chart
                                FROM(SELECT generated_timestamp AS timestamp,
                                               COALESCE(COUNT(error_id), 0) AS errors_count
                                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                             LEFT JOIN LATERAL ( SELECT DISTINCT errors.error_id
                                                                 FROM events.errors 
                                                                        INNER JOIN public.errors AS m_errors USING (error_id)
                                                                        INNER JOIN public.sessions USING (session_id)
                                                                 WHERE {" AND ".join(pg_sub_query_chart)}
                                             ) AS errors ON (TRUE)
                                        GROUP BY generated_timestamp
                                        ORDER BY generated_timestamp) AS chart) AS chart ON(TRUE);"""
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


@dev.timed
def get_resources_vs_visually_complete(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                       endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)
    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp                                                             AS timestamp,
                               COALESCE(jsonb_agg(resources_avg_count_by_type)
                                        FILTER ( WHERE resources_avg_count_by_type IS NOT NULL ), '[]'::jsonb) AS types,
                               COALESCE(AVG(total_count), 0)                                                   AS avg_count_resources,
                               COALESCE(AVG(avg_time_to_render), 0)                                            AS avg_time_to_render
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                 LEFT JOIN LATERAL (SELECT resources_count_by_session_by_type.type,
                                                           avg(resources_count_by_session_by_type.count) AS avg_count,
                                                           sum(resources_count_by_session_by_type.count) AS total_count
                                                    FROM (SELECT resources.type, COUNT(resources.url) AS count
                                                            FROM events.resources
                                                                INNER JOIN public.sessions USING (session_id)
                                                            WHERE {" AND ".join(pg_sub_query_chart)}
                                                            GROUP BY resources.session_id, resources.type) AS resources_count_by_session_by_type
                                                    GROUP BY resources_count_by_session_by_type.type) AS resources_avg_count_by_type ON (TRUE)
                                 LEFT JOIN LATERAL (SELECT AVG(visually_complete) AS avg_time_to_render
                                                    FROM events.pages
                                                             INNER JOIN public.sessions USING (session_id)
                                                    WHERE {" AND ".join(pg_sub_query_chart)}
                                                      AND pages.visually_complete > 0) AS time_to_render ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        cur.execute(cur.mogrify(pg_query, {"step_size": step_size,
                                           "project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
    for r in rows:
        r["types"] = {t["type"]: t["avg_count"] for t in r["types"]}

    return helper.list_to_camel_case(rows)


@dev.timed
def get_resources_count_by_type(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                                endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True,
                                           chart=True, data=args)

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp AS timestamp,
                        COALESCE(JSONB_AGG(t) FILTER (WHERE t IS NOT NULL), '[]'::JSONB) AS types
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                            LEFT JOIN LATERAL (SELECT  resources.type, COUNT(resources.session_id) AS count
                                                FROM events.resources INNER JOIN public.sessions USING (session_id)
                                                WHERE {" AND ".join(pg_sub_query_chart)} 
                                                GROUP BY resources.type
                                            ) AS t ON(TRUE)
                        GROUP BY timestamp
                        ORDER BY timestamp;"""
        cur.execute(cur.mogrify(pg_query, {"step_size": step_size,
                                           "project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
        for r in rows:
            for t in r["types"]:
                r[t["type"]] = t["count"]
            r.pop("types")
        rows = __merge_rows_with_neutral(rows, {k: 0 for k in RESOURCS_TYPE_TO_DB_TYPE.keys()})
    return rows


@dev.timed
def get_resources_by_party(project_id, startTimestamp=TimeUTC.now(delta_days=-1),
                           endTimestamp=TimeUTC.now(), density=7, **args):
    step_size = __get_step_size(startTimestamp, endTimestamp, density, factor=1)
    pg_sub_query_chart = __get_constraints(project_id=project_id, time_constraint=True, chart=True,
                                           data=args)
    pg_sub_query_chart.append("resources.success = FALSE")
    pg_sub_query = ["sessions.project_id =%(project_id)s", "rs.type IN ('fetch','script')"]

    with pg_client.PostgresClient() as cur:
        pg_query = f"""SELECT generated_timestamp                                                       AS timestamp,
                               SUM(CASE WHEN first.url_host = sub_resources.url_host THEN 1 ELSE 0 END)  AS first_party,
                               SUM(CASE WHEN first.url_host != sub_resources.url_host THEN 1 ELSE 0 END) AS third_party
                        FROM generate_series(%(startTimestamp)s, %(endTimestamp)s, %(step_size)s) AS generated_timestamp
                                 LEFT JOIN (
                                        SELECT resources.url_host,
                                               COUNT(resources.session_id) AS count
                                        FROM events.resources
                                                 INNER JOIN public.sessions USING (session_id)
                                        WHERE sessions.project_id = '1'
                                          AND resources.type IN ('fetch', 'script')
                                          AND sessions.start_ts > (EXTRACT(EPOCH FROM now() - INTERVAL '31 days') * 1000)::BIGINT
                                          AND resources.timestamp > (EXTRACT(EPOCH FROM now() - INTERVAL '31 days') * 1000)::BIGINT
                                        GROUP BY resources.url_host
                                        ORDER BY count DESC
                                        LIMIT 1
                                    ) AS first ON (TRUE)
                                 LEFT JOIN LATERAL (
                            SELECT resources.url_host
                            FROM events.resources
                                     INNER JOIN public.sessions USING (session_id)
                            WHERE {" AND ".join(pg_sub_query_chart)}
                            ) AS sub_resources ON (TRUE)
                        GROUP BY generated_timestamp
                        ORDER BY generated_timestamp;"""
        cur.execute(cur.mogrify(pg_query, {"step_size": step_size,
                                           "project_id": project_id,
                                           "startTimestamp": startTimestamp,
                                           "endTimestamp": endTimestamp, **__get_constraint_values(args)}))
        rows = cur.fetchall()
    return rows
