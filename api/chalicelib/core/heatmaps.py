import logging

import schemas
from chalicelib.core import sessions_mobs, sessions, events
from chalicelib.utils import pg_client, helper

# from chalicelib.utils import sql_helper as sh

logger = logging.getLogger(__name__)


def get_by_url(project_id, data: schemas.GetHeatmapPayloadSchema):
    args = {"startDate": data.startTimestamp, "endDate": data.endTimestamp,
            "project_id": project_id, "url": data.url}
    constraints = ["sessions.project_id = %(project_id)s",
                   "(url = %(url)s OR path= %(url)s)",
                   "clicks.timestamp >= %(startDate)s",
                   "clicks.timestamp <= %(endDate)s",
                   "start_ts >= %(startDate)s",
                   "start_ts <= %(endDate)s",
                   "duration IS NOT NULL",
                   "normalized_x IS NOT NULL"]
    query_from = "events.clicks INNER JOIN sessions USING (session_id)"
    has_click_rage_filter = False
    # TODO: is this used ?
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

    if data.click_rage and not has_click_rage_filter:
        constraints.append("""(issues.session_id IS NULL 
                                OR (issues.timestamp >= %(startDate)s
                                    AND issues.timestamp <= %(endDate)s
                                    AND mis.project_id = %(project_id)s
                                    AND mis.type='click_rage'))""")
        query_from += """LEFT JOIN events_common.issues USING (timestamp, session_id)
                       LEFT JOIN issues AS mis USING (issue_id)"""
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


def get_by_url_and_session_id(project_id, session_id, data: schemas.GetHeatmapBasePayloadSchema):
    args = {"session_id": session_id, "url": data.url}
    constraints = ["session_id = %(session_id)s",
                   "(url = %(url)s OR path= %(url)s)",
                   "normalized_x IS NOT NULL"]
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


SESSION_PROJECTION_COLS = """s.project_id,
s.session_id::text AS session_id,
s.user_uuid,
s.user_id,
s.user_os,
s.user_browser,
s.user_device,
s.user_device_type,
s.user_country,
s.start_ts,
s.duration,
s.events_count,
s.pages_count,
s.errors_count,
s.user_anonymous_id,
s.platform,
s.issue_score,
to_jsonb(s.issue_types) AS issue_types,
favorite_sessions.session_id NOTNULL            AS favorite,
COALESCE((SELECT TRUE
 FROM public.user_viewed_sessions AS fs
 WHERE s.session_id = fs.session_id
   AND fs.user_id = %(userId)s LIMIT 1), FALSE) AS viewed """


def search_short_session(data: schemas.ClickMapSessionsSearch, project_id, user_id,
                         include_mobs: bool = True, exclude_sessions: list[str] = [],
                         _depth: int = 3):
    no_platform = True
    for f in data.filters:
        if f.type == schemas.FilterType.platform:
            no_platform = False
            break
    if no_platform:
        data.filters.append(schemas.SessionSearchFilterSchema(type=schemas.FilterType.platform,
                                                              value=[schemas.PlatformType.desktop],
                                                              operator=schemas.SearchEventOperator._is))

    full_args, query_part = sessions.search_query_parts(data=data, error_status=None, errors_only=False,
                                                        favorite_only=data.bookmarked, issue=None,
                                                        project_id=project_id, user_id=user_id)
    full_args["exclude_sessions"] = tuple(exclude_sessions)
    if len(exclude_sessions) > 0:
        query_part += "\n AND session_id NOT IN (%(exclude_sessions)s)"
    with pg_client.PostgresClient() as cur:
        data.order = schemas.SortOrderType.desc
        data.sort = 'duration'
        main_query = cur.mogrify(f"""SELECT {SESSION_PROJECTION_COLS}
                                     {query_part}
                                     ORDER BY {data.sort} {data.order.value}
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
                                                     event_type=schemas.EventType.location)

    return helper.dict_to_camel_case(session)
