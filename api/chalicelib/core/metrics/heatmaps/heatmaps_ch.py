import logging

from decouple import config

import schemas
from chalicelib.core import events
from chalicelib.core.metrics.modules import sessions, sessions_mobs
from chalicelib.utils import sql_helper as sh

from chalicelib.utils import pg_client, helper, ch_client, exp_ch_helper

logger = logging.getLogger(__name__)


def get_by_url(project_id, data: schemas.GetHeatMapPayloadSchema):
    if data.url is None or data.url == "":
        return []
    args = {"startDate": data.startTimestamp, "endDate": data.endTimestamp,
            "project_id": project_id, "url": data.url}
    constraints = [
        "main_events.project_id = toUInt16(%(project_id)s)",
        "main_events.created_at >= toDateTime(%(startDate)s / 1000)",
        "main_events.created_at <= toDateTime(%(endDate)s / 1000)",
        "main_events.`$event_name` = 'CLICK'",
        "isNotNull(JSON_VALUE(CAST(main_events.`$properties` AS String), '$.normalized_x'))"
    ]

    if data.operator == schemas.SearchEventOperator.IS:
        constraints.append("JSON_VALUE(CAST(main_events.`$properties` AS String), '$.url_path') = %(url)s")
    else:
        constraints.append("JSON_VALUE(CAST(main_events.`$properties` AS String), '$.url_path') ILIKE %(url)s")
        args["url"] = helper.values_for_operator(data.url, data.operator)

    query_from = f"{exp_ch_helper.get_main_events_table(data.startTimestamp)} AS main_events"
    # TODO: is this used ?
    # has_click_rage_filter = False
    # if len(data.filters) > 0:
    #     for i, f in enumerate(data.filters):
    #         if f.type == schemas.FilterType.issue and len(f.value) > 0:
    #             has_click_rage_filter = True
    #             query_from += """INNER JOIN events_common.issues USING (timestamp, session_id)
    #                            INNER JOIN issues AS mis USING (issue_id)
    #                            INNER JOIN LATERAL (
    #                                 SELECT COUNT(1) AS real_count
    #                                  FROM events.clicks AS sc
    #                                           INNER JOIN sessions as ss USING (session_id)
    #                                  WHERE ss.project_id = 2
    #                                    AND (sc.url = %(url)s OR sc.path = %(url)s)
    #                                    AND sc.timestamp >= %(startDate)s
    #                                    AND sc.timestamp <= %(endDate)s
    #                                    AND ss.start_ts >= %(startDate)s
    #                                    AND ss.start_ts <= %(endDate)s
    #                                    AND sc.selector = clicks.selector) AS r_clicks ON (TRUE)"""
    #             constraints += ["mis.project_id = %(project_id)s",
    #                             "issues.timestamp >= %(startDate)s",
    #                             "issues.timestamp <= %(endDate)s"]
    #             f_k = f"issue_value{i}"
    #             args = {**args, **sh.multi_values(f.value, value_key=f_k)}
    #             constraints.append(sh.multi_conditions(f"%({f_k})s = ANY (issue_types)",
    #                                                    f.value, value_key=f_k))
    #             constraints.append(sh.multi_conditions(f"mis.type = %({f_k})s",
    #                                                    f.value, value_key=f_k))
    # TODO: change this once click-rage is fixed
    # if data.click_rage and not has_click_rage_filter:
    #     constraints.append("""(issues_t.session_id IS NULL
    #                             OR (issues_t.datetime >= toDateTime(%(startDate)s/1000)
    #                                 AND issues_t.datetime <= toDateTime(%(endDate)s/1000)
    #                                 AND issues_t.project_id = toUInt16(%(project_id)s)
    #                                 AND issues_t.event_type = 'ISSUE'
    #                                 AND issues_t.project_id = toUInt16(%(project_id)s)
    #                                 AND mis.project_id = toUInt16(%(project_id)s)
    #                                 AND mis.type='click_rage'))""")
    #     query_from += """ LEFT JOIN experimental.events AS issues_t ON (main_events.session_id=issues_t.session_id)
    #                    LEFT JOIN experimental.issues AS mis ON (issues_t.issue_id=mis.issue_id)"""
    with ch_client.ClickHouseClient() as cur:
        query = cur.format(query=f"""SELECT 
                                accurateCastOrNull(`$properties`.`normalized_x`,'Float64') AS normalized_x, 
                                accurateCastOrNull(`$properties`.`normalized_y`,'Float64') AS normalized_y
                             FROM {query_from}
                             WHERE {" AND ".join(constraints)}
                             LIMIT 500;""",
                           parameters=args)
        logger.debug("---------")
        logger.debug(query)
        logger.debug("---------")
        try:
            rows = cur.execute(query=query)
        except Exception as err:
            logger.warning("--------- HEATMAP 2 SEARCH QUERY EXCEPTION CH -----------")
            logger.warning(query)
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(data)
            logger.warning("--------------------")
            raise err

        return helper.list_to_camel_case(rows)


def get_x_y_by_url_and_session_id(project_id, session_id, data: schemas.GetHeatMapPayloadSchema):
    args = {"project_id": project_id, "session_id": session_id, "url": data.url}
    constraints = [
        "main_events.project_id = toUInt16(%(project_id)s)",
        "main_events.session_id = %(session_id)s",
        "main_events.`$event_name`='CLICK'",
        "isNotNull(JSON_VALUE(CAST(main_events.`$properties` AS String), '$.normalized_x'))"
    ]
    if data.operator == schemas.SearchEventOperator.IS:
        constraints.append("JSON_VALUE(CAST(main_events.`$properties` AS String), '$.url_path') = %(url)s")
    else:
        constraints.append("JSON_VALUE(CAST(main_events.`$properties` AS String), '$.url_path') ILIKE %(url)s")
        args["url"] = helper.values_for_operator(data.url, data.operator)

    query_from = f"{exp_ch_helper.get_main_events_table(0)} AS main_events"

    with ch_client.ClickHouseClient() as cur:
        query = cur.format(query=f"""SELECT main_events.normalized_x AS normalized_x, 
                                                main_events.normalized_y AS normalized_y
                               FROM {query_from}
                               WHERE {" AND ".join(constraints)};""",
                           parameters=args)
        logger.debug("---------")
        logger.debug(query)
        logger.debug("---------")
        try:
            rows = cur.execute(query=query)
        except Exception as err:
            logger.warning("--------- HEATMAP-session_id SEARCH QUERY EXCEPTION CH -----------")
            logger.warning(query)
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(data)
            logger.warning("--------------------")
            raise err

        return helper.list_to_camel_case(rows)


def get_selectors_by_url_and_session_id(project_id, session_id, data: schemas.GetHeatMapPayloadSchema):
    args = {"project_id": project_id, "session_id": session_id, "url": data.url}
    constraints = ["main_events.project_id = toUInt16(%(project_id)s)",
                   "main_events.session_id = %(session_id)s",
                   "main_events.`$event_name`='CLICK'"]

    if data.operator == schemas.SearchEventOperator.IS:
        constraints.append("JSON_VALUE(CAST(main_events.`$properties` AS String), '$.url_path') = %(url)s")
    else:
        constraints.append("JSON_VALUE(CAST(main_events.`$properties` AS String), '$.url_path') ILIKE %(url)s")
        args["url"] = helper.values_for_operator(data.url, data.operator)

    query_from = f"{exp_ch_helper.get_main_events_table(0)} AS main_events"

    with ch_client.ClickHouseClient() as cur:
        query = cur.format(query=f"""SELECT CAST(`$properties`.selector AS String) AS selector, 
                                      COUNT(1) AS count
                               FROM {query_from}
                               WHERE {" AND ".join(constraints)}
                               GROUP BY 1
                               ORDER BY count DESC;""",
                           parameters=args)
        logger.debug("---------")
        logger.debug(query)
        logger.debug("---------")
        try:
            rows = cur.execute(query=query)
        except Exception as err:
            logger.warning("--------- HEATMAP-session_id SEARCH QUERY EXCEPTION CH -----------")
            logger.warning(query)
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(data)
            logger.warning("--------------------")
            raise err

        return helper.list_to_camel_case(rows)


# use CH
SESSION_PROJECTION_COLS = """s.project_id,
s.session_id AS session_id,
toUnixTimestamp(s.datetime)*1000 AS start_ts,
s.duration AS duration"""


def __get_1_url(location_condition: schemas.SessionSearchEventSchema2 | None, session_id: str, project_id: int,
                start_time: int,
                end_time: int) -> str | None:
    full_args = {
        "sessionId": session_id,
        "projectId": project_id,
        "start_time": start_time,
        "end_time": end_time,
    }
    sub_condition = ["session_id = %(sessionId)s", "`$event_name` = 'CLICK'", "project_id = %(projectId)s"]
    if location_condition and len(location_condition.value) > 0:
        f_k = "LOC"
        op = sh.get_sql_operator(location_condition.operator)
        full_args = {**full_args, **sh.multi_values(location_condition.value, value_key=f_k)}
        sub_condition.append(
            sh.multi_conditions(f'path {op} %({f_k})s', location_condition.value, is_not=False,
                                value_key=f_k))
    with ch_client.ClickHouseClient() as cur:
        main_query = cur.format(query=f"""WITH paths AS (
                                     SELECT DISTINCT 
                                         JSON_VALUE(CAST(`$properties` AS String), '$.url_path') AS url_path
                                     FROM product_analytics.events
                                     WHERE {" AND ".join(sub_condition)}
                                  )
                                  SELECT 
                                      paths.url_path, 
                                      COUNT(*) AS count
                                  FROM product_analytics.events
                                  INNER JOIN paths 
                                      ON JSON_VALUE(CAST(product_analytics.events.$properties AS String), '$.url_path') = paths.url_path
                                  WHERE `$event_name` = 'CLICK'
                                    AND project_id = %(projectId)s
                                    AND created_at >= toDateTime(%(start_time)s / 1000)
                                    AND created_at <= toDateTime(%(end_time)s / 1000)
                                  GROUP BY paths.url_path
                                  ORDER BY count DESC
                                  LIMIT 1;""",
                                parameters=full_args)
        logger.debug("--------------------")
        logger.debug(main_query)
        logger.debug("--------------------")
        try:
            url = cur.execute(query=main_query)
        except Exception as err:
            logger.warning("--------- CLICK MAP BEST URL SEARCH QUERY EXCEPTION CH-----------")
            logger.warning(main_query.decode('UTF-8'))
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(full_args)
            logger.warning("--------------------")
            raise err

    if url is None or len(url) == 0:
        return None
    return url[0]["url_path"]


def search_short_session(data: schemas.HeatMapSessionsSearch, project_id, user_id,
                         include_mobs: bool = True, exclude_sessions: list[str] = [],
                         _depth: int = 3):
    no_platform = True
    location_condition = None
    no_click = True
    for f in data.filters:
        if f.type == schemas.FilterType.PLATFORM:
            no_platform = False
            break
    for f in data.events:
        if f.type == schemas.EventType.LOCATION:
            if len(f.value) == 0:
                f.operator = schemas.SearchEventOperator.IS_ANY
            location_condition = f.model_copy()
        elif f.type == schemas.EventType.CLICK:
            no_click = False
            if len(f.value) == 0:
                f.operator = schemas.SearchEventOperator.IS_ANY
        if location_condition and not no_click:
            break

    if no_platform:
        data.filters.append(schemas.SessionSearchFilterSchema(type=schemas.FilterType.PLATFORM,
                                                              value=[schemas.PlatformType.DESKTOP],
                                                              operator=schemas.SearchEventOperator.IS))
    if not location_condition:
        data.events.append(schemas.SessionSearchEventSchema2(type=schemas.EventType.LOCATION,
                                                             value=[],
                                                             operator=schemas.SearchEventOperator.IS_ANY))
    if no_click:
        data.events.append(schemas.SessionSearchEventSchema2(type=schemas.EventType.CLICK,
                                                             value=[],
                                                             operator=schemas.SearchEventOperator.IS_ANY))

    data.filters.append(schemas.SessionSearchFilterSchema(type=schemas.FilterType.EVENTS_COUNT,
                                                          value=[0],
                                                          operator=schemas.MathOperator.GREATER))

    full_args, query_part = sessions.search_query_parts_ch(data=data, error_status=None, errors_only=False,
                                                           favorite_only=data.bookmarked, issue=None,
                                                           project_id=project_id, user_id=user_id)
    full_args["exclude_sessions"] = tuple(exclude_sessions)
    if len(exclude_sessions) > 0:
        query_part += "\n AND session_id NOT IN (%(exclude_sessions)s)"
    with ch_client.ClickHouseClient() as cur:
        data.order = schemas.SortOrderType.DESC
        data.sort = 'duration'
        main_query = cur.format(query=f"""SELECT * 
                                           FROM (SELECT {SESSION_PROJECTION_COLS}
                                           {query_part}
                                           -- ORDER BY {data.sort} {data.order.value}
                                           LIMIT 20) AS raw
                                           ORDER BY rand()
                                           LIMIT 1;""",
                                parameters=full_args)
        logger.debug("--------------------")
        logger.debug(main_query)
        logger.debug("--------------------")
        try:
            session = cur.execute(query=main_query)
        except Exception as err:
            logger.warning("--------- CLICK MAP SHORT SESSION SEARCH QUERY EXCEPTION CH -----------")
            logger.warning(main_query)
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(data.model_dump_json())
            logger.warning("--------------------")
            raise err

    if len(session) > 0:
        session = session[0]
        if not location_condition or location_condition.operator == schemas.SearchEventOperator.IS_ANY:
            session["path"] = __get_1_url(project_id=project_id, session_id=session["session_id"],
                                          location_condition=location_condition,
                                          start_time=data.startTimestamp, end_time=data.endTimestamp)
        else:
            session["path"] = location_condition.value[0]

        if include_mobs:
            session['domURL'] = sessions_mobs.get_urls(session_id=session["session_id"], project_id=project_id)
            session['mobsUrl'] = sessions_mobs.get_urls_depercated(session_id=session["session_id"])
            if _depth > 0 and len(session['domURL']) == 0 and len(session['mobsUrl']) == 0:
                return search_short_session(data=data, project_id=project_id, user_id=user_id,
                                            include_mobs=include_mobs,
                                            exclude_sessions=exclude_sessions + [session["session_id"]],
                                            _depth=_depth - 1)
            elif _depth == 0 and len(session['domURL']) == 0 and len(session['mobsUrl']) == 0:
                logger.info("couldn't find an existing replay after 3 iterations for heatmap")

        session['events'] = events.get_by_session_id(project_id=project_id, session_id=session["session_id"],
                                                     event_type=schemas.EventType.LOCATION)
    else:
        return None

    return helper.dict_to_camel_case(session)


def get_selected_session(project_id, session_id):
    with ch_client.ClickHouseClient() as cur:
        main_query = cur.format(query=f"""SELECT {SESSION_PROJECTION_COLS}
                                    FROM experimental.sessions AS s
                                    WHERE session_id=%(session_id)s;""",
                                parameters={"session_id": session_id})
        logger.debug("--------------------")
        logger.debug(main_query)
        logger.debug("--------------------")
        try:
            session = cur.execute(query=main_query)
        except Exception as err:
            logger.warning("--------- CLICK MAP GET SELECTED SESSION QUERY EXCEPTION -----------")
            logger.warning(main_query.decode('UTF-8'))
            raise err
    if len(session) > 0:
        session = session[0]
    else:
        session = None

    if session:
        session['domURL'] = sessions_mobs.get_urls(session_id=session["session_id"], project_id=project_id)
        session['mobsUrl'] = sessions_mobs.get_urls_depercated(session_id=session["session_id"])
        if len(session['domURL']) == 0 and len(session['mobsUrl']) == 0:
            session["_issue"] = "mob file not found"
            logger.info("can't find selected mob file for heatmap")
        session['events'] = get_page_events(session_id=session["session_id"], project_id=project_id)

    return helper.dict_to_camel_case(session)


def get_page_events(session_id, project_id):
    with ch_client.ClickHouseClient() as cur:
        query = cur.format(query=f"""SELECT
                                    event_id as message_id,
                                    toUnixTimestamp(created_at)*1000 AS timestamp,
                                    JSON_VALUE(CAST(`$properties` AS String), '$.url_host') AS host,
                                    JSON_VALUE(CAST(`$properties` AS String), '$.url_path') AS path,
                                    JSON_VALUE(CAST(`$properties` AS String), '$.url_path') AS value,
                                    JSON_VALUE(CAST(`$properties` AS String), '$.url_path') AS url,
                                    'LOCATION' AS type
                                FROM product_analytics.events
                                WHERE session_id = %(session_id)s 
                                    AND `$event_name`='LOCATION'
                                    AND project_id= %(project_id)s
                                ORDER BY created_at,message_id;""",
                           parameters={"session_id": session_id, "project_id": project_id})

        rows = cur.execute(query=query)
        rows = helper.list_to_camel_case(rows)
    return rows
