import json
import logging
import time
from datetime import datetime

from decouple import config

import schemas
from chalicelib.core import notifications, webhook
from chalicelib.core.collaboration_msteams import MSTeams
from chalicelib.core.collaboration_slack import Slack
from chalicelib.utils import pg_client, helper, email_helper, smtp
from chalicelib.utils.TimeUTC import TimeUTC


def get(id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    SELECT *
                    FROM public.alerts 
                    WHERE alert_id =%(id)s;""",
                        {"id": id})
        )
        a = helper.dict_to_camel_case(cur.fetchone())
    return helper.custom_alert_to_front(__process_circular(a))


def get_all(project_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""\
                    SELECT alerts.*,
                           COALESCE(metrics.name || '.' || (COALESCE(metric_series.name, 'series ' || index)) || '.count',
                                    query ->> 'left') AS series_name
                    FROM public.alerts
                         LEFT JOIN metric_series USING (series_id)
                         LEFT JOIN metrics USING (metric_id)
                    WHERE alerts.project_id =%(project_id)s 
                        AND alerts.deleted_at ISNULL
                    ORDER BY alerts.created_at;""",
                            {"project_id": project_id})
        cur.execute(query=query)
        all = helper.list_to_camel_case(cur.fetchall())
    for i in range(len(all)):
        all[i] = helper.custom_alert_to_front(__process_circular(all[i]))
    return all


def __process_circular(alert):
    if alert is None:
        return None
    alert.pop("deletedAt")
    alert["createdAt"] = TimeUTC.datetime_to_timestamp(alert["createdAt"])
    return alert


def create(project_id, data: schemas.AlertSchema):
    data = data.model_dump()
    data["query"] = json.dumps(data["query"])
    data["options"] = json.dumps(data["options"])

    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    INSERT INTO public.alerts(project_id, name, description, detection_method, query, options, series_id, change)
                    VALUES (%(project_id)s, %(name)s, %(description)s, %(detection_method)s, %(query)s, %(options)s::jsonb, %(series_id)s, %(change)s)
                    RETURNING *;""",
                        {"project_id": project_id, **data})
        )
        a = helper.dict_to_camel_case(cur.fetchone())
    return {"data": helper.custom_alert_to_front(helper.dict_to_camel_case(__process_circular(a)))}


def update(id, data: schemas.AlertSchema):
    data = data.model_dump()
    data["query"] = json.dumps(data["query"])
    data["options"] = json.dumps(data["options"])

    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""\
                    UPDATE public.alerts
                    SET name = %(name)s,
                        description = %(description)s,
                        active = TRUE,
                        detection_method = %(detection_method)s,
                        query = %(query)s,
                        options = %(options)s,
                        series_id = %(series_id)s,
                        change = %(change)s
                    WHERE alert_id =%(id)s AND deleted_at ISNULL
                    RETURNING *;""",
                            {"id": id, **data})
        cur.execute(query=query)
        a = helper.dict_to_camel_case(cur.fetchone())
    return {"data": helper.custom_alert_to_front(__process_circular(a))}


def process_notifications(data):
    full = {}
    for n in data:
        if "message" in n["options"]:
            webhook_data = {}
            if "data" in n["options"]:
                webhook_data = n["options"].pop("data")
            for c in n["options"].pop("message"):
                if c["type"] not in full:
                    full[c["type"]] = []
                if c["type"] in ["slack", "msteams", "email"]:
                    full[c["type"]].append({
                        "notification": n,
                        "destination": c["value"]
                    })
                elif c["type"] in ["webhook"]:
                    full[c["type"]].append({"data": webhook_data, "destination": c["value"]})
    notifications.create(data)
    BATCH_SIZE = 200
    for t in full.keys():
        for i in range(0, len(full[t]), BATCH_SIZE):
            notifications_list = full[t][i:min(i + BATCH_SIZE, len(full[t]))]
            if notifications_list is None or len(notifications_list) == 0:
                break

            if t == "slack":
                try:
                    send_to_slack_batch(notifications_list=notifications_list)
                except Exception as e:
                    logging.error("!!!Error while sending slack notifications batch")
                    logging.error(str(e))
            elif t == "msteams":
                try:
                    send_to_msteams_batch(notifications_list=notifications_list)
                except Exception as e:
                    logging.error("!!!Error while sending msteams notifications batch")
                    logging.error(str(e))
            elif t == "email":
                try:
                    send_by_email_batch(notifications_list=notifications_list)
                except Exception as e:
                    logging.error("!!!Error while sending email notifications batch")
                    logging.error(str(e))
            elif t == "webhook":
                try:
                    webhook.trigger_batch(data_list=notifications_list)
                except Exception as e:
                    logging.error("!!!Error while sending webhook notifications batch")
                    logging.error(str(e))


def send_by_email(notification, destination):
    if notification is None:
        return
    email_helper.alert_email(recipients=destination,
                             subject=f'"{notification["title"]}" has been triggered',
                             data={
                                 "message": f'"{notification["title"]}" {notification["description"]}',
                                 "project_id": notification["options"]["projectId"]})


def send_by_email_batch(notifications_list):
    if not smtp.has_smtp():
        logging.info("no SMTP configuration for email notifications")
    if notifications_list is None or len(notifications_list) == 0:
        logging.info("no email notifications")
        return
    for n in notifications_list:
        send_by_email(notification=n.get("notification"), destination=n.get("destination"))
        time.sleep(1)


def send_to_slack_batch(notifications_list):
    webhookId_map = {}
    for n in notifications_list:
        if n.get("destination") not in webhookId_map:
            webhookId_map[n.get("destination")] = {"tenantId": n["notification"]["tenantId"], "batch": []}
        webhookId_map[n.get("destination")]["batch"].append({"text": n["notification"]["description"] \
                                                                     + f"\n<{config('SITE_URL')}{n['notification']['buttonUrl']}|{n['notification']['buttonText']}>",
                                                             "title": n["notification"]["title"],
                                                             "title_link": n["notification"]["buttonUrl"],
                                                             "ts": datetime.now().timestamp()})
    for batch in webhookId_map.keys():
        Slack.send_batch(tenant_id=webhookId_map[batch]["tenantId"], webhook_id=batch,
                         attachments=webhookId_map[batch]["batch"])


def send_to_msteams_batch(notifications_list):
    webhookId_map = {}
    for n in notifications_list:
        if n.get("destination") not in webhookId_map:
            webhookId_map[n.get("destination")] = {"tenantId": n["notification"]["tenantId"], "batch": []}

        link = f"{config('SITE_URL')}{n['notification']['buttonUrl']}"
        # for MSTeams, the batch is the list of `sections`
        webhookId_map[n.get("destination")]["batch"].append(
            {
                "activityTitle": n["notification"]["title"],
                "activitySubtitle": f"On Project *{n['notification']['projectName']}*",
                "facts": [
                    {
                        "name": "Target:",
                        "value": link
                    },
                    {
                        "name": "Description:",
                        "value": n["notification"]["description"]
                    }],
                "markdown": True
            }
        )
    for batch in webhookId_map.keys():
        MSTeams.send_batch(tenant_id=webhookId_map[batch]["tenantId"], webhook_id=batch,
                           attachments=webhookId_map[batch]["batch"])


def delete(project_id, alert_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(""" UPDATE public.alerts 
                            SET deleted_at = timezone('utc'::text, now()),
                                active = FALSE
                            WHERE alert_id = %(alert_id)s AND project_id=%(project_id)s;""",
                        {"alert_id": alert_id, "project_id": project_id})
        )
    return {"data": {"state": "success"}}


def get_predefined_values():
    values = [e.value for e in schemas.AlertColumn]
    values = [{"name": v, "value": v,
               "unit": "count" if v.endswith(".count") else "ms",
               "predefined": True,
               "metricId": None,
               "seriesId": None} for v in values if v != schemas.AlertColumn.custom]
    return values
