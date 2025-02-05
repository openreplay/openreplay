import ast
import logging
from typing import List, Union

import schemas
from chalicelib.core import events, metadata, projects
from chalicelib.core.sessions import performance_event, sessions_favorite, sessions_legacy
from chalicelib.utils import pg_client, helper, ch_client, exp_ch_helper
from chalicelib.utils import sql_helper as sh

logger = logging.getLogger(__name__)
SESSION_PROJECTION_COLS_CH = """\
s.project_id,
s.session_id AS session_id,
s.user_uuid AS user_uuid,
s.user_id AS user_id,
s.user_os AS user_os,
s.user_browser AS user_browser,
s.user_device AS user_device,
s.user_device_type AS user_device_type,
s.user_country AS user_country,
s.user_city AS user_city,
s.user_state AS user_state,
toUnixTimestamp(s.datetime)*1000 AS start_ts,
s.duration AS duration,
s.events_count AS events_count,
s.pages_count AS pages_count,
s.errors_count AS errors_count,
s.user_anonymous_id AS user_anonymous_id,
s.platform AS platform,
s.timezone AS timezone,
coalesce(issue_score,0) AS issue_score,
s.issue_types AS issue_types 
"""

SESSION_PROJECTION_COLS_CH_MAP = """\
'project_id',        toString(%(project_id)s),
'session_id',        toString(s.session_id),
'user_uuid',         toString(s.user_uuid),
'user_id',           toString(s.user_id),
'user_os',           toString(s.user_os),
'user_browser',      toString(s.user_browser),
'user_device',       toString(s.user_device),
'user_device_type',  toString(s.user_device_type),
'user_country',      toString(s.user_country),
'user_city',         toString(s.user_city),
'user_state',        toString(s.user_state),
'start_ts',          toString(toUnixTimestamp(s.datetime)*1000),
'duration',          toString(s.duration),
'events_count',      toString(s.events_count),
'pages_count',       toString(s.pages_count),
'errors_count',      toString(s.errors_count),
'user_anonymous_id', toString(s.user_anonymous_id),
'platform',          toString(s.platform),
'timezone',          toString(s.timezone),
'issue_score',       toString(coalesce(issue_score,0)),
'viewed',            toString(viewed_sessions.session_id > 0)
"""


def _multiple_conditions(condition, values, value_key="value", is_not=False):
    query = []
    for i in range(len(values)):
        k = f"{value_key}_{i}"
        query.append(condition.replace(value_key, k))
    return "(" + (" AND " if is_not else " OR ").join(query) + ")"


def _multiple_values(values, value_key="value"):
    query_values = {}
    if values is not None and isinstance(values, list):
        for i in range(len(values)):
            k = f"{value_key}_{i}"
            query_values[k] = values[i]
    return query_values


def _isAny_opreator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator.ON_ANY, schemas.SearchEventOperator.IS_ANY]


def _isUndefined_operator(op: schemas.SearchEventOperator):
    return op in [schemas.SearchEventOperator.IS_UNDEFINED]


# This function executes the query and return result
def search_sessions(data: schemas.SessionsSearchPayloadSchema, project_id, user_id, errors_only=False,
                    error_status=schemas.ErrorStatus.ALL, count_only=False, issue=None, ids_only=False,
                    platform="web"):
    if data.bookmarked:
        data.startTimestamp, data.endTimestamp = sessions_favorite.get_start_end_timestamp(project_id, user_id)
    full_args, query_part = search_query_parts_ch(data=data, error_status=error_status, errors_only=errors_only,
                                                  favorite_only=data.bookmarked, issue=issue, project_id=project_id,
                                                  user_id=user_id, platform=platform)
    if data.sort == "startTs":
        data.sort = "datetime"
    if data.limit is not None and data.page is not None:
        full_args["sessions_limit"] = data.limit
        full_args["sessions_limit_s"] = (data.page - 1) * data.limit
        full_args["sessions_limit_e"] = data.page * data.limit
    else:
        full_args["sessions_limit"] = 200
        full_args["sessions_limit_s"] = 0
        full_args["sessions_limit_e"] = 200

    meta_keys = []
    with ch_client.ClickHouseClient() as cur:
        if errors_only:
            main_query = cur.format(f"""SELECT DISTINCT er.error_id,
                                        COALESCE((SELECT TRUE
                                                 FROM {exp_ch_helper.get_user_viewed_errors_table()} AS ve
                                                 WHERE er.error_id = ve.error_id
                                                   AND ve.user_id = %(userId)s LIMIT 1), FALSE) AS viewed
                                        {query_part};""", full_args)

        elif count_only:
            main_query = cur.mogrify(f"""SELECT COUNT(DISTINCT s.session_id) AS count_sessions, 
                                                COUNT(DISTINCT s.user_uuid) AS count_users
                                        {query_part};""", full_args)
        elif data.group_by_user:
            g_sort = "count(full_sessions)"
            if data.order is None:
                data.order = schemas.SortOrderType.DESC.value
            else:
                data.order = data.order
            if data.sort is not None and data.sort != 'sessionsCount':
                sort = helper.key_to_snake_case(data.sort)
                g_sort = f"{'MIN' if data.order == schemas.SortOrderType.DESC else 'MAX'}({sort})"
            else:
                sort = 'start_ts'

            meta_keys = metadata.get(project_id=project_id)
            meta_map = ",map(%s) AS 'metadata'" \
                       % ','.join([f"'{m['key']}',coalesce(metadata_{m['index']},'None')" for m in meta_keys])
            main_query = cur.mogrify(f"""SELECT COUNT(*) AS count,
                                                COALESCE(JSONB_AGG(users_sessions) 
                                                    FILTER (WHERE rn>%(sessions_limit_s)s AND rn<=%(sessions_limit_e)s), '[]'::JSONB) AS sessions
                                        FROM (SELECT user_id,
                                                 count(full_sessions)                                   AS user_sessions_count,
                                                 jsonb_agg(full_sessions) FILTER (WHERE rn <= 1)        AS last_session,
                                                 MIN(full_sessions.start_ts)                            AS first_session_ts,
                                                 ROW_NUMBER() OVER (ORDER BY {g_sort} {data.order}) AS rn
                                            FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY {sort} {data.order}) AS rn 
                                                FROM (SELECT DISTINCT ON(s.session_id) {SESSION_PROJECTION_COLS_CH} {meta_map}
                                                    {query_part}
                                                    ) AS filtred_sessions
                                                ) AS full_sessions
                                                GROUP BY user_id
                                            ) AS users_sessions;""",
                                     full_args)
        elif ids_only:
            main_query = cur.format(f"""SELECT DISTINCT ON(s.session_id) s.session_id
                                             {query_part}
                                             ORDER BY s.session_id desc
                                             LIMIT %(sessions_limit)s OFFSET %(sessions_limit_s)s;""",
                                    full_args)
        else:
            if data.order is None:
                data.order = schemas.SortOrderType.DESC.value
            else:
                data.order = data.order
            sort = 'session_id'
            if data.sort is not None and data.sort != "session_id":
                # sort += " " + data.order + "," + helper.key_to_snake_case(data.sort)
                sort = helper.key_to_snake_case(data.sort)

            meta_keys = metadata.get(project_id=project_id)
            meta_map = ",'metadata',toString(map(%s))" \
                       % ','.join([f"'{m['key']}',coalesce(metadata_{m['index']},'None')" for m in meta_keys])
            main_query = cur.format(f"""SELECT any(total) AS count, groupArray(%(sessions_limit)s)(details) AS sessions
                                        FROM (SELECT total, details
                                              FROM (SELECT COUNT() OVER () AS total,
                                                    s.{sort} AS sort_key,
                                                    map({SESSION_PROJECTION_COLS_CH_MAP}{meta_map}) AS details
                                                {query_part}
                                              LEFT JOIN (SELECT DISTINCT session_id
                                                FROM experimental.user_viewed_sessions
                                                WHERE user_id = %(userId)s AND project_id=%(project_id)s
                                                  AND _timestamp >= toDateTime(%(startDate)s / 1000)) AS viewed_sessions
                                               ON (viewed_sessions.session_id = s.session_id)
                                             ) AS raw
                                        ORDER BY sort_key {data.order}
                                        LIMIT %(sessions_limit)s OFFSET %(sessions_limit_s)s) AS sorted_sessions;""",
                                    full_args)
        logging.debug("--------------------")
        logging.debug(main_query)
        logging.debug("--------------------")
        try:
            sessions = cur.execute(main_query)
        except Exception as err:
            logging.warning("--------- SESSIONS-CH SEARCH QUERY EXCEPTION -----------")
            logging.warning(main_query)
            logging.warning("--------- PAYLOAD -----------")
            logging.warning(data.model_dump_json())
            logging.warning("--------------------")
            raise err
        if errors_only or ids_only:
            return helper.list_to_camel_case(sessions)

        if len(sessions) > 0:
            sessions = sessions[0]

        total = sessions["count"]
        sessions = sessions["sessions"]

    if data.group_by_user:
        for i, s in enumerate(sessions):
            sessions[i] = {**s.pop("last_session")[0], **s}
            sessions[i].pop("rn")
            sessions[i]["metadata"] = ast.literal_eval(sessions[i]["metadata"])
    else:
        for i in range(len(sessions)):
            sessions[i]["metadata"] = ast.literal_eval(sessions[i]["metadata"])
            sessions[i] = schemas.SessionModel.parse_obj(helper.dict_to_camel_case(sessions[i]))

    return {
        'total': total,
        'sessions': sessions
    }


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
def search_query_parts_ch(data: schemas.SessionsSearchPayloadSchema, error_status, errors_only, favorite_only, issue,
                          project_id, user_id, platform="web", extra_event=None, extra_deduplication=[],
                          extra_conditions=None):
    if issue:
        data.filters.append(
            schemas.SessionSearchFilterSchema(value=[issue['type']],
                                              type=schemas.FilterType.ISSUE.value,
                                              operator='is')
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
                            "datetime >= toDateTime(%(startDate)s/1000)",
                            "datetime <= toDateTime(%(endDate)s/1000)"]
    events_conditions_where = ["main.project_id = %(projectId)s",
                               "main.datetime >= toDateTime(%(startDate)s/1000)",
                               "main.datetime <= toDateTime(%(endDate)s/1000)"]
    if len(data.filters) > 0:
        meta_keys = None
        # to reduce include a sub-query of sessions inside events query, in order to reduce the selected data
        include_in_events = False
        for i, f in enumerate(data.filters):
            if not isinstance(f.value, list):
                f.value = [f.value]
            filter_type = f.type
            f.value = helper.values_for_operator(value=f.value, op=f.operator)
            f_k = f"f_value{i}"
            full_args = {**full_args, f_k: f.value, **_multiple_values(f.value, value_key=f_k)}
            op = sh.get_sql_operator(f.operator) \
                if filter_type not in [schemas.FilterType.EVENTS_COUNT] else f.operator.value
            is_any = _isAny_opreator(f.operator)
            is_undefined = _isUndefined_operator(f.operator)
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
                        _multiple_conditions(f's.user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_browser {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_OS, schemas.FilterType.USER_OS_MOBILE]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_os)')
                    ss_constraints.append('isNotNull(ms.user_os)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_os {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_DEVICE, schemas.FilterType.USER_DEVICE_MOBILE]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_device)')
                    ss_constraints.append('isNotNull(ms.user_device)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_device {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.USER_COUNTRY, schemas.FilterType.USER_COUNTRY_MOBILE]:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_country)')
                    ss_constraints.append('isNotNull(ms.user_country)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_country {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in schemas.FilterType.USER_CITY:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_city)')
                    ss_constraints.append('isNotNull(ms.user_city)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_city {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_city {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in schemas.FilterType.USER_STATE:
                if is_any:
                    extra_constraints.append('isNotNull(s.user_state)')
                    ss_constraints.append('isNotNull(ms.user_state)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.user_state {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.user_state {op} %({f_k})s', f.value, is_not=is_not, value_key=f_k))

            elif filter_type in [schemas.FilterType.UTM_SOURCE]:
                if is_any:
                    extra_constraints.append('isNotNull(s.utm_source)')
                    ss_constraints.append('isNotNull(ms.utm_source)')
                elif is_undefined:
                    extra_constraints.append('isNull(s.utm_source)')
                    ss_constraints.append('isNull(ms.utm_source)')
                else:
                    extra_constraints.append(
                        _multiple_conditions(f's.utm_source {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_source {op} toString(%({f_k})s)', f.value, is_not=is_not,
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
                        _multiple_conditions(f's.utm_medium {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_medium {op} toString(%({f_k})s)', f.value, is_not=is_not,
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
                        _multiple_conditions(f's.utm_campaign {op} toString(%({f_k})s)', f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f'ms.utm_campaign {op} toString(%({f_k})s)', f.value, is_not=is_not,
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
                        _multiple_conditions(f"s.base_referrer {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"ms.base_referrer {op} toString(%({f_k})s)", f.value, is_not=is_not,
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
                            _multiple_conditions(
                                f"s.{metadata.index_to_colname(meta_keys[f.source])} {op} toString(%({f_k})s)",
                                f.value, is_not=is_not, value_key=f_k))
                        ss_constraints.append(
                            _multiple_conditions(
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
                        _multiple_conditions(f"s.user_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"ms.user_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
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
                        _multiple_conditions(f"s.user_anonymous_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"ms.user_anonymous_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
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
                        _multiple_conditions(f"s.rev_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
                    ss_constraints.append(
                        _multiple_conditions(f"ms.rev_id {op} toString(%({f_k})s)", f.value, is_not=is_not,
                                             value_key=f_k))
            elif filter_type == schemas.FilterType.PLATFORM:
                # op = sh.get_sql_operator(f.operator)
                extra_constraints.append(
                    _multiple_conditions(f"s.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"ms.user_device_type {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
            elif filter_type == schemas.FilterType.ISSUE:
                if is_any:
                    extra_constraints.append("notEmpty(s.issue_types)")
                    ss_constraints.append("notEmpty(ms.issue_types)")
                else:
                    if f.source:
                        issues.append(f)

                    extra_constraints.append(f"hasAny(s.issue_types,%({f_k})s)")
                    # _multiple_conditions(f"%({f_k})s {op} ANY (s.issue_types)", f.value, is_not=is_not,
                    #                      value_key=f_k))
                    ss_constraints.append(f"hasAny(ms.issue_types,%({f_k})s)")
                    #     _multiple_conditions(f"%({f_k})s {op} ANY (ms.issue_types)", f.value, is_not=is_not,
                    #                          value_key=f_k))
                    if is_not:
                        extra_constraints[-1] = f"not({extra_constraints[-1]})"
                        ss_constraints[-1] = f"not({ss_constraints[-1]})"
            elif filter_type == schemas.FilterType.EVENTS_COUNT:
                extra_constraints.append(
                    _multiple_conditions(f"s.events_count {op} %({f_k})s", f.value, is_not=is_not,
                                         value_key=f_k))
                ss_constraints.append(
                    _multiple_conditions(f"ms.events_count {op} %({f_k})s", f.value, is_not=is_not,
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
            is_any = _isAny_opreator(event.operator)
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
            is_any = _isAny_opreator(event.operator)
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
                           "main.datetime >= toDateTime(%(startDate)s/1000)",
                           "main.datetime <= toDateTime(%(endDate)s/1000)"]

            e_k = f"e_value{i}"
            s_k = e_k + "_source"

            event.value = helper.values_for_operator(value=event.value, op=event.operator)
            full_args = {**full_args,
                         **_multiple_values(event.value, value_key=e_k),
                         **_multiple_values(event.source, value_key=s_k)}

            if event_type == events.EventType.CLICK.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                if platform == "web":
                    _column = events.EventType.CLICK.column
                    event_where.append(
                        f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if schemas.ClickEventExtraOperator.has_value(event.operator):
                            event_where.append(
                                _multiple_conditions(f"main.selector {op} %({e_k})s", event.value, value_key=e_k))
                            events_conditions[-1]["condition"] = event_where[-1]
                        else:
                            if is_not:
                                event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                        value_key=e_k))
                                events_conditions_not.append(
                                    {
                                        "type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                                events_conditions_not[-1]["condition"] = event_where[-1]
                            else:
                                event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                        value_key=e_k))
                                events_conditions[-1]["condition"] = event_where[-1]
                else:
                    _column = events.EventType.CLICK_MOBILE.column
                    event_where.append(
                        f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if is_not:
                            event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                    value_key=e_k))
                            events_conditions_not.append(
                                {
                                    "type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = event_where[-1]
                        else:
                            event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                    value_key=e_k))
                            events_conditions[-1]["condition"] = event_where[-1]

            elif event_type == events.EventType.INPUT.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                if platform == "web":
                    _column = events.EventType.INPUT.column
                    event_where.append(
                        f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if is_not:
                            event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                    value_key=e_k))
                            events_conditions_not.append(
                                {
                                    "type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = event_where[-1]
                        else:
                            event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                    value_key=e_k))
                            events_conditions[-1]["condition"] = event_where[-1]
                    if event.source is not None and len(event.source) > 0:
                        event_where.append(_multiple_conditions(f"main.value ILIKE %(custom{i})s", event.source,
                                                                value_key=f"custom{i}"))
                        full_args = {**full_args, **_multiple_values(event.source, value_key=f"custom{i}")}
                else:
                    _column = events.EventType.INPUT_MOBILE.column
                    event_where.append(
                        f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if is_not:
                            event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                    value_key=e_k))
                            events_conditions_not.append(
                                {
                                    "type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = event_where[-1]
                        else:
                            event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                    value_key=e_k))
                            events_conditions[-1]["condition"] = event_where[-1]

            elif event_type == events.EventType.LOCATION.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                if platform == "web":
                    _column = 'url_path'
                    event_where.append(
                        f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if is_not:
                            event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                    value_key=e_k))
                            events_conditions_not.append(
                                {
                                    "type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = event_where[-1]
                        else:
                            event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s",
                                                                    event.value, value_key=e_k))
                            events_conditions[-1]["condition"] = event_where[-1]
                else:
                    _column = events.EventType.VIEW_MOBILE.column
                    event_where.append(
                        f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                    events_conditions.append({"type": event_where[-1]})
                    if not is_any:
                        if is_not:
                            event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                    value_key=e_k))
                            events_conditions_not.append(
                                {
                                    "type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                            events_conditions_not[-1]["condition"] = event_where[-1]
                        else:
                            event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s",
                                                                    event.value, value_key=e_k))
                            events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.CUSTOM.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = events.EventType.CUSTOM.column
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append(
                            {"type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.REQUEST.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = 'url_path'
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append(
                            {"type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]

            elif event_type == events.EventType.STATEACTION.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = events.EventType.STATEACTION.column
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append(
                            {"type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s",
                                                                event.value, value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            # TODO: isNot for ERROR
            elif event_type == events.EventType.ERROR.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main"
                events_extra_join = f"SELECT * FROM {MAIN_EVENTS_TABLE} AS main1 WHERE main1.project_id=%(project_id)s"
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                event.source = tuple(event.source)
                events_conditions[-1]["condition"] = []
                if not is_any and event.value not in [None, "*", ""]:
                    event_where.append(
                        _multiple_conditions(f"(main1.message {op} %({e_k})s OR main1.name {op} %({e_k})s)",
                                             event.value, value_key=e_k))
                    events_conditions[-1]["condition"].append(event_where[-1])
                    events_extra_join += f" AND {event_where[-1]}"
                if len(event.source) > 0 and event.source[0] not in [None, "*", ""]:
                    event_where.append(_multiple_conditions(f"main1.source = %({s_k})s", event.source, value_key=s_k))
                    events_conditions[-1]["condition"].append(event_where[-1])
                    events_extra_join += f" AND {event_where[-1]}"

                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])

            # ----- Mobile
            elif event_type == events.EventType.CLICK_MOBILE.ui_type:
                _column = events.EventType.CLICK_MOBILE.column
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append(
                            {"type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.INPUT_MOBILE.ui_type:
                _column = events.EventType.INPUT_MOBILE.column
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append(
                            {"type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.VIEW_MOBILE.ui_type:
                _column = events.EventType.VIEW_MOBILE.column
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append(
                            {"type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s",
                                                                event.value, value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.CUSTOM_MOBILE.ui_type:
                _column = events.EventType.CUSTOM_MOBILE.column
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append(
                            {"type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s",
                                                                event.value, value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.REQUEST_MOBILE.ui_type:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = 'url_path'
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append(
                            {"type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.CRASH_MOBILE.ui_type:
                _column = events.EventType.CRASH_MOBILE.column
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append(
                            {"type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s",
                                                                event.value, value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]
            elif event_type == events.EventType.SWIPE_MOBILE.ui_type and platform != "web":
                _column = events.EventType.SWIPE_MOBILE.column
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append(
                            {"type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s",
                                                                event.value, value_key=e_k))
                        events_conditions[-1]["condition"] = event_where[-1]

            elif event_type == schemas.PerformanceEventType.FETCH_FAILED:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                _column = 'url_path'
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                if not is_any:
                    if is_not:
                        event_where.append(_multiple_conditions(f"sub.{_column} {op} %({e_k})s", event.value,
                                                                value_key=e_k))
                        events_conditions_not.append(
                            {"type": f"sub.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'"})
                        events_conditions_not[-1]["condition"] = event_where[-1]
                    else:
                        event_where.append(_multiple_conditions(f"main.{_column} {op} %({e_k})s",
                                                                event.value, value_key=e_k))
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
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                col = performance_event.get_col(event_type)
                colname = col["column"]
                tname = "main"
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.url_path {op} %({e_k})s",
                                             event.value, value_key=e_k))
                    events_conditions[-1]["condition"].append(event_where[-1])
                e_k += "_custom"
                full_args = {**full_args, **_multiple_values(event.source, value_key=e_k)}

                event_where.append(f"isNotNull({tname}.{colname}) AND {tname}.{colname}>0 AND " +
                                   _multiple_conditions(f"{tname}.{colname} {event.sourceOperator} %({e_k})s",
                                                        event.source, value_key=e_k))
                events_conditions[-1]["condition"].append(event_where[-1])
                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])
            # TODO: isNot for PerformanceEvent
            elif event_type in [schemas.PerformanceEventType.LOCATION_AVG_CPU_LOAD,
                                schemas.PerformanceEventType.LOCATION_AVG_MEMORY_USAGE]:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                col = performance_event.get_col(event_type)
                colname = col["column"]
                tname = "main"
                if not is_any:
                    event_where.append(
                        _multiple_conditions(f"main.url_path {op} %({e_k})s",
                                             event.value, value_key=e_k))
                    events_conditions[-1]["condition"].append(event_where[-1])
                e_k += "_custom"
                full_args = {**full_args, **_multiple_values(event.source, value_key=e_k)}

                event_where.append(f"isNotNull({tname}.{colname}) AND {tname}.{colname}>0 AND " +
                                   _multiple_conditions(f"{tname}.{colname} {event.sourceOperator} %({e_k})s",
                                                        event.source, value_key=e_k))
                events_conditions[-1]["condition"].append(event_where[-1])
                events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])

            elif event_type == schemas.EventType.REQUEST_DETAILS:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                event_where.append(f"main.event_type='{exp_ch_helper.get_event_type(event_type, platform=platform)}'")
                events_conditions.append({"type": event_where[-1]})
                apply = False
                events_conditions[-1]["condition"] = []
                for j, f in enumerate(event.filters):
                    is_any = _isAny_opreator(f.operator)
                    if is_any or len(f.value) == 0:
                        continue
                    f.value = helper.values_for_operator(value=f.value, op=f.operator)
                    op = sh.get_sql_operator(f.operator)
                    e_k_f = e_k + f"_fetch{j}"
                    full_args = {**full_args, **_multiple_values(f.value, value_key=e_k_f)}
                    if f.type == schemas.FetchFilterType.FETCH_URL:
                        event_where.append(
                            _multiple_conditions(f"main.url_path {op} %({e_k_f})s", f.value,
                                                 value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_STATUS_CODE:
                        event_where.append(
                            _multiple_conditions(f"main.status {f.operator} %({e_k_f})s", f.value,
                                                 value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_METHOD:
                        event_where.append(
                            _multiple_conditions(f"main.method {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_DURATION:
                        event_where.append(
                            _multiple_conditions(f"main.duration {f.operator} %({e_k_f})s", f.value,
                                                 value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_REQUEST_BODY:
                        event_where.append(
                            _multiple_conditions(f"main.request_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    elif f.type == schemas.FetchFilterType.FETCH_RESPONSE_BODY:
                        event_where.append(
                            _multiple_conditions(f"main.response_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                        apply = True
                    else:
                        logging.warning(f"undefined FETCH filter: {f.type}")
                if not apply:
                    continue
                else:
                    events_conditions[-1]["condition"] = " AND ".join(events_conditions[-1]["condition"])
            # TODO: no isNot for GraphQL
            elif event_type == schemas.EventType.GRAPHQL:
                event_from = event_from % f"{MAIN_EVENTS_TABLE} AS main "
                event_where.append(f"main.event_type='GRAPHQL'")
                events_conditions.append({"type": event_where[-1]})
                events_conditions[-1]["condition"] = []
                for j, f in enumerate(event.filters):
                    is_any = _isAny_opreator(f.operator)
                    if is_any or len(f.value) == 0:
                        continue
                    f.value = helper.values_for_operator(value=f.value, op=f.operator)
                    op = sh.get_sql_operator(f.operator)
                    e_k_f = e_k + f"_graphql{j}"
                    full_args = {**full_args, **_multiple_values(f.value, value_key=e_k_f)}
                    if f.type == schemas.GraphqlFilterType.GRAPHQL_NAME:
                        event_where.append(
                            _multiple_conditions(f"main.{events.EventType.GRAPHQL.column} {op} %({e_k_f})s", f.value,
                                                 value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                    elif f.type == schemas.GraphqlFilterType.GRAPHQL_METHOD:
                        event_where.append(
                            _multiple_conditions(f"main.method {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                    elif f.type == schemas.GraphqlFilterType.GRAPHQL_REQUEST_BODY:
                        event_where.append(
                            _multiple_conditions(f"main.request_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
                        events_conditions[-1]["condition"].append(event_where[-1])
                    elif f.type == schemas.GraphqlFilterType.GRAPHQL_RESPONSE_BODY:
                        event_where.append(
                            _multiple_conditions(f"main.response_body {op} %({e_k_f})s", f.value, value_key=e_k_f))
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
            (SELECT main.session_id, {"MIN" if event_index < (valid_events_count - 1) else "MAX"}(main.datetime) AS datetime
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
                having = f"""HAVING sequenceMatch('{''.join(sequence_pattern)}')(main.datetime,{','.join(sequence_conditions)})"""
            else:
                having = f"""HAVING {" AND ".join([f"countIf({c})>0" for c in list(set(sequence_conditions))])}"""

            events_query_part = f"""SELECT main.session_id,
                                        MIN(main.datetime) AS first_event_ts,
                                        MAX(main.datetime) AS last_event_ts
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
                                        MIN(main.datetime) AS first_event_ts,
                                        MAX(main.datetime) AS last_event_ts
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
                             AND events.datetime >= toDateTime(%(startDate)s/1000)
                             AND events.datetime <= toDateTime(%(endDate)s/1000)
                             ) AS issues ON (f.session_id = issues.session_id)
                """
        full_args["issue_contextString"] = issue["contextString"]
        full_args["issue_type"] = issue["type"]
    elif len(issues) > 0:
        issues_conditions = []
        for i, f in enumerate(issues):
            f_k_v = f"f_issue_v{i}"
            f_k_s = f_k_v + "_source"
            full_args = {**full_args, **_multiple_values(f.value, value_key=f_k_v), f_k_s: f.source}
            issues_conditions.append(_multiple_conditions(f"issues.type=%({f_k_v})s", f.value,
                                                          value_key=f_k_v))
            issues_conditions[-1] = f"({issues_conditions[-1]} AND issues.context_string=%({f_k_s})s)"
        extra_join = f"""INNER JOIN (SELECT DISTINCT events.session_id
                                 FROM experimental.issues
                                          INNER JOIN experimental.events USING (issue_id)
                                 WHERE issues.project_id = %(projectId)s
                                   AND events.project_id = %(projectId)s
                                   AND events.datetime >= toDateTime(%(startDate)s/1000)
                                   AND events.datetime <= toDateTime(%(endDate)s/1000)
                                   AND {" OR ".join(issues_conditions)}
                            ) AS issues USING (session_id)"""

    if extra_event:
        extra_event = f"INNER JOIN ({extra_event}) AS extra_event USING(session_id)"
        if extra_conditions and len(extra_conditions) > 0:
            _extra_or_condition = []
            for i, c in enumerate(extra_conditions):
                if _isAny_opreator(c.operator):
                    continue
                e_k = f"ec_value{i}"
                op = sh.get_sql_operator(c.operator)
                c.value = helper.values_for_operator(value=c.value, op=c.operator)
                full_args = {**full_args,
                             **_multiple_values(c.value, value_key=e_k)}
                if c.type == events.EventType.LOCATION.ui_type:
                    _extra_or_condition.append(
                        _multiple_conditions(f"extra_event.url_path {op} %({e_k})s",
                                             c.value, value_key=e_k))
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
            extra_join += f"""INNER JOIN (SELECT * 
                                    FROM {MAIN_SESSIONS_TABLE} AS s {extra_event}
                                    WHERE {" AND ".join(extra_constraints)}) AS s ON(s.session_id=f.session_id)"""
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


def search_by_metadata(tenant_id, user_id, m_key, m_value, project_id=None):
    if project_id is None:
        all_projects = projects.get_projects(tenant_id=tenant_id)
    else:
        all_projects = [
            projects.get_project(tenant_id=tenant_id, project_id=int(project_id), include_last_session=False,
                                 include_gdpr=False)]

    all_projects = {int(p["projectId"]): p["name"] for p in all_projects}
    project_ids = list(all_projects.keys())

    available_keys = metadata.get_keys_by_projects(project_ids)
    for i in available_keys:
        available_keys[i]["user_id"] = schemas.FilterType.USER_ID
        available_keys[i]["user_anonymous_id"] = schemas.FilterType.USER_ANONYMOUS_ID
    results = {}
    for i in project_ids:
        if m_key not in available_keys[i].values():
            available_keys.pop(i)
            results[i] = {"total": 0, "sessions": [], "missingMetadata": True}
    project_ids = list(available_keys.keys())
    if len(project_ids) > 0:
        with pg_client.PostgresClient() as cur:
            sub_queries = []
            for i in project_ids:
                col_name = list(available_keys[i].keys())[list(available_keys[i].values()).index(m_key)]
                sub_queries.append(cur.mogrify(
                    f"(SELECT COALESCE(COUNT(s.*)) AS count FROM public.sessions AS s WHERE s.project_id = %(id)s AND s.{col_name} = %(value)s) AS \"{i}\"",
                    {"id": i, "value": m_value}).decode('UTF-8'))
            query = f"""SELECT {", ".join(sub_queries)};"""
            cur.execute(query=query)

            rows = cur.fetchone()

            sub_queries = []
            for i in rows.keys():
                results[i] = {"total": rows[i], "sessions": [], "missingMetadata": False, "name": all_projects[int(i)]}
                if rows[i] > 0:
                    col_name = list(available_keys[int(i)].keys())[list(available_keys[int(i)].values()).index(m_key)]
                    sub_queries.append(
                        cur.mogrify(
                            f"""(
                                    SELECT *
                                    FROM (
                                            SELECT DISTINCT ON(favorite_sessions.session_id, s.session_id) {SESSION_PROJECTION_COLS_CH}
                                            FROM public.sessions AS s LEFT JOIN (SELECT session_id
                                                                                    FROM public.user_favorite_sessions
                                                                                    WHERE user_favorite_sessions.user_id = %(userId)s
                                                                                ) AS favorite_sessions USING (session_id)
                                            WHERE s.project_id = %(id)s AND s.duration IS NOT NULL AND s.{col_name} = %(value)s
                                        ) AS full_sessions
                                    ORDER BY favorite DESC, issue_score DESC
                                    LIMIT 10
                                )""",
                            {"id": i, "value": m_value, "userId": user_id}).decode('UTF-8'))
            if len(sub_queries) > 0:
                cur.execute("\nUNION\n".join(sub_queries))
                rows = cur.fetchall()
                for i in rows:
                    results[str(i["project_id"])]["sessions"].append(helper.dict_to_camel_case(i))
    return results


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
        query = cur.format(f"""SELECT 1 
                               FROM {exp_ch_helper.get_main_sessions_table()} 
                               WHERE session_id=%(session_id)s 
                                    AND project_id=%(project_id)s
                               LIMIT 1""",
                           {"project_id": project_id, "session_id": session_id})
        row = cur.execute(query)
    return row is not None


# TODO: support this for CH
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


# TODO: rewrite this function to use ClickHouse
def search_sessions_by_ids(project_id: int, session_ids: list, sort_by: str = 'session_id',
                           ascending: bool = False) -> dict:
    if session_ids is None or len(session_ids) == 0:
        return {"total": 0, "sessions": []}
    with pg_client.PostgresClient() as cur:
        meta_keys = metadata.get(project_id=project_id)
        params = {"project_id": project_id, "session_ids": tuple(session_ids)}
        order_direction = 'ASC' if ascending else 'DESC'
        main_query = cur.mogrify(f"""SELECT {sessions_legacy.SESSION_PROJECTION_BASE_COLS}
                                            {"," if len(meta_keys) > 0 else ""}{",".join([f'metadata_{m["index"]}' for m in meta_keys])}
                                     FROM public.sessions AS s
                                        WHERE project_id=%(project_id)s 
                                            AND session_id IN %(session_ids)s
                                     ORDER BY {sort_by} {order_direction};""", params)

        cur.execute(main_query)
        rows = cur.fetchall()
        if len(meta_keys) > 0:
            for s in rows:
                s["metadata"] = {}
                for m in meta_keys:
                    s["metadata"][m["key"]] = s.pop(f'metadata_{m["index"]}')
    return {"total": len(rows), "sessions": helper.list_to_camel_case(rows)}
