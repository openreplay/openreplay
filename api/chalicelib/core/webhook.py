import logging
from typing import Optional

import requests
from fastapi import HTTPException, status

import schemas
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC


def get_by_id(webhook_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    SELECT w.*
                    FROM public.webhooks AS w 
                    WHERE w.webhook_id =%(webhook_id)s AND deleted_at ISNULL;""",
                        {"webhook_id": webhook_id})
        )
        w = helper.dict_to_camel_case(cur.fetchone())
        if w:
            w["createdAt"] = TimeUTC.datetime_to_timestamp(w["createdAt"])
        return w


def get_webhook(tenant_id, webhook_id, webhook_type='webhook'):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""SELECT w.*
                            FROM public.webhooks AS w 
                            WHERE w.webhook_id =%(webhook_id)s 
                                AND deleted_at ISNULL AND type=%(webhook_type)s;""",
                        {"webhook_id": webhook_id, "webhook_type": webhook_type})
        )
        w = helper.dict_to_camel_case(cur.fetchone())
        if w:
            w["createdAt"] = TimeUTC.datetime_to_timestamp(w["createdAt"])
        return w


def get_by_type(tenant_id, webhook_type):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""SELECT w.webhook_id,w.endpoint,w.auth_header,w.type,w.index,w.name,w.created_at
                            FROM public.webhooks AS w 
                            WHERE w.type =%(type)s AND deleted_at ISNULL;""",
                        {"type": webhook_type})
        )
        webhooks = helper.list_to_camel_case(cur.fetchall())
        for w in webhooks:
            w["createdAt"] = TimeUTC.datetime_to_timestamp(w["createdAt"])
        return webhooks


def get_by_tenant(tenant_id, replace_none=False):
    with pg_client.PostgresClient() as cur:
        cur.execute("""SELECT w.*
                        FROM public.webhooks AS w 
                        WHERE deleted_at ISNULL;""")
        all = helper.list_to_camel_case(cur.fetchall())
        for w in all:
            w["createdAt"] = TimeUTC.datetime_to_timestamp(w["createdAt"])
        return all


def update(tenant_id, webhook_id, changes, replace_none=False):
    allow_update = ["name", "index", "authHeader", "endpoint"]
    with pg_client.PostgresClient() as cur:
        sub_query = [f"{helper.key_to_snake_case(k)} = %({k})s" for k in changes.keys() if k in allow_update]
        cur.execute(
            cur.mogrify(f"""\
                    UPDATE public.webhooks
                    SET {','.join(sub_query)}
                    WHERE webhook_id =%(id)s AND deleted_at ISNULL
                    RETURNING *;""",
                        {"id": webhook_id, **changes})
        )
        w = helper.dict_to_camel_case(cur.fetchone())
        if w is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"webhook not found.")
        w["createdAt"] = TimeUTC.datetime_to_timestamp(w["createdAt"])
        if replace_none:
            for k in w.keys():
                if w[k] is None:
                    w[k] = ''
        return w


def add(tenant_id, endpoint, auth_header=None, webhook_type='webhook', name="", replace_none=False):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""\
                    INSERT INTO public.webhooks(endpoint,auth_header,type,name)
                    VALUES (%(endpoint)s, %(auth_header)s, %(type)s,%(name)s)
                    RETURNING *;""",
                            {"endpoint": endpoint, "auth_header": auth_header,
                             "type": webhook_type, "name": name})
        cur.execute(
            query
        )
        w = helper.dict_to_camel_case(cur.fetchone())
        w["createdAt"] = TimeUTC.datetime_to_timestamp(w["createdAt"])
        if replace_none:
            for k in w.keys():
                if w[k] is None:
                    w[k] = ''
        return w


def exists_by_name(name: str, exclude_id: Optional[int], webhook_type: str = schemas.WebhookType.webhook,
                   tenant_id: Optional[int] = None) -> bool:
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT EXISTS(SELECT 1 
                                FROM public.webhooks
                                WHERE name ILIKE %(name)s
                                    AND deleted_at ISNULL
                                    AND type=%(webhook_type)s
                                    {"AND webhook_id!=%(exclude_id)s" if exclude_id else ""}) AS exists;""",
                            {"name": name, "exclude_id": exclude_id, "webhook_type": webhook_type})
        cur.execute(query)
        row = cur.fetchone()
    return row["exists"]


def add_edit(tenant_id, data: schemas.WebhookSchema, replace_none=None):
    if len(data.name) > 0 \
            and exists_by_name(name=data.name, exclude_id=data.webhook_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"name already exists.")
    if data.webhook_id is not None:
        return update(tenant_id=tenant_id, webhook_id=data.webhook_id,
                      changes={"endpoint": data.endpoint.unicode_string(),
                               "authHeader": data.auth_header,
                               "name": data.name},
                      replace_none=replace_none)
    else:
        return add(tenant_id=tenant_id,
                   endpoint=data.endpoint.unicode_string(),
                   auth_header=data.auth_header,
                   name=data.name,
                   replace_none=replace_none)


def delete(tenant_id, webhook_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    UPDATE public.webhooks
                    SET deleted_at = (now() at time zone 'utc')
                    WHERE webhook_id =%(id)s AND deleted_at ISNULL
                    RETURNING *;""",
                        {"id": webhook_id})
        )
    return {"data": {"state": "success"}}


def trigger_batch(data_list):
    webhooks_map = {}
    for w in data_list:
        if w["destination"] not in webhooks_map:
            webhooks_map[w["destination"]] = get_by_id(webhook_id=w["destination"])
        if webhooks_map[w["destination"]] is None:
            logging.error(f"!!Error webhook not found: webhook_id={w['destination']}")
        else:
            __trigger(hook=webhooks_map[w["destination"]], data=w["data"])


def __trigger(hook, data):
    if hook is not None and hook["type"] == 'webhook':
        headers = {}
        if hook["authHeader"] is not None and len(hook["authHeader"]) > 0:
            headers = {"Authorization": hook["authHeader"]}

        r = requests.post(url=hook["endpoint"], json=data, headers=headers)
        if r.status_code != 200:
            logging.error("=======> webhook: something went wrong for:")
            logging.error(hook)
            logging.error(r.status_code)
            logging.error(r.text)
            return
        response = None
        try:
            response = r.json()
        except:
            try:
                response = r.text
            except:
                logging.info("no response found")
        return response
