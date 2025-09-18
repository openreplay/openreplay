import logging

import schemas
from chalicelib.utils import pg_client, ch_client, exp_ch_helper

logger = logging.getLogger(__name__)


def add_favorite_session(context: schemas.CurrentContext, project_id, session_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                INSERT INTO public.user_favorite_sessions(user_id, session_id) 
                VALUES (%(userId)s,%(session_id)s)
                RETURNING session_id;""",
                        {"userId": context.user_id, "session_id": session_id})
        )
        row = cur.fetchone()
    if row:
        add_favorite_session_to_ch(project_id=project_id, user_id=context.user_id, session_id=session_id)
        return {"data": {"sessionId": session_id}}
    return {"errors": ["something went wrong"]}


def remove_favorite_session(context: schemas.CurrentContext, project_id, session_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                        DELETE FROM public.user_favorite_sessions                          
                        WHERE user_id = %(userId)s
                            AND session_id = %(session_id)s
                        RETURNING session_id;""",
                        {"userId": context.user_id, "session_id": session_id})
        )
        row = cur.fetchone()
    if row:
        remove_favorite_session_from_ch(project_id=project_id, user_id=context.user_id, session_id=session_id)
        return {"data": {"sessionId": session_id}}
    return {"errors": ["something went wrong"]}


def favorite_session(context: schemas.CurrentContext, project_id, session_id):
    if favorite_session_exists(user_id=context.user_id, session_id=session_id):
        return remove_favorite_session(context=context, project_id=project_id,
                                       session_id=session_id)

    return add_favorite_session(context=context, project_id=project_id, session_id=session_id)


def favorite_session_exists(session_id, user_id=None):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                f"""SELECT session_id                                                
                    FROM public.user_favorite_sessions 
                    WHERE
                     session_id = %(session_id)s
                     {'AND user_id = %(userId)s' if user_id else ''};""",
                {"userId": user_id, "session_id": session_id})
        )
        r = cur.fetchone()
        return r is not None


def get_start_end_timestamp(project_id, user_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT max(start_ts) AS max_start_ts, min(start_ts) AS min_start_ts
                   FROM public.user_favorite_sessions
                            INNER JOIN sessions USING (session_id)
                   WHERE user_favorite_sessions.user_id = %(userId)s
                     AND project_id = %(project_id)s;""",
                {"userId": user_id, "project_id": project_id})
        )
        r = cur.fetchone()
    return (0, 0) if r is None else (r["min_start_ts"], r["max_start_ts"])


def add_favorite_session_to_ch(project_id, user_id, session_id, sign=1):
    try:
        with ch_client.ClickHouseClient() as cur:
            query = f"""INSERT INTO {exp_ch_helper.get_user_favorite_sessions_table()}(project_id,user_id, session_id, sign) 
                        VALUES (%(project_id)s,%(userId)s,%(sessionId)s,%(sign)s);"""
            params = {"userId": user_id, "sessionId": session_id, "project_id": project_id, "sign": sign}
            cur.execute(query=query, parameters=params)

    except Exception as err:
        logger.error("------- Exception while adding favorite session to CH")
        logger.error(err)


def remove_favorite_session_from_ch(project_id, user_id, session_id):
    add_favorite_session_to_ch(project_id=project_id, user_id=user_id, session_id=session_id, sign=-1)
