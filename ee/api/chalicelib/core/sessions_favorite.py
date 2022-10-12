from decouple import config

import schemas_ee
from chalicelib.core import sessions, sessions_favorite_exp
from chalicelib.utils import pg_client, s3_extra


def add_favorite_session(project_id, session_id, context: schemas_ee.CurrentContext):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                INSERT INTO public.user_favorite_sessions(user_id, session_id) 
                VALUES (%(userId)s,%(sessionId)s);""",
                        {"userId": context.user_id, "sessionId": session_id})
        )

    sessions_favorite_exp.add_favorite_session(project_id=project_id, user_id=context.user_id, session_id=session_id)
    return sessions.get_by_id2_pg(project_id=project_id, session_id=session_id,
                                  full_data=False, include_fav_viewed=True, context=context)


def remove_favorite_session(project_id, session_id, context: schemas_ee.CurrentContext):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                        DELETE FROM public.user_favorite_sessions                          
                        WHERE user_id = %(userId)s
                            AND session_id = %(sessionId)s;""",
                        {"userId": context.user_id, "sessionId": session_id})
        )
    sessions_favorite_exp.remove_favorite_session(project_id=project_id, user_id=context.user_id, session_id=session_id)
    return sessions.get_by_id2_pg(project_id=project_id, session_id=session_id,
                                  full_data=False, include_fav_viewed=True, context=context)


def favorite_session(tenant_id, project_id, user_id, session_id, context: schemas_ee.CurrentContext):
    if favorite_session_exists(user_id=user_id, session_id=session_id):
        key = str(session_id)
        try:
            s3_extra.tag_file(session_id=key, tag_value=config('RETENTION_D_VALUE', default='default'))
        except Exception as e:
            print(f"!!!Error while tagging: {key} to default")
            print(str(e))
        key = str(session_id) + "e"
        try:
            s3_extra.tag_file(session_id=key, tag_value=config('RETENTION_D_VALUE', default='default'))
        except Exception as e:
            print(f"!!!Error while tagging: {key} to default")
            print(str(e))
        return remove_favorite_session(project_id=project_id, session_id=session_id, context=context)
    key = str(session_id)
    try:
        s3_extra.tag_file(session_id=key, tag_value=config('RETENTION_L_VALUE', default='vault'))
    except Exception as e:
        print(f"!!!Error while tagging: {key} to vault")
        print(str(e))
    key = str(session_id) + "e"
    try:
        s3_extra.tag_file(session_id=key, tag_value=config('RETENTION_L_VALUE', default='vault'))
    except Exception as e:
        print(f"!!!Error while tagging: {key} to vault")
        print(str(e))
    return add_favorite_session(project_id=project_id, session_id=session_id, context=context)


def favorite_session_exists(user_id, session_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT session_id                                                
                    FROM public.user_favorite_sessions 
                    WHERE
                     user_id = %(userId)s
                     AND session_id = %(sessionId)s""",
                {"userId": user_id, "sessionId": session_id})
        )
        r = cur.fetchone()
        return r is not None


def get_start_end_timestamp(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT max(start_ts) AS max_start_ts, min(start_ts) AS min_start_ts                                                
                    FROM public.user_favorite_sessions INNER JOIN sessions USING(session_id)
                    WHERE
                     user_favorite_sessions.user_id = %(userId)s
                     AND project_id = %(project_id)s;""",
                {"userId": user_id, "project_id": project_id})
        )
        r = cur.fetchone()
    return (0, 0) if r is None else (r["min_start_ts"], r["max_start_ts"])
