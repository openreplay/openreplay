import logging
from typing import List, Union

import schemas
from chalicelib.core import events, metadata
from . import performance_event
from chalicelib.utils import pg_client, helper, metrics_helper
from chalicelib.utils import sql_helper as sh

logger = logging.getLogger(__name__)


# TODO: remove "table of" search from this function
def search2_series(data: schemas.SessionsSearchPayloadSchema, project_id: int, density: int,
                   metric_type: schemas.MetricType, metric_of: schemas.MetricOfTimeseries | schemas.MetricOfTable,
                   metric_value: List):
    step_size = int(metrics_helper.get_step_size(endTimestamp=data.endTimestamp, startTimestamp=data.startTimestamp,
                                                 density=density, factor=1, decimal=True))
    extra_event = None
    if metric_of == schemas.MetricOfTable.VISITED_URL:
        extra_event = "events.pages"
    elif metric_of == schemas.MetricOfTable.ISSUES and len(metric_value) > 0:
        data.filters.append(schemas.SessionSearchFilterSchema(value=metric_value, type=schemas.FilterType.ISSUE,
                                                              operator=schemas.SearchEventOperator.IS))
    full_args, query_part = search_query_parts(data=data, error_status=None, errors_only=False,
                                               favorite_only=False, issue=None, project_id=project_id,
                                               user_id=None, extra_event=extra_event)
    full_args["step_size"] = step_size
    sessions = []
    with pg_client.PostgresClient() as cur:
        if metric_type == schemas.MetricType.TIMESERIES:
            if metric_of == schemas.MetricOfTimeseries.SESSION_COUNT:
                # main_query = cur.mogrify(f"""WITH full_sessions AS (SELECT DISTINCT ON(s.session_id) s.session_id, s.start_ts
                main_query = cur.mogrify(f"""WITH full_sessions AS (SELECT s.session_id, s.start_ts
                                                                {query_part})
                                            SELECT generated_timestamp AS timestamp,
                                                   COUNT(s)            AS count
                                            FROM generate_series(%(startDate)s, %(endDate)s, %(step_size)s) AS generated_timestamp
                                                     LEFT JOIN LATERAL (SELECT 1 AS s
                                                                        FROM full_sessions
                                                                        WHERE start_ts >= generated_timestamp
                                                                          AND start_ts <= generated_timestamp + %(step_size)s) AS sessions ON (TRUE)
                                            GROUP BY generated_timestamp
                                            ORDER BY generated_timestamp;""", full_args)
            elif metric_of == schemas.MetricOfTimeseries.USER_COUNT:
                main_query = cur.mogrify(f"""WITH full_sessions AS (SELECT s.user_id, s.start_ts
                                                                    {query_part}
                                                                    AND s.user_id IS NOT NULL
                                                                    AND s.user_id != '')
                                            SELECT generated_timestamp AS timestamp,
                                                   COUNT(s)            AS count
                                            FROM generate_series(%(startDate)s, %(endDate)s, %(step_size)s) AS generated_timestamp
                                                     LEFT JOIN LATERAL (SELECT DISTINCT user_id AS s
                                                                        FROM full_sessions
                                                                        WHERE start_ts >= generated_timestamp
                                                                          AND start_ts <= generated_timestamp + %(step_size)s) AS sessions ON (TRUE)
                                            GROUP BY generated_timestamp
                                            ORDER BY generated_timestamp;""", full_args)
            else:
                raise Exception(f"Unsupported metricOf:{metric_of}")

            logger.debug("--------------------")
            logger.debug(main_query)
            logger.debug("--------------------")
            try:
                cur.execute(main_query)
            except Exception as err:
                logger.warning("--------- SESSIONS-SERIES QUERY EXCEPTION -----------")
                logger.warning(main_query.decode('UTF-8'))
                logger.warning("--------- PAYLOAD -----------")
                logger.warning(data.model_dump_json())
                logger.warning("--------------------")
                raise err
            sessions = cur.fetchall()

        elif metric_type == schemas.MetricType.TABLE:
            if isinstance(metric_of, schemas.MetricOfTable):
                main_col = "user_id"
                extra_col = ""
                extra_where = ""
                pre_query = ""
                distinct_on = "s.session_id"
                if metric_of == schemas.MetricOfTable.USER_COUNTRY:
                    main_col = "user_country"
                elif metric_of == schemas.MetricOfTable.USER_DEVICE:
                    main_col = "user_device"
                elif metric_of == schemas.MetricOfTable.USER_BROWSER:
                    main_col = "user_browser"
                elif metric_of == schemas.MetricOfTable.ISSUES:
                    main_col = "issue"
                    extra_col = f", UNNEST(s.issue_types) AS {main_col}"
                    if len(metric_value) > 0:
                        extra_where = []
                        for i in range(len(metric_value)):
                            arg_name = f"selected_issue_{i}"
                            extra_where.append(f"{main_col} = %({arg_name})s")
                            full_args[arg_name] = metric_value[i]
                        extra_where = f"WHERE ({' OR '.join(extra_where)})"
                elif metric_of == schemas.MetricOfTable.VISITED_URL:
                    main_col = "path"
                    extra_col = ", path"
                    distinct_on += ",path"
                main_query = cur.mogrify(f"""{pre_query}
                                             SELECT COUNT(*) AS count, 
                                                    SUM(users_sessions.session_count) AS total_sessions,
                                                    COALESCE(JSONB_AGG(users_sessions) FILTER ( WHERE rn <= 200 ), '[]'::JSONB) AS values
                                                        FROM (SELECT {main_col} AS name,
                                                                 count(DISTINCT session_id)                                   AS session_count,
                                                                 ROW_NUMBER() OVER (ORDER BY count(full_sessions) DESC) AS rn
                                                            FROM (SELECT *
                                                            FROM (SELECT DISTINCT ON({distinct_on}) s.session_id, s.user_uuid, 
                                                                        s.user_id, s.user_os, 
                                                                        s.user_browser, s.user_device, 
                                                                        s.user_device_type, s.user_country, s.issue_types{extra_col}
                                                            {query_part}
                                                            ORDER BY s.session_id desc) AS filtred_sessions
                                                            ) AS full_sessions
                                                            {extra_where}
                                                            GROUP BY {main_col}
                                                            ORDER BY session_count DESC) AS users_sessions;""",
                                         full_args)
            logger.debug("--------------------")
            logger.debug(main_query)
            logger.debug("--------------------")
            cur.execute(main_query)
            sessions = helper.dict_to_camel_case(cur.fetchone())
            for s in sessions["values"]:
                s.pop("rn")

        return sessions


def search2_table(data: schemas.SessionsSearchPayloadSchema, project_id: int, density: int,
                  metric_of: schemas.MetricOfTable, metric_value: List,
                  metric_format: Union[schemas.MetricExtendedFormatType, schemas.MetricExtendedFormatType]):
    step_size = int(metrics_helper.get_step_size(endTimestamp=data.endTimestamp, startTimestamp=data.startTimestamp,
                                                 density=density, factor=1, decimal=True))
    extra_event = None
    extra_conditions = None
    if metric_of == schemas.MetricOfTable.VISITED_URL:
        extra_event = "events.pages"
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
        extra_event = "events_common.requests"
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
    elif metric_of == schemas.MetricOfTable.REFERRER:
        data.filters.append(schemas.SessionSearchFilterSchema(value=metric_value, type=schemas.FilterType.REFERRER,
                                                              operator=schemas.SearchEventOperator.IS_ANY))

    full_args, query_part = search_query_parts(data=data, error_status=None, errors_only=False,
                                               favorite_only=False, issue=None, project_id=project_id,
                                               user_id=None, extra_event=extra_event, extra_conditions=extra_conditions)
    full_args["step_size"] = step_size
    with pg_client.PostgresClient() as cur:
        if isinstance(metric_of, schemas.MetricOfTable):
            full_args["limit"] = data.limit
            full_args["limit_s"] = (data.page - 1) * data.limit
            full_args["limit_e"] = data.page * data.limit

            main_col = "user_id"
            extra_col = ""
            extra_where = ""
            distinct_on = "s.session_id"
            if metric_of == schemas.MetricOfTable.USER_COUNTRY:
                main_col = "user_country"
            elif metric_of == schemas.MetricOfTable.USER_DEVICE:
                main_col = "user_device"
            elif metric_of == schemas.MetricOfTable.USER_BROWSER:
                main_col = "user_browser"
            elif metric_of == schemas.MetricOfTable.ISSUES:
                main_col = "issue"
                extra_col = f", UNNEST(s.issue_types) AS {main_col}"
                if len(metric_value) > 0:
                    extra_where = []
                    for i in range(len(metric_value)):
                        arg_name = f"selected_issue_{i}"
                        extra_where.append(f"{main_col} = %({arg_name})s")
                        full_args[arg_name] = metric_value[i]
                    extra_where = f"WHERE ({' OR '.join(extra_where)})"
            elif metric_of == schemas.MetricOfTable.VISITED_URL:
                main_col = "path"
                extra_col = ", path"
                distinct_on += ",path"
            elif metric_of == schemas.MetricOfTable.REFERRER:
                main_col = "referrer"
                extra_col = ", referrer"
            elif metric_of == schemas.MetricOfTable.FETCH:
                main_col = "path"
                extra_col = ", path"
                distinct_on += ",path"

            if metric_format == schemas.MetricExtendedFormatType.SESSION_COUNT:
                main_query = f"""SELECT COUNT(*) AS count,
                                    COALESCE(SUM(users_sessions.total),0) AS total,
                                    COALESCE(JSONB_AGG(users_sessions) 
                                            FILTER ( WHERE rn > %(limit_s)s 
                                                        AND rn <= %(limit_e)s ), '[]'::JSONB) AS values
                                 FROM (SELECT {main_col} AS name,
                                     count(DISTINCT session_id)                                   AS total,
                                     ROW_NUMBER() OVER (ORDER BY count(full_sessions) DESC) AS rn
                                       FROM (SELECT *
                                             FROM (SELECT DISTINCT ON({distinct_on}) s.session_id, s.user_uuid, 
                                                    s.user_id, s.user_os, 
                                                    s.user_browser, s.user_device, 
                                                    s.user_device_type, s.user_country, s.issue_types{extra_col}
                                            {query_part}
                                            ORDER BY s.session_id desc) AS filtred_sessions
                                            ) AS full_sessions
                                 {extra_where}
                                 GROUP BY {main_col}
                                 ORDER BY total DESC) AS users_sessions;"""
            else:
                main_query = f"""SELECT COUNT(*) AS count,
                                    COALESCE(SUM(users_sessions.total),0) AS total,
                                    COALESCE(JSONB_AGG(users_sessions) FILTER ( WHERE rn <= 200 ), '[]'::JSONB) AS values
                                 FROM (SELECT {main_col} AS name,
                                         count(DISTINCT user_id)                                AS total,
                                         ROW_NUMBER() OVER (ORDER BY count(full_sessions) DESC) AS rn
                                       FROM (SELECT *
                                             FROM (SELECT DISTINCT ON({distinct_on}) s.session_id, s.user_uuid, 
                                                        s.user_id, s.user_os, 
                                                        s.user_browser, s.user_device, 
                                                        s.user_device_type, s.user_country, s.issue_types{extra_col}
                                             {query_part}
                                             AND s.user_id IS NOT NULL
                                             AND s.user_id !=''
                                             ORDER BY s.session_id desc) AS filtred_sessions
                                        ) AS full_sessions
                                {extra_where}
                                GROUP BY {main_col}
                                ORDER BY total DESC) AS users_sessions;"""

            main_query = cur.mogrify(main_query, full_args)
        logger.debug("--------------------")
        logger.debug(main_query)
        logger.debug("--------------------")
        cur.execute(main_query)
        sessions = helper.dict_to_camel_case(cur.fetchone())
        for s in sessions["values"]:
            s.pop("rn")

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


# this function generates the query and return the generated-query with the dict of query arguments
def search_query_parts(data: schemas.SessionsSearchPayloadSchema, error_status, errors_only, favorite_only, issue,
                       project_id, user_id, platform="web", extra_event=None, extra_conditions=None):
    ss_constraints = []
    full_args = {"project_id": project_id, "startDate": data.startTimestamp, "endDate": data.endTimestamp,
                 "projectId": project_id, "userId": user_id}
    extra_constraints = [
        "s.project_id = %(project_id)s",
        "s.duration IS NOT NULL"
    ]
    extra_from = ""
    events_query_part = ""
    issues = []
    if len(data.filters) > 0:
        meta_keys = None
        for i, f in enumerate(data.filters):
            filter_type = f.type
            f.value = helper.values_for_operator(value=f.value, op=f.operator)
            f_k = f"f_value{i}"
            full_args = {**full_args, **sh.multi_values(f.value, value_key=f_k)}
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
                    extra_constraints.append('s.user_browser IS NOT NULL')
                    ss_constraints.append('ms.user_browser IS NOT NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_browser {op} %({f_k})s', f.value, is_not=is_not,
                                            value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_OS, schemas.FilterType.USER_OS_MOBILE]:
                if is_any:
                    extra_constraints.append('s.user_os IS NOT NULL')
                    ss_constraints.append('ms.user_os IS NOT NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_DEVICE, schemas.FilterType.USER_DEVICE_MOBILE]:
                if is_any:
                    extra_constraints.append('s.user_device IS NOT NULL')
                    ss_constraints.append('ms.user_device IS NOT NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_COUNTRY, schemas.FilterType.USER_COUNTRY_MOBILE]:
                if is_any:
                    extra_constraints.append('s.user_country IS NOT NULL')
                    ss_constraints.append('ms.user_country IS NOT NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_country {op} %({f_k})s', f.value, is_not=is_not,
                                            value_key=f_k))

            elif filter_type == schemas.FilterType.USER_CITY:
                if is_any:
                    extra_constraints.append('s.user_city IS NOT NULL')
                    ss_constraints.append('ms.user_city IS NOT NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_city {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_city {op} %({f_k})s', f.value, is_not=is_not,
                                            value_key=f_k))

            elif filter_type == schemas.FilterType.USER_STATE:
                if is_any:
                    extra_constraints.append('s.user_state IS NOT NULL')
                    ss_constraints.append('ms.user_state IS NOT NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.user_state {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.user_state {op} %({f_k})s', f.value, is_not=is_not,
                                            value_key=f_k))

            elif filter_type in [schemas.FilterType.UTM_SOURCE]:
                if is_any:
                    extra_constraints.append('s.utm_source IS NOT NULL')
                    ss_constraints.append('ms.utm_source  IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.utm_source IS NULL')
                    ss_constraints.append('ms.utm_source  IS NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.utm_source {op} %({f_k})s::text', f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.utm_source {op} %({f_k})s::text', f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type in [schemas.FilterType.UTM_MEDIUM]:
                if is_any:
                    extra_constraints.append('s.utm_medium IS NOT NULL')
                    ss_constraints.append('ms.utm_medium IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.utm_medium IS NULL')
                    ss_constraints.append('ms.utm_medium IS NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.utm_medium {op} %({f_k})s::text', f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.utm_medium {op} %({f_k})s::text', f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type in [schemas.FilterType.UTM_CAMPAIGN]:
                if is_any:
                    extra_constraints.append('s.utm_campaign IS NOT NULL')
                    ss_constraints.append('ms.utm_campaign IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.utm_campaign IS NULL')
                    ss_constraints.append('ms.utm_campaign IS NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f's.utm_campaign {op} %({f_k})s::text', f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f'ms.utm_campaign {op} %({f_k})s::text', f.value, is_not=is_not,
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
                # extra_from += f"INNER JOIN {events.event_type.LOCATION.table} AS p USING(session_id)"
                if is_any:
                    extra_constraints.append('s.base_referrer IS NOT NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f"s.base_referrer {op} %({f_k})s", f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type == events.EventType.METADATA.ui_type:
                # get metadata list only if you need it
                if meta_keys is None:
                    meta_keys = metadata.get(project_id=project_id)
                    meta_keys = {m["key"]: m["index"] for m in meta_keys}
                if f.source in meta_keys.keys():
                    if is_any:
                        extra_constraints.append(f"s.{metadata.index_to_colname(meta_keys[f.source])} IS NOT NULL")
                        ss_constraints.append(f"ms.{metadata.index_to_colname(meta_keys[f.source])} IS NOT NULL")
                    elif is_undefined:
                        extra_constraints.append(f"s.{metadata.index_to_colname(meta_keys[f.source])} IS NULL")
                        ss_constraints.append(f"ms.{metadata.index_to_colname(meta_keys[f.source])} IS NULL")
                    else:
                        extra_constraints.append(
                            sh.multi_conditions(
                                f"s.{metadata.index_to_colname(meta_keys[f.source])} {op} %({f_k})s::text",
                                f.value, is_not=is_not, value_key=f_k))
                        ss_constraints.append(
                            sh.multi_conditions(
                                f"ms.{metadata.index_to_colname(meta_keys[f.source])} {op} %({f_k})s::text",
                                f.value, is_not=is_not, value_key=f_k))
            elif filter_type in [schemas.FilterType.USER_ID, schemas.FilterType.USER_ID_MOBILE]:
                if is_any:
                    extra_constraints.append('s.user_id IS NOT NULL')
                    ss_constraints.append('ms.user_id IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.user_id IS NULL')
                    ss_constraints.append('ms.user_id IS NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f"s.user_id {op} %({f_k})s::text", f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f"ms.user_id {op} %({f_k})s::text", f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type in [schemas.FilterType.USER_ANONYMOUS_ID,
                                 schemas.FilterType.USER_ANONYMOUS_ID_MOBILE]:
                if is_any:
                    extra_constraints.append('s.user_anonymous_id IS NOT NULL')
                    ss_constraints.append('ms.user_anonymous_id IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.user_anonymous_id IS NULL')
                    ss_constraints.append('ms.user_anonymous_id IS NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f"s.user_anonymous_id {op} %({f_k})s::text", f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f"ms.user_anonymous_id {op} %({f_k})s::text", f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type in [schemas.FilterType.REV_ID, schemas.FilterType.REV_ID_MOBILE]:
                if is_any:
                    extra_constraints.append('s.rev_id IS NOT NULL')
                    ss_constraints.append('ms.rev_id IS NOT NULL')
                elif is_undefined:
                    extra_constraints.append('s.rev_id IS NULL')
                    ss_constraints.append('ms.rev_id IS NULL')
                else:
                    extra_constraints.append(
                        sh.multi_conditions(f"s.rev_id {op} %({f_k})s::text", f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f"ms.rev_id {op} %({f_k})s::text", f.value, is_not=is_not,
                                            value_key=f_k))
            elif filter_type == schemas.FilterType.PLATFORM:
                # op = __ sh.get_sql_operator(f.operator)
                extra_constraints.append(
                    sh.multi_conditions(f"s.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                        value_key=f_k))
                ss_constraints.append(
                    sh.multi_conditions(f"ms.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                        value_key=f_k))
            elif filter_type == schemas.FilterType.ISSUE:
                if is_any:
                    extra_constraints.append("array_length(s.issue_types, 1) > 0")
                    ss_constraints.append("array_length(ms.issue_types, 1) > 0")
                else:
                    if f.source:
                        issues.append(f)

                    extra_constraints.append(
                        sh.multi_conditions(f"%({f_k})s {op} ANY (s.issue_types)", f.value, is_not=is_not,
                                            value_key=f_k))
                    ss_constraints.append(
                        sh.multi_conditions(f"%({f_k})s {op} ANY (ms.issue_types)", f.value, is_not=is_not,
                                            value_key=f_k))

            elif filter_type == schemas.FilterType.EVENTS_COUNT:
                extra_constraints.append(
                    sh.multi_conditions(f"s.events_count {op} %({f_k})s", f.value, is_not=is_not,
                                        value_key=f_k))
                ss_constraints.append(
                    sh.multi_conditions(f"ms.events_count {op} %({f_k})s", f.value, is_not=is_not,
                                        value_key=f_k))
    # ---------------------------------------------------------------------------
    if len(data.events) > 0:
        valid_events_count = 0
        for event in data.events:
            is_any = sh.isAny_opreator(event.operator)
            if not isinstance(event.value, list):
                event.value = [event.value]
            if __is_valid_event(is_any=is_any, event=event):
                valid_events_count += 1
        events_query_from = []
        event_index = 0
        or_events = data.events_order == schemas.SearchEventOrder.OR
        # events_joiner = " FULL JOIN " if or_events else " INNER JOIN LATERAL "
        events_joiner = " UNION " if or_events else " INNER JOIN LATERAL "
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
            if event_index == 0 or or_events:
                event_from = "%s INNER JOIN public.sessions AS ms USING (session_id)"
                event_where = ["ms.project_id = %(projectId)s", "main.timestamp >= %(startDate)s",
                               "main.timestamp <= %(endDate)s", "ms.start_ts >= %(startDate)s",
                               "ms.start_ts <= %(endDate)s", "ms.duration IS NOT NULL"]
                if favorite_only and not errors_only:
                    event_from += "INNER JOIN public.user_favorite_sessions AS fs USING(session_id)"
                    event_where.append("fs.user_id = %(userId)s")
            else:
                event_from = "%s"
                event_where = ["main.timestamp >= %(startDate)s", "main.timestamp <= %(endDate)s",
                               "main.session_id=event_0.session_id"]
                if data.events_order == schemas.SearchEventOrder.THEN:
                    event_where.append(f"event_{event_index - 1}.timestamp <= main.timestamp")
            e_k = f"e_value{i}"
            s_k = e_k + "_source"

            event.value = helper.values_for_operator(value=event.value, op=event.operator)
            full_args = {**full_args,
                         **sh.multi_values(event.value, value_key=e_k),
                         **sh.multi_values(event.source, value_key=s_k)}

            if event_type == events.EventType.CLICK.ui_type:
                if platform == "web":
                    event_from = event_from % f"{events.EventType.CLICK.table} AS main "
                    if not is_any:
                        if schemas.ClickEventExtraOperator.has_value(event.operator):
                            event_where.append(
                                sh.multi_conditions(f"main.selector {op} %({e_k})s", event.value, value_key=e_k))
                        else:
                            event_where.append(
                                sh.multi_conditions(f"main.{events.EventType.CLICK.column} {op} %({e_k})s", event.value,
                                                    value_key=e_k))
                else:
                    event_from = event_from % f"{events.EventType.CLICK_MOBILE.table} AS main "
                    if not is_any:
                        event_where.append(
                            sh.multi_conditions(f"main.{events.EventType.CLICK_MOBILE.column} {op} %({e_k})s",
                                                event.value,
                                                value_key=e_k))

            elif event_type == events.EventType.TAG.ui_type:
                event_from = event_from % f"{events.EventType.TAG.table} AS main "
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.tag_id = %({e_k})s", event.value, value_key=e_k))
            elif event_type == events.EventType.INPUT.ui_type:
                if platform == "web":
                    event_from = event_from % f"{events.EventType.INPUT.table} AS main "
                    if not is_any:
                        event_where.append(
                            sh.multi_conditions(f"main.{events.EventType.INPUT.column} {op} %({e_k})s", event.value,
                                                value_key=e_k))
                    if event.source is not None and len(event.source) > 0:
                        event_where.append(sh.multi_conditions(f"main.value ILIKE %(custom{i})s", event.source,
                                                               value_key=f"custom{i}"))
                        full_args = {**full_args, **sh.multi_values(event.source, value_key=f"custom{i}")}

                else:
                    event_from = event_from % f"{events.EventType.INPUT_MOBILE.table} AS main "
                    if not is_any:
                        event_where.append(
                            sh.multi_conditions(f"main.{events.EventType.INPUT_MOBILE.column} {op} %({e_k})s",
                                                event.value,
                                                value_key=e_k))


            elif event_type == events.EventType.LOCATION.ui_type:
                if platform == "web":
                    event_from = event_from % f"{events.EventType.LOCATION.table} AS main "
                    if not is_any:
                        event_where.append(
                            sh.multi_conditions(f"main.{events.EventType.LOCATION.column} {op} %({e_k})s",
                                                event.value, value_key=e_k))
                else:
                    event_from = event_from % f"{events.EventType.VIEW_MOBILE.table} AS main "
                    if not is_any:
                        event_where.append(
                            sh.multi_conditions(f"main.{events.EventType.VIEW_MOBILE.column} {op} %({e_k})s",
                                                event.value, value_key=e_k))
            elif event_type == events.EventType.CUSTOM.ui_type:
                event_from = event_from % f"{events.EventType.CUSTOM.table} AS main "
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.{events.EventType.CUSTOM.column} {op} %({e_k})s", event.value,
                                            value_key=e_k))
            elif event_type == events.EventType.REQUEST.ui_type:
                event_from = event_from % f"{events.EventType.REQUEST.table} AS main "
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.{events.EventType.REQUEST.column} {op} %({e_k})s", event.value,
                                            value_key=e_k))
            # elif event_type == events.event_type.GRAPHQL.ui_type:
            #     event_from = event_from % f"{events.event_type.GRAPHQL.table} AS main "
            #     if not is_any:
            #         event_where.append(
            #             _multiple_conditions(f"main.{events.event_type.GRAPHQL.column} {op} %({e_k})s", event.value,
            #                                  value_key=e_k))
            elif event_type == events.EventType.STATEACTION.ui_type:
                event_from = event_from % f"{events.EventType.STATEACTION.table} AS main "
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.{events.EventType.STATEACTION.column} {op} %({e_k})s",
                                            event.value, value_key=e_k))
            elif event_type == events.EventType.ERROR.ui_type:
                event_from = event_from % f"{events.EventType.ERROR.table} AS main INNER JOIN public.errors AS main1 USING(error_id)"
                event.source = list(set(event.source))
                if not is_any and event.value not in [None, "*", ""]:
                    event_where.append(
                        sh.multi_conditions(f"(main1.message {op} %({e_k})s OR main1.name {op} %({e_k})s)",
                                            event.value, value_key=e_k))
                if len(event.source) > 0 and event.source[0] not in [None, "*", ""]:
                    event_where.append(sh.multi_conditions(f"main1.source = %({s_k})s", event.source, value_key=s_k))


            # ----- Mobile
            elif event_type == events.EventType.CLICK_MOBILE.ui_type:
                event_from = event_from % f"{events.EventType.CLICK_MOBILE.table} AS main "
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.{events.EventType.CLICK_MOBILE.column} {op} %({e_k})s",
                                            event.value, value_key=e_k))

            elif event_type == events.EventType.INPUT_MOBILE.ui_type:
                event_from = event_from % f"{events.EventType.INPUT_MOBILE.table} AS main "
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.{events.EventType.INPUT_MOBILE.column} {op} %({e_k})s",
                                            event.value, value_key=e_k))
                if event.source is not None and len(event.source) > 0:
                    event_where.append(sh.multi_conditions(f"main.value ILIKE %(custom{i})s", event.source,
                                                           value_key="custom{i}"))
                    full_args = {**full_args, **sh.multi_values(event.source, f"custom{i}")}
            elif event_type == events.EventType.VIEW_MOBILE.ui_type:
                event_from = event_from % f"{events.EventType.VIEW_MOBILE.table} AS main "
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.{events.EventType.VIEW_MOBILE.column} {op} %({e_k})s",
                                            event.value, value_key=e_k))
            elif event_type == events.EventType.CUSTOM_MOBILE.ui_type:
                event_from = event_from % f"{events.EventType.CUSTOM_MOBILE.table} AS main "
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.{events.EventType.CUSTOM_MOBILE.column} {op} %({e_k})s",
                                            event.value, value_key=e_k))
            elif event_type == events.EventType.REQUEST_MOBILE.ui_type:
                event_from = event_from % f"{events.EventType.REQUEST_MOBILE.table} AS main "
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.{events.EventType.REQUEST_MOBILE.column} {op} %({e_k})s",
                                            event.value, value_key=e_k))
            elif event_type == events.EventType.CRASH_MOBILE.ui_type:
                event_from = event_from % f"{events.EventType.CRASH_MOBILE.table} AS main INNER JOIN public.crashes_ios AS main1 USING(crash_ios_id)"
                if not is_any and event.value not in [None, "*", ""]:
                    event_where.append(
                        sh.multi_conditions(f"(main1.reason {op} %({e_k})s OR main1.name {op} %({e_k})s)",
                                            event.value, value_key=e_k))
            elif event_type == events.EventType.SWIPE_MOBILE.ui_type and platform != "web":
                event_from = event_from % f"{events.EventType.SWIPE_MOBILE.table} AS main "
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.{events.EventType.SWIPE_MOBILE.column} {op} %({e_k})s",
                                            event.value, value_key=e_k))

            elif event_type == schemas.PerformanceEventType.FETCH_FAILED:
                event_from = event_from % f"{events.EventType.REQUEST.table} AS main "
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.{events.EventType.REQUEST.column} {op} %({e_k})s",
                                            event.value, value_key=e_k))
                col = performance_event.get_col(event_type)
                colname = col["column"]
                event_where.append(f"main.{colname} = FALSE")
            # elif event_type == schemas.PerformanceEventType.fetch_duration:
            #     event_from = event_from % f"{events.event_type.REQUEST.table} AS main "
            #     if not is_any:
            #         event_where.append(
            #             _multiple_conditions(f"main.{events.event_type.REQUEST.column} {op} %({e_k})s",
            #                                  event.value, value_key=e_k))
            #     col = performance_event.get_col(event_type)
            #     colname = col["column"]
            #     tname = "main"
            #     e_k += "_custom"
            #     full_args = {**full_args, **_ sh.multiple_values(event.source, value_key=e_k)}
            #     event_where.append(f"{tname}.{colname} IS NOT NULL AND {tname}.{colname}>0 AND " +
            #                        _multiple_conditions(f"{tname}.{colname} {event.sourceOperator} %({e_k})s",
            #                                             event.source, value_key=e_k))
            elif event_type in [schemas.PerformanceEventType.LOCATION_DOM_COMPLETE,
                                schemas.PerformanceEventType.LOCATION_LARGEST_CONTENTFUL_PAINT_TIME,
                                schemas.PerformanceEventType.LOCATION_TTFB,
                                schemas.PerformanceEventType.LOCATION_AVG_CPU_LOAD,
                                schemas.PerformanceEventType.LOCATION_AVG_MEMORY_USAGE
                                ]:
                event_from = event_from % f"{events.EventType.LOCATION.table} AS main "
                col = performance_event.get_col(event_type)
                colname = col["column"]
                tname = "main"
                if col.get("extraJoin") is not None:
                    tname = "ej"
                    event_from += f" INNER JOIN {col['extraJoin']} AS {tname} USING(session_id)"
                    event_where += [f"{tname}.timestamp >= main.timestamp", f"{tname}.timestamp >= %(startDate)s",
                                    f"{tname}.timestamp <= %(endDate)s"]
                if not is_any:
                    event_where.append(
                        sh.multi_conditions(f"main.{events.EventType.LOCATION.column} {op} %({e_k})s",
                                            event.value, value_key=e_k))
                e_k += "_custom"
                full_args = {**full_args, **sh.multi_values(event.source, value_key=e_k)}

                event_where.append(f"{tname}.{colname} IS NOT NULL AND {tname}.{colname}>0 AND " +
                                   sh.multi_conditions(f"{tname}.{colname} {event.sourceOperator} %({e_k})s",
                                                       event.source, value_key=e_k))

            elif event_type == schemas.EventType.REQUEST_DETAILS:
                event_from = event_from % f"{events.EventType.REQUEST.table} AS main "
                apply = False
                for j, f in enumerate(event.filters):
                    is_any = sh.isAny_opreator(f.operator)
                    if is_any or len(f.value) == 0:
                        continue
                    f.value = helper.values_for_operator(value=f.value, op=f.operator)
                    op = sh.get_sql_operator(f.operator)
                    e_k_f = e_k + f"_fetch{j}"
                    full_args = {**full_args, **sh.multi_values(f.value, value_key=e_k_f)}
                    if f.type == schemas.FetchFilterType.FETCH_URL:
                        event_where.append(
                            sh.multi_conditions(f"main.{events.EventType.REQUEST.column} {op} %({e_k_f})s::text",
                                                f.value, value_key=e_k_f))
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_STATUS_CODE:
                        event_where.append(
                            sh.multi_conditions(f"main.status_code {f.operator} %({e_k_f})s::integer", f.value,
                                                value_key=e_k_f))
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_METHOD:
                        event_where.append(
                            sh.multi_conditions(f"main.method {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_DURATION:
                        event_where.append(
                            sh.multi_conditions(f"main.duration {f.operator} %({e_k_f})s::integer", f.value,
                                                value_key=e_k_f))
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_REQUEST_BODY:
                        event_where.append(
                            sh.multi_conditions(f"main.request_body {op} %({e_k_f})s::text", f.value,
                                                value_key=e_k_f))
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_RESPONSE_BODY:
                        event_where.append(
                            sh.multi_conditions(f"main.response_body {op} %({e_k_f})s::text", f.value,
                                                value_key=e_k_f))
                        apply = True
                    else:
                        logger.warning(f"undefined FETCH filter: {f.type}")
                if not apply:
                    continue
            elif event_type == schemas.EventType.GRAPHQL:
                event_from = event_from % f"{events.EventType.GRAPHQL.table} AS main "
                for j, f in enumerate(event.filters):
                    is_any = sh.isAny_opreator(f.operator)
                    if is_any or len(f.value) == 0:
                        continue
                    f.value = helper.values_for_operator(value=f.value, op=f.operator)
                    op = sh.get_sql_operator(f.operator)
                    e_k_f = e_k + f"_graphql{j}"
                    full_args = {**full_args, **sh.multi_values(f.value, value_key=e_k_f)}
                    if f.type == schemas.GraphqlFilterType.GRAPHQL_NAME:
                        event_where.append(
                            sh.multi_conditions(f"main.{events.EventType.GRAPHQL.column} {op} %({e_k_f})s", f.value,
                                                value_key=e_k_f))
                    elif f.type == schemas.GraphqlFilterType.GRAPHQL_METHOD:
                        event_where.append(
                            sh.multi_conditions(f"main.method {op} %({e_k_f})s", f.value, value_key=e_k_f))
                    elif f.type == schemas.GraphqlFilterType.GRAPHQL_REQUEST_BODY:
                        event_where.append(
                            sh.multi_conditions(f"main.request_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
                    elif f.type == schemas.GraphqlFilterType.GRAPHQL_RESPONSE_BODY:
                        event_where.append(
                            sh.multi_conditions(f"main.response_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
                    else:
                        logger.warning(f"undefined GRAPHQL filter: {f.type}")
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
                events_query_from.append(f"""\
            (SELECT main.session_id, {"MIN" if event_index < (valid_events_count - 1) else "MAX"}(main.timestamp) AS timestamp
              FROM {event_from}
              WHERE {" AND ".join(event_where)}
              GROUP BY 1
            ) {"" if or_events else (f"AS event_{event_index} " + ("ON(TRUE)" if event_index > 0 else ""))}\
            """)
            event_index += 1
        if event_index > 0:
            if or_events:
                events_query_part = f"""SELECT
                                            session_id, 
                                            MIN(timestamp) AS first_event_ts, 
                                            MAX(timestamp) AS last_event_ts
                                        FROM ({events_joiner.join(events_query_from)}) AS u
                                        GROUP BY 1"""
            else:
                events_query_part = f"""SELECT
                                        event_0.session_id,
                                        MIN(event_0.timestamp) AS first_event_ts,
                                        MAX(event_{event_index - 1}.timestamp) AS last_event_ts
                                    FROM {events_joiner.join(events_query_from)}
                                    GROUP BY 1"""
    else:
        data.events = []
    # ---------------------------------------------------------------------------
    if data.startTimestamp is not None:
        extra_constraints.append("s.start_ts >= %(startDate)s")
    if data.endTimestamp is not None:
        extra_constraints.append("s.start_ts <= %(endDate)s")
    # if data.platform is not None:
    #     if data.platform == schemas.PlatformType.mobile:
    #         extra_constraints.append(b"s.user_os in ('Android','BlackBerry OS','iOS','Tizen','Windows Phone')")
    #     elif data.platform == schemas.PlatformType.desktop:
    #         extra_constraints.append(
    #             b"s.user_os in ('Chrome OS','Fedora','Firefox OS','Linux','Mac OS X','Ubuntu','Windows')")

    if errors_only:
        extra_from += f" INNER JOIN {events.EventType.ERROR.table} AS er USING (session_id) INNER JOIN public.errors AS ser USING (error_id)"
        extra_constraints.append("ser.source = 'js_exception'")
        extra_constraints.append("ser.project_id = %(project_id)s")
        # if error_status != schemas.ErrorStatus.all:
        #     extra_constraints.append("ser.status = %(error_status)s")
        #     full_args["error_status"] = error_status
        # if favorite_only:
        #     extra_from += " INNER JOIN public.user_favorite_errors AS ufe USING (error_id)"
        #     extra_constraints.append("ufe.user_id = %(userId)s")

    if favorite_only and not errors_only and user_id is not None:
        extra_from += """INNER JOIN (SELECT user_id, session_id
                                    FROM public.user_favorite_sessions
                                    WHERE user_id = %(userId)s) AS favorite_sessions
                                    USING (session_id)"""
    elif not favorite_only and not errors_only and user_id is not None:
        extra_from += """LEFT JOIN (SELECT user_id, session_id
                                    FROM public.user_favorite_sessions
                                    WHERE user_id = %(userId)s) AS favorite_sessions
                                    USING (session_id)"""
    extra_join = ""
    if issue is not None:
        extra_join = """
                INNER JOIN LATERAL(SELECT TRUE FROM events_common.issues INNER JOIN public.issues AS p_issues USING (issue_id)
                WHERE issues.session_id=f.session_id 
                    AND p_issues.type=%(issue_type)s 
                    AND p_issues.context_string=%(issue_contextString)s
                    AND timestamp >= f.first_event_ts
                    AND timestamp <= f.last_event_ts) AS issues ON(TRUE)
                """
        full_args["issue_contextString"] = issue["contextString"]
        full_args["issue_type"] = issue["type"]
    elif len(issues) > 0:
        issues_conditions = []
        for i, f in enumerate(issues):
            f_k_v = f"f_issue_v{i}"
            f_k_s = f_k_v + "_source"
            full_args = {**full_args, **sh.multi_values(f.value, value_key=f_k_v), f_k_s: f.source}
            issues_conditions.append(sh.multi_conditions(f"p_issues.type=%({f_k_v})s", f.value,
                                                         value_key=f_k_v))
            issues_conditions[-1] = f"({issues_conditions[-1]} AND p_issues.context_string=%({f_k_s})s)"

        if len(events_query_part) > 0:
            extra_join = f"""
                            INNER JOIN LATERAL(SELECT TRUE FROM events_common.issues INNER JOIN public.issues AS p_issues USING (issue_id)
                            WHERE issues.session_id=f.session_id 
                                AND timestamp >= f.first_event_ts
                                AND timestamp <= f.last_event_ts
                                AND {" OR ".join(issues_conditions)}
                                ) AS issues ON(TRUE)
                            """
        else:
            extra_join = f"""
                            INNER JOIN LATERAL(SELECT TRUE FROM events_common.issues INNER JOIN public.issues AS p_issues USING (issue_id)
                            WHERE issues.session_id=s.session_id 
                                AND timestamp >= %(startDate)s
                                AND timestamp <= %(endDate)s
                                AND {" OR ".join(issues_conditions)}
                                ) AS issues ON(TRUE)
                            """
        # full_args["issue_contextString"] = issue["contextString"]
        # full_args["issue_type"] = issue["type"]
    if extra_event:
        extra_join += f"""INNER JOIN {extra_event} AS ev USING(session_id)"""
        extra_constraints.append("ev.timestamp>=%(startDate)s")
        extra_constraints.append("ev.timestamp<=%(endDate)s")
        if extra_conditions and len(extra_conditions) > 0:
            _extra_or_condition = []
            for i, c in enumerate(extra_conditions):
                if sh.isAny_opreator(c.operator):
                    continue
                e_k = f"ec_value{i}"
                op = sh.get_sql_operator(c.operator)
                c.value = helper.values_for_operator(value=c.value, op=c.operator)
                full_args = {**full_args,
                             **sh.multi_values(c.value, value_key=e_k)}
                if c.type == events.EventType.LOCATION.ui_type:
                    _extra_or_condition.append(
                        sh.multi_conditions(f"ev.{events.EventType.LOCATION.column} {op} %({e_k})s",
                                            c.value, value_key=e_k))
                else:
                    logger.warning(f"unsupported extra_event type: {c.type}")
            if len(_extra_or_condition) > 0:
                extra_constraints.append("(" + " OR ".join(_extra_or_condition) + ")")
    query_part = f"""\
                        FROM {f"({events_query_part}) AS f" if len(events_query_part) > 0 else "public.sessions AS s"}
                        {extra_join}
                        {"INNER JOIN public.sessions AS s USING(session_id)" if len(events_query_part) > 0 else ""}
                        {extra_from}
                        WHERE 
                          {" AND ".join(extra_constraints)}"""
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


def count_all():
    with pg_client.PostgresClient(unlimited_query=True) as cur:
        cur.execute(query="SELECT COUNT(session_id) AS count FROM public.sessions")
        row = cur.fetchone()
    return row.get("count", 0) if row else 0


def session_exists(project_id, session_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT 1 
                             FROM public.sessions 
                             WHERE session_id=%(session_id)s 
                                AND project_id=%(project_id)s
                             LIMIT 1;""",
                            {"project_id": project_id, "session_id": session_id})
        cur.execute(query)
        row = cur.fetchone()
    return row is not None


def check_recording_status(project_id: int) -> dict:
    query = f"""
        WITH project_sessions AS (SELECT COUNT(1)                                      AS full_count,
                                 COUNT(1) FILTER ( WHERE duration IS NOT NULL) AS nn_duration_count
                          FROM public.sessions
                          WHERE project_id = %(project_id)s
                            AND start_ts >= (extract(EPOCH FROM now() - INTERVAL '1 day')) * 1000
                            AND start_ts <= (extract(EPOCH FROM now() + INTERVAL '1 day')) * 1000)
        SELECT CASE
                   WHEN full_count = 0 THEN 0
                   WHEN nn_duration_count = 0 THEN 1
                   ELSE 2
                   END    AS recording_status,
               full_count AS sessions_count
        FROM project_sessions;
    """

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(query, {"project_id": project_id})
        cur.execute(query)
        row = cur.fetchone()

    return {
        "recordingStatus": row["recording_status"],
        "sessionsCount": row["sessions_count"]
    }
