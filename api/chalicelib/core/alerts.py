import json
import time

import schemas
from chalicelib.core import notifications, slack, webhook
from chalicelib.utils import pg_client, helper, email_helper
from chalicelib.utils.TimeUTC import TimeUTC
import logging

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
    return __process_circular(a)


def get_all(project_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""\
                    SELECT *
                    FROM public.alerts 
                    WHERE project_id =%(project_id)s AND deleted_at ISNULL
                    ORDER BY created_at;""",
                            {"project_id": project_id})
        cur.execute(query=query)
        all = helper.list_to_camel_case(cur.fetchall())
    for a in all:
        a = __process_circular(a)
    return all


def __process_circular(alert):
    if alert is None:
        return None
    alert.pop("deletedAt")
    alert["createdAt"] = TimeUTC.datetime_to_timestamp(alert["createdAt"])
    return alert


def create(project_id, data: schemas.AlertSchema):
    data = data.dict()
    data["query"] = json.dumps(data["query"])
    data["options"] = json.dumps(data["options"])

    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    INSERT INTO public.alerts(project_id, name, description, detection_method, query, options, series_id)
                    VALUES (%(project_id)s, %(name)s, %(description)s, %(detection_method)s, %(query)s, %(options)s::jsonb, %(series_id)s)
                    RETURNING *;""",
                        {"project_id": project_id, **data})
        )
        a = helper.dict_to_camel_case(cur.fetchone())
    return {"data": helper.dict_to_camel_case(__process_circular(a))}


def update(id, data: schemas.AlertSchema):
    data = data.dict()
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
                        series_id = %(series_id)s
                    WHERE alert_id =%(id)s AND deleted_at ISNULL
                    RETURNING *;""",
                            {"id": id, **data})
        cur.execute(query=query)
        a = helper.dict_to_camel_case(cur.fetchone())
    return {"data": __process_circular(a)}


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
                if c["type"] in ["slack", "email"]:
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
            notifications_list = full[t][i:i + BATCH_SIZE]

            if t == "slack":
                try:
                    slack.send_batch(notifications_list=notifications_list)
                except Exception as e:
                    logging.error("!!!Error while sending slack notifications batch")
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
    if notifications_list is None or len(notifications_list) == 0:
        return
    for n in notifications_list:
        send_by_email(notification=n.get("notification"), destination=n.get("destination"))
        time.sleep(1)


def delete(project_id, alert_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                            UPDATE public.alerts 
                            SET 
                              deleted_at = timezone('utc'::text, now()),
                              active = FALSE
                            WHERE 
                                alert_id = %(alert_id)s AND project_id=%(project_id)s;""",
                        {"alert_id": alert_id, "project_id": project_id})
        )
    return {"data": {"state": "success"}}
