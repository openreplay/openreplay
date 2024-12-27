from decouple import config

import schemas
from . import errors
from chalicelib.core import metrics, metadata
from chalicelib.core import sessions
from chalicelib.utils import ch_client, exp_ch_helper
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC


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
            } for o in data
        ]


def __transform_map_to_tag(data, key1, key2, requested_key):
    result = []
    for i in data:
        if requested_key == 0 and i.get(key1) is None and i.get(key2) is None:
            result.append({"name": "all", "count": int(i.get("count"))})
        elif requested_key == 1 and i.get(key1) is not None and i.get(key2) is None:
            result.append({"name": i.get(key1), "count": int(i.get("count"))})
        elif requested_key == 2 and i.get(key1) is not None and i.get(key2) is not None:
            result.append({"name": i.get(key2), "count": int(i.get("count"))})
    return result


def __process_tags_map(row):
    browsers_partition = row.pop("browsers_partition")
    os_partition = row.pop("os_partition")
    device_partition = row.pop("device_partition")
    country_partition = row.pop("country_partition")
    return [
        {"name": "browser",
         "partitions": __transform_map_to_tag(data=browsers_partition,
                                              key1="browser",
                                              key2="browser_version",
                                              requested_key=1)},
        {"name": "browser.ver",
         "partitions": __transform_map_to_tag(data=browsers_partition,
                                              key1="browser",
                                              key2="browser_version",
                                              requested_key=2)},
        {"name": "OS",
         "partitions": __transform_map_to_tag(data=os_partition,
                                              key1="os",
                                              key2="os_version",
                                              requested_key=1)
         },
        {"name": "OS.ver",
         "partitions": __transform_map_to_tag(data=os_partition,
                                              key1="os",
                                              key2="os_version",
                                              requested_key=2)},
        {"name": "device.family",
         "partitions": __transform_map_to_tag(data=device_partition,
                                              key1="device_type",
                                              key2="device",
                                              requested_key=1)},
        {"name": "device",
         "partitions": __transform_map_to_tag(data=device_partition,
                                              key1="device_type",
                                              key2="device",
                                              requested_key=2)},
        {"name": "country", "partitions": __transform_map_to_tag(data=country_partition,
                                                                 key1="country",
                                                                 key2="",
                                                                 requested_key=1)}
    ]


def get_details(project_id, error_id, user_id, **data):
    MAIN_SESSIONS_TABLE = exp_ch_helper.get_main_sessions_table(0)
    MAIN_ERR_SESS_TABLE = exp_ch_helper.get_main_js_errors_sessions_table(0)
    MAIN_EVENTS_TABLE = exp_ch_helper.get_main_events_table(0)

    ch_sub_query24 = errors.__get_basic_constraints(startTime_arg_name="startDate24", endTime_arg_name="endDate24")
    ch_sub_query24.append("error_id = %(error_id)s")

    ch_sub_query30 = errors.__get_basic_constraints(startTime_arg_name="startDate30", endTime_arg_name="endDate30",
                                                    project_key="errors.project_id")
    ch_sub_query30.append("error_id = %(error_id)s")
    ch_basic_query = errors.__get_basic_constraints(time_constraint=False)
    ch_basic_query.append("error_id = %(error_id)s")

    with ch_client.ClickHouseClient() as ch:
        data["startDate24"] = TimeUTC.now(-1)
        data["endDate24"] = TimeUTC.now()
        data["startDate30"] = TimeUTC.now(-30)
        data["endDate30"] = TimeUTC.now()

        density24 = int(data.get("density24", 24))
        step_size24 = errors.get_step_size(data["startDate24"], data["endDate24"], density24)
        density30 = int(data.get("density30", 30))
        step_size30 = errors.get_step_size(data["startDate30"], data["endDate30"], density30)
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
        WITH pre_processed AS (SELECT error_id,
                                      name,
                                      message,
                                      session_id,
                                      datetime,
                                      user_id,
                                      user_browser,
                                      user_browser_version,
                                      user_os,
                                      user_os_version,
                                      user_device_type,
                                      user_device,
                                      user_country,
                                      error_tags_keys, 
                                      error_tags_values
                               FROM {MAIN_ERR_SESS_TABLE} AS errors
                               WHERE {" AND ".join(ch_basic_query)}
                               )
        SELECT %(error_id)s AS error_id, name, message,users,
                first_occurrence,last_occurrence,last_session_id,
                sessions,browsers_partition,os_partition,device_partition,
                country_partition,chart24,chart30,custom_tags
        FROM (SELECT error_id,
                     name,
                     message
              FROM pre_processed
              LIMIT 1) AS details
                  INNER JOIN (SELECT COUNT(DISTINCT user_id)    AS users,
                                     COUNT(DISTINCT session_id) AS sessions
                              FROM pre_processed
                              WHERE datetime >= toDateTime(%(startDate30)s / 1000)
                                AND datetime <= toDateTime(%(endDate30)s / 1000)
                              ) AS last_month_stats ON TRUE
                  INNER JOIN (SELECT toUnixTimestamp(max(datetime)) * 1000 AS last_occurrence,
                                     toUnixTimestamp(min(datetime)) * 1000 AS first_occurrence
                              FROM pre_processed) AS time_details ON TRUE
                  INNER JOIN (SELECT session_id AS last_session_id,
                                    arrayMap((key, value)->(map(key, value)), error_tags_keys, error_tags_values) AS custom_tags
                              FROM pre_processed
                              ORDER BY datetime DESC
                              LIMIT 1) AS last_session_details ON TRUE
                  INNER JOIN (SELECT groupArray(details) AS browsers_partition
                              FROM (SELECT COUNT(1)                                              AS count,
                                           coalesce(nullIf(user_browser,''),toNullable('unknown')) AS browser,
                                           coalesce(nullIf(user_browser_version,''),toNullable('unknown')) AS browser_version,
                                           map('browser', browser,
                                               'browser_version', browser_version,
                                               'count', toString(count)) AS details
                                    FROM pre_processed
                                    GROUP BY ROLLUP(browser, browser_version)
                                    ORDER BY browser nulls first, browser_version nulls first, count DESC) AS mapped_browser_details
                 ) AS browser_details ON TRUE
                 INNER JOIN (SELECT groupArray(details) AS os_partition
                             FROM (SELECT COUNT(1)                                    AS count,
                                          coalesce(nullIf(user_os,''),toNullable('unknown')) AS os,
                                          coalesce(nullIf(user_os_version,''),toNullable('unknown')) AS os_version,
                                          map('os', os,
                                              'os_version', os_version,
                                              'count', toString(count)) AS details
                                   FROM pre_processed
                                   GROUP BY ROLLUP(os, os_version)
                                   ORDER BY os nulls first, os_version nulls first, count DESC) AS mapped_os_details
                    ) AS os_details ON TRUE
                 INNER JOIN (SELECT groupArray(details) AS device_partition
                             FROM (SELECT COUNT(1)                                            AS count,
                                          coalesce(nullIf(user_device,''),toNullable('unknown')) AS user_device,
                                          map('device_type', toString(user_device_type),
                                              'device', user_device,
                                              'count', toString(count)) AS details
                                   FROM pre_processed
                                   GROUP BY ROLLUP(user_device_type, user_device)
                                   ORDER BY user_device_type nulls first, user_device nulls first, count DESC
                                      ) AS count_per_device_details
                            ) AS mapped_device_details ON TRUE
                 INNER JOIN (SELECT groupArray(details) AS country_partition
                             FROM (SELECT COUNT(1)  AS count,
                                          map('country', toString(user_country),
                                              'count', toString(count)) AS details
                                   FROM pre_processed
                                   GROUP BY user_country
                                   ORDER BY count DESC) AS count_per_country_details
                            ) AS mapped_country_details ON TRUE
                 INNER JOIN (SELECT groupArray(map('timestamp', timestamp, 'count', count)) AS chart24
                             FROM (SELECT toUnixTimestamp(toStartOfInterval(datetime, INTERVAL 3756 second)) *
                                          1000                       AS timestamp,
                                          COUNT(DISTINCT session_id) AS count
                                   FROM {MAIN_EVENTS_TABLE} AS errors
                                   WHERE {" AND ".join(ch_sub_query24)}
                                   GROUP BY timestamp
                                   ORDER BY timestamp) AS chart_details
                            ) AS chart_details24 ON TRUE
                 INNER JOIN (SELECT groupArray(map('timestamp', timestamp, 'count', count)) AS chart30
                             FROM (SELECT toUnixTimestamp(toStartOfInterval(datetime, INTERVAL 3724 second)) *
                                          1000                       AS timestamp,
                                          COUNT(DISTINCT session_id) AS count
                                   FROM {MAIN_EVENTS_TABLE} AS errors
                                   WHERE {" AND ".join(ch_sub_query30)}
                                   GROUP BY timestamp
                                   ORDER BY timestamp) AS chart_details
                            ) AS chart_details30 ON TRUE;"""

        # print("--------------------")
        # print(ch.format(main_ch_query, params))
        # print("--------------------")
        row = ch.execute(query=main_ch_query, parameters=params)
        if len(row) == 0:
            return {"errors": ["error not found"]}
        row = row[0]

        row["tags"] = __process_tags_map(row)

        query = f"""SELECT session_id, toUnixTimestamp(datetime) * 1000 AS start_ts,
                         user_anonymous_id,user_id, user_uuid, user_browser, user_browser_version,
                        user_os, user_os_version, user_device, FALSE AS favorite, True AS viewed
                    FROM {MAIN_SESSIONS_TABLE} AS sessions
                    WHERE project_id = toUInt16(%(project_id)s)
                      AND session_id = %(session_id)s
                    ORDER BY datetime DESC
                    LIMIT 1;"""
        params = {"project_id": project_id, "session_id": row["last_session_id"], "userId": user_id}
        # print("--------------------")
        # print(ch.format(query, params))
        # print("--------------------")
        status = ch.execute(query=query, parameters=params)

    if status is not None:
        status = status[0]
        row["favorite"] = status.pop("favorite")
        row["viewed"] = status.pop("viewed")
        row["last_hydrated_session"] = status
    else:
        row["last_hydrated_session"] = None
        row["favorite"] = False
        row["viewed"] = False
    row["chart24"] = metrics.__complete_missing_steps(start_time=data["startDate24"], end_time=data["endDate24"],
                                                      density=density24, rows=row["chart24"], neutral={"count": 0})
    row["chart30"] = metrics.__complete_missing_steps(start_time=data["startDate30"], end_time=data["endDate30"],
                                                      density=density30, rows=row["chart30"], neutral={"count": 0})
    return {"data": helper.dict_to_camel_case(row)}
