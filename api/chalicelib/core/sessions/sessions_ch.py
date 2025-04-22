import logging
from typing import List, Union

import schemas
from chalicelib.core import events, metadata
from . import performance_event, sessions_legacy
from chalicelib.utils import pg_client, helper, metrics_helper, ch_client, exp_ch_helper
from chalicelib.utils import sql_helper as sh

logger = logging.getLogger(__name__)


def search2_series(data: schemas.SessionsSearchPayloadSchema, project_id: int, density: int,
                   metric_type: schemas.MetricType, metric_of: schemas.MetricOfTimeseries | schemas.MetricOfTable,
                   metric_value: List):
    step_size = metrics_helper.get_step_size(endTimestamp=data.endTimestamp, startTimestamp=data.startTimestamp,
                                             density=density, factor=1)
    extra_event = None
    if metric_of == schemas.MetricOfTable.VISITED_URL:
        extra_event = f"""SELECT DISTINCT ev.session_id, ev.url_path
                          FROM {exp_ch_helper.get_main_events_table(data.startTimestamp)} AS ev
                          WHERE ev.created_at >= toDateTime(%(startDate)s / 1000)
                            AND ev.created_at <= toDateTime(%(endDate)s / 1000)
                            AND ev.project_id = %(project_id)s
                            AND ev.`$event_name` = 'LOCATION'"""
    elif metric_of == schemas.MetricOfTable.ISSUES and len(metric_value) > 0:
        data.filters.append(schemas.SessionSearchFilterSchema(value=metric_value, type=schemas.FilterType.ISSUE,
                                                              operator=schemas.SearchEventOperator.IS))
    full_args, query_part = search_query_parts_ch(data=data, error_status=None, errors_only=False,
                                                  favorite_only=False, issue=None, project_id=project_id,
                                                  user_id=None, extra_event=extra_event)
    full_args["step_size"] = step_size
    sessions = []
    with ch_client.ClickHouseClient() as cur:
        if metric_type == schemas.MetricType.TIMESERIES:
            if metric_of == schemas.MetricOfTimeseries.SESSION_COUNT:
                query = f"""SELECT gs.generate_series AS timestamp,
                                   COALESCE(COUNT(DISTINCT processed_sessions.session_id),0) AS count
                            FROM generate_series(%(startDate)s, %(endDate)s, %(step_size)s) AS gs
                                LEFT JOIN (SELECT s.session_id AS session_id,
                                                s.datetime AS datetime
                                            {query_part}) AS processed_sessions ON(TRUE)
                            WHERE processed_sessions.datetime >= toDateTime(timestamp / 1000)
                                AND processed_sessions.datetime < toDateTime((timestamp + %(step_size)s) / 1000)
                            GROUP BY timestamp
                            ORDER BY timestamp;"""
            elif metric_of == schemas.MetricOfTimeseries.USER_COUNT:
                query = f"""SELECT gs.generate_series AS timestamp,
                                COALESCE(COUNT(DISTINCT processed_sessions.user_id),0) AS count
                            FROM generate_series(%(startDate)s, %(endDate)s, %(step_size)s) AS gs
                                LEFT JOIN (SELECT multiIf(s.user_id IS NOT NULL AND s.user_id != '', s.user_id,
                                                         s.user_anonymous_id IS NOT NULL AND s.user_anonymous_id != '', 
                                                         s.user_anonymous_id, toString(s.user_uuid)) AS user_id,
                                                s.datetime AS datetime
                                            {query_part}) AS processed_sessions ON(TRUE)
                            WHERE processed_sessions.datetime >= toDateTime(timestamp / 1000)
                                AND processed_sessions.datetime < toDateTime((timestamp + %(step_size)s) / 1000)
                            GROUP BY timestamp
                            ORDER BY timestamp;"""
            else:
                raise Exception(f"Unsupported metricOf:{metric_of}")
            main_query = cur.format(query=query, parameters=full_args)

            logging.debug("--------------------")
            logging.debug(main_query)
            logging.debug("--------------------")
            sessions = cur.execute(query=main_query)

        elif metric_type == schemas.MetricType.TABLE:
            full_args["limit_s"] = 0
            full_args["limit_e"] = 200
            if isinstance(metric_of, schemas.MetricOfTable):
                main_col = "user_id"
                extra_col = "s.user_id"
                extra_where = ""
                pre_query = ""
                if metric_of == schemas.MetricOfTable.USER_COUNTRY:
                    main_col = "user_country"
                    extra_col = "s.user_country"
                elif metric_of == schemas.MetricOfTable.USER_DEVICE:
                    main_col = "user_device"
                    extra_col = "s.user_device"
                elif metric_of == schemas.MetricOfTable.USER_BROWSER:
                    main_col = "user_browser"
                    extra_col = "s.user_browser"
                elif metric_of == schemas.MetricOfTable.ISSUES:
                    main_col = "issue"
                    extra_col = f"arrayJoin(s.issue_types) AS {main_col}"
                    if len(metric_value) > 0:
                        extra_where = []
                        for i in range(len(metric_value)):
                            arg_name = f"selected_issue_{i}"
                            extra_where.append(f"{main_col} = %({arg_name})s")
                            full_args[arg_name] = metric_value[i]
                        extra_where = f"WHERE ({' OR '.join(extra_where)})"
                elif metric_of == schemas.MetricOfTable.VISITED_URL:
                    main_col = "url_path"
                    extra_col = "s.url_path"
                main_query = cur.format(query=f"""{pre_query}
                                            SELECT COUNT(DISTINCT {main_col}) OVER () AS main_count, 
                                                 {main_col} AS name,
                                                 count(DISTINCT session_id) AS session_count
                                            FROM (SELECT s.session_id AS session_id, 
                                                        {extra_col}
                                            {query_part}
                                            ORDER BY s.session_id desc) AS filtred_sessions
                                            {extra_where}
                                            GROUP BY {main_col}
                                            ORDER BY session_count DESC
                                            LIMIT %(limit_e)s OFFSET %(limit_s)s;""",
                                        parameters=full_args)
            logging.debug("--------------------")
            logging.debug(main_query)
            logging.debug("--------------------")
            sessions = cur.execute(query=main_query)
            # cur.fetchone()
            count = 0
            if len(sessions) > 0:
                count = sessions[0]["main_count"]
                for s in sessions:
                    s.pop("main_count")
            sessions = {"count": count, "values": helper.list_to_camel_case(sessions)}

        return metrics_helper.complete_missing_steps(rows=sessions,
                                                     start_timestamp=data.startTimestamp,
                                                     end_timestamp=data.endTimestamp, step=step_size,
                                                     neutral={"count": 0})


def search2_table(data: schemas.SessionsSearchPayloadSchema, project_id: int, density: int,
                  metric_of: schemas.MetricOfTable, metric_value: List,
                  metric_format: Union[schemas.MetricExtendedFormatType, schemas.MetricExtendedFormatType]):
    step_size = int(metrics_helper.get_step_size(endTimestamp=data.endTimestamp, startTimestamp=data.startTimestamp,
                                                 density=density))
    extra_event = None
    extra_deduplication = []
    extra_conditions = None
    if metric_of == schemas.MetricOfTable.VISITED_URL:
        extra_event = f"""SELECT DISTINCT ev.session_id, 
                             JSONExtractString(toString(ev.`$properties`), 'url_path') AS url_path
                  FROM {exp_ch_helper.get_main_events_table(data.startTimestamp)} AS ev
                  WHERE ev.created_at >= toDateTime(%(startDate)s / 1000)
                    AND ev.created_at <= toDateTime(%(endDate)s / 1000)
                    AND ev.project_id = %(project_id)s
                    AND ev.`$event_name` = 'LOCATION'"""
        extra_deduplication.append("url_path")
        extra_conditions = {}
        for e in data.events:
            if e.type == schemas.EventType.LOCATION:
                if e.operator not in extra_conditions:
                    extra_conditions[e.operator] = schemas.SessionSearchEventSchema2.model_validate({
                        "type": e.type,
                        "isEvent": True,
                        "value": [],
                        "operator": e.operator,
                        "filters": e.filters
                    })
                for v in e.value:
                    if v not in extra_conditions[e.operator].value:
                        extra_conditions[e.operator].value.append(v)
        extra_conditions = list(extra_conditions.values())
    elif metric_of == schemas.MetricOfTable.FETCH:
        extra_event = f"""SELECT DISTINCT ev.session_id, 
                                JSONExtractString(toString(ev.`$properties`), 'url_path') AS url_path
                  FROM {exp_ch_helper.get_main_events_table(data.startTimestamp)} AS ev
                  WHERE ev.created_at >= toDateTime(%(startDate)s / 1000)
                    AND ev.created_at <= toDateTime(%(endDate)s / 1000)
                    AND ev.project_id = %(project_id)s
                    AND ev.`$event_name` = 'REQUEST'"""

        extra_deduplication.append("url_path")
        extra_conditions = {}
        for e in data.events:
            if e.type == schemas.EventType.REQUEST_DETAILS:
                if e.operator not in extra_conditions:
                    extra_conditions[e.operator] = schemas.SessionSearchEventSchema2.model_validate({
                        "type": e.type,
                        "isEvent": True,
                        "value": [],
                        "operator": e.operator,
                        "filters": e.filters
                    })
                for v in e.value:
                    if v not in extra_conditions[e.operator].value:
                        extra_conditions[e.operator].value.append(v)
        extra_conditions = list(extra_conditions.values())

    elif metric_of == schemas.MetricOfTable.ISSUES and len(metric_value) > 0:
        data.filters.append(schemas.SessionSearchFilterSchema(value=metric_value, type=schemas.FilterType.ISSUE,
                                                              operator=schemas.SearchEventOperator.IS))
    full_args, query_part = search_query_parts_ch(data=data, error_status=None, errors_only=False,
                                                  favorite_only=False, issue=None, project_id=project_id,
                                                  user_id=None, extra_event=extra_event,
                                                  extra_deduplication=extra_deduplication,
                                                  extra_conditions=extra_conditions)
    full_args["step_size"] = step_size
    sessions = []
    with ch_client.ClickHouseClient() as cur:
        if isinstance(metric_of, schemas.MetricOfTable):
            full_args["limit"] = data.limit
            full_args["limit_s"] = (data.page - 1) * data.limit
            full_args["limit_e"] = data.page * data.limit

            main_col = "user_id"
            extra_col = ", s.user_id"
            extra_where = ""
            if metric_of == schemas.MetricOfTable.USER_COUNTRY:
                main_col = "user_country"
                extra_col = ", s.user_country"
            elif metric_of == schemas.MetricOfTable.USER_DEVICE:
                main_col = "user_device"
                extra_col = ", s.user_device"
            elif metric_of == schemas.MetricOfTable.USER_BROWSER:
                main_col = "user_browser"
                extra_col = ", s.user_browser"
            elif metric_of == schemas.MetricOfTable.ISSUES:
                main_col = "issue"
                extra_col = f", arrayJoin(s.issue_types) AS {main_col}"
                if len(metric_value) > 0:
                    extra_where = []
                    for i in range(len(metric_value)):
                        arg_name = f"selected_issue_{i}"
                        extra_where.append(f"{main_col} = %({arg_name})s")
                        full_args[arg_name] = metric_value[i]
                    extra_where = f"WHERE ({' OR '.join(extra_where)})"
            elif metric_of == schemas.MetricOfTable.VISITED_URL:
                main_col = "url_path"
                extra_col = ", s.url_path"
            elif metric_of == schemas.MetricOfTable.REFERRER:
                main_col = "referrer"
                extra_col = ", referrer"
                extra_where = "WHERE isNotNull(referrer)"
            elif metric_of == schemas.MetricOfTable.FETCH:
                main_col = "url_path"
                extra_col = ", s.url_path"

            if metric_format == schemas.MetricExtendedFormatType.SESSION_COUNT:
                main_query = f"""SELECT COUNT(DISTINCT {main_col}) OVER () AS main_count, 
                                     {main_col} AS name,
                                     count(DISTINCT session_id) AS total,
                                     COALESCE(SUM(count(DISTINCT session_id)) OVER (), 0) AS total_count
                                FROM (SELECT s.session_id AS session_id {extra_col}
                                {query_part}) AS filtred_sessions
                                {extra_where}
                                GROUP BY {main_col}
                                ORDER BY total DESC
                                LIMIT %(limit)s OFFSET %(limit_s)s;"""
            else:
                main_query = f"""SELECT COUNT(DISTINCT {main_col}) OVER () AS main_count, 
                                     {main_col} AS name,
                                     count(DISTINCT user_id) AS total,
                                     COALESCE(SUM(count(DISTINCT user_id)) OVER (), 0) AS total_count
                                FROM (SELECT s.user_id AS user_id {extra_col}
                                {query_part}
                                WHERE isNotNull(user_id)
                                    AND user_id != '') AS filtred_sessions
                                {extra_where}
                                GROUP BY {main_col}
                                ORDER BY total DESC
                                LIMIT %(limit)s OFFSET %(limit_s)s;"""

            main_query = cur.format(query=main_query, parameters=full_args)
            logging.debug("--------------------")
            logging.debug(main_query)
            logging.debug("--------------------")
            sessions = cur.execute(query=main_query)
            count = 0
            total = 0
            if len(sessions) > 0:
                count = sessions[0]["main_count"]
                total = sessions[0]["total_count"]
                for s in sessions:
                    s.pop("main_count")
                    s.pop("total_count")
            sessions = {"total": count, "count": total, "values": helper.list_to_camel_case(sessions)}

        return sessions


def __is_valid_event(is_any: bool, event: schemas.SessionSearchEventSchema2):
    return not (not is_any and len(event.value) == 0 and event.type not in [schemas.EventType.REQUEST_DETAILS,
                                                                            schemas.EventType.GRAPHQL] \
                or event.type in [schemas.PerformanceEventType.LOCATION_DOM_COMPLETE,
                                  schemas.PerformanceEventType.LOCATION_LARGEST_CONTENTFUL_PAINT_TIME,
                                  schemas.PerformanceEventType.LOCATION_TTFB,
                                  schemas.PerformanceEventType.LOCATION_AVG_CPU_LOAD,
                                  schemas.PerformanceEventType.LOCATION_AVG_MEMORY_USAGE
                                  ] and (event.source is None or len(event.source) == 0) \
                or event.type in [schemas.EventType.REQUEST_DETAILS, schemas.EventType.GRAPHQL] and (
                        event.filters is None or len(event.filters) == 0))


def json_condition(table_alias, json_column, json_key, op, values, value_key, check_existence=False,
                   numeric_check=False, numeric_type="float"):
    """
    Constructs a condition to filter a JSON column dynamically in SQL queries.

    Parameters:
        table_alias (str): Alias of the table (e.g., 'main', 'sub').
        json_column (str): Name of the JSON column (e.g., '$properties').
        json_key (str): Key in the JSON object to extract.
        op (str): SQL operator to apply (e.g., '=', 'ILIKE', etc.).
        values (str | list | tuple): Single value, list of values, or tuple to compare.
        value_key (str): The parameterized key for SQL (e.g., 'custom').
        check_existence (bool): Whether to include a JSONHas condition to check if the key exists.
        numeric_check (bool): Whether to include a numeric check on the extracted value.
        numeric_type (str): Type for numeric extraction, "int" or "float".

    Returns:
        str: The constructed condition.
    """
    if isinstance(values, tuple):
        values = list(values)
    elif not isinstance(values, list):
        values = [values]

    conditions = []

    # Add JSONHas condition if required
    if check_existence:
        conditions.append(f"JSONHas(toString({table_alias}.`{json_column}`), '{json_key}')")

    # Determine the extraction function for numeric checks
    if numeric_check:
        extract_func = "JSONExtractFloat" if numeric_type == "float" else "JSONExtractInt"
        conditions.append(f"{extract_func}(toString({table_alias}.`{json_column}`), '{json_key}') > 0")

    # Add the main condition for value comparison
    if numeric_check:
        extract_func = "JSONExtractFloat" if numeric_type == "float" else "JSONExtractInt"
        condition = f"{extract_func}(toString({table_alias}.`{json_column}`), '{json_key}') {op} %({value_key})s"
    else:
        condition = f"JSONExtractString(toString({table_alias}.`{json_column}`), '{json_key}') {op} %({value_key})s"

    conditions.append(sh.multi_conditions(condition, values, value_key=value_key))

    return " AND ".join(conditions)


# this function generates the query and return the generated-query with the dict of query arguments
def search_query_parts_ch(data: schemas.SessionsSearchPayloadSchema, error_status, errors_only, favorite_only, issue,
                          project_id, user_id, platform="web", extra_event=None, extra_deduplication=[],
                          extra_conditions=None):
    if issue:
        data.filters.append(
            schemas.SessionSearchFilterSchema(value=[issue['type']],
                                              type=schemas.FilterType.ISSUE.value,
                                              operator=schemas.SearchEventOperator.IS.value)
        )
    ss_constraints = []
    full_args = {"project_id": project_id, "startDate": data.startTimestamp, "endDate": data.endTimestamp,
                 "projectId": project_id, "userId": user_id}

    MAIN_EVENTS_TABLE = exp_ch_helper.get_main_events_table(timestamp=data.startTimestamp, platform=platform)
    MAIN_SESSIONS_TABLE = exp_ch_helper.get_main_sessions_table(data.startTimestamp)

    full_args["MAIN_EVENTS_TABLE"] = MAIN_EVENTS_TABLE
    full_args["MAIN_SESSIONS_TABLE"] = MAIN_SESSIONS_TABLE
    extra_constraints = [
        "s.project_id = %(project_id)s",
        "isNotNull(s.duration)"
    ]
    if favorite_only:
        extra_constraints.append(f"""s.session_id IN (SELECT session_id
                                        FROM {exp_ch_helper.get_user_favorite_sessions_table()} AS user_favorite_sessions
                                        WHERE user_id = %(userId)s)""")
    extra_from = ""
    events_query_part = ""
    issues = []
    __events_where_basic = ["project_id = %(projectId)s",
                            "created_at >= toDateTime(%(startDate)s/1000)",
                            "created_at <= toDateTime(%(endDate)s/1000)"]
    events_conditions_where = ["main.project_id = %(projectId)s",
                               "main.created_at >= toDateTime(%(startDate)s/1000)",
                               "main.created_at <= toDateTime(%(endDate)s/1000)"]
    if len(data.filters) > 0:
        meta_keys = None
        # to reduce include a sub-query of sessions inside events query, in order to reduce the selected data
        include_in_events = False
        for i, f in enumerate(data.filters):
            filter_type = f.type
            f.value = helper.values_for_operator(value=f.value, op=f.operator)
            f_k = f"f_value{i}"
            full_args = {**full_args, f_k: sh.single_value(f.value), **sh.multi_values(f.value, value_key=f_k)}
            op = sh.get_sql_operator(f.operator) \
                if filter_type not in [schemas.FilterType.EVENTS_COUNT] else f.operator.value
            is_any = sh.isAny_opreator(f.operator)
            is_undefined = sh.isUndefined_operator(f.operator)
            if not is_any and not is_undefined and len(f.value) == 0:
                continue
            is_not = False
            if sh.is_negation_operator(f.operator):
                is_not = True
            if filter_type == schemas.FilterType.USER_BROWSER:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_browser)')
                    ss_constraints.append('isNotNull(ms.user_browser)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_browser {op} %({f_k})s', f.value, is_not=is_not,
                                            value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_OS, schemas.FilterType.USER_OS_MOBILE]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_os)')
                    ss_constraints.append('isNotNull(ms.user_os)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_DEVICE, schemas.FilterType.USER_DEVICE_MOBILE]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_device)')
                    ss_constraints.append('isNotNull(ms.user_device)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_COUNTRY, schemas.FilterType.USER_COUNTRY_MOBILE]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_country)')
                    ss_constraints.append('isNotNull(ms.user_country)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_country {op} %({f_k})s', f.value, is_not=is_not,
                                            value_key=f_k))

            elif filter_type in schemas.FilterType.USER_CITY:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_city)')
                    ss_constraints.append('isNotNull(ms.user_city)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_city {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_city {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in schemas.FilterType.USER_STATE:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_state)')
                    ss_constraints.append('isNotNull(ms.user_state)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_state {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_state {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.UTM_SOURCE]:
                if is_any:
                    extra_constraints.append('isNotNull(s.utm_source)')
                    ss_constraints.append('isNotNull(ms.utm_source)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.utm_source)')
                    ss_constraints.append('isNull(ms.utm_source)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.utm_source {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.utm_source {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type in [schemas.FilterType.UTM_MEDIUM]:
                if is_any:
                    extra_constraints.append('isNotNull(s.utm_medium)')
                    ss_constraints.append('isNotNull(ms.utm_medium)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.utm_medium)')
                    ss_constraints.append('isNull(ms.utm_medium')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.utm_medium {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.utm_medium {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type in [schemas.FilterType.UTM_CAMPAIGN]:
                if is_any:
                    extra_constraints.append('isNotNull(s.utm_campaign)')
                    ss_constraints.append('isNotNull(ms.utm_campaign)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.utm_campaign)')
                    ss_constraints.append('isNull(ms.utm_campaign)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.utm_campaign {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.utm_campaign {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                            value_key=f_k))

            elif filter_type == schemas.FilterType.DURATION:
                if len(f.value) > 0 and f.value[0] is not None:
                    extra_constraints.append("s.duration >= %(minDuration)s")
                    ss_constraints.append("ms.duration >= %(minDuration)s")
                    full_args["minDuration"] = f.value[0]
                if len(f.value) > 1 and f.value[1] is not None and int(f.value[1]) > 0:
                    extra_constraints.append("s.duration <= %(maxDuration)s")
                    ss_constraints.append("ms.duration <= %(maxDuration)s")
                    full_args["maxDuration"] = f.value[1]
            elif filter_type == schemas.FilterType.REFERRER:
                if is_any:
                    extra_constraints.append('isNotNull(s.base_referrer)')
                    ss_constraints.append('isNotNull(ms.base_referrer)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f"s.base_referrer {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f"ms.base_referrer {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type == events.EventType.METADATA.ui_type:
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
                            sh.multi_conditions(
                                f"s.{metadata.index_to_colname(meta_keys[f.source])} {op} toString(%({f_k})s)",
                                f.value, is_not=is_not, value_key=f_k))
                        ss_constraints.append(
                            sh.multi_conditions(
                                f"ms.{metadata.index_to_colname(meta_keys[f.source])} {op} toString(%({f_k})s)",
                                f.value, is_not=is_not, value_key=f_k))
            elif filter_type in [schemas.FilterType.USER_ID, schemas.FilterType.USER_ID_MOBILE]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_id)')
                    ss_constraints.append('isNotNull(ms.user_id)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.user_id)')
                    ss_constraints.append('isNull(ms.user_id)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f"s.user_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f"ms.user_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type in [schemas.FilterType.USER_ANONYMOUS_ID,
                                 schemas.FilterType.USER_ANONYMOUS_ID_MOBILE]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_anonymous_id)')
                    ss_constraints.append('isNotNull(ms.user_anonymous_id)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.user_anonymous_id)')
                    ss_constraints.append('isNull(ms.user_anonymous_id)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f"s.user_anonymous_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f"ms.user_anonymous_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type in [schemas.FilterType.REV_ID, schemas.FilterType.REV_ID_MOBILE]:
                if is_any:
                    extra_constraints.append('isNotNull(s.rev_id)')
                    ss_constraints.append('isNotNull(ms.rev_id)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.rev_id)')
                    ss_constraints.append('isNull(ms.rev_id)')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f"s.rev_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f"ms.rev_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type == schemas.FilterType.PLATFORM:
                # op = sh.get_sql_operator(f.operator)
                extra_constraints.append(
                    sh.multi_conditions(f"s.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                        value_key=f_k))
                ss_constraints.append(
                    sh.multi_conditions(f"ms.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                        value_key=f_k))
            elif filter_type == schemas.FilterType.ISSUE:
                if is_any:
                    extra_constraints.append("notEmpty(s.issue_types)")
                    ss_constraints.append("notEmpty(ms.issue_types)")
                else:
                    if f.source:
                        issues.append(f)

                    extra_constraints.append(f"hasAny(s.issue_types,%({f_k})s)")
                    # sh.multi_conditions(f"%({f_k})s {op} ANY (s.issue_types)", f.value, is_not=is_not,
                    #                      value_key=f_k))
                    ss_constraints.append(f"hasAny(ms.issue_types,%({f_k})s)")
                    #     sh.multi_conditions(f"%({f_k})s {op} ANY (ms.issue_types)", f.value, is_not=is_not,
                    #                          value_key=f_k))
                    if is_not:
                        extra_constraints[-1] = f"not({extra_constraints[-1]})"
                        ss_constraints[-1] = f"not({ss_constraints[-1]})"
            elif filter_type == schemas.FilterType.EVENTS_COUNT:
                extra_constraints.append(
                    sh.multi_conditions(f"s.events_count {op} %({f_k})s", f.value, is_not=is_not,
                                        value_key=f_k))
                ss_constraints.append(
                    sh.multi_conditions(f"ms.events_count {op} %({f_k})s", f.value, is_not=is_not,
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
            is_any = sh.isAny_opreator(event.operator)
            if not isinstance(event.value, list):
                event.value = [event.value]
            if __is_valid_event(is_any=is_any, event=event):
                valid_events_count += 1
        events_query_from = []
        events_conditions = []
        events_conditions_not = []
        event_index = 0
        or_events = data.events_order == schemas.SearchEventOrder.OR
        for i, event in enumerate(data.events):
            event_type = event.type
            is_any = sh.isAny_opreator(event.operator)
            if not isinstance(event.value, list):
                event.value = [event.value]
            if not __is_valid_event(is_any=is_any, event=event):
                continue
            op = sh.get_sql_operator(event.operator)
            is_not = False
            if sh.is_negation_operator(event.operator):
                is_not = True
                op = sh.reverse_sql_operator(op)
            # if event_index == 0 or or_events:
            # event_from = f"%s INNER JOIN {MAIN_SESSIONS_TABLE} AS ms USING (session_id)"
            event_from = "%s"
            event_where = ["main.project_id = %(projectId)s",
                           "main.created_at >= toDateTime(%(startDate)s/1000)",
                           "main.created_at <= toDateTime(%(endDate)s/1000)"]

            e_k = f"e_value{i}"
            s_k = e_k + "_source"

            event.value = helper.values_for_operator(value=event.value, op=event.operator)
            full_args = {**full_args,
                         **sh.multi_values(event.value, value_key=e_k),
                         **sh.multi_values(event.source, value_key=s_k)}

            if event_type == events.EventType.CLICK.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                if platform == "web":
                    _column = events.EventType.CLICK.column
                    event_where.append(
                        f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if schemas.ClickEventExtraOperator.has_value(event.operator):
                            event_where.append(json_condition(
                                "main",
                                "$properties",
                                "selector", op, event.value, e_k)
                            )
                            events_conditions[-1]["condition"] = event_where[-1]
                        else:
                            if is_not:
                                event_where.append(json_condition(
                                    "sub", "$properties", _column, op, event.value, e_k
                                ))
                                events_conditions_not.append(
                                    {
                                        "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                                events_conditions_not[-1]["condition"] = event_where[-1]
                            else:
                                event_where.append(
                                    json_condition("main", "$properties", _column, op, event.value, e_k)
                                )
                                events_conditions[-1]["condition"] = event_where[-1]
                else:
                    _column = events.EventType.CLICK_MOBILE.column
                    event_where.append(
                        f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if is_not:
                            event_where.append(
                                json_condition("sub", "$properties", _column, op, event.value, e_k)
                            )
                            events_conditions_not.append(
                                {
                                    "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = event_where[-1]
                        else:
                            event_where.append(
                                json_condition("main", "$properties", _column, op, event.value, e_k)
                            )
                            events_conditions[-1]["condition"] = event_where[-1]

            elif event_type == events.EventType.INPUT.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                if platform == "web":
                    _column = events.EventType.INPUT.column
                    event_where.append(
                        f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if is_not:
                            event_where.append(
                                json_condition("sub", "$properties", _column, op, event.value, e_k)
                            )
                            events_conditions_not.append(
                                {
                                    "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = event_where[-1]
                        else:
                            event_where.append(
                                json_condition("main", "$properties", _column, op, event.value, e_k)
                            )
                            events_conditions[-1]["condition"] = event_where[-1]
                    if event.source is not None and len(event.source) > 0:
                        event_where.append(
                            json_condition("main", "$properties", "value", "ILIKE", event.source, f"custom{i}")
                        )

                        full_args = {**full_args, **sh.multi_values(event.source, value_key=f"custom{i}")}
                else:
                    _column = events.EventType.INPUT_MOBILE.column
                    event_where.append(
                        f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if is_not:
                            event_where.append(
                                json_condition("sub", "$properties", _column, op, event.value, e_k)
                            )
                            events_conditions_not.append(
                                {
                                    "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = event_where[-1]
                        else:
                            event_where.append(
                                json_condition("main", "$properties", _column, op, event.value, e_k)
                            )

                            events_conditions[-1]["condition"] = event_where[-1]

            elif event_type == events.EventType.LOCATION.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                if platform == "web":
                    _column = 'url_path'
                    event_where.append(
                        f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if is_not:
                            event_where.append(
                                json_condition("sub", "$properties", _column, op, event.value, e_k)
                            )
                            events_conditions_not.append(
                                {
                                    "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = event_where[-1]
                        else:
                            event_where.append(
                                json_condition("main", "$properties", _column, op, event.value, e_k)
                            )
                            events_conditions[-1]["condition"] = event_where[-1]
                else:
                    _column = events.EventType.VIEW_MOBILE.column
                    event_where.append(
                        f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if is_not:
                            event_where.append(
                                json_condition("sub", "$properties", _column, op, event.value, e_k)
                            )
                            events_conditions_not.append(
                                {
                                    "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = event_where[-1]
                        else:
                            event_where.append(sh.multi_conditions(f"main.{_column} {op} %({e_k})s",
                                                                   event.value, value_key=e_k))
                            events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.CUSTOM.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = events.EventType.CUSTOM.column
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(
                            json_condition("sub", "$properties", _column, op, event.value, e_k)
                        )
                        events_conditions_not.append(
                            {
                                "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(json_condition(
                            "main", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.REQUEST.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = 'url_path'
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(json_condition(
                            "sub", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions_not.append(
                            {
                                "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(json_condition(
                            "main", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions[-1]["condition"] = event_where[-1]

            elif event_type == events.EventType.STATEACTION.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = events.EventType.STATEACTION.column
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(json_condition(
                            "sub", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions_not.append(
                            {
                                "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(json_condition(
                            "main", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions[-1]["condition"] = event_where[-1]
            # TODO: isNot for ERROR
            elif event_type == events.EventType.ERROR.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main"
                events_extra_join = f"SELECT * FROM {MAIN_EVENTS_TABLE} AS main1 WHERE main1.project_id=%(project_id)s"
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                event.source = tuple(event.source)
                events_conditions[-1]["condition"] = []
                if not is_any and event.value not in [None, "*", ""]:
                    event_where.append(
                        sh.multi_conditions(f"(toString(main1.`$properties`.message) {op} %({e_k})s OR toString(main1.`$properties`.name) {op} %({e_k})s)",
                                            event.value, value_key=e_k))
                    events_conditions[-1]["condition"].append(event_where[-1])
                    events_extra_join += f" AND {event_where[-1]}"
                if len(event.source) > 0 and event.source[0] not in [None, "*", ""]:
                    event_where.append(sh.multi_conditions(f"toString(main1.`$properties`.source) = %({s_k})s", event.source, value_key=s_k))
                    events_conditions[-1]["condition"].append(event_where[-1])
                    events_extra_join += f" AND {event_where[-1]}"

                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])

            # ----- Mobile
            elif event_type == events.EventType.CLICK_MOBILE.ui_type:
                _column = events.EventType.CLICK_MOBILE.column
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(json_condition(
                            "sub", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions_not.append(
                            {
                                "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(json_condition(
                            "main", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.INPUT_MOBILE.ui_type:
                _column = events.EventType.INPUT_MOBILE.column
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(json_condition(
                            "sub", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions_not.append(
                            {
                                "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(json_condition(
                            "main", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.VIEW_MOBILE.ui_type:
                _column = events.EventType.VIEW_MOBILE.column
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(json_condition(
                            "sub", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions_not.append(
                            {
                                "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(json_condition(
                            "main", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.CUSTOM_MOBILE.ui_type:
                _column = events.EventType.CUSTOM_MOBILE.column
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(json_condition(
                            "sub", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions_not.append(
                            {
                                "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(json_condition(
                            "main", "$properties", _column, op, event.value, e_k
                        ))

                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.REQUEST_MOBILE.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = 'url_path'
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(json_condition(
                            "sub", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions_not.append(
                            {
                                "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(json_condition(
                            "main", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.CRASH_MOBILE.ui_type:
                _column = events.EventType.CRASH_MOBILE.column
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(json_condition(
                            "sub", "$properties", _column, op, event.value, e_k
                        ))

                        events_conditions_not.append(
                            {
                                "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(json_condition(
                            "main", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.SWIPE_MOBILE.ui_type and platform != "web":
                _column = events.EventType.SWIPE_MOBILE.column
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(json_condition(
                            "sub", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions_not.append(
                            {
                                "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(json_condition(
                            "main", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions[-1]["condition"] = event_where[-1]

            elif event_type == schemas.PerformanceEventType.FETCH_FAILED:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = 'url_path'
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                if not is_any:
                    if is_not:
                        event_where.append(json_condition(
                            "sub", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions_not.append(
                            {
                                "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(json_condition(
                            "main", "$properties", _column, op, event.value, e_k
                        ))
                        events_conditions[-1]["condition"].append(event_where[-1])
                col = performance_event.get_col(event_type)
                colname = col["column"]
                event_where.append(f"main.{colname} = 0")
                events_conditions[-1]["condition"].append(event_where[-1])
                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])

            elif event_type in [schemas.PerformanceEventType.LOCATION_DOM_COMPLETE,
                                schemas.PerformanceEventType.LOCATION_LARGEST_CONTENTFUL_PAINT_TIME,
                                schemas.PerformanceEventType.LOCATION_TTFB]:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                col = performance_event.get_col(event_type)
                colname = col["column"]
                tname = "main"
                if not is_any:
                    event_where.append(json_condition(
                        "main", "$properties", 'url_path', op, event.value, e_k
                    ))
                    events_conditions[-1]["condition"].append(event_where[-1])
                e_k += "_custom"
                full_args = {**full_args, **sh.multi_values(event.source, value_key=e_k)}

                event_where.append(json_condition(
                    tname, "$properties", colname, event.sourceOperator, event.source, e_k, True, True)
                )

                events_conditions[-1]["condition"].append(event_where[-1])
                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])
            # TODO: isNot for PerformanceEvent
            elif event_type in [schemas.PerformanceEventType.LOCATION_AVG_CPU_LOAD,
                                schemas.PerformanceEventType.LOCATION_AVG_MEMORY_USAGE]:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                col = performance_event.get_col(event_type)
                colname = col["column"]
                tname = "main"
                if not is_any:
                    event_where.append(json_condition(
                        "main", "$properties", 'url_path', op, event.value, e_k
                    ))
                    events_conditions[-1]["condition"].append(event_where[-1])
                e_k += "_custom"
                full_args = {**full_args, **sh.multi_values(event.source, value_key=e_k)}

                event_where.append(json_condition(
                    tname, "$properties", colname, event.sourceOperator, event.source, e_k, True, True)
                )

                events_conditions[-1]["condition"].append(event_where[-1])
                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])

            elif event_type == schemas.EventType.REQUEST_DETAILS:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                event_where.append(
                    f"main.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                apply = False
                events_conditions[-1]["condition"] = []
                for j, f in enumerate(event.filters):
                    is_any = sh.isAny_opreator(f.operator)
                    if is_any or len(f.value) == 0:
                        continue
                    is_negative_operator = sh.is_negation_operator(f.operator)
                    f.value = helper.values_for_operator(value=f.value, op=f.operator)
                    op = sh.get_sql_operator(f.operator)
                    r_op = ""
                    if is_negative_operator:
                        r_op = sh.reverse_sql_operator(op)
                    e_k_f = e_k + f"_fetch{j}"
                    full_args = {**full_args, **sh.multi_values(f.value, value_key=e_k_f)}
                    if f.type == schemas.FetchFilterType.FETCH_URL:
                        event_where.append(json_condition(
                            "main", "$properties", 'url_path', op, f.value, e_k_f
                        ))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                        if is_negative_operator:
                            events_conditions_not.append(
                                {
                                    "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = sh.multi_conditions(
                                f"sub.`$properties`.url_path {r_op} %({e_k_f})s", f.value, value_key=e_k_f)
                    elif f.type == schemas.FetchFilterType.FETCH_STATUS_CODE:
                        event_where.append(json_condition(
                            "main", "$properties", 'status', op, f.value, e_k_f, True, True
                        ))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_METHOD:
                        event_where.append(json_condition(
                            "main", "$properties", 'method', op, f.value, e_k_f
                        ))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                        if is_negative_operator:
                            events_conditions_not.append(
                                {
                                    "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = sh.multi_conditions(
                                f"sub.`$properties`.method {r_op} %({e_k_f})s", f.value,
                                value_key=e_k_f)
                    elif f.type == schemas.FetchFilterType.FETCH_DURATION:
                        event_where.append(
                            sh.multi_conditions(f"main.`$duration_s` {f.operator} %({e_k_f})s/1000", f.value,
                                                value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_REQUEST_BODY:
                        event_where.append(json_condition(
                            "main", "$properties", 'request_body', op, f.value, e_k_f
                        ))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                        if is_negative_operator:
                            events_conditions_not.append(
                                {
                                    "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = sh.multi_conditions(
                                f"sub.`$properties`.request_body {r_op} %({e_k_f})s", f.value,
                                value_key=e_k_f)
                    elif f.type == schemas.FetchFilterType.FETCH_RESPONSE_BODY:
                        event_where.append(json_condition(
                            "main", "$properties", 'response_body', op, f.value, e_k_f
                        ))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                        if is_negative_operator:
                            events_conditions_not.append(
                                {
                                    "type": f"sub.`$event_name`='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = sh.multi_conditions(
                                f"sub.`$properties`.response_body {r_op} %({e_k_f})s", f.value,
                                value_key=e_k_f)
                    else:
                        logging.warning(f"undefined FETCH filter: {f.type}")
                if not apply:
                    continue
                else:
                    events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])
            # TODO: no isNot for GraphQL
            elif event_type == schemas.EventType.GRAPHQL:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                event_where.append(f"main.`$event_name`='GRAPHQL'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                for j, f in enumerate(event.filters):
                    is_any = sh.isAny_opreator(f.operator)
                    if is_any or len(f.value) == 0:
                        continue
                    f.value = helper.values_for_operator(value=f.value, op=f.operator)
                    op = sh.get_sql_operator(f.operator)
                    e_k_f = e_k + f"_graphql{j}"
                    full_args = {**full_args, **sh.multi_values(f.value, value_key=e_k_f)}
                    if f.type == schemas.GraphqlFilterType.GRAPHQL_NAME:
                        event_where.append(json_condition(
                            "main", "$properties", events.EventType.GRAPHQL.column, op, f.value, e_k_f
                        ))
                        events_conditions[-1]["condition"].append(event_where[-1])
                    elif f.type == schemas.GraphqlFilterType.GRAPHQL_METHOD:
                        event_where.append(json_condition(
                            "main", "$properties", 'method', op, f.value, e_k_f
                        ))
                        events_conditions[-1]["condition"].append(event_where[-1])
                    elif f.type == schemas.GraphqlFilterType.GRAPHQL_REQUEST_BODY:
                        event_where.append(json_condition(
                            "main", "$properties", 'request_body', op, f.value, e_k_f
                        ))
                        events_conditions[-1]["condition"].append(event_where[-1])
                    elif f.type == schemas.GraphqlFilterType.GRAPHQL_RESPONSE_BODY:
                        event_where.append(json_condition(
                            "main", "$properties", 'response_body', op, f.value, e_k_f
                        ))
                        events_conditions[-1]["condition"].append(event_where[-1])
                    else:
                        logging.warning(f"undefined GRAPHQL filter: {f.type}")
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
                if data.events_order == schemas.SearchEventOrder.THEN:
                    pass
                else:
                    events_query_from.append(f"""\
            (SELECT main.session_id, {"MIN" if event_index < (valid_events_count - 1) else "MAX"}(main.created_at) AS datetime
              FROM {event_from}
              WHERE {" AND ".join(event_where)}
              GROUP BY session_id
            ) {"" if or_events else (f"AS event_{event_index} " + ("ON(TRUE)" if event_index > 0 else ""))}\
            """)
            event_index += 1
            # limit THEN-events to 7 in CH because sequenceMatch cannot take more arguments
            if event_index == 7 and data.events_order == schemas.SearchEventOrder.THEN:
                break
        if event_index < 2:
            data.events_order = schemas.SearchEventOrder.OR
        if len(events_extra_join) > 0:
            if event_index < 2:
                events_extra_join = f"INNER JOIN ({events_extra_join}) AS main1 USING(error_id)"
            else:
                events_extra_join = f"LEFT JOIN ({events_extra_join}) AS main1 USING(error_id)"
        if favorite_only and user_id is not None:
            events_conditions_where.append(f"""main.session_id IN (SELECT session_id
                                                FROM {exp_ch_helper.get_user_favorite_sessions_table()} AS user_favorite_sessions
                                                WHERE user_id = %(userId)s)""")

        if data.events_order in [schemas.SearchEventOrder.THEN, schemas.SearchEventOrder.AND]:
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
            if len(events_conditions) > 0:
                events_conditions_where.append(f"({' OR '.join([c for c in type_conditions])})")
            del type_conditions
            # if len(value_conditions) > 0:
            #     events_conditions_where.append(f"({' OR '.join([c for c in value_conditions])})")
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

                sub_join = f"""LEFT ANTI JOIN ( SELECT DISTINCT sub.session_id
                                    FROM {MAIN_EVENTS_TABLE} AS sub
                                    WHERE {' AND '.join(__events_where_basic)}
                                        AND ({' OR '.join([c for c in value_conditions_not])})) AS sub USING(session_id)"""
                del _value_conditions_not
                del value_conditions_not

            if data.events_order == schemas.SearchEventOrder.THEN:
                having = f"""HAVING sequenceMatch('{''.join(sequence_pattern)}')(toDateTime(main.created_at),{','.join(sequence_conditions)})"""
            else:
                having = f"""HAVING {" AND ".join([f"countIf({c})>0" for c in list(set(sequence_conditions))])}"""

            events_query_part = f"""SELECT main.session_id,
                                        MIN(main.created_at) AS first_event_ts,
                                        MAX(main.created_at) AS last_event_ts
                                    FROM {MAIN_EVENTS_TABLE} AS main {events_extra_join}
                                        {sub_join}
                                    WHERE {" AND ".join(events_conditions_where)}
                                    GROUP BY session_id
                                    {having}"""
        else:
            type_conditions = []
            sequence_conditions = []
            has_values = False
            for c in events_conditions:
                if c['type'] not in type_conditions:
                    type_conditions.append(c['type'])
                if c.get('condition'):
                    has_values = True
                    sequence_conditions.append(c['type'] + " AND " + c["condition"])

            if len(events_conditions) > 0:
                events_conditions_where.append(f"({' OR '.join([c for c in type_conditions])})")

            if len(events_conditions_not) > 0:
                has_values = True
                _value_conditions_not = []
                value_conditions_not = []
                for c in events_conditions_not:
                    p = f"{c['type']} AND {c['condition']}".replace("sub.", "main.")
                    _p = p % full_args
                    if _p not in _value_conditions_not:
                        _value_conditions_not.append(_p)
                        value_conditions_not.append(p)
                del _value_conditions_not
                # sequence_conditions += value_conditions_not
                events_extra_join += f"""LEFT ANTI JOIN ( SELECT DISTINCT session_id
                                        FROM {MAIN_EVENTS_TABLE} AS main
                                        WHERE {' AND '.join(__events_where_basic)}
                                            AND ({' OR '.join(value_conditions_not)})) AS sub USING(session_id)"""

            if has_values and len(sequence_conditions) > 0:
                events_conditions = [c for c in list(set(sequence_conditions))]
                events_conditions_where.append(f"({' OR '.join(events_conditions)})")

            events_query_part = f"""SELECT main.session_id,
                                        MIN(main.created_at) AS first_event_ts,
                                        MAX(main.created_at) AS last_event_ts
                                    FROM {MAIN_EVENTS_TABLE} AS main {events_extra_join}
                                    WHERE {" AND ".join(events_conditions_where)}
                                    GROUP BY session_id"""
    else:
        data.events = []
    # ---------------------------------------------------------------------------
    if data.startTimestamp is not None:
        extra_constraints.append("s.datetime >= toDateTime(%(startDate)s/1000)")
    if data.endTimestamp is not None:
        extra_constraints.append("s.datetime <= toDateTime(%(endDate)s/1000)")

    extra_join = ""
    if issue is not None:
        extra_join = """
                INNER JOIN (SELECT DISTINCT session_id
                           FROM experimental.issues
                                    INNER JOIN experimental.events USING (issue_id)
                           WHERE issues.type = %(issue_type)s
                             AND issues.context_string = %(issue_contextString)s
                             AND issues.project_id = %(projectId)s
                             AND events.project_id = %(projectId)s
                             AND events.issue_type = %(issue_type)s
                             AND events.created_at >= toDateTime(%(startDate)s/1000)
                             AND events.created_at <= toDateTime(%(endDate)s/1000)
                             ) AS issues ON (f.session_id = issues.session_id)
                """
        full_args["issue_contextString"] = issue["contextString"]
        full_args["issue_type"] = issue["type"]
    elif len(issues) > 0:
        issues_conditions = []
        for i, f in enumerate(issues):
            f_k_v = f"f_issue_v{i}"
            f_k_s = f_k_v + "_source"
            full_args = {**full_args, **sh.multi_values(f.value, value_key=f_k_v), f_k_s: f.source}
            issues_conditions.append(sh.multi_conditions(f"issues.type=%({f_k_v})s", f.value,
                                                         value_key=f_k_v))
            issues_conditions[-1] = f"({issues_conditions[-1]} AND issues.context_string=%({f_k_s})s)"
        extra_join = f"""INNER JOIN (SELECT DISTINCT events.session_id
                                 FROM experimental.issues
                                          INNER JOIN experimental.events USING (issue_id)
                                 WHERE issues.project_id = %(projectId)s
                                   AND events.project_id = %(projectId)s
                                   AND events.created_at >= toDateTime(%(startDate)s/1000)
                                   AND events.created_at <= toDateTime(%(endDate)s/1000)
                                   AND {" OR ".join(issues_conditions)}
                            ) AS issues USING (session_id)"""

    if extra_event:
        extra_event = f"INNER JOIN ({extra_event}) AS extra_event USING(session_id)"
        if extra_conditions and len(extra_conditions) > 0:
            _extra_or_condition = []
            for i, c in enumerate(extra_conditions):
                if sh.isAny_opreator(c.operator) and c.type != schemas.EventType.REQUEST_DETAILS.value:
                    continue
                e_k = f"ec_value{i}"
                op = sh.get_sql_operator(c.operator)
                c.value = helper.values_for_operator(value=c.value, op=c.operator)
                full_args = {**full_args,
                             **sh.multi_values(c.value, value_key=e_k)}
                if c.type in (schemas.EventType.LOCATION.value, schemas.EventType.REQUEST.value):
                    _extra_or_condition.append(
                        sh.multi_conditions(f"extra_event.url_path {op} %({e_k})s",
                                            c.value, value_key=e_k))
                elif c.type == schemas.EventType.REQUEST_DETAILS.value:
                    for j, c_f in enumerate(c.filters):
                        if sh.isAny_opreator(c_f.operator) or len(c_f.value) == 0:
                            continue
                        e_k += f"_{j}"
                        op = sh.get_sql_operator(c_f.operator)
                        c_f.value = helper.values_for_operator(value=c_f.value, op=c_f.operator)
                        full_args = {**full_args,
                                     **sh.multi_values(c_f.value, value_key=e_k)}
                        if c_f.type == schemas.FetchFilterType.FETCH_URL.value:
                            _extra_or_condition.append(
                                sh.multi_conditions(f"extra_event.url_path {op} %({e_k})s",
                                                     c_f.value, value_key=e_k))
                else:
                    logging.warning(f"unsupported extra_event type:${c.type}")
            if len(_extra_or_condition) > 0:
                extra_constraints.append("(" + " OR ".join(_extra_or_condition) + ")")
    else:
        extra_event = ""
    if errors_only:
        query_part = f"""{f"({events_query_part}) AS f" if len(events_query_part) > 0 else ""}"""
    else:
        if len(events_query_part) > 0:
            extra_join += f"""INNER JOIN (SELECT DISTINCT ON (session_id) * 
                                    FROM {MAIN_SESSIONS_TABLE} AS s {extra_event}
                                    WHERE {" AND ".join(extra_constraints)}
                                    ORDER BY _timestamp DESC) AS s ON(s.session_id=f.session_id)"""
        else:
            deduplication_keys = ["session_id"] + extra_deduplication
            extra_join = f"""(SELECT * 
                                FROM {MAIN_SESSIONS_TABLE} AS s {extra_join} {extra_event}
                                WHERE {" AND ".join(extra_constraints)}
                                ORDER BY _timestamp DESC
                                LIMIT 1 BY {",".join(deduplication_keys)}) AS s"""
        query_part = f"""\
                            FROM {f"({events_query_part}) AS f" if len(events_query_part) > 0 else ""}
                            {extra_join}
                            {extra_from}
                            """
    return full_args, query_part


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


def session_exists(project_id, session_id):
    with ch_client.ClickHouseClient() as cur:
        query = cur.format(query=f"""SELECT 1 
                                     FROM {exp_ch_helper.get_main_sessions_table()} 
                                     WHERE session_id=%(session_id)s 
                                          AND project_id=%(project_id)s
                                     LIMIT 1""",
                           parameters={"project_id": project_id, "session_id": session_id})
        row = cur.execute(query=query)
    return row is not None


# TODO: support this for CH
def check_recording_status(project_id: int) -> dict:
    return sessions_legacy.check_recording_status(project_id=project_id)
