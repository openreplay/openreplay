import decimal
import logging

from decouple import config

import schemas
from chalicelib.core import alerts_listener
from chalicelib.core import alerts
from chalicelib.utils import pg_client
from chalicelib.utils.TimeUTC import TimeUTC

if config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
    from chalicelib.core import sessions_legacy as sessions
else:
    from chalicelib.core import sessions

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))

LeftToDb = {
    schemas.AlertColumn.performance__dom_content_loaded__average: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "COALESCE(AVG(NULLIF(dom_content_loaded_time ,0)),0)"},
    schemas.AlertColumn.performance__first_meaningful_paint__average: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "COALESCE(AVG(NULLIF(first_contentful_paint_time,0)),0)"},
    schemas.AlertColumn.performance__page_load_time__average: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)", "formula": "AVG(NULLIF(load_time ,0))"},
    schemas.AlertColumn.performance__dom_build_time__average: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "AVG(NULLIF(dom_building_time,0))"},
    schemas.AlertColumn.performance__speed_index__average: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)", "formula": "AVG(NULLIF(speed_index,0))"},
    schemas.AlertColumn.performance__page_response_time__average: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "AVG(NULLIF(response_time,0))"},
    schemas.AlertColumn.performance__ttfb__average: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "AVG(NULLIF(first_paint_time,0))"},
    schemas.AlertColumn.performance__time_to_render__average: {
        "table": "events.pages INNER JOIN public.sessions USING(session_id)",
        "formula": "AVG(NULLIF(visually_complete,0))"},
    schemas.AlertColumn.performance__image_load_time__average: {
        "table": "events.resources INNER JOIN public.sessions USING(session_id)",
        "formula": "AVG(NULLIF(resources.duration,0))", "condition": "type='img'"},
    schemas.AlertColumn.performance__request_load_time__average: {
        "table": "events.resources INNER JOIN public.sessions USING(session_id)",
        "formula": "AVG(NULLIF(resources.duration,0))", "condition": "type='fetch'"},
    schemas.AlertColumn.resources__load_time__average: {
        "table": "events.resources INNER JOIN public.sessions USING(session_id)",
        "formula": "AVG(NULLIF(resources.duration,0))"},
    schemas.AlertColumn.resources__missing__count: {
        "table": "events.resources INNER JOIN public.sessions USING(session_id)",
        "formula": "COUNT(DISTINCT url_hostpath)", "condition": "success= FALSE AND type='img'"},
    schemas.AlertColumn.errors__4xx_5xx__count: {
        "table": "events.resources INNER JOIN public.sessions USING(session_id)", "formula": "COUNT(session_id)",
        "condition": "status/100!=2"},
    schemas.AlertColumn.errors__4xx__count: {"table": "events.resources INNER JOIN public.sessions USING(session_id)",
                                             "formula": "COUNT(session_id)", "condition": "status/100=4"},
    schemas.AlertColumn.errors__5xx__count: {"table": "events.resources INNER JOIN public.sessions USING(session_id)",
                                             "formula": "COUNT(session_id)", "condition": "status/100=5"},
    schemas.AlertColumn.errors__javascript__impacted_sessions__count: {
        "table": "events.resources INNER JOIN public.sessions USING(session_id)",
        "formula": "COUNT(DISTINCT session_id)", "condition": "success= FALSE AND type='script'"},
    schemas.AlertColumn.performance__crashes__count: {
        "table": "public.sessions",
        "formula": "COUNT(DISTINCT session_id)",
        "condition": "errors_count > 0 AND duration>0"},
    schemas.AlertColumn.errors__javascript__count: {
        "table": "events.errors INNER JOIN public.errors AS m_errors USING (error_id)",
        "formula": "COUNT(DISTINCT session_id)", "condition": "source='js_exception'", "joinSessions": False},
    schemas.AlertColumn.errors__backend__count: {
        "table": "events.errors INNER JOIN public.errors AS m_errors USING (error_id)",
        "formula": "COUNT(DISTINCT session_id)", "condition": "source!='js_exception'", "joinSessions": False},
}

# This is the frequency of execution for each threshold
TimeInterval = {
    15: 3,
    30: 5,
    60: 10,
    120: 20,
    240: 30,
    1440: 60,
}


def can_check(a) -> bool:
    now = TimeUTC.now()

    repetitionBase = a["options"]["currentPeriod"] \
        if a["detectionMethod"] == schemas.AlertDetectionMethod.change \
           and a["options"]["currentPeriod"] > a["options"]["previousPeriod"] \
        else a["options"]["previousPeriod"]

    if TimeInterval.get(repetitionBase) is None:
        logging.error(f"repetitionBase: {repetitionBase} NOT FOUND")
        return False

    return (a["options"]["renotifyInterval"] <= 0 or
            a["options"].get("lastNotification") is None or
            a["options"]["lastNotification"] <= 0 or
            ((now - a["options"]["lastNotification"]) > a["options"]["renotifyInterval"] * 60 * 1000)) \
           and ((now - a["createdAt"]) % (TimeInterval[repetitionBase] * 60 * 1000)) < 60 * 1000


def Build(a):
    now = TimeUTC.now()
    params = {"project_id": a["projectId"], "now": now}
    full_args = {}
    j_s = True
    if a["seriesId"] is not None:
        a["filter"]["sort"] = "session_id"
        a["filter"]["order"] = schemas.SortOrderType.desc
        a["filter"]["startDate"] = -1
        a["filter"]["endDate"] = TimeUTC.now()
        full_args, query_part = sessions.search_query_parts(
            data=schemas.SessionsSearchPayloadSchema.parse_obj(a["filter"]), error_status=None, errors_only=False,
            issue=None, project_id=a["projectId"], user_id=None, favorite_only=False)
        subQ = f"""SELECT COUNT(session_id) AS value 
                {query_part}"""
    else:
        colDef = LeftToDb[a["query"]["left"]]
        subQ = f"""SELECT {colDef["formula"]} AS value
                    FROM {colDef["table"]}
                    WHERE project_id = %(project_id)s 
                        {"AND " + colDef["condition"] if colDef.get("condition") is not None else ""}"""
        j_s = colDef.get("joinSessions", True)

    q = f"""SELECT coalesce(value,0) AS value, coalesce(value,0) {a["query"]["operator"]} {a["query"]["right"]} AS valid"""

    if a["detectionMethod"] == schemas.AlertDetectionMethod.threshold:
        if a["seriesId"] is not None:
            q += f""" FROM ({subQ}) AS stat"""
        else:
            q += f""" FROM ({subQ} AND timestamp>=%(startDate)s AND timestamp<=%(now)s 
                                {"AND sessions.start_ts >= %(startDate)s" if j_s else ""}
                                {"AND sessions.start_ts <= %(now)s" if j_s else ""}) AS stat"""
        params = {**params, **full_args, "startDate": TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000}
    else:
        if a["change"] == schemas.AlertDetectionType.change:
            if a["seriesId"] is not None:
                sub2 = subQ.replace("%(startDate)s", "%(timestamp_sub2)s").replace("%(endDate)s", "%(startDate)s")
                sub1 = f"SELECT (({subQ})-({sub2})) AS value"
                q += f" FROM ( {sub1} ) AS stat"
                params = {**params, **full_args,
                          "startDate": TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000,
                          "timestamp_sub2": TimeUTC.now() - 2 * a["options"]["currentPeriod"] * 60 * 1000}
            else:
                sub1 = f"""{subQ} AND timestamp>=%(startDate)s 
                                    AND datetime<=toDateTime(%(now)s/1000)
                                    {"AND sessions.start_ts >= %(startDate)s" if j_s else ""}
                                    {"AND sessions.start_ts <= %(now)s" if j_s else ""}"""
                params["startDate"] = TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000
                sub2 = f"""{subQ} AND timestamp<%(startDate)s 
                                    AND timestamp>=%(timestamp_sub2)s
                            {"AND sessions.start_ts < %(startDate)s AND sessions.start_ts >= %(timestamp_sub2)s" if j_s else ""}"""
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
                sub1 = f"""{subQ} AND timestamp>=%(startDate)s AND timestamp<=%(now)s
                                {"AND sessions.start_ts >= %(startDate)s" if j_s else ""}
                                {"AND sessions.start_ts <= %(now)s" if j_s else ""}"""
                params["startDate"] = TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000
                sub2 = f"""{subQ} AND timestamp<%(startDate)s
                                AND timestamp>=%(timestamp_sub2)s
                        {"AND sessions.start_ts < %(startDate)s AND sessions.start_ts >= %(timestamp_sub2)s" if j_s else ""}"""
                params["timestamp_sub2"] = TimeUTC.now() \
                                           - (a["options"]["currentPeriod"] + a["options"]["currentPeriod"]) * 60 * 1000
                sub1 = f"SELECT (({sub1})/NULLIF(({sub2}),0)-1)*100 AS value"
                q += f" FROM ({sub1}) AS stat"

    return q, params


def process():
    notifications = []
    all_alerts = alerts_listener.get_all_alerts()
    with pg_client.PostgresClient() as cur:
        for alert in all_alerts:
            if can_check(alert):
                logging.info(f"Querying alertId:{alert['alertId']} name: {alert['name']}")
                query, params = Build(alert)
                query = cur.mogrify(query, params)
                logging.debug(alert)
                logging.debug(query)
                try:
                    cur.execute(query)
                    result = cur.fetchone()
                    if result["valid"]:
                        logging.info("Valid alert, notifying users")
                        notifications.append(generate_notification(alert, result))
                except Exception as e:
                    logging.error(f"!!!Error while running alert query for alertId:{alert['alertId']}")
                    logging.error(str(e))
                    logging.error(query)
        if len(notifications) > 0:
            cur.execute(
                cur.mogrify(f"""UPDATE public.Alerts 
                                SET options = options||'{{"lastNotification":{TimeUTC.now()}}}'::jsonb 
                                WHERE alert_id IN %(ids)s;""", {"ids": tuple([n["alertId"] for n in notifications])}))
    if len(notifications) > 0:
        alerts.process_notifications(notifications)


def generate_notification(alert, result):
    return {
        "alertId": alert["alertId"],
        "tenantId": alert["tenantId"],
        "title": alert["name"],
        "description": f"has been triggered, {alert['query']['left']} = {round(result['value'], 2)} ({alert['query']['operator']} {alert['query']['right']}).",
        "buttonText": "Check metrics for more details",
        "buttonUrl": f"/{alert['projectId']}/metrics",
        "imageUrl": None,
        "options": {"source": "ALERT", "sourceId": alert["alertId"],
                    "sourceMeta": alert["detectionMethod"],
                    "message": alert["options"]["message"], "projectId": alert["projectId"],
                    "data": {"title": alert["name"],
                             "limitValue": alert["query"]["right"],
                             "actualValue": float(result["value"]) \
                                 if isinstance(result["value"], decimal.Decimal) \
                                 else result["value"],
                             "operator": alert["query"]["operator"],
                             "trigger": alert["query"]["left"],
                             "alertId": alert["alertId"],
                             "detectionMethod": alert["detectionMethod"],
                             "currentPeriod": alert["options"]["currentPeriod"],
                             "previousPeriod": alert["options"]["previousPeriod"],
                             "createdAt": TimeUTC.now()}},
    }
