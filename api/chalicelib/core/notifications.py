import json

from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC


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
