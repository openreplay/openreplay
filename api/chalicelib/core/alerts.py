import json
import time

from fastapi import BackgroundTasks

from chalicelib.core import notifications, slack, webhook
from chalicelib.utils import pg_client, helper, email_helper
from chalicelib.utils.TimeUTC import TimeUTC

ALLOW_UPDATE = ["name", "description", "active", "detectionMethod", "query", "options"]


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


SUPPORTED_THRESHOLD = [15, 30, 60, 120, 240, 1440]


def __transform_structure(data):
    if data.get("options") is None:
        return f"Missing 'options'", None
    if data["options"].get("currentPeriod") not in SUPPORTED_THRESHOLD:
        return f"Unsupported currentPeriod, please provide one of these values {SUPPORTED_THRESHOLD}", None
    if data["options"].get("previousPeriod", 15) not in SUPPORTED_THRESHOLD:
        return f"Unsupported previousPeriod, please provide one of these values {SUPPORTED_THRESHOLD}", None
    if data["options"].get("renotifyInterval") is None:
        data["options"]["renotifyInterval"] = 720
    data["query"]["right"] = float(data["query"]["right"])
    data["query"] = json.dumps(data["query"])
    data["description"] = data["description"] if data.get("description") is not None and len(
        data["description"]) > 0 else None
    if data.get("options"):
        messages = []
        for m in data["options"].get("message", []):
            if m.get("value") is None:
                continue
            m["value"] = str(m["value"])
            messages.append(m)
        data["options"]["message"] = messages
        data["options"] = json.dumps(data["options"])
    return None, data


def __process_circular(alert):
    if alert is None:
        return None
    alert.pop("deletedAt")
    alert["createdAt"] = TimeUTC.datetime_to_timestamp(alert["createdAt"])
    return alert


def create(project_id, data):
    err, data = __transform_structure(data)
    if err is not None:
        return {"errors": [err]}
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    INSERT INTO public.alerts(project_id, name, description, detection_method, query, options)
                    VALUES (%(project_id)s, %(name)s, %(description)s, %(detectionMethod)s, %(query)s, %(options)s::jsonb)
                    RETURNING *;""",
                        {"project_id": project_id, **data})
        )
        a = helper.dict_to_camel_case(cur.fetchone())
    return {"data": helper.dict_to_camel_case(__process_circular(a))}


def update(id, changes):
    changes = {k: changes[k] for k in changes.keys() if k in ALLOW_UPDATE}
    err, changes = __transform_structure(changes)
    if err is not None:
        return {"errors": [err]}
    updateq = []
    for k in changes.keys():
        updateq.append(f"{helper.key_to_snake_case(k)} = %({k})s")
    if len(updateq) == 0:
        return {"errors": ["nothing to update"]}
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""\
                    UPDATE public.alerts
                    SET {", ".join(updateq)}
                    WHERE alert_id =%(id)s AND deleted_at ISNULL
                    RETURNING *;""",
                            {"id": id, **changes})
        cur.execute(query=query)
        a = helper.dict_to_camel_case(cur.fetchone())
    return {"data": __process_circular(a)}


def process_notifications(data, background_tasks: BackgroundTasks):
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
            # helper.async_post(config('alert_ntf') % t, {"notifications": full[t][i:i + BATCH_SIZE]})
            notifications_list = full[t][i:i + BATCH_SIZE]

            if t == "slack":
                background_tasks.add_task(slack.send_batch, notifications_list=notifications_list)
            elif t == "email":
                background_tasks.add_task(send_by_email_batch, notifications_list=notifications_list)
            elif t == "webhook":
                background_tasks.add_task(webhook.trigger_batch, data_list=notifications_list)


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
