import logging

from chalicelib.core.errors.modules import errors_helper
from chalicelib.utils import ch_client, exp_ch_helper
from chalicelib.utils import helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.metrics_helper import get_step_size

logger = logging.getLogger(__name__)


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

    ch_basic_query = errors_helper.__get_basic_constraints_ch(time_constraint=False)
    ch_basic_query.append("error_id = %(error_id)s")

    with ch_client.ClickHouseClient() as ch:
        data["startDate24"] = TimeUTC.now(-1)
        data["endDate24"] = TimeUTC.now()
        data["startDate30"] = TimeUTC.now(-30)
        data["endDate30"] = TimeUTC.now()

        density24 = int(data.get("density24", 24))
        step_size24 = get_step_size(data["startDate24"], data["endDate24"], density24)
        density30 = int(data.get("density30", 30))
        step_size30 = get_step_size(data["startDate30"], data["endDate30"], density30)
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
                                      toString(`$properties`.name)             AS name,
                                      toString(`$properties`.message)          AS message,
                                      session_id,
                                      created_at                               AS datetime,
                                      `$user_id`                               AS user_id,
                                      `$browser`                               AS user_browser,
                                      `$browser_version`                       AS user_browser_version,
                                      `$os`                                    AS user_os,
                                      '$os_version'                            AS user_os_version,
                                      toString(`$properties`.user_device_type) AS user_device_type,
                                      toString(`$properties`.user_device)      AS user_device,
                                      `$country`                               AS user_country
                               FROM {MAIN_ERR_SESS_TABLE} AS errors
                               WHERE {" AND ".join(ch_basic_query)}
                               )
        SELECT %(error_id)s AS error_id, name, message,users,
                first_occurrence,last_occurrence,last_session_id,
                sessions,browsers_partition,os_partition,device_partition,
                country_partition,chart24,chart30
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
                  INNER JOIN (SELECT session_id AS last_session_id
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
                             FROM (SELECT gs.generate_series         AS timestamp,
                                          COUNT(DISTINCT session_id) AS count
                                   FROM generate_series(%(startDate24)s, %(endDate24)s, %(step_size24)s) AS gs
                                        LEFT JOIN {MAIN_EVENTS_TABLE} AS errors ON(TRUE)
                                   WHERE project_id = toUInt16(%(project_id)s)
                                         AND `$event_name` = 'ERROR'
                                         AND events.created_at >= toDateTime(timestamp / 1000)
                                         AND events.created_at < toDateTime((timestamp + %(step_size24)s) / 1000)
                                         AND error_id = %(error_id)s
                                   GROUP BY timestamp
                                   ORDER BY timestamp) AS chart_details
                            ) AS chart_details24 ON TRUE
                 INNER JOIN (SELECT groupArray(map('timestamp', timestamp, 'count', count)) AS chart30
                             FROM (SELECT gs.generate_series         AS timestamp,
                                          COUNT(DISTINCT session_id) AS count
                                   FROM generate_series(%(startDate30)s, %(endDate30)s, %(step_size30)s) AS gs
                                        LEFT JOIN {MAIN_EVENTS_TABLE} AS errors ON(TRUE)
                                   WHERE project_id = toUInt16(%(project_id)s)
                                         AND `$event_name` = 'ERROR'
                                         AND events.created_at >= toDateTime(timestamp / 1000)
                                         AND events.created_at < toDateTime((timestamp + %(step_size30)s) / 1000)
                                         AND error_id = %(error_id)s
                                   GROUP BY timestamp
                                   ORDER BY timestamp) AS chart_details
                            ) AS chart_details30 ON TRUE;"""

        logger.debug("--------------------")
        logging.debug(ch.format(query=main_ch_query, parameters=params))
        logger.debug("--------------------")
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
        logger.debug("--------------------")
        logging.debug(ch.format(query=query, parameters=params))
        logger.debug("--------------------")
        status = ch.execute(query=query, parameters=params)

    if status is not None and len(status) > 0:
        status = status[0]
        row["favorite"] = status.pop("favorite")
        row["viewed"] = status.pop("viewed")
        row["last_hydrated_session"] = status
    else:
        row["last_hydrated_session"] = None
        row["favorite"] = False
        row["viewed"] = False
    return {"data": helper.dict_to_camel_case(row)}
