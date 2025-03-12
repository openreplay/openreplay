import logging

from pydantic_core._pydantic_core import ValidationError

import schemas
from chalicelib.utils import pg_client, ch_client, exp_ch_helper
from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.core.alerts import alerts, alerts_listener
from chalicelib.core.alerts.modules import alert_helpers
from chalicelib.core.sessions import sessions_ch as sessions

logger = logging.getLogger(__name__)

LeftToDb = {
    schemas.AlertColumn.PERFORMANCE__DOM_CONTENT_LOADED__AVERAGE: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "COALESCE(AVG(NULLIF(dom_content_loaded_event_time ,0)),0)",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.PERFORMANCE__FIRST_MEANINGFUL_PAINT__AVERAGE: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "COALESCE(AVG(NULLIF(first_contentful_paint_time,0)),0)",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.PERFORMANCE__PAGE_LOAD_TIME__AVERAGE: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(load_event_time ,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.PERFORMANCE__DOM_BUILD_TIME__AVERAGE: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(dom_building_time,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.PERFORMANCE__SPEED_INDEX__AVERAGE: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(speed_index,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.PERFORMANCE__PAGE_RESPONSE_TIME__AVERAGE: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(response_time,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.PERFORMANCE__TTFB__AVERAGE: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(first_contentful_paint_time,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.PERFORMANCE__TIME_TO_RENDER__AVERAGE: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(visually_complete,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.PERFORMANCE__CRASHES__COUNT: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_sessions_table(timestamp)} AS sessions",
        "formula": "COUNT(DISTINCT session_id)",
        "condition": "duration>0 AND errors_count>0"
    },
    schemas.AlertColumn.ERRORS__JAVASCRIPT__COUNT: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS errors",
        "eventType": "ERROR",
        "formula": "COUNT(DISTINCT session_id)",
        "condition": "source='js_exception'"
    },
    schemas.AlertColumn.ERRORS__BACKEND__COUNT: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS errors",
        "eventType": "ERROR",
        "formula": "COUNT(DISTINCT session_id)",
        "condition": "source!='js_exception'"
    },
}


def Build(a):
    now = TimeUTC.now()
    params = {"project_id": a["projectId"], "now": now}
    full_args = {}
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

        full_args, query_part = sessions.search_query_parts_ch(data=data, error_status=None, errors_only=False,
                                                               issue=None, project_id=a["projectId"], user_id=None,
                                                               favorite_only=False)
        subQ = f"""SELECT COUNT(session_id) AS value 
                {query_part}"""
    else:
        colDef = LeftToDb[a["query"]["left"]]
        params["event_type"] = LeftToDb[a["query"]["left"]].get("eventType")
        subQ = f"""SELECT {colDef["formula"]} AS value
                    FROM {colDef["table"](now)}
                    WHERE project_id = %(project_id)s 
                        {"AND event_type=%(event_type)s" if params["event_type"] else ""} 
                        {"AND " + colDef["condition"] if colDef.get("condition") else ""}"""

    q = f"""SELECT coalesce(value,0) AS value, coalesce(value,0) {a["query"]["operator"]} {a["query"]["right"]} AS valid"""

    if a["detectionMethod"] == schemas.AlertDetectionMethod.THRESHOLD:
        if a["seriesId"] is not None:
            q += f""" FROM ({subQ}) AS stat"""
        else:
            q += f""" FROM ({subQ} 
                            AND datetime>=toDateTime(%(startDate)s/1000) 
                            AND datetime<=toDateTime(%(now)s/1000) ) AS stat"""
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
                sub1 = f"""{subQ} AND datetime>=toDateTime(%(startDate)s/1000)
                                    AND datetime<=toDateTime(%(now)s/1000)"""
                params["startDate"] = TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000
                sub2 = f"""{subQ} AND datetime<toDateTime(%(startDate)s/1000) 
                                    AND datetime>=toDateTime(%(timestamp_sub2)s/1000)"""
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
                sub1 = f"""{subQ} AND datetime>=toDateTime(%(startDate)s/1000)
                                AND datetime<=toDateTime(%(now)s/1000)"""
                params["startDate"] = TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000
                sub2 = f"""{subQ} AND datetime<toDateTime(%(startDate)s/1000)
                                AND datetime>=toDateTime(%(timestamp_sub2)s/1000)"""
                params["timestamp_sub2"] = TimeUTC.now() \
                                           - (a["options"]["currentPeriod"] + a["options"]["currentPeriod"]) * 60 * 1000
                sub1 = f"SELECT (({sub1})/NULLIF(({sub2}),0)-1)*100 AS value"
                q += f" FROM ({sub1}) AS stat"

    return q, params


def process():
    logger.info("> processing alerts on CH")
    notifications = []
    all_alerts = alerts_listener.get_all_alerts()
    with pg_client.PostgresClient() as cur, ch_client.ClickHouseClient() as ch_cur:
        for alert in all_alerts:
            if alert["query"]["left"] != "CUSTOM":
                continue
            if alert_helpers.can_check(alert):
                query, params = Build(alert)
                try:
                    query = ch_cur.format(query=query, parameters=params)
                except Exception as e:
                    logger.error(
                        f"!!!Error while building alert query for alertId:{alert['alertId']} name: {alert['name']}")
                    logger.error(e)
                    continue
                logger.debug(alert)
                logger.debug(query)
                try:
                    result = ch_cur.execute(query=query)
                    if len(result) > 0:
                        result = result[0]

                    if result["valid"]:
                        logger.info("Valid alert, notifying users")
                        notifications.append(alert_helpers.generate_notification(alert, result))
                except Exception as e:
                    logger.error(f"!!!Error while running alert query for alertId:{alert['alertId']}")
                    logger.error(str(e))
                    logger.error(query)
        if len(notifications) > 0:
            cur.execute(
                cur.mogrify(f"""UPDATE public.alerts 
                                SET options = options||'{{"lastNotification":{TimeUTC.now()}}}'::jsonb 
                                WHERE alert_id IN %(ids)s;""", {"ids": tuple([n["alertId"] for n in notifications])}))
    if len(notifications) > 0:
        alerts.process_notifications(notifications)
