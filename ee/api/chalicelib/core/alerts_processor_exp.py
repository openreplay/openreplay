import decimal
import logging

import schemas
from chalicelib.core import alerts_listener, alerts_processor
from chalicelib.core import sessions, alerts
from chalicelib.utils import pg_client, ch_client, exp_ch_helper
from chalicelib.utils.TimeUTC import TimeUTC

LeftToDb = {
    schemas.AlertColumn.performance__dom_content_loaded__average: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "COALESCE(AVG(NULLIF(dom_content_loaded_event_time ,0)),0)",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.performance__first_meaningful_paint__average: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "COALESCE(AVG(NULLIF(first_contentful_paint_time,0)),0)",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.performance__page_load_time__average: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(load_event_time ,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.performance__dom_build_time__average: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(dom_building_time,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.performance__speed_index__average: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(speed_index,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.performance__page_response_time__average: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(response_time,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.performance__ttfb__average: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(first_contentful_paint_time,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.performance__time_to_render__average: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS pages",
        "formula": "AVG(NULLIF(visually_complete,0))",
        "eventType": "LOCATION"
    },
    schemas.AlertColumn.performance__image_load_time__average: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_resources_table(timestamp)} AS resources",
        "formula": "AVG(NULLIF(resources.duration,0))",
        "condition": "type='img'"
    },
    schemas.AlertColumn.performance__request_load_time__average: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_resources_table(timestamp)} AS resources",
        "formula": "AVG(NULLIF(resources.duration,0))",
        "condition": "type='fetch'"
    },
    schemas.AlertColumn.resources__load_time__average: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_resources_table(timestamp)} AS resources",
        "formula": "AVG(NULLIF(resources.duration,0))"
    },
    schemas.AlertColumn.resources__missing__count: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_resources_table(timestamp)} AS resources",
        "formula": "COUNT(DISTINCT url_hostpath)",
        "condition": "success= FALSE AND type='img'"
    },
    schemas.AlertColumn.errors__4xx_5xx__count: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS requests",
        "eventType": "REQUEST",
        "formula": "COUNT(1)",
        "condition": "intDiv(requests.status, 100)!=2"
    },
    schemas.AlertColumn.errors__4xx__count: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS requests",
        "eventType": "REQUEST",
        "formula": "COUNT(1)",
        "condition": "intDiv(requests.status, 100)==4"
    },
    schemas.AlertColumn.errors__5xx__count: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS requests",
        "eventType": "REQUEST",
        "formula": "COUNT(1)",
        "condition": "intDiv(requests.status, 100)==5"
    },
    schemas.AlertColumn.errors__javascript__impacted_sessions__count: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS errors",
        "eventType": "ERROR",
        "formula": "COUNT(DISTINCT session_id)",
        "condition": "source='js_exception'"
    },
    schemas.AlertColumn.performance__crashes__count: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_sessions_table(timestamp)} AS sessions",
        "formula": "COUNT(DISTINCT session_id)",
        "condition": "duration>0 AND errors_count>0"
    },
    schemas.AlertColumn.errors__javascript__count: {
        "table": lambda timestamp: f"{exp_ch_helper.get_main_events_table(timestamp)} AS errors",
        "eventType": "ERROR",
        "formula": "COUNT(DISTINCT session_id)",
        "condition": "source='js_exception'"
    },
    schemas.AlertColumn.errors__backend__count: {
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
        params["event_type"] = LeftToDb[a["query"]["left"]].get("eventType")
        subQ = f"""SELECT {colDef["formula"]} AS value
                    FROM {colDef["table"](now)}
                    WHERE project_id = %(project_id)s {"AND event_type=%(event_type)s" if params["event_type"] else ""} 
                        {"AND " + colDef["condition"] if colDef.get("condition") is not None else ""}"""

    q = f"""SELECT coalesce(value,0) AS value, coalesce(value,0) {a["query"]["operator"]} {a["query"]["right"]} AS valid"""

    if a["detectionMethod"] == schemas.AlertDetectionMethod.threshold:
        if a["seriesId"] is not None:
            q += f""" FROM ({subQ}) AS stat"""
        else:
            q += f""" FROM ({subQ} 
                            AND datetime>=toDateTime(%(startDate)s/1000) 
                            AND datetime<=toDateTime(%(now)s/1000) ) AS stat"""
        params = {**params, **full_args, "startDate": TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000}
    else:
        if a["options"]["change"] == schemas.AlertDetectionChangeType.change:
            if a["seriesId"] is not None:
                sub2 = subQ.replace("%(startDate)s", "%(timestamp_sub2)s").replace("%(endDate)s", "%(startDate)s")
                sub1 = f"SELECT (({subQ})-({sub2})) AS value"
                q += f" FROM ( {sub1} ) AS stat"
                params = {**params, **full_args,
                          "startDate": TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000,
                          "timestamp_sub2": TimeUTC.now() - 2 * a["options"]["currentPeriod"] * 60 * 1000}
            else:
                sub1 = f"""{subQ} AND timestamp>=%(startDate)s"""
                params["startDate"] = TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000
                sub2 = f"""{subQ} AND timestamp<%(startDate)s 
                                    AND timestamp>=%(timestamp_sub2)s"""
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
                sub1 = f"""{subQ} AND timestamp>=%(startDate)s
                                {"AND sessions.start_ts >= %(startDate)s" if j_s else ""}"""
                params["startDate"] = TimeUTC.now() - a["options"]["currentPeriod"] * 60 * 1000
                sub2 = f"""{subQ} AND timestamp<%(startDate)s
                                AND timestamp>=%(timestamp_sub2)s"""
                params["timestamp_sub2"] = TimeUTC.now() \
                                           - (a["options"]["currentPeriod"] + a["options"]["currentPeriod"]) * 60 * 1000
                sub1 = f"SELECT (({sub1})/NULLIF(({sub2}),0)-1)*100 AS value"
                q += f" FROM ({sub1}) AS stat"

    return q, params


def process():
    notifications = []
    all_alerts = alerts_listener.get_all_alerts()
    with pg_client.PostgresClient() as cur, ch_client.ClickHouseClient() as curc:
        for alert in all_alerts:
            if alert["query"]["left"] == "CUSTOM":
                continue
            if alert["query"]["left"] == schemas.AlertColumn.performance__dom_content_loaded__average:
                alert["query"]["left"] = schemas.AlertColumn.errors__backend__count
            if True or alerts_processor.can_check(alert):
                logging.info(f"Querying alertId:{alert['alertId']} name: {alert['name']}")
                query, params = Build(alert)
                query = curc.format(query, params)
                logging.debug(alert)
                logging.debug(query)
                try:
                    print("------------------Alerts")
                    print(params)
                    print(alert)
                    print(query)
                    print("------------------")
                    # continue
                    result = curc.execute(query)
                    if len(result) > 0:
                        result = result[0]
                    continue
                    if result["valid"]:
                        logging.info("Valid alert, notifying users")
                        notifications.append({
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
                        })
                except Exception as e:
                    logging.error(f"!!!Error while running alert query for alertId:{alert['alertId']}")
                    logging.error(str(e))
                    logging.error(query)
        if len(notifications) > 0:
            cur.execute(
                cur.mogrify(f"""UPDATE public.alerts 
                                SET options = options||'{{"lastNotification":{TimeUTC.now()}}}'::jsonb 
                                WHERE alert_id IN %(ids)s;""", {"ids": tuple([n["alertId"] for n in notifications])}))
    if len(notifications) > 0:
        alerts.process_notifications(notifications)
