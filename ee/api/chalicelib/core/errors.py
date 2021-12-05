import json

from chalicelib.core import dashboard
from chalicelib.core import sourcemaps, sessions
from chalicelib.utils import ch_client
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC


def get(error_id, family=False):
    if family:
        return get_batch([error_id])
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            "SELECT * FROM events.errors AS e INNER JOIN public.errors AS re USING(error_id) WHERE error_id = %(error_id)s;",
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


def __flatten_sort_key_count_version(data, merge_nested=False):
    if data is None:
        return []
    return sorted(
        [
            {
                "name": f"{o[0][0][0]}@{v[0]}",
                "count": v[1]
            } for o in data for v in o[2]
        ],
        key=lambda o: o["count"], reverse=True) if merge_nested else \
        [
            {
                "name": o[0][0][0],
                "count": o[1][0][0],
                # "versions": [{"version": v[0], "count": v[1]} for v in o[2]]
            } for o in data
        ]


def __flatten_sort_key_count(data):
    if data is None:
        return []
    return [
        {
            "name": o[0][0][0],
            "count": o[1][0][0]
        } for o in data
    ]


def __rearrange_chart_details(start_at, end_at, density, chart):
    chart = list(chart)
    for i in range(len(chart)):
        chart[i] = {"timestamp": chart[i][0], "count": chart[i][1]}
    chart = dashboard.__complete_missing_steps(rows=chart, start_time=start_at, end_time=end_at, density=density,
                                               neutral={"count": 0})
    return chart


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
        {"name": "country", "partitions": __flatten_sort_key_count(data=row.pop("country_partition"))}
    ]


def get_details(project_id, error_id, user_id, **data):
    # now=TimeUTC.now()
    ch_sub_query24 = __get_basic_constraints(startTime_arg_name="startDate24", endTime_arg_name="endDate24")
    ch_sub_query24.append("error_id = %(error_id)s")
    ch_sub_query30 = __get_basic_constraints(startTime_arg_name="startDate30", endTime_arg_name="endDate30")
    ch_sub_query30.append("error_id = %(error_id)s")
    ch_basic_query = __get_basic_constraints(time_constraint=False)
    ch_basic_query.append("error_id = %(error_id)s")
    with ch_client.ClickHouseClient() as ch:
        data["startDate24"] = TimeUTC.now(-1)
        data["endDate24"] = TimeUTC.now()
        data["startDate30"] = TimeUTC.now(-30)
        data["endDate30"] = TimeUTC.now()
        density24 = int(data.get("density24", 24))
        step_size24 = __get_step_size(data["startDate24"], data["endDate24"], density24)
        density30 = int(data.get("density30", 30))
        step_size30 = __get_step_size(data["startDate30"], data["endDate30"], density30)
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

        main_ch_query = f"""\
        SELECT details.error_id AS error_id,
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
                     COUNT(DISTINCT user_uuid)  AS users,
                     COUNT(DISTINCT session_id) AS sessions
              FROM errors
              WHERE error_id = %(error_id)s
              GROUP BY error_id, name, message) AS details
                 INNER JOIN (SELECT error_id,
                                    toUnixTimestamp(MAX(datetime)) * 1000 AS last_occurrence,
                                    toUnixTimestamp(MIN(datetime)) * 1000 AS first_occurrence
                             FROM errors
                             WHERE error_id = %(error_id)s
                             GROUP BY error_id) AS time_details
                            ON details.error_id = time_details.error_id
                 INNER JOIN (SELECT error_id, session_id AS last_session_id, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_uuid
                             FROM errors
                             WHERE error_id = %(error_id)s
                             ORDER BY datetime DESC
                             LIMIT 1) AS last_session_details ON last_session_details.error_id = details.error_id
                 INNER JOIN (SELECT %(error_id)s                                             AS error_id,
                                    groupArray(
                                            [[[user_browser]], [[toString(count_per_browser)]],versions_partition]) AS browsers_partition
                             FROM (SELECT user_browser,
                                          COUNT(session_id) AS count_per_browser
                                   FROM errors
                                   WHERE {" AND ".join(ch_basic_query)}
                                   GROUP BY user_browser
                                   ORDER BY count_per_browser DESC) AS count_per_browser_query
                                      INNER JOIN (SELECT user_browser,
                                                         groupArray([user_browser_version, toString(count_per_version)]) AS versions_partition
                                                  FROM (SELECT user_browser,
                                                               user_browser_version,
                                                               COUNT(session_id) AS count_per_version
                                                        FROM errors
                                                        WHERE {" AND ".join(ch_basic_query)}
                                                        GROUP BY user_browser, user_browser_version
                                                        ORDER BY count_per_version DESC) AS version_details
                                                  GROUP BY user_browser ) AS browser_version_details USING (user_browser)) AS browser_details
                            ON browser_details.error_id = details.error_id
                 INNER JOIN (SELECT %(error_id)s                                      AS error_id,
                                    groupArray([[[user_os]], [[toString(count_per_os)]],versions_partition]) AS os_partition
                             FROM (SELECT user_os,
                                          COUNT(session_id) AS count_per_os
                                   FROM errors
                                   WHERE {" AND ".join(ch_basic_query)}
                                   GROUP BY user_os
                                   ORDER BY count_per_os DESC) AS count_per_os_details
                                      INNER JOIN (SELECT user_os,
                                                         groupArray([user_os_version, toString(count_per_version)]) AS versions_partition
                                                  FROM (SELECT user_os, user_os_version, COUNT(session_id) AS count_per_version
                                                        FROM errors
                                                        WHERE {" AND ".join(ch_basic_query)}
                                                        GROUP BY user_os, user_os_version
                                                        ORDER BY count_per_version DESC) AS count_per_version_details
                                                  GROUP BY user_os ) AS os_version_details USING (user_os)) AS os_details
                            ON os_details.error_id = details.error_id
                 INNER JOIN (SELECT %(error_id)s                                                          AS error_id,
                                    groupArray(
                                            [[[toString(user_device_type)]], [[toString(count_per_device)]],versions_partition]) AS device_partition
                             FROM (SELECT user_device_type,
                                          COUNT(session_id) AS count_per_device
                                   FROM errors
                                   WHERE {" AND ".join(ch_basic_query)}
                                   GROUP BY user_device_type
                                   ORDER BY count_per_device DESC) AS count_per_device_details
                                      INNER JOIN (SELECT user_device_type,
                                                         groupArray([user_device, toString(count_per_device)]) AS versions_partition
                                                  FROM (SELECT user_device_type,
                                                               COALESCE(user_device,'unknown') AS user_device,
                                                               COUNT(session_id) AS count_per_device
                                                        FROM errors
                                                        WHERE {" AND ".join(ch_basic_query)}
                                                        GROUP BY user_device_type, user_device
                                                        ORDER BY count_per_device DESC) AS count_per_device_details
                                                  GROUP BY user_device_type ) AS device_version_details USING (user_device_type)) AS device_details
                            ON device_details.error_id = details.error_id
                 INNER JOIN (SELECT %(error_id)s                                    AS error_id,
                                    groupArray(
                                            [[[toString(user_country)]], [[toString(count_per_country)]]]) AS country_partition
                             FROM (SELECT user_country,
                                          COUNT(session_id) AS count_per_country
                                   FROM errors
                                   WHERE {" AND ".join(ch_basic_query)}
                                   GROUP BY user_country
                                   ORDER BY count_per_country DESC) AS count_per_country_details) AS country_details
                            ON country_details.error_id = details.error_id
                 INNER JOIN (SELECT %(error_id)s AS error_id, groupArray([timestamp, count]) AS chart24
                             FROM (SELECT toUnixTimestamp(toStartOfInterval(datetime, INTERVAL %(step_size24)s second)) * 1000 AS timestamp,
                                          COUNT(DISTINCT session_id) AS count
                                   FROM errors
                                   WHERE {" AND ".join(ch_sub_query24)}
                                   GROUP BY timestamp
                                   ORDER BY timestamp) AS chart_details) AS chart_details24
                            ON details.error_id = chart_details24.error_id
                 INNER JOIN (SELECT %(error_id)s AS error_id, groupArray([timestamp, count]) AS chart30
                             FROM (SELECT toUnixTimestamp(toStartOfInterval(datetime, INTERVAL %(step_size30)s second)) * 1000 AS timestamp,
                                          COUNT(DISTINCT session_id) AS count
                                   FROM errors
                                   WHERE {" AND ".join(ch_sub_query30)}
                                   GROUP BY timestamp
                                   ORDER BY timestamp) AS chart_details) AS chart_details30
                            ON details.error_id = chart_details30.error_id;"""

        # print("--------------------")
        # print(main_ch_query % params)
        # print("--------------------")
        row = ch.execute(query=main_ch_query, params=params)
    if len(row) == 0:
        return {"errors": ["error not found"]}
    row = row[0]
    row["tags"] = __process_tags(row)
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            f"""SELECT error_id, status, session_id, start_ts, 
                        parent_error_id,session_id, user_anonymous_id,
                        user_id, user_uuid, user_browser, user_browser_version, 
                        user_os, user_os_version, user_device, payload,
                                    COALESCE((SELECT TRUE
                                     FROM public.user_favorite_errors AS fe
                                     WHERE pe.error_id = fe.error_id
                                       AND fe.user_id = %(user_id)s), FALSE) AS favorite,
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
        row["stack"] = format_first_stack_frame(status).pop("stack")
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
    row["chart24"] = __rearrange_chart_details(start_at=data["startDate24"], end_at=data["endDate24"],
                                               density=density24,
                                               chart=row["chart24"])
    row["chart30"] = __rearrange_chart_details(start_at=data["startDate30"], end_at=data["endDate30"],
                                               density=density30,
                                               chart=row["chart30"])
    return {"data": helper.dict_to_camel_case(row)}


def get_details_chart(project_id, error_id, user_id, **data):
    ch_sub_query = __get_basic_constraints()
    ch_sub_query.append("error_id = %(error_id)s")
    with ch_client.ClickHouseClient() as ch:
        if data.get("startDate") is None:
            data["startDate"] = TimeUTC.now(-7)
        else:
            data["startDate"] = int(data["startDate"])
        if data.get("endDate") is None:
            data["endDate"] = TimeUTC.now()
        else:
            data["endDate"] = int(data["endDate"])
        density = int(data.get("density", 7))
        step_size = __get_step_size(data["startDate"], data["endDate"], density)
        params = {
            "startDate": data['startDate'],
            "endDate": data['endDate'],
            "project_id": project_id,
            "userId": user_id,
            "step_size": step_size,
            "error_id": error_id}

        main_ch_query = f"""\
        SELECT browser_details.error_id AS error_id,
               browsers_partition,
               os_partition,
               device_partition,
               country_partition,
               chart
        FROM (SELECT %(error_id)s                                             AS error_id,
                     groupArray([[[user_browser]], [[toString(count_per_browser)]],versions_partition]) AS browsers_partition
              FROM (SELECT user_browser,
                           COUNT(session_id) AS count_per_browser
                    FROM errors
                    WHERE {" AND ".join(ch_sub_query)}
                    GROUP BY user_browser
                    ORDER BY count_per_browser DESC) AS count_per_browser_query
                       INNER JOIN (SELECT user_browser,
                                          groupArray([user_browser_version, toString(count_per_version)]) AS versions_partition
                                   FROM (SELECT user_browser,
                                                user_browser_version,
                                                COUNT(session_id) AS count_per_version
                                         FROM errors
                                         WHERE {" AND ".join(ch_sub_query)}
                                         GROUP BY user_browser, user_browser_version
                                         ORDER BY count_per_version DESC) AS count_per_version_details
                                   GROUP BY user_browser ) AS browesr_version_details USING (user_browser)) AS browser_details
                 INNER JOIN (SELECT %(error_id)s                                   AS error_id,
                                    groupArray(
                                            [[[user_os]], [[toString(count_per_os)]],versions_partition]) AS os_partition
                             FROM (SELECT user_os,
                                          COUNT(session_id) AS count_per_os
                                   FROM errors
                                   WHERE {" AND ".join(ch_sub_query)}
                                   GROUP BY user_os
                                   ORDER BY count_per_os DESC) AS count_per_os_details
                                      INNER JOIN (SELECT user_os,
                                                         groupArray([user_os_version, toString(count_per_version)]) AS versions_partition
                                                  FROM (SELECT user_os, user_os_version, COUNT(session_id) AS count_per_version
                                                        FROM errors
                                                        WHERE {" AND ".join(ch_sub_query)}
                                                        GROUP BY user_os, user_os_version
                                                        ORDER BY count_per_version DESC) AS count_per_version_query
                                                  GROUP BY user_os ) AS os_version_query USING (user_os)) AS os_details
                            ON os_details.error_id = browser_details.error_id
                 INNER JOIN (SELECT %(error_id)s                                                          AS error_id,
                                    groupArray(
                                            [[[toString(user_device_type)]], [[toString(count_per_device)]],versions_partition]) AS device_partition
                             FROM (SELECT user_device_type,
                                          COUNT(session_id) AS count_per_device
                                   FROM errors
                                   WHERE {" AND ".join(ch_sub_query)}
                                   GROUP BY user_device_type
                                   ORDER BY count_per_device DESC) AS count_per_device_details
                                      INNER JOIN (SELECT user_device_type,
                                                         groupArray([user_device, toString(count_per_device)]) AS versions_partition
                                                  FROM (SELECT user_device_type,
                                                               COALESCE(user_device,'unknown') AS user_device,
                                                               COUNT(session_id) AS count_per_device
                                                        FROM errors
                                                        WHERE {" AND ".join(ch_sub_query)}
                                                        GROUP BY user_device_type, user_device
                                                        ORDER BY count_per_device DESC) AS count_per_device_details
                                                  GROUP BY user_device_type ) AS device_version_details USING (user_device_type)) AS device_details
                            ON device_details.error_id = os_details.error_id
                 INNER JOIN (SELECT %(error_id)s                                    AS error_id,
                                    groupArray(
                                            [[[toString(user_country)]], [[toString(count_per_country)]]]) AS country_partition
                             FROM (SELECT user_country,
                                          COUNT(session_id) AS count_per_country
                                   FROM errors
                                   WHERE {" AND ".join(ch_sub_query)}
                                   GROUP BY user_country
                                   ORDER BY count_per_country DESC) AS count_per_country_details) AS country_details
                            ON country_details.error_id = device_details.error_id
                 INNER JOIN (SELECT %(error_id)s AS error_id, groupArray([timestamp, count]) AS chart
                             FROM (SELECT toUnixTimestamp(toStartOfInterval(datetime, INTERVAL %(step_size)s second)) * 1000                       AS timestamp,
                                          COUNT(DISTINCT session_id) AS count
                                   FROM errors
                                   WHERE {" AND ".join(ch_sub_query)}
                                   GROUP BY timestamp
                                   ORDER BY timestamp) AS chart_details) AS chart_details
                            ON country_details.error_id = chart_details.error_id;"""

        # print("--------------------")
        # print(main_ch_query % params)
        row = ch.execute(query=main_ch_query, params=params)
    if len(row) == 0:
        return {"errors": ["error not found"]}
    row = row[0]
    row["tags"] = __process_tags(row)
    row["chart"] = __rearrange_chart_details(start_at=data["startDate"], end_at=data["endDate"], density=density,
                                             chart=row["chart"])
    return {"data": helper.dict_to_camel_case(row)}


def __get_basic_constraints(platform=None, time_constraint=True, startTime_arg_name="startDate",
                            endTime_arg_name="endDate"):
    ch_sub_query = ["project_id =toUInt32(%(project_id)s)"]
    if time_constraint:
        ch_sub_query += [f"datetime >= toDateTime(%({startTime_arg_name})s/1000)",
                         f"datetime < toDateTime(%({endTime_arg_name})s/1000)"]
    if platform == 'mobile':
        ch_sub_query.append("user_device_type = 'mobile'")
    elif platform == 'desktop':
        ch_sub_query.append("user_device_type = 'desktop'")
    return ch_sub_query


def __get_step_size(startTimestamp, endTimestamp, density):
    step_size = (int(endTimestamp) // 1000 - int(startTimestamp) // 1000) // (int(density) - 1)
    return step_size


def __get_sort_key(key):
    return {
        "datetime": "max_datetime",
        "lastOccurrence": "max_datetime",
        "firstOccurrence": "min_datetime"
    }.get(key, 'max_datetime')


def search(data, project_id, user_id, flows=False, status="ALL", favorite_only=False):
    status = status.upper()
    if status.lower() not in ['all', 'unresolved', 'resolved', 'ignored']:
        return {"errors": ["invalid error status"]}
    ch_sub_query = __get_basic_constraints(data.get('platform'))
    ch_sub_query.append("source ='js_exception'")
    statuses = []
    error_ids = None
    if data.get("startDate") is None:
        data["startDate"] = TimeUTC.now(-30)
    if data.get("endDate") is None:
        data["endDate"] = TimeUTC.now(1)
    if len(data.get("events", [])) > 0 or len(data.get("filters", [])) > 0 or status != "ALL" or favorite_only:
        statuses = sessions.search2_pg(data=data, project_id=project_id, user_id=user_id, errors_only=True,
                                       error_status=status, favorite_only=favorite_only)
        error_ids = [e["error_id"] for e in statuses]
        if len(statuses) == 0:
            return {"data": {
                'total': 0,
                'errors': []
            }}
    with ch_client.ClickHouseClient() as ch:
        if data.get("startDate") is None:
            data["startDate"] = TimeUTC.now(-7)
        if data.get("endDate") is None:
            data["endDate"] = TimeUTC.now()
        density = data.get("density", 7)
        step_size = __get_step_size(data["startDate"], data["endDate"], density)
        sort = __get_sort_key('datetime')
        if data.get("sort") is not None:
            sort = __get_sort_key(data["sort"])
        order = "DESC"
        if data.get("order") is not None:
            order = data["order"]

        params = {
            "startDate": data['startDate'],
            "endDate": data['endDate'],
            "project_id": project_id,
            "userId": user_id,
            "step_size": step_size}
        if error_ids is not None:
            params["error_ids"] = tuple(error_ids)
            ch_sub_query.append("error_id IN %(error_ids)s")
        main_ch_query = f"""\
                SELECT COUNT(DISTINCT error_id)  AS count
                  FROM errors
                  WHERE {" AND ".join(ch_sub_query)};"""
        total = ch.execute(query=main_ch_query, params=params)[0]["count"]
        if flows:
            return {"data": {"count": total}}
        if total == 0:
            rows = []
        else:
            main_ch_query = f"""\
                    SELECT details.error_id AS error_id, name, message, users, sessions, last_occurrence, first_occurrence, chart
                    FROM (SELECT error_id,
                                 name,
                                 message,
                                 COUNT(DISTINCT user_uuid)  AS users,
                                 COUNT(DISTINCT session_id) AS sessions,
                                 MAX(datetime)              AS max_datetime,
                                 MIN(datetime)              AS min_datetime
                          FROM errors
                          WHERE {" AND ".join(ch_sub_query)}
                          GROUP BY error_id, name, message
                          ORDER BY {sort} {order}) AS details INNER JOIN (SELECT error_id AS error_id, toUnixTimestamp(MAX(datetime))*1000 AS last_occurrence, toUnixTimestamp(MIN(datetime))*1000 AS first_occurrence
                         FROM errors
                         GROUP BY error_id) AS time_details
                    ON details.error_id=time_details.error_id
                        INNER JOIN (SELECT error_id, groupArray([timestamp, count]) AS chart
                        FROM (SELECT error_id, toUnixTimestamp(toStartOfInterval(datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                                COUNT(DISTINCT session_id) AS count
                                FROM errors
                                WHERE {" AND ".join(ch_sub_query)}
                                GROUP BY error_id, timestamp
                                ORDER BY timestamp) AS sub_table
                                GROUP BY error_id) AS chart_details ON details.error_id=chart_details.error_id;"""

            # print("--------------------")
            # print(main_ch_query % params)
            rows = ch.execute(query=main_ch_query, params=params)
            if len(statuses) == 0:
                with pg_client.PostgresClient() as cur:
                    query = cur.mogrify(
                        """SELECT error_id, status, parent_error_id, payload,
                                COALESCE((SELECT TRUE
                                             FROM public.user_favorite_errors AS fe
                                             WHERE errors.error_id = fe.error_id
                                               AND fe.user_id = %(user_id)s LIMIT 1), FALSE) AS favorite,
                                COALESCE((SELECT TRUE
                                             FROM public.user_viewed_errors AS ve
                                             WHERE errors.error_id = ve.error_id
                                               AND ve.user_id = %(user_id)s LIMIT 1), FALSE) AS viewed
                            FROM public.errors 
                            WHERE project_id = %(project_id)s AND error_id IN %(error_ids)s;""",
                        {"project_id": project_id, "error_ids": tuple([r["error_id"] for r in rows]),
                         "user_id": user_id})
                    cur.execute(query=query)
                    statuses = cur.fetchall()
    statuses = {
        s["error_id"]: s for s in statuses
    }

    for r in rows:
        if r["error_id"] in statuses:
            r["status"] = statuses[r["error_id"]]["status"]
            r["parent_error_id"] = statuses[r["error_id"]]["parent_error_id"]
            r["favorite"] = statuses[r["error_id"]]["favorite"]
            r["viewed"] = statuses[r["error_id"]]["viewed"]
            r["stack"] = format_first_stack_frame(statuses[r["error_id"]])["stack"]
        else:
            r["status"] = "untracked"
            r["parent_error_id"] = None
            r["favorite"] = False
            r["viewed"] = False
            r["stack"] = None

        r["chart"] = list(r["chart"])
        for i in range(len(r["chart"])):
            r["chart"][i] = {"timestamp": r["chart"][i][0], "count": r["chart"][i][1]}
        r["chart"] = dashboard.__complete_missing_steps(rows=r["chart"], start_time=data["startDate"],
                                                        end_time=data["endDate"],
                                                        density=density, neutral={"count": 0})
    offset = len(rows)
    rows = [r for r in rows if r["stack"] is None
            or (len(r["stack"]) == 0 or len(r["stack"]) > 1
                or len(r["stack"]) > 0
                and (r["message"].lower() != "script error." or len(r["stack"][0]["absPath"]) > 0))]
    offset -= len(rows)
    return {
        "data": {
            'total': total - offset,
            'errors': helper.list_to_camel_case(rows)
        }
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
    error = get(error_id=error_id)
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


ACTION_STATE = {
    "unsolve": 'unresolved',
    "solve": 'resolved',
    "ignore": 'ignored'
}


def change_state(project_id, user_id, error_id, action):
    errors = get(error_id, family=True)
    print(len(errors))
    status = ACTION_STATE.get(action)
    if errors is None or len(errors) == 0:
        return {"errors": ["error not found"]}
    if errors[0]["status"] == status:
        return {"errors": [f"error is already {status}"]}

    if errors[0]["status"] == ACTION_STATE["solve"] and status == ACTION_STATE["ignore"]:
        return {"errors": [f"state transition not permitted {errors[0]['status']} -> {status}"]}

    params = {
        "userId": user_id,
        "error_ids": tuple([e["errorId"] for e in errors]),
        "status": status}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """UPDATE public.errors
                SET status = %(status)s
                WHERE error_id IN %(error_ids)s
                RETURNING status""",
            params)
        cur.execute(query=query)
        row = cur.fetchone()
    if row is not None:
        for e in errors:
            e["status"] = row["status"]
    return {"data": errors}


MAX_RANK = 2


def __status_rank(status):
    return {
        'unresolved': MAX_RANK - 2,
        'ignored': MAX_RANK - 1,
        'resolved': MAX_RANK
    }.get(status)


def merge(error_ids):
    error_ids = list(set(error_ids))
    errors = get_batch(error_ids)
    if len(error_ids) <= 1 or len(error_ids) > len(errors):
        return {"errors": ["invalid list of ids"]}
    error_ids = [e["errorId"] for e in errors]
    parent_error_id = error_ids[0]
    status = "unresolved"
    for e in errors:
        if __status_rank(status) < __status_rank(e["status"]):
            status = e["status"]
            if __status_rank(status) == MAX_RANK:
                break
    params = {
        "error_ids": tuple(error_ids),
        "parent_error_id": parent_error_id,
        "status": status
    }
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """UPDATE public.errors
                SET parent_error_id = %(parent_error_id)s, status = %(status)s
                WHERE error_id IN %(error_ids)s OR parent_error_id IN %(error_ids)s;""",
            params)
        cur.execute(query=query)
        # row = cur.fetchone()

    return {"data": "success"}


def format_first_stack_frame(error):
    error["stack"] = sourcemaps.format_payload(error.pop("payload"), truncate_to_first=True)
    for s in error["stack"]:
        for c in s.get("context", []):
            for sci, sc in enumerate(c):
                if isinstance(sc, str) and len(sc) > 1000:
                    c[sci] = sc[:1000]
        # convert bytes to string:
        if isinstance(s["filename"], bytes):
            s["filename"] = s["filename"].decode("utf-8")
    return error


def stats(project_id, user_id, startTimestamp=TimeUTC.now(delta_days=-7), endTimestamp=TimeUTC.now()):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """
                SELECT COUNT(errors.*) AS unresolved_and_unviewed
                FROM public.errors
                         INNER JOIN (SELECT root_error.error_id
                                     FROM events.errors
                                              INNER JOIN public.errors AS root_error USING (error_id)
                                     WHERE project_id =  %(project_id)s
                                       AND timestamp >= %(startTimestamp)s
                                       AND timestamp <= %(endTimestamp)s
                                       AND source = 'js_exception') AS timed_errors USING (error_id)
                         LEFT JOIN (SELECT error_id FROM public.user_viewed_errors WHERE user_id = %(user_id)s) AS user_viewed
                                   USING (error_id)
                WHERE user_viewed.error_id ISNULL
                  AND errors.project_id =  %(project_id)s
                  AND errors.status = 'unresolved'
                  AND errors.source = 'js_exception';""",
            {"project_id": project_id, "user_id": user_id, "startTimestamp": startTimestamp,
             "endTimestamp": endTimestamp})
        cur.execute(query=query)
        row = cur.fetchone()

    return {
        "data": helper.dict_to_camel_case(row)
    }
