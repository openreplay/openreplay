from decouple import config

import schemas
from chalicelib.core import sessions, sessions_favorite_exp, sessions_mobs, sessions_devtool
from chalicelib.utils import pg_client
from chalicelib.utils.storage import extra


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
        sessions_favorite_exp.add_favorite_session(project_id=project_id, user_id=context.user_id, session_id=session_id)
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
        sessions_favorite_exp.remove_favorite_session(project_id=project_id, user_id=context.user_id, session_id=session_id)
        return {"data": {"sessionId": session_id}}
    return {"errors": ["something went wrong"]}


def favorite_session(context: schemas.CurrentContext, project_id, session_id):
    keys = sessions_mobs.__get_mob_keys(project_id=project_id, session_id=session_id)
    keys += sessions_mobs.__get_mob_keys_deprecated(session_id=session_id)  # To support old sessions
    keys += sessions_devtool.__get_devtools_keys(project_id=project_id, session_id=session_id)

    if favorite_session_exists(user_id=context.user_id, session_id=session_id):
        tag = config('RETENTION_D_VALUE', default='default')

        for k in keys:
            try:
                extra.tag_session(file_key=k, tag_value=tag)
            except Exception as e:
                print(f"!!!Error while tagging: {k} to {tag} for removal")
                print(str(e))

        return remove_favorite_session(context=context, project_id=project_id, session_id=session_id)

    tag = config('RETENTION_L_VALUE', default='vault')

    for k in keys:
        try:
            extra.tag_session(file_key=k, tag_value=tag)
        except Exception as e:
            print(f"!!!Error while tagging: {k} to {tag} for vault")
            print(str(e))

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
                    FROM public.user_favorite_sessions INNER JOIN sessions USING(session_id)
                    WHERE
                     user_favorite_sessions.user_id = %(userId)s
                     AND project_id = %(project_id)s;""",
                {"userId": user_id, "project_id": project_id})
        )
        r = cur.fetchone()
    return (0, 0) if r is None else (r["min_start_ts"], r["max_start_ts"])
