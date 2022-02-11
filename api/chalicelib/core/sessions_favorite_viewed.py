from chalicelib.core import sessions
from chalicelib.utils import pg_client


def add_favorite_session(project_id, user_id, session_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                INSERT INTO public.user_favorite_sessions 
                    (user_id, session_id) 
                VALUES 
                    (%(userId)s,%(sessionId)s);""",
                        {"userId": user_id, "sessionId": session_id})
        )
    return sessions.get_by_id2_pg(project_id=project_id, session_id=session_id, user_id=user_id, full_data=False,
                                  include_fav_viewed=True)


def remove_favorite_session(project_id, user_id, session_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                        DELETE FROM public.user_favorite_sessions                          
                        WHERE 
                            user_id = %(userId)s
                            AND session_id = %(sessionId)s;""",
                        {"userId": user_id, "sessionId": session_id})
        )
    return sessions.get_by_id2_pg(project_id=project_id, session_id=session_id, user_id=user_id, full_data=False,
                                  include_fav_viewed=True)


def add_viewed_session(project_id, user_id, session_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                INSERT INTO public.user_viewed_sessions 
                    (user_id, session_id) 
                VALUES 
                    (%(userId)s,%(sessionId)s)
                ON CONFLICT DO NOTHING;""",
                        {"userId": user_id, "sessionId": session_id})
        )


def favorite_session(project_id, user_id, session_id):
    if favorite_session_exists(user_id=user_id, session_id=session_id):
        return remove_favorite_session(project_id=project_id, user_id=user_id, session_id=session_id)

    return add_favorite_session(project_id=project_id, user_id=user_id, session_id=session_id)


def view_session(project_id, user_id, session_id):
    return add_viewed_session(project_id=project_id, user_id=user_id, session_id=session_id)


def favorite_session_exists(user_id, session_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(
                """SELECT 
                        session_id                                                
                    FROM public.user_favorite_sessions 
                    WHERE
                     user_id = %(userId)s
                     AND session_id = %(sessionId)s""",
                {"userId": user_id, "sessionId": session_id})
        )
        r = cur.fetchone()
        return r is not None
