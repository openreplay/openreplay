import schemas
from chalicelib.core import metadata
from chalicelib.core import sessions
from chalicelib.core.metrics import metrics
from chalicelib.utils import ch_client, exp_ch_helper
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC
from . import errors as errors_legacy


def _multiple_values(values, value_key="value"):
    query_values = {}
    if values is not None and isinstance(values, list):
        for i in range(len(values)):
            k = f"{value_key}_{i}"
            query_values[k] = values[i]
    return query_values


def __get_sql_operator(op: schemas.SearchEventOperator):
    return {
        schemas.SearchEventOperator.IS: "=",
        schemas.SearchEventOperator.IS_ANY: "IN",
        schemas.SearchEventOperator.ON: "=",
        schemas.SearchEventOperator.ON_ANY: "IN",
        schemas.SearchEventOperator.IS_NOT: "!=",
        schemas.SearchEventOperator.NOT_ON: "!=",
        schemas.SearchEventOperator.CONTAINS: "ILIKE",
        schemas.SearchEventOperator.NOT_CONTAINS: "NOT ILIKE",
        schemas.SearchEventOperator.STARTS_WITH: "ILIKE",
        schemas.SearchEventOperator.ENDS_WITH: "ILIKE",
    }.get(op, "=")


def _isAny_opreator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator.ON_ANY, schemas.SearchEventOperator.IS_ANY]


def _isUndefined_operator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator.IS_UNDEFINED]


def __is_negation_operator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator.IS_NOT,
                  schemas.SearchEventOperator.NOT_ON,
                  schemas.SearchEventOperator.NOT_CONTAINS]


def _multiple_conditions(condition, values, value_key="value", is_not=False):
    query = []
    for i in range(len(values)):
        k = f"{value_key}_{i}"
        query.append(condition.replace(value_key, k))
    return "(" + (" AND " if is_not else " OR ").join(query) + ")"


def get(error_id, family=False):
    return errors_legacy.get(error_id=error_id, family=family)


def get_batch(error_ids):
    return errors_legacy.get_batch(error_ids=error_ids)


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


def __flatten_sort_key_count(data):
    if data is None:
        return []
    return [
        {
            "name": o[0][0][0],
            "count": o[1][0][0]
        } for o in data
    ]


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

    ch_sub_query24 = __get_basic_constraints(startTime_arg_name="startDate24", endTime_arg_name="endDate24")
    ch_sub_query24.append("error_id = %(error_id)s")

    ch_sub_query30 = __get_basic_constraints(startTime_arg_name="startDate30", endTime_arg_name="endDate30",
                                             project_key="errors.project_id")
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


def __get_basic_constraints(platform=None, time_constraint=True, startTime_arg_name="startDate",
                            endTime_arg_name="endDate", type_condition=True, project_key="project_id", table_name=None):
    ch_sub_query = [f"{project_key} =toUInt16(%(project_id)s)"]
    if table_name is not None:
        table_name = table_name + "."
    else:
        table_name = ""
    if type_condition:
        ch_sub_query.append(f"{table_name}event_type='ERROR'")
    if time_constraint:
        ch_sub_query += [f"{table_name}datetime >= toDateTime(%({startTime_arg_name})s/1000)",
                         f"{table_name}datetime < toDateTime(%({endTime_arg_name})s/1000)"]
    if platform == schemas.PlatformType.MOBILE:
        ch_sub_query.append("user_device_type = 'mobile'")
    elif platform == schemas.PlatformType.DESKTOP:
        ch_sub_query.append("user_device_type = 'desktop'")
    return ch_sub_query


def __get_step_size(startTimestamp, endTimestamp, density):
    step_size = (int(endTimestamp) // 1000 - int(startTimestamp) // 1000) // (int(density) - 1)
    return step_size


def __get_sort_key(key):
    return {
        schemas.ErrorSort.OCCURRENCE: "max_datetime",
        schemas.ErrorSort.USERS_COUNT: "users",
        schemas.ErrorSort.SESSIONS_COUNT: "sessions"
    }.get(key, 'max_datetime')


def search(data: schemas.SearchErrorsSchema, project_id, user_id):
    MAIN_EVENTS_TABLE = exp_ch_helper.get_main_events_table(data.startTimestamp)
    MAIN_SESSIONS_TABLE = exp_ch_helper.get_main_sessions_table(data.startTimestamp)

    platform = None
    for f in data.filters:
        if f.type == schemas.FilterType.PLATFORM and len(f.value) > 0:
            platform = f.value[0]
    ch_sessions_sub_query = __get_basic_constraints(platform, type_condition=False)
    # ignore platform for errors table
    ch_sub_query = __get_basic_constraints(None, type_condition=True)
    ch_sub_query.append("source ='js_exception'")
    # To ignore Script error
    ch_sub_query.append("message!='Script error.'")
    error_ids = None

    if data.startTimestamp is None:
        data.startTimestamp = TimeUTC.now(-7)
    if data.endTimestamp is None:
        data.endTimestamp = TimeUTC.now(1)

    subquery_part = ""
    params = {}
    if len(data.events) > 0:
        errors_condition_count = 0
        for i, e in enumerate(data.events):
            if e.type == schemas.EventType.ERROR:
                errors_condition_count += 1
                is_any = _isAny_opreator(e.operator)
                op = __get_sql_operator(e.operator)
                e_k = f"e_value{i}"
                params = {**params, **_multiple_values(e.value, value_key=e_k)}
                if not is_any and len(e.value) > 0 and e.value[1] not in [None, "*", ""]:
                    ch_sub_query.append(
                        _multiple_conditions(f"(message {op} %({e_k})s OR name {op} %({e_k})s)",
                                             e.value, value_key=e_k))
        if len(data.events) > errors_condition_count:
            subquery_part_args, subquery_part = sessions.search_query_parts_ch(data=data, error_status=data.status,
                                                                               errors_only=True,
                                                                               project_id=project_id, user_id=user_id,
                                                                               issue=None,
                                                                               favorite_only=False)
            subquery_part = f"INNER JOIN {subquery_part} USING(session_id)"
            params = {**params, **subquery_part_args}
    if len(data.filters) > 0:
        meta_keys = None
        # to reduce include a sub-query of sessions inside events query, in order to reduce the selected data
        for i, f in enumerate(data.filters):
            if not isinstance(f.value, list):
                f.value = [f.value]
            filter_type = f.type
            f.value = helper.values_for_operator(value=f.value, op=f.operator)
            f_k = f"f_value{i}"
            params = {**params, f_k: f.value, **_multiple_values(f.value, value_key=f_k)}
            op = __get_sql_operator(f.operator) \
                if filter_type not in [schemas.FilterType.EVENTS_COUNT] else f.operator
            is_any = _isAny_opreator(f.operator)
            is_undefined = _isUndefined_operator(f.operator)
            if not is_any and not is_undefined and len(f.value) == 0:
                continue
            is_not = False
            if __is_negation_operator(f.operator):
                is_not = True
            if filter_type == schemas.FilterType.USER_BROWSER:
                if is_any:
                    ch_sessions_sub_query.append('isNotNull(s.user_browser)')
                else:
                    ch_sessions_sub_query.append(
                        _multiple_conditions(f's.user_browser {op} %({f_k})s', f.value, is_not=is_not,
                                             value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_OS, schemas.FilterType.USER_OS_MOBILE]:
                if is_any:
                    ch_sessions_sub_query.append('isNotNull(s.user_os)')
                else:
                    ch_sessions_sub_query.append(
                        _multiple_conditions(f's.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_DEVICE, schemas.FilterType.USER_DEVICE_MOBILE]:
                if is_any:
                    ch_sessions_sub_query.append('isNotNull(s.user_device)')
                else:
                    ch_sessions_sub_query.append(
                        _multiple_conditions(f's.user_device {op} %({f_k})s', f.value, is_not=is_not,
                                             value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_COUNTRY, schemas.FilterType.USER_COUNTRY_MOBILE]:
                if is_any:
                    ch_sessions_sub_query.append('isNotNull(s.user_country)')
                else:
                    ch_sessions_sub_query.append(
                        _multiple_conditions(f's.user_country {op} %({f_k})s', f.value, is_not=is_not,
                                             value_key=f_k))


            elif filter_type in [schemas.FilterType.UTM_SOURCE]:
                if is_any:
                    ch_sessions_sub_query.append('isNotNull(s.utm_source)')
                elif is_undefined:
                    ch_sessions_sub_query.append('isNull(s.utm_source)')
                else:
                    ch_sessions_sub_query.append(
                        _multiple_conditions(f's.utm_source {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))

            elif filter_type in [schemas.FilterType.UTM_MEDIUM]:
                if is_any:
                    ch_sessions_sub_query.append('isNotNull(s.utm_medium)')
                elif is_undefined:
                    ch_sessions_sub_query.append('isNull(s.utm_medium)')
                else:
                    ch_sessions_sub_query.append(
                        _multiple_conditions(f's.utm_medium {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type in [schemas.FilterType.UTM_CAMPAIGN]:
                if is_any:
                    ch_sessions_sub_query.append('isNotNull(s.utm_campaign)')
                elif is_undefined:
                    ch_sessions_sub_query.append('isNull(s.utm_campaign)')
                else:
                    ch_sessions_sub_query.append(
                        _multiple_conditions(f's.utm_campaign {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))

            elif filter_type == schemas.FilterType.DURATION:
                if len(f.value) > 0 and f.value[0] is not None:
                    ch_sessions_sub_query.append("s.duration >= %(minDuration)s")
                    params["minDuration"] = f.value[0]
                if len(f.value) > 1 and f.value[1] is not None and int(f.value[1]) > 0:
                    ch_sessions_sub_query.append("s.duration <= %(maxDuration)s")
                    params["maxDuration"] = f.value[1]

            elif filter_type == schemas.FilterType.REFERRER:
                # extra_from += f"INNER JOIN {events.EventType.LOCATION.table} AS p USING(session_id)"
                if is_any:
                    referrer_constraint = 'isNotNull(s.base_referrer)'
                else:
                    referrer_constraint = _multiple_conditions(f"s.base_referrer {op} %({f_k})s", f.value,
                                                               is_not=is_not, value_key=f_k)
            elif filter_type == schemas.FilterType.METADATA:
                # get metadata list only if you need it
                if meta_keys is None:
                    meta_keys = metadata.get(project_id=project_id)
                    meta_keys = {m["key"]: m["index"] for m in meta_keys}
                if f.source in meta_keys.keys():
                    if is_any:
                        ch_sessions_sub_query.append(f"isNotNull(s.{metadata.index_to_colname(meta_keys[f.source])})")
                    elif is_undefined:
                        ch_sessions_sub_query.append(f"isNull(s.{metadata.index_to_colname(meta_keys[f.source])})")
                    else:
                        ch_sessions_sub_query.append(
                            _multiple_conditions(
                                f"s.{metadata.index_to_colname(meta_keys[f.source])} {op} toString(%({f_k})s)",
                                f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_ID, schemas.FilterType.USER_ID_MOBILE]:
                if is_any:
                    ch_sessions_sub_query.append('isNotNull(s.user_id)')
                elif is_undefined:
                    ch_sessions_sub_query.append('isNull(s.user_id)')
                else:
                    ch_sessions_sub_query.append(
                        _multiple_conditions(f"s.user_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type in [schemas.FilterType.USER_ANONYMOUS_ID,
                                 schemas.FilterType.USER_ANONYMOUS_ID_MOBILE]:
                if is_any:
                    ch_sessions_sub_query.append('isNotNull(s.user_anonymous_id)')
                elif is_undefined:
                    ch_sessions_sub_query.append('isNull(s.user_anonymous_id)')
                else:
                    ch_sessions_sub_query.append(
                        _multiple_conditions(f"s.user_anonymous_id {op} toString(%({f_k})s)", f.value,
                                             is_not=is_not,
                                             value_key=f_k))

            elif filter_type in [schemas.FilterType.REV_ID, schemas.FilterType.REV_ID_MOBILE]:
                if is_any:
                    ch_sessions_sub_query.append('isNotNull(s.rev_id)')
                elif is_undefined:
                    ch_sessions_sub_query.append('isNull(s.rev_id)')
                else:
                    ch_sessions_sub_query.append(
                        _multiple_conditions(f"s.rev_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))

            elif filter_type == schemas.FilterType.PLATFORM:
                # op = __get_sql_operator(f.operator)
                ch_sessions_sub_query.append(
                    _multiple_conditions(f"s.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
            # elif filter_type == schemas.FilterType.issue:
            #     if is_any:
            #         ch_sessions_sub_query.append("notEmpty(s.issue_types)")
            #     else:
            #         ch_sessions_sub_query.append(f"hasAny(s.issue_types,%({f_k})s)")
            #         # _multiple_conditions(f"%({f_k})s {op} ANY (s.issue_types)", f.value, is_not=is_not,
            #         #                      value_key=f_k))
            #
            #         if is_not:
            #             extra_constraints[-1] = f"not({extra_constraints[-1]})"
            #             ss_constraints[-1] = f"not({ss_constraints[-1]})"
            elif filter_type == schemas.FilterType.EVENTS_COUNT:
                ch_sessions_sub_query.append(
                    _multiple_conditions(f"s.events_count {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))

    with ch_client.ClickHouseClient() as ch:
        step_size = __get_step_size(data.startTimestamp, data.endTimestamp, data.density)
        sort = __get_sort_key('datetime')
        if data.sort is not None:
            sort = __get_sort_key(data.sort)
        order = "DESC"
        if data.order is not None:
            order = data.order
        params = {
            **params,
            "startDate": data.startTimestamp,
            "endDate": data.endTimestamp,
            "project_id": project_id,
            "userId": user_id,
            "step_size": step_size}
        if data.limit is not None and data.page is not None:
            params["errors_offset"] = (data.page - 1) * data.limit
            params["errors_limit"] = data.limit
        else:
            params["errors_offset"] = 0
            params["errors_limit"] = 200
        # if data.bookmarked:
        #     cur.execute(cur.mogrify(f"""SELECT error_id
        #                                FROM public.user_favorite_errors
        #                                WHERE user_id = %(userId)s
        #                                {"" if error_ids is None else "AND error_id IN %(error_ids)s"}""",
        #                             {"userId": user_id, "error_ids": tuple(error_ids or [])}))
        #     error_ids = cur.fetchall()
        #     if len(error_ids) == 0:
        #         return empty_response
        #     error_ids = [e["error_id"] for e in error_ids]

        if error_ids is not None:
            params["error_ids"] = tuple(error_ids)
            ch_sub_query.append("error_id IN %(error_ids)s")

        main_ch_query = f"""\
                SELECT details.error_id AS error_id, 
                        name, message, users, total, viewed,
                        sessions, last_occurrence, first_occurrence, chart
                FROM (SELECT error_id,
                             name,
                             message,
                             COUNT(DISTINCT user_id)  AS users,
                             COUNT(DISTINCT events.session_id) AS sessions,
                             MAX(datetime)              AS max_datetime,
                             MIN(datetime)              AS min_datetime,
                             COUNT(DISTINCT events.error_id) OVER() AS total,
                             any(isNotNull(viewed_error_id)) AS viewed
                      FROM {MAIN_EVENTS_TABLE} AS events
                            LEFT JOIN (SELECT error_id AS viewed_error_id
                                        FROM {exp_ch_helper.get_user_viewed_errors_table()}
                                        WHERE project_id=%(project_id)s
                                            AND user_id=%(userId)s) AS viewed_errors ON(events.error_id=viewed_errors.viewed_error_id)
                            INNER JOIN (SELECT session_id, coalesce(user_id,toString(user_uuid)) AS user_id 
                                        FROM {MAIN_SESSIONS_TABLE} AS s
                                                {subquery_part}
                                        WHERE {" AND ".join(ch_sessions_sub_query)}) AS sessions 
                                                                                    ON (events.session_id = sessions.session_id)
                      WHERE {" AND ".join(ch_sub_query)}
                      GROUP BY error_id, name, message
                      ORDER BY {sort} {order}
                      LIMIT %(errors_limit)s OFFSET %(errors_offset)s) AS details 
                        INNER JOIN (SELECT error_id AS error_id, 
                                            toUnixTimestamp(MAX(datetime))*1000 AS last_occurrence, 
                                            toUnixTimestamp(MIN(datetime))*1000 AS first_occurrence
                                     FROM {MAIN_EVENTS_TABLE}
                                     WHERE project_id=%(project_id)s
                                        AND event_type='ERROR'
                                     GROUP BY error_id) AS time_details
                ON details.error_id=time_details.error_id
                    INNER JOIN (SELECT error_id, groupArray([timestamp, count]) AS chart
                    FROM (SELECT error_id, toUnixTimestamp(toStartOfInterval(datetime, INTERVAL %(step_size)s second)) * 1000 AS timestamp,
                            COUNT(DISTINCT session_id) AS count
                            FROM {MAIN_EVENTS_TABLE}
                            WHERE {" AND ".join(ch_sub_query)}
                            GROUP BY error_id, timestamp
                            ORDER BY timestamp) AS sub_table
                            GROUP BY error_id) AS chart_details ON details.error_id=chart_details.error_id;"""

        # print("------------")
        # print(ch.format(main_ch_query, params))
        # print("------------")

        rows = ch.execute(query=main_ch_query, parameters=params)
        total = rows[0]["total"] if len(rows) > 0 else 0

    for r in rows:
        r["chart"] = list(r["chart"])
        for i in range(len(r["chart"])):
            r["chart"][i] = {"timestamp": r["chart"][i][0], "count": r["chart"][i][1]}
        r["chart"] = metrics.__complete_missing_steps(rows=r["chart"], start_time=data.startTimestamp,
                                                      end_time=data.endTimestamp,
                                                      density=data.density, neutral={"count": 0})
    return {
        'total': total,
        'errors': helper.list_to_camel_case(rows)
    }


def get_trace(project_id, error_id):
    return errors_legacy.get_trace(project_id=project_id, error_id=error_id)


def get_sessions(start_date, end_date, project_id, user_id, error_id):
    return errors_legacy.get_sessions(start_date=start_date,
                                      end_date=end_date,
                                      project_id=project_id,
                                      user_id=user_id,
                                      error_id=error_id)


def change_state(project_id, user_id, error_id, action):
    return errors_legacy.change_state(project_id=project_id, user_id=user_id, error_id=error_id, action=action)


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
