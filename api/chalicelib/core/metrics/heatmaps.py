import logging

import schemas
from chalicelib.core import sessions
from chalicelib.core.sessions import sessions_mobs
from chalicelib.utils import pg_client, helper
from chalicelib.utils import sql_helper as sh

logger = logging.getLogger(__name__)


def get_by_url(project_id, data: schemas.GetHeatMapPayloadSchema):
    if data.url is None or data.url == "":
        return []
    args = {"startDate": data.startTimestamp, "endDate": data.endTimestamp,
            "project_id": project_id, "url": data.url}
    constraints = ["sessions.project_id = %(project_id)s",
                   "clicks.timestamp >= %(startDate)s",
                   "clicks.timestamp <= %(endDate)s",
                   "start_ts >= %(startDate)s",
                   "start_ts <= %(endDate)s",
                   "duration IS NOT NULL",
                   "normalized_x IS NOT NULL"]
    if data.operator == schemas.SearchEventOperator.IS:
        constraints.append("path= %(url)s")
    else:
        constraints.append("path ILIKE %(url)s")
        args["url"] = helper.values_for_operator(data.url, data.operator)

    query_from = "events.clicks INNER JOIN sessions USING (session_id)"
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
    #     constraints.append("""(issues.session_id IS NULL
    #                             OR (issues.timestamp >= %(startDate)s
    #                                 AND issues.timestamp <= %(endDate)s
    #                                 AND mis.project_id = %(project_id)s
    #                                 AND mis.type='click_rage'))""")
    #     query_from += """LEFT JOIN events_common.issues USING (timestamp, session_id)
    #                    LEFT JOIN issues AS mis USING (issue_id)"""
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT normalized_x, normalized_y
                                FROM {query_from}
                                WHERE {" AND ".join(constraints)}
                                LIMIT 500;""", args)
        logger.debug("---------")
        logger.debug(query.decode('UTF-8'))
        logger.debug("---------")
        try:
            cur.execute(query)
        except Exception as err:
            logger.warning("--------- HEATMAP 2 SEARCH QUERY EXCEPTION -----------")
            logger.warning(query.decode('UTF-8'))
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(data)
            logger.warning("--------------------")
            raise err
        rows = cur.fetchall()

    return helper.list_to_camel_case(rows)


def get_x_y_by_url_and_session_id(project_id, session_id, data: schemas.GetHeatMapPayloadSchema):
    args = {"session_id": session_id, "url": data.url}
    constraints = ["session_id = %(session_id)s",
                   "normalized_x IS NOT NULL"]
    if data.operator == schemas.SearchEventOperator.IS:
        constraints.append("path= %(url)s")
    else:
        constraints.append("path ILIKE %(url)s")
        args["url"] = helper.values_for_operator(data.url, data.operator)

    query_from = "events.clicks"

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT normalized_x, normalized_y
                                FROM {query_from}
                                WHERE {" AND ".join(constraints)};""", args)
        logger.debug("---------")
        logger.debug(query.decode('UTF-8'))
        logger.debug("---------")
        try:
            cur.execute(query)
        except Exception as err:
            logger.warning("--------- HEATMAP-session_id SEARCH QUERY EXCEPTION -----------")
            logger.warning(query.decode('UTF-8'))
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(data)
            logger.warning("--------------------")
            raise err
        rows = cur.fetchall()

    return helper.list_to_camel_case(rows)


def get_selectors_by_url_and_session_id(project_id, session_id, data: schemas.GetHeatMapPayloadSchema):
    args = {"session_id": session_id, "url": data.url}
    constraints = ["session_id = %(session_id)s"]
    if data.operator == schemas.SearchEventOperator.IS:
        constraints.append("path= %(url)s")
    else:
        constraints.append("path ILIKE %(url)s")
        args["url"] = helper.values_for_operator(data.url, data.operator)

    query_from = "events.clicks"

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT selector, COUNT(1) AS count
                                FROM {query_from}
                                WHERE {" AND ".join(constraints)}
                                GROUP BY 1
                                ORDER BY count DESC;""", args)
        logger.debug("---------")
        logger.debug(query.decode('UTF-8'))
        logger.debug("---------")
        try:
            cur.execute(query)
        except Exception as err:
            logger.warning("--------- HEATMAP-selector-session_id SEARCH QUERY EXCEPTION -----------")
            logger.warning(query.decode('UTF-8'))
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(data)
            logger.warning("--------------------")
            raise err
        rows = cur.fetchall()

    return helper.list_to_camel_case(rows)


SESSION_PROJECTION_COLS = """s.project_id,
s.session_id::text AS session_id,
s.start_ts,
s.duration"""


def __get_1_url(location_condition: schemas.SessionSearchEventSchema2 | None, session_id: str, project_id: int,
                start_time: int,
                end_time: int) -> str | None:
    full_args = {
        "sessionId": session_id,
        "projectId": project_id,
        "start_time": start_time,
        "end_time": end_time,
    }
    sub_condition = ["session_id = %(sessionId)s"]
    if location_condition and len(location_condition.value) > 0:
        f_k = "LOC"
        op = sh.get_sql_operator(location_condition.operator)
        full_args = {**full_args, **sh.multi_values(location_condition.value, value_key=f_k)}
        sub_condition.append(
            sh.multi_conditions(f'path {op} %({f_k})s', location_condition.value, is_not=False,
                                value_key=f_k))
    with pg_client.PostgresClient() as cur:
        main_query = cur.mogrify(f"""WITH paths AS (SELECT DISTINCT path 
                                                    FROM events.clicks 
                                                    WHERE {" AND ".join(sub_condition)})
                                     SELECT path, COUNT(1) AS count
                                     FROM events.clicks
                                              INNER JOIN public.sessions USING (session_id)
                                              INNER JOIN paths USING (path)
                                     WHERE sessions.project_id = %(projectId)s
                                       AND clicks.timestamp >= %(start_time)s
                                       AND clicks.timestamp <= %(end_time)s
                                       AND start_ts >= %(start_time)s
                                       AND start_ts <= %(end_time)s
                                       AND duration IS NOT NULL
                                     GROUP BY path
                                     ORDER BY count DESC
                                     LIMIT 1;""", full_args)
        logger.debug("--------------------")
        logger.debug(main_query)
        logger.debug("--------------------")
        try:
            cur.execute(main_query)
        except Exception as err:
            logger.warning("--------- CLICK MAP BEST URL SEARCH QUERY EXCEPTION -----------")
            logger.warning(main_query.decode('UTF-8'))
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(full_args)
            logger.warning("--------------------")
            raise err

        url = cur.fetchone()
    if url is None:
        return None
    return url["path"]


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

    full_args, query_part = sessions.search_query_parts(data=data, error_status=None, errors_only=False,
                                                        favorite_only=data.bookmarked, issue=None,
                                                        project_id=project_id, user_id=user_id)
    full_args["exclude_sessions"] = tuple(exclude_sessions)
    if len(exclude_sessions) > 0:
        query_part += "\n AND session_id NOT IN %(exclude_sessions)s"
    with pg_client.PostgresClient() as cur:
        data.order = schemas.SortOrderType.DESC
        data.sort = 'duration'
        main_query = cur.mogrify(f"""SELECT *
                                     FROM (SELECT {SESSION_PROJECTION_COLS}
                                           {query_part}
                                           --ignoring the sort made the query faster (from 6s to 100ms)
                                           --ORDER BY {data.sort} {data.order.value}
                                           LIMIT 20) AS raw
                                     ORDER BY random()
                                     LIMIT 1;""", full_args)
        logger.debug("--------------------")
        logger.debug(main_query)
        logger.debug("--------------------")
        try:
            cur.execute(main_query)
        except Exception as err:
            logger.warning("--------- CLICK MAP SHORT SESSION SEARCH QUERY EXCEPTION -----------")
            logger.warning(main_query.decode('UTF-8'))
            logger.warning("--------- PAYLOAD -----------")
            logger.warning(data.model_dump_json())
            logger.warning("--------------------")
            raise err

        session = cur.fetchone()
    if session:
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

        session['events'] = get_page_events(session_id=session["session_id"], project_id=project_id)
    else:
        logger.debug("No session found for heatmap")

    return helper.dict_to_camel_case(session)


def get_selected_session(project_id, session_id):
    with pg_client.PostgresClient() as cur:
        main_query = cur.mogrify(f"""SELECT {SESSION_PROJECTION_COLS}
                                     FROM public.sessions AS s
                                     WHERE session_id=%(session_id)s;""", {"session_id": session_id})
        logger.debug("--------------------")
        logger.debug(main_query)
        logger.debug("--------------------")
        try:
            cur.execute(main_query)
        except Exception as err:
            logger.warning("--------- CLICK MAP GET SELECTED SESSION QUERY EXCEPTION -----------")
            logger.warning(main_query.decode('UTF-8'))
            raise err

        session = cur.fetchone()

    if session:
        session['domURL'] = sessions_mobs.get_urls(session_id=session["session_id"], project_id=project_id)
        session['mobsUrl'] = sessions_mobs.get_urls_depercated(session_id=session["session_id"])
        if len(session['domURL']) == 0 and len(session['mobsUrl']) == 0:
            session["_issue"] = "mob file not found"
            logger.info("can't find selected mob file for heatmap")
        session['events'] = get_page_events(session_id=session["session_id"], project_id=project_id)

    return helper.dict_to_camel_case(session)


def get_page_events(session_id, project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify("""\
                SELECT 
                    message_id,
                    timestamp,
                    host,
                    path,
                    path AS value,
                    path AS url,
                    'LOCATION' AS type
                FROM events.pages
                WHERE session_id = %(session_id)s
                ORDER BY timestamp,message_id;""", {"session_id": session_id}))
        rows = cur.fetchall()
        rows = helper.list_to_camel_case(rows)
    return rows
