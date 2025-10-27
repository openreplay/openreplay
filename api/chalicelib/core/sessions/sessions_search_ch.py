import json
import logging

import schemas
from chalicelib.core import metadata
from chalicelib.utils import helper, ch_client, exp_ch_helper
from . import sessions_favorite, sessions_search_legacy, sessions_ch as sessions, sessions_legacy_mobil

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
'viewed',            toString(viewed_sessions.session_id > 0)
"""


def __parse_metadata(metadata_map):
    return json.loads(metadata_map.replace("'", '"').replace("NULL", 'null'))


# This function executes the query and return result
def search_sessions(data: schemas.SessionsSearchPayloadSchema, project: schemas.ProjectContext,
                    user_id, errors_only=False, error_status=schemas.ErrorStatus.ALL,
                    count_only=False, issue=None, ids_only=False, metric_of: schemas.MetricOfTable = None):
    if data.bookmarked:
        data.startTimestamp, data.endTimestamp = sessions_favorite.get_start_end_timestamp(project.project_id, user_id)
    if data.startTimestamp is None:
        logger.debug(f"No vault sessions found for project:{project.project_id}")
        return {
            'total': 0,
            'sessions': [],
            '_src': 2
        }
    # ---------------------- extra filter in order to only select sessions that has been used in the card-table
    extra_event = None
    # extra_deduplication = []
    extra_conditions = None
    if metric_of == schemas.MetricOfTable.VISITED_URL:
        extra_event = f"""SELECT DISTINCT ev.session_id, 
                                 JSONExtractString(toString(ev.`$properties`), 'url_path') AS url_path
                      FROM {exp_ch_helper.get_main_events_table(data.startTimestamp)} AS ev
                      WHERE ev.created_at >= toDateTime(%(startDate)s / 1000)
                        AND ev.created_at <= toDateTime(%(endDate)s / 1000)
                        AND ev.project_id = %(project_id)s
                        AND ev.`$event_name` = 'LOCATION'"""
        # extra_deduplication.append("url_path")
        extra_conditions = {}
        for e in data.events:
            if e.name == schemas.EventType.LOCATION:
                if e.operator not in extra_conditions:
                    extra_conditions[e.operator] = schemas.SessionSearchEventSchema(**{
                        "type": e.name,
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
        extra_event = f"""SELECT DISTINCT ev.session_id 
                          FROM {exp_ch_helper.get_main_events_table(data.startTimestamp)} AS ev
                          WHERE ev.created_at >= toDateTime(%(startDate)s / 1000)
                            AND ev.created_at <= toDateTime(%(endDate)s / 1000)
                            AND ev.project_id = %(project_id)s
                            AND ev.`$event_name` = 'REQUEST'"""

        # extra_deduplication.append("url_path")
        extra_conditions = {}
        for e in data.events:
            if e.name == schemas.EventType.REQUEST_DETAILS:
                if e.operator not in extra_conditions:
                    extra_conditions[e.operator] = schemas.SessionSearchEventSchema(**{
                        "type": e.name,
                        "isEvent": True,
                        "value": [],
                        "operator": e.operator,
                        "filters": e.filters
                    })
                for v in e.value:
                    if v not in extra_conditions[e.operator].value:
                        extra_conditions[e.operator].value.append(v)
        extra_conditions = list(extra_conditions.values())

    # elif metric_of == schemas.MetricOfTable.ISSUES and len(metric_value) > 0:
    #     data.filters.append(schemas.SessionSearchFilterSchema(value=metric_value, type=schemas.FilterType.ISSUE,
    #                                                           operator=schemas.SearchEventOperator.IS))
    # ----------------------
    if project.platform == "web":
        full_args, query_part = sessions.search_query_parts_ch(data=data, error_status=error_status,
                                                               errors_only=errors_only,
                                                               favorite_only=data.bookmarked, issue=issue,
                                                               project_id=project.project_id,
                                                               user_id=user_id, platform=project.platform,
                                                               extra_event=extra_event,
                                                               # extra_deduplication=extra_deduplication,
                                                               extra_conditions=extra_conditions)
    else:
        full_args, query_part = sessions_legacy_mobil.search_query_parts_ch(data=data, error_status=error_status,
                                                                            errors_only=errors_only,
                                                                            favorite_only=data.bookmarked, issue=issue,
                                                                            project_id=project.project_id,
                                                                            user_id=user_id, platform=project.platform)
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
            main_query = cur.format(query=f"""SELECT DISTINCT er.error_id,
                                              COALESCE((SELECT TRUE
                                                        FROM {exp_ch_helper.get_user_viewed_errors_table()} AS ve
                                                        WHERE er.error_id = ve.error_id
                                                            AND ve.user_id = %(userId)s LIMIT 1), FALSE) AS viewed
                                              {query_part};""", parameters=full_args)

        elif count_only:
            main_query = cur.format(query=f"""SELECT COUNT(DISTINCT s.session_id) AS count_sessions, 
                                                     COUNT(DISTINCT s.user_uuid) AS count_users
                                              {query_part};""",
                                    parameters=full_args)
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

            meta_keys = metadata.get(project_id=project.project_id)
            meta_map = ",map(%s) AS 'metadata'" \
                       % ','.join(
                [f"'{m['key']}',coalesce(metadata_{m['index']},CAST(NULL AS Nullable(String)))" for m in meta_keys])
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
            main_query = cur.format(query=f"""SELECT DISTINCT ON(s.session_id) s.session_id AS session_id
                                              {query_part}
                                              ORDER BY s.session_id desc
                                              LIMIT %(sessions_limit)s OFFSET %(sessions_limit_s)s;""",
                                    parameters=full_args)
        else:
            if data.order is None:
                data.order = schemas.SortOrderType.DESC.value
            else:
                data.order = data.order
            sort = 'session_id'
            if data.sort is not None and data.sort != "session_id":
                # sort += " " + data.order + "," + helper.key_to_snake_case(data.sort)
                sort = helper.key_to_snake_case(data.sort)

            meta_keys = metadata.get(project_id=project.project_id)
            meta_map = ",'metadata',toString(map(%s))" \
                       % ','.join(
                [f"'{m['key']}',coalesce(metadata_{m['index']},CAST(NULL AS Nullable(String)))" for m in meta_keys])
            main_query = cur.format(query=f"""SELECT any(total) AS count, 
                                                     groupArray(%(sessions_limit)s)(details) AS sessions
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
                                    parameters=full_args)

        try:
            logging.debug("--------------------")
            sessions_list = cur.execute(main_query)
            logging.debug("--------------------")
        except Exception as err:
            logging.warning("--------- SESSIONS-CH SEARCH QUERY EXCEPTION -----------")
            logging.warning(main_query)
            logging.warning("--------- PAYLOAD -----------")
            logging.warning(data.model_dump_json())
            logging.warning("--------------------")
            raise err
        if errors_only or ids_only:
            return helper.list_to_camel_case(sessions_list)

        if len(sessions_list) > 0:
            sessions_list = sessions_list[0]

        total = sessions_list["count"]
        sessions_list = sessions_list["sessions"]

    if data.group_by_user:
        for i, s in enumerate(sessions_list):
            sessions_list[i] = {**s.pop("last_session")[0], **s}
            sessions_list[i].pop("rn")
            sessions_list[i]["metadata"] = __parse_metadata(sessions_list[i]["metadata"])
    else:
        import json
        for i in range(len(sessions_list)):
            sessions_list[i]["metadata"] = __parse_metadata(sessions_list[i]["metadata"])
            sessions_list[i] = schemas.SessionModel.model_validate(helper.dict_to_camel_case(sessions_list[i]))

    return {
        'total': total,
        'sessions': sessions_list,
        '_src': 2
    }


def search_by_metadata(tenant_id, user_id, m_key, m_value, project_id=None):
    return sessions_search_legacy.search_by_metadata(tenant_id, user_id, m_key, m_value, project_id)


def search_sessions_by_ids(project_id: int, session_ids: list, sort_by: str = 'session_id',
                           ascending: bool = False) -> dict:
    return sessions_search_legacy.search_sessions_by_ids(project_id, session_ids, sort_by, ascending)
