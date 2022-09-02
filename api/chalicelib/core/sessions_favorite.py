from chalicelib.core import sessions
from chalicelib.utils import pg_client


def add_favorite_session(project_id, user_id, session_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                INSERT INTO public.user_favorite_sessions(user_id, session_id) 
                VALUES (%(userId)s,%(sessionId)s);""",
                        {"userId": user_id, "sessionId": session_id})
        )
    return sessions.get_by_id2_pg(project_id=project_id, session_id=session_id, user_id=user_id, full_data=False,
                                  include_fav_viewed=True)


def remove_favorite_session(project_id, user_id, session_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                        DELETE FROM public.user_favorite_sessions                          
                        WHERE user_id = %(userId)s
                            AND session_id = %(sessionId)s;""",
                        {"userId": user_id, "sessionId": session_id})
        )
    return sessions.get_by_id2_pg(project_id=project_id, session_id=session_id, user_id=user_id, full_data=False,
                                  include_fav_viewed=True)


def favorite_session(project_id, user_id, session_id):
    if favorite_session_exists(user_id=user_id, session_id=session_id):
        return remove_favorite_session(project_id=project_id, user_id=user_id, session_id=session_id)

    return add_favorite_session(project_id=project_id, user_id=user_id, session_id=session_id)


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
    return (0, 0) if r is None else (r["max_start_ts"], r["min_start_ts"])
