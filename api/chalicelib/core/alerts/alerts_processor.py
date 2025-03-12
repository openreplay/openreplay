import logging

from pydantic_core._pydantic_core import ValidationError

import schemas
from chalicelib.core.alerts import alerts, alerts_listener
from chalicelib.core.alerts.modules import alert_helpers
from chalicelib.core.sessions import sessions_pg as sessions
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC

logger = logging.getLogger(__name__)

LeftToDb = {
    schemas.AlertColumn.PERFORMANCE__DOM_CONTENT_LOADED__AVERAGE: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "COALESCE(AVG(NULLIF(dom_content_loaded_time ,0)),0)"},
    schemas.AlertColumn.PERFORMANCE__FIRST_MEANINGFUL_PAINT__AVERAGE: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "COALESCE(AVG(NULLIF(first_contentful_paint_time,0)),0)"},
    schemas.AlertColumn.PERFORMANCE__PAGE_LOAD_TIME__AVERAGE: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)", "formula": "AVG(NULLIF(load_time ,0))"},
    schemas.AlertColumn.PERFORMANCE__DOM_BUILD_TIME__AVERAGE: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "AVG(NULLIF(dom_building_time,0))"},
    schemas.AlertColumn.PERFORMANCE__SPEED_INDEX__AVERAGE: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)", "formula": "AVG(NULLIF(speed_index,0))"},
    schemas.AlertColumn.PERFORMANCE__PAGE_RESPONSE_TIME__AVERAGE: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "AVG(NULLIF(response_time,0))"},
    schemas.AlertColumn.PERFORMANCE__TTFB__AVERAGE: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "AVG(NULLIF(first_paint_time,0))"},
    schemas.AlertColumn.PERFORMANCE__TIME_TO_RENDER__AVERAGE: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "AVG(NULLIF(visually_complete,0))"},
    schemas.AlertColumn.PERFORMANCE__CRASHES__COUNT: {
        "table": "public.sessions",
        "formula": "COUNT(DISTINCT session_id)",
        "condition": "errors_count > 0 AND duration>0"},
    schemas.AlertColumn.ERRORS__JAVASCRIPT__COUNT: {
        "table": "events.errors INNER JOIN public.errors AS m_errors USING (error_id)",
        "formula": "COUNT(DISTINCT session_id)", "condition": "source='js_exception'", "joinSessions": False},
    schemas.AlertColumn.ERRORS__BACKEND__COUNT: {
        "table": "events.errors INNER JOIN public.errors AS m_errors USING (error_id)",
        "formula": "COUNT(DISTINCT session_id)", "condition": "source!='js_exception'", "joinSessions": False},
}


def Build(a):
    now = TimeUTC.now()
    params = {"project_id": a["projectId"], "now": now}
    full_args = {}
    j_s = True
    main_table = ""
    if a["seriesId"] is not None:
        a["filter"]["sort"] = "session_id"
        a["filter"]["order"] = schemas.SortOrderType.DESC
        a["filter"]["startDate"] = 0
        a["filter"]["endDate"] = TimeUTC.now()
        try:
            data = schemas.SessionsSearchPayloadSchema.model_validate(a["filter"])
        except ValidationError:
            logger.warning("Validation error for:")
            logger.warning(a["filter"])
            raise

        full_args, query_part = sessions.search_query_parts(data=data, error_status=None, errors_only=False,
                                                            issue=None, project_id=a["projectId"], user_id=None,
                                                            favorite_only=False)
        subQ = f"""SELECT COUNT(session_id) AS value 
                {query_part}"""
    else:
        colDef = LeftToDb[a["query"]["left"]]
        subQ = f"""SELECT {colDef["formula"]} AS value
                    FROM {colDef["table"]}
                    WHERE project_id = %(project_id)s 
                        {"AND " + colDef["condition"] if colDef.get("condition") else ""}"""
        j_s = colDef.get("joinSessions", True)
        main_table = colDef["table"]
    is_ss = main_table == "public.sessions"
    q = f"""SELECT coalesce(value,0) AS value, coalesce(value,0) {a["query"]["operator"]} {a["query"]["right"]} AS valid"""

    if a["detectionMethod"] == schemas.AlertDetectionMethod.THRESHOLD:
        if a["seriesId"] is not None:
            q += f""" FROM ({subQ}) AS stat"""
        else:
            q += f""" FROM ({subQ} {"AND timestamp >= %(startDate)s AND timestamp <= %(now)s" if not is_ss else ""} 
                                {"AND start_ts >= %(startDate)s AND start_ts <= %(now)s" if j_s else ""}) AS stat"""
        params = {**params, **full_args, "startDate": TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000}
    else:
        if a["change"] == schemas.AlertDetectionType.CHANGE:
            if a["seriesId"] is not None:
                sub2 = subQ.replace("%(startDate)s", "%(timestamp_sub2)s").replace("%(endDate)s", "%(startDate)s")
                sub1 = f"SELECT (({subQ})-({sub2})) AS value"
                q += f" FROM ( {sub1} ) AS stat"
                params = {**params, **full_args,
                          "startDate": TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000,
                          "timestamp_sub2": TimeUTC.now() - 2 * a["options"]["currentPeriod"] * 60 * 1000}
            else:
                sub1 = f"""{subQ} {"AND timestamp >= %(startDate)s AND timestamp <= %(now)s" if not is_ss else ""}
                                {"AND start_ts >= %(startDate)s AND start_ts <= %(now)s" if j_s else ""}"""
                params["startDate"] = TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000
                sub2 = f"""{subQ} {"AND timestamp < %(startDate)s AND timestamp >= %(timestamp_sub2)s" if not is_ss else ""}
                            {"AND start_ts < %(startDate)s AND start_ts >= %(timestamp_sub2)s" if j_s else ""}"""
                params["timestamp_sub2"] = TimeUTC.now() - 2 * a["options"]["currentPeriod"] * 60 * 1000
                sub1 = f"SELECT (( {sub1} )-( {sub2} )) AS value"
                q += f" FROM ( {sub1} ) AS stat"

        else:
            if a["seriesId"] is not None:
                sub2 = subQ.replace("%(startDate)s", "%(timestamp_sub2)s").replace("%(endDate)s", "%(startDate)s")
                sub1 = f"SELECT (({subQ})/NULLIF(({sub2}),0)-1)*100 AS value"
                q += f" FROM ({sub1}) AS stat"
                params = {**params, **full_args,
                          "startDate": TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000,
                          "timestamp_sub2": TimeUTC.now() \
                                            - (a["options"]["currentPeriod"] + a["options"]["currentPeriod"]) \
                                            * 60 * 1000}
            else:
                sub1 = f"""{subQ} {"AND timestamp >= %(startDate)s AND timestamp <= %(now)s" if not is_ss else ""}
                                {"AND start_ts >= %(startDate)s AND start_ts <= %(now)s" if j_s else ""}"""
                params["startDate"] = TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000
                sub2 = f"""{subQ} {"AND timestamp < %(startDate)s AND timestamp >= %(timestamp_sub2)s" if not is_ss else ""}
                        {"AND start_ts < %(startDate)s AND start_ts >= %(timestamp_sub2)s" if j_s else ""}"""
                params["timestamp_sub2"] = TimeUTC.now() \
                                           - (a["options"]["currentPeriod"] + a["options"]["currentPeriod"]) * 60 * 1000
                sub1 = f"SELECT (({sub1})/NULLIF(({sub2}),0)-1)*100 AS value"
                q += f" FROM ({sub1}) AS stat"

    return q, params


def process():
    logger.info("> processing alerts on PG")
    notifications = []
    all_alerts = alerts_listener.get_all_alerts()
    with pg_client.PostgresClient() as cur:
        for alert in all_alerts:
            if alert_helpers.can_check(alert):
                query, params = Build(alert)
                try:
                    query = cur.mogrify(query, params)
                except Exception as e:
                    logger.error(
                        f"!!!Error while building alert query for alertId:{alert['alertId']} name: {alert['name']}")
                    logger.error(e)
                    continue
                logger.debug(alert)
                logger.debug(query)
                try:
                    cur.execute(query)
                    result = cur.fetchone()
                    if result["valid"]:
                        logger.info(f"Valid alert, notifying users, alertId:{alert['alertId']} name: {alert['name']}")
                        notifications.append(alert_helpers.generate_notification(alert, result))
                except Exception as e:
                    logger.error(
                        f"!!!Error while running alert query for alertId:{alert['alertId']} name: {alert['name']}")
                    logger.error(query)
                    logger.error(e)
                    cur = cur.recreate(rollback=True)
        if len(notifications) > 0:
            cur.execute(
                cur.mogrify(f"""UPDATE public.alerts 
                                SET options = options||'{{"lastNotification":{TimeUTC.now()}}}'::jsonb 
                                WHERE alert_id IN %(ids)s;""", {"ids": tuple([n["alertId"] for n in notifications])}))
    if len(notifications) > 0:
        alerts.process_notifications(notifications)
