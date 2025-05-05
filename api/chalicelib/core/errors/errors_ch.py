import schemas
from chalicelib.core import metadata
from chalicelib.core.errors import errors_legacy
from chalicelib.core.errors.modules import errors_helper
from chalicelib.core.errors.modules import sessions
from chalicelib.utils import ch_client, exp_ch_helper
from chalicelib.utils import helper, metrics_helper
from chalicelib.utils.TimeUTC import TimeUTC


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


def __get_basic_constraints_events(platform=None, time_constraint=True, startTime_arg_name="startDate",
                                   endTime_arg_name="endDate", type_condition=True, project_key="project_id",
                                   table_name=None):
    ch_sub_query = [f"{project_key} =toUInt16(%(project_id)s)"]
    if table_name is not None:
        table_name = table_name + "."
    else:
        table_name = ""
    if type_condition:
        ch_sub_query.append(f"{table_name}`$event_name`='ERROR'")
    if time_constraint:
        ch_sub_query += [f"{table_name}created_at >= toDateTime(%({startTime_arg_name})s/1000)",
                         f"{table_name}created_at < toDateTime(%({endTime_arg_name})s/1000)"]
    # if platform == schemas.PlatformType.MOBILE:
    #     ch_sub_query.append("user_device_type = 'mobile'")
    # elif platform == schemas.PlatformType.DESKTOP:
    #     ch_sub_query.append("user_device_type = 'desktop'")
    return ch_sub_query


def __get_sort_key(key):
    return {
        schemas.ErrorSort.OCCURRENCE: "max_datetime",
        schemas.ErrorSort.USERS_COUNT: "users",
        schemas.ErrorSort.SESSIONS_COUNT: "sessions"
    }.get(key, 'max_datetime')


def search(data: schemas.SearchErrorsSchema, project: schemas.ProjectContext, user_id):
    MAIN_EVENTS_TABLE = exp_ch_helper.get_main_events_table(data.startTimestamp)
    MAIN_SESSIONS_TABLE = exp_ch_helper.get_main_sessions_table(data.startTimestamp)

    platform = None
    for f in data.filters:
        if f.type == schemas.FilterType.PLATFORM and len(f.value) > 0:
            platform = f.value[0]
    ch_sessions_sub_query = errors_helper.__get_basic_constraints_ch(platform, type_condition=False)
    # ignore platform for errors table
    ch_sub_query = __get_basic_constraints_events(None, type_condition=True)
    ch_sub_query.append("JSONExtractString(toString(`$properties`), 'source') = 'js_exception'")

    # To ignore Script error
    ch_sub_query.append("JSONExtractString(toString(`$properties`), 'message') != 'Script error.'")
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
                                                                               project_id=project.project_id,
                                                                               user_id=user_id,
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
                    meta_keys = metadata.get(project_id=project.project_id)
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
        step_size = metrics_helper.get_step_size(data.startTimestamp, data.endTimestamp, data.density)
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
            "project_id": project.project_id,
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
                SELECT details.error_id as error_id,
                        name, message, users, total, 
                        sessions, last_occurrence, first_occurrence, chart
                FROM (SELECT error_id,
                             JSONExtractString(toString(`$properties`), 'name') AS name,
                             JSONExtractString(toString(`$properties`), 'message') AS message,
                             COUNT(DISTINCT user_id)  AS users,
                             COUNT(DISTINCT events.session_id) AS sessions,
                             MAX(created_at)              AS max_datetime,
                             MIN(created_at)              AS min_datetime,
                             COUNT(DISTINCT error_id) 
                                OVER() AS total
                      FROM {MAIN_EVENTS_TABLE} AS events
                            INNER JOIN (SELECT session_id, coalesce(user_id,toString(user_uuid)) AS user_id 
                                        FROM {MAIN_SESSIONS_TABLE} AS s
                                                {subquery_part}
                                        WHERE {" AND ".join(ch_sessions_sub_query)}) AS sessions 
                                                                                    ON (events.session_id = sessions.session_id)
                      WHERE {" AND ".join(ch_sub_query)}
                      GROUP BY error_id, name, message
                      ORDER BY {sort} {order}
                      LIMIT %(errors_limit)s OFFSET %(errors_offset)s) AS details 
                        INNER JOIN (SELECT error_id, 
                                            toUnixTimestamp(MAX(created_at))*1000 AS last_occurrence, 
                                            toUnixTimestamp(MIN(created_at))*1000 AS first_occurrence
                                     FROM {MAIN_EVENTS_TABLE}
                                     WHERE project_id=%(project_id)s
                                        AND `$event_name`='ERROR'
                                     GROUP BY error_id) AS time_details
                ON details.error_id=time_details.error_id
                    INNER JOIN (SELECT error_id, groupArray([timestamp, count]) AS chart
                    FROM (SELECT error_id, 
                                 gs.generate_series AS timestamp,
                                 COUNT(DISTINCT session_id) AS count
                            FROM generate_series(%(startDate)s, %(endDate)s, %(step_size)s) AS gs
                                    LEFT JOIN {MAIN_EVENTS_TABLE} ON(TRUE)
                            WHERE {" AND ".join(ch_sub_query)}
                                AND created_at >= toDateTime(timestamp / 1000)
                                AND created_at < toDateTime((timestamp + %(step_size)s) / 1000)
                            GROUP BY error_id, timestamp
                            ORDER BY timestamp) AS sub_table
                            GROUP BY error_id) AS chart_details ON details.error_id=chart_details.error_id;"""

        # print("------------")
        # print(ch.format(main_ch_query, params))
        # print("------------")
        query = ch.format(query=main_ch_query, parameters=params)

        rows = ch.execute(query=query)
        total = rows[0]["total"] if len(rows) > 0 else 0

    for r in rows:
        r["chart"] = list(r["chart"])
        for i in range(len(r["chart"])):
            r["chart"][i] = {"timestamp": r["chart"][i][0], "count": r["chart"][i][1]}

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
