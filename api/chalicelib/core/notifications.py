import json

from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC


def get_all(tenant_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    SELECT notifications.*,
                           user_viewed_notifications.notification_id NOTNULL AS viewed
                    FROM public.notifications
                             LEFT JOIN (SELECT notification_id
                                        FROM public.user_viewed_notifications
                                        WHERE user_viewed_notifications.user_id = %(user_id)s) AS user_viewed_notifications USING (notification_id)
                    WHERE notifications.user_id IS NULL OR notifications.user_id =%(user_id)s
                    ORDER BY created_at DESC
                    LIMIT 100;""",
                        {"user_id": user_id})
        )
        rows = helper.list_to_camel_case(cur.fetchall())
    for r in rows:
        r["createdAt"] = TimeUTC.datetime_to_timestamp(r["createdAt"])
    return rows


def get_all_count(tenant_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                    SELECT COALESCE(COUNT(notifications.*),0) AS count
                    FROM public.notifications
                             LEFT JOIN (SELECT notification_id
                                        FROM public.user_viewed_notifications
                                        WHERE user_viewed_notifications.user_id = %(user_id)s) AS user_viewed_notifications USING (notification_id)
                    WHERE (notifications.user_id IS NULL OR notifications.user_id =%(user_id)s) AND user_viewed_notifications.notification_id IS NULL;""",
                        {"user_id": user_id})
        )
        row = cur.fetchone()
    return row


def view_notification(user_id, notification_ids=[], tenant_id=None, startTimestamp=None, endTimestamp=None):
    if len(notification_ids) == 0 and endTimestamp is None:
        return False
    if startTimestamp is None:
        startTimestamp = 0
    notification_ids = [(user_id, id) for id in notification_ids]
    with pg_client.PostgresClient() as cur:
        if len(notification_ids) > 0:
            cur.executemany(
                "INSERT INTO public.user_viewed_notifications(user_id, notification_id) VALUES (%s,%s) ON CONFLICT DO NOTHING;",
                notification_ids)
        else:
            query = """INSERT INTO public.user_viewed_notifications(user_id, notification_id) 
                                SELECT %(user_id)s AS user_id, notification_id
                                FROM public.notifications
                                WHERE (user_id IS NULL OR user_id =%(user_id)s) 
                                    AND EXTRACT(EPOCH FROM created_at)*1000>=(%(startTimestamp)s) 
                                    AND EXTRACT(EPOCH FROM created_at)*1000<=(%(endTimestamp)s+1000) 
                                ON CONFLICT DO NOTHING;"""
            params = {"user_id": user_id, "startTimestamp": startTimestamp,
                      "endTimestamp": endTimestamp}
            # print('-------------------')
            # print(cur.mogrify(query, params))
            cur.execute(cur.mogrify(query, params))
    return True


def create(notifications):
    if len(notifications) == 0:
        return []
    with pg_client.PostgresClient() as cur:
        values = []
        for n in notifications:
            clone = dict(n)
            if "userId" not in clone:
                clone["userId"] = None
            if "options" not in clone:
                clone["options"] = '{}'
            else:
                clone["options"] = json.dumps(clone["options"])
            values.append(
                cur.mogrify(
                    "(%(userId)s, %(title)s, %(description)s, %(buttonText)s, %(buttonUrl)s, %(imageUrl)s,%(options)s)",
                    clone).decode('UTF-8')
            )
        cur.execute(
            f"""INSERT INTO public.notifications(user_id, title, description, button_text, button_url, image_url, options) 
                VALUES {",".join(values)} RETURNING *;""")
        rows = helper.list_to_camel_case(cur.fetchall())
        for r in rows:
            r["createdAt"] = TimeUTC.datetime_to_timestamp(r["createdAt"])
            r["viewed"] = False
    return rows
