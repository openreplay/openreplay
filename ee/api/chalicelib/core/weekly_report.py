from chalicelib.utils import pg_client, helper


def get_config(user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify("""\
            SELECT users.weekly_report
            FROM public.users
            WHERE users.deleted_at ISNULL AND users.user_id=%(user_id)s 
            LIMIT 1;""", {"user_id": user_id}))
        result = cur.fetchone()
    return helper.dict_to_camel_case(result)


def edit_config(user_id, weekly_report):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify("""\
            UPDATE public.users
            SET weekly_report= %(weekly_report)s
            WHERE users.deleted_at ISNULL 
                AND users.user_id=%(user_id)s
            RETURNING weekly_report;""", {"user_id": user_id, "weekly_report": weekly_report}))
        result = cur.fetchone()
    return helper.dict_to_camel_case(result)
