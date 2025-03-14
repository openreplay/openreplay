from chalicelib.core.errors.modules import errors_helper

from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.metrics_helper import get_step_size


def __flatten_sort_key_count_version(data, merge_nested=False):
    if data is None:
        return []
    return sorted(
        [
            {
                "name": f'{o["name"]}@{v["version"]}',
                "count": v["count"]
            } for o in data for v in o["partition"]
        ],
        key=lambda o: o["count"], reverse=True) if merge_nested else \
        [
            {
                "name": o["name"],
                "count": o["count"],
            } for o in data
        ]


def __process_tags(row):
    return [
        {"name": "browser", "partitions": __flatten_sort_key_count_version(data=row.get("browsers_partition"))},
        {"name": "browser.ver",
         "partitions": __flatten_sort_key_count_version(data=row.pop("browsers_partition"), merge_nested=True)},
        {"name": "OS", "partitions": __flatten_sort_key_count_version(data=row.get("os_partition"))},
        {"name": "OS.ver",
         "partitions": __flatten_sort_key_count_version(data=row.pop("os_partition"), merge_nested=True)},
        {"name": "device.family", "partitions": __flatten_sort_key_count_version(data=row.get("device_partition"))},
        {"name": "device",
         "partitions": __flatten_sort_key_count_version(data=row.pop("device_partition"), merge_nested=True)},
        {"name": "country", "partitions": row.pop("country_partition")}
    ]


def get_details(project_id, error_id, user_id, **data):
    pg_sub_query24 = errors_helper.__get_basic_constraints(time_constraint=False, chart=True,
                                                           step_size_name="step_size24")
    pg_sub_query24.append("error_id = %(error_id)s")
    pg_sub_query30_session = errors_helper.__get_basic_constraints(time_constraint=True, chart=False,
                                                                   startTime_arg_name="startDate30",
                                                                   endTime_arg_name="endDate30",
                                                                   project_key="sessions.project_id")
    pg_sub_query30_session.append("sessions.start_ts >= %(startDate30)s")
    pg_sub_query30_session.append("sessions.start_ts <= %(endDate30)s")
    pg_sub_query30_session.append("error_id = %(error_id)s")
    pg_sub_query30_err = errors_helper.__get_basic_constraints(time_constraint=True, chart=False,
                                                               startTime_arg_name="startDate30",
                                                               endTime_arg_name="endDate30",
                                                               project_key="errors.project_id")
    pg_sub_query30_err.append("sessions.project_id = %(project_id)s")
    pg_sub_query30_err.append("sessions.start_ts >= %(startDate30)s")
    pg_sub_query30_err.append("sessions.start_ts <= %(endDate30)s")
    pg_sub_query30_err.append("error_id = %(error_id)s")
    pg_sub_query30_err.append("source ='js_exception'")
    pg_sub_query30 = errors_helper.__get_basic_constraints(time_constraint=False, chart=True,
                                                           step_size_name="step_size30")
    pg_sub_query30.append("error_id = %(error_id)s")
    pg_basic_query = errors_helper.__get_basic_constraints(time_constraint=False)
    pg_basic_query.append("error_id = %(error_id)s")
    with pg_client.PostgresClient() as cur:
        data["startDate24"] = TimeUTC.now(-1)
        data["endDate24"] = TimeUTC.now()
        data["startDate30"] = TimeUTC.now(-30)
        data["endDate30"] = TimeUTC.now()
        density24 = int(data.get("density24", 24))
        step_size24 = get_step_size(data["startDate24"], data["endDate24"], density24, factor=1)
        density30 = int(data.get("density30", 30))
        step_size30 = get_step_size(data["startDate30"], data["endDate30"], density30, factor=1)
        params = {
            "startDate24": data['startDate24'],
            "endDate24": data['endDate24'],
            "startDate30": data['startDate30'],
            "endDate30": data['endDate30'],
            "project_id": project_id,
            "userId": user_id,
            "step_size24": step_size24,
            "step_size30": step_size30,
            "error_id": error_id}

        main_pg_query = f"""\
        SELECT error_id,
               name,
               message,
               users,
               sessions,
               last_occurrence,
               first_occurrence,
               last_session_id,
               browsers_partition,
               os_partition,
               device_partition,
               country_partition,
               chart24,
               chart30
        FROM (SELECT error_id,
                     name,
                     message,
                     COUNT(DISTINCT user_id)  AS users,
                     COUNT(DISTINCT session_id) AS sessions
              FROM public.errors
                       INNER JOIN events.errors AS s_errors USING (error_id)
                       INNER JOIN public.sessions USING (session_id)
              WHERE {" AND ".join(pg_sub_query30_err)}
              GROUP BY error_id, name, message) AS details
                 INNER JOIN (SELECT MAX(timestamp) AS last_occurrence,
                                    MIN(timestamp) AS first_occurrence
                             FROM events.errors
                             WHERE error_id = %(error_id)s) AS time_details ON (TRUE)
                 INNER JOIN (SELECT session_id AS last_session_id
                             FROM events.errors
                             WHERE error_id = %(error_id)s
                             ORDER BY errors.timestamp DESC
                             LIMIT 1) AS last_session_details ON (TRUE)
                 INNER JOIN (SELECT jsonb_agg(browser_details) AS browsers_partition
                             FROM (SELECT *
                                   FROM (SELECT user_browser AS name,
                                                COUNT(session_id) AS count
                                         FROM events.errors
                                                  INNER JOIN sessions USING (session_id)
                                         WHERE {" AND ".join(pg_sub_query30_session)}
                                         GROUP BY user_browser
                                         ORDER BY count DESC) AS count_per_browser_query
                                            INNER JOIN LATERAL (SELECT JSONB_AGG(version_details) AS partition
                                                                FROM (SELECT user_browser_version AS version,
                                                                             COUNT(session_id) AS count
                                                                      FROM events.errors INNER JOIN public.sessions USING (session_id)
                                                                      WHERE {" AND ".join(pg_sub_query30_session)}
                                                                        AND sessions.user_browser = count_per_browser_query.name
                                                                      GROUP BY user_browser_version
                                                                      ORDER BY count DESC) AS version_details
                                       ) AS browser_version_details ON (TRUE)) AS browser_details) AS browser_details ON (TRUE)
                 INNER JOIN (SELECT jsonb_agg(os_details) AS os_partition
                             FROM (SELECT *
                                   FROM (SELECT user_os AS name,
                                                COUNT(session_id) AS count
                                         FROM events.errors INNER JOIN public.sessions USING (session_id)
                                         WHERE {" AND ".join(pg_sub_query30_session)}
                                         GROUP BY user_os
                                         ORDER BY count DESC) AS count_per_os_details
                                            INNER JOIN LATERAL (SELECT jsonb_agg(count_per_version_details) AS partition
                                                                FROM (SELECT COALESCE(user_os_version,'unknown') AS version, COUNT(session_id) AS count
                                                                      FROM events.errors INNER JOIN public.sessions USING (session_id)
                                                                      WHERE {" AND ".join(pg_sub_query30_session)}
                                                                        AND sessions.user_os = count_per_os_details.name
                                                                      GROUP BY user_os_version
                                                                      ORDER BY count DESC) AS count_per_version_details
                                                                GROUP BY count_per_os_details.name ) AS os_version_details
                                                       ON (TRUE)) AS os_details) AS os_details ON (TRUE)
                 INNER JOIN (SELECT jsonb_agg(device_details) AS device_partition
                             FROM (SELECT *
                                   FROM (SELECT user_device_type AS name,
                                                COUNT(session_id) AS count
                                         FROM events.errors INNER JOIN public.sessions USING (session_id)
                                         WHERE {" AND ".join(pg_sub_query30_session)}
                                         GROUP BY user_device_type
                                         ORDER BY count DESC) AS count_per_device_details
                                            INNER JOIN LATERAL (SELECT jsonb_agg(count_per_device_v_details) AS partition
                                                                FROM (SELECT CASE
                                                                                 WHEN user_device = '' OR user_device ISNULL
                                                                                     THEN 'unknown'
                                                                                 ELSE user_device END AS version,
                                                                             COUNT(session_id)        AS count
                                                                      FROM events.errors INNER JOIN public.sessions USING (session_id)
                                                                      WHERE {" AND ".join(pg_sub_query30_session)}
                                                                        AND sessions.user_device_type = count_per_device_details.name
                                                                      GROUP BY user_device
                                                                      ORDER BY count DESC) AS count_per_device_v_details
                                                                GROUP BY count_per_device_details.name ) AS device_version_details
                                                       ON (TRUE)) AS device_details) AS device_details ON (TRUE)
                 INNER JOIN (SELECT jsonb_agg(count_per_country_details) AS country_partition
                             FROM (SELECT user_country AS name,
                                          COUNT(session_id) AS count
                                   FROM events.errors INNER JOIN public.sessions USING (session_id)
                                   WHERE {" AND ".join(pg_sub_query30_session)}
                                   GROUP BY user_country
                                   ORDER BY count DESC) AS count_per_country_details) AS country_details ON (TRUE)
                 INNER JOIN (SELECT jsonb_agg(chart_details) AS chart24
                             FROM (SELECT generated_timestamp AS timestamp,
                                          COUNT(session_id)   AS count
                                   FROM generate_series(%(startDate24)s, %(endDate24)s, %(step_size24)s) AS generated_timestamp
                                            LEFT JOIN LATERAL (SELECT DISTINCT session_id
                                                               FROM events.errors
                                                                        INNER JOIN public.sessions USING (session_id)
                                                               WHERE {" AND ".join(pg_sub_query24)}
                                       ) AS chart_details ON (TRUE)
                                   GROUP BY generated_timestamp
                                   ORDER BY generated_timestamp) AS chart_details) AS chart_details24 ON (TRUE)
                 INNER JOIN (SELECT jsonb_agg(chart_details) AS chart30
                             FROM (SELECT generated_timestamp AS timestamp,
                                          COUNT(session_id)   AS count
                                   FROM generate_series(%(startDate30)s, %(endDate30)s, %(step_size30)s) AS generated_timestamp
                                            LEFT JOIN LATERAL (SELECT DISTINCT session_id
                                                               FROM events.errors INNER JOIN public.sessions USING (session_id)
                                                               WHERE {" AND ".join(pg_sub_query30)}) AS chart_details
                                                      ON (TRUE)
                                   GROUP BY timestamp
                                   ORDER BY timestamp) AS chart_details) AS chart_details30 ON (TRUE);
        """

        # print("--------------------")
        # print(cur.mogrify(main_pg_query, params))
        # print("--------------------")
        cur.execute(cur.mogrify(main_pg_query, params))
        row = cur.fetchone()
        if row is None:
            return {"errors": ["error not found"]}
        row["tags"] = __process_tags(row)

        query = cur.mogrify(
            f"""SELECT error_id, status, session_id, start_ts,
                        parent_error_id,session_id, user_anonymous_id,
                        user_id, user_uuid, user_browser, user_browser_version,
                        user_os, user_os_version, user_device, payload,
                                    FALSE AS favorite,
                                       True AS viewed
                                FROM public.errors AS pe
                                         INNER JOIN events.errors AS ee USING (error_id)
                                         INNER JOIN public.sessions USING (session_id)
                                WHERE pe.project_id = %(project_id)s
                                  AND error_id = %(error_id)s
                                ORDER BY start_ts DESC
                                LIMIT 1;""",
            {"project_id": project_id, "error_id": error_id, "user_id": user_id})
        cur.execute(query=query)
        status = cur.fetchone()

    if status is not None:
        row["stack"] = errors_helper.format_first_stack_frame(status).pop("stack")
        row["status"] = status.pop("status")
        row["parent_error_id"] = status.pop("parent_error_id")
        row["favorite"] = status.pop("favorite")
        row["viewed"] = status.pop("viewed")
        row["last_hydrated_session"] = status
    else:
        row["stack"] = []
        row["last_hydrated_session"] = None
        row["status"] = "untracked"
        row["parent_error_id"] = None
        row["favorite"] = False
        row["viewed"] = False
    return {"data": helper.dict_to_camel_case(row)}
