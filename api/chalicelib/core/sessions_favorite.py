import schemas
from chalicelib.utils import pg_client


async def add_favorite_session(context: schemas.CurrentContext, project_id, session_id):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(f"""\
                INSERT INTO public.user_favorite_sessions(user_id, session_id) 
                VALUES (%(userId)s,%(session_id)s)
                RETURNING session_id;""",
                        {"userId": context.user_id, "session_id": session_id})
        )
        row = await cur.fetchone()
    if row:
        return {"data": {"sessionId": session_id}}
    return {"errors": ["something went wrong"]}


async def remove_favorite_session(context: schemas.CurrentContext, project_id, session_id):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(f"""\
                        DELETE FROM public.user_favorite_sessions                          
                        WHERE user_id = %(userId)s
                            AND session_id = %(session_id)s
                        RETURNING session_id;""",
                        {"userId": context.user_id, "session_id": session_id})
        )
        row = await cur.fetchone()
    if row:
        return {"data": {"sessionId": session_id}}
    return {"errors": ["something went wrong"]}


async def favorite_session(context: schemas.CurrentContext, project_id, session_id):
    if await favorite_session_exists(user_id=context.user_id, session_id=session_id):
        return await remove_favorite_session(context=context, project_id=project_id,
                                       session_id=session_id)

    return await add_favorite_session(context=context, project_id=project_id, session_id=session_id)


async def favorite_session_exists(session_id, user_id=None):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                f"""SELECT session_id                                                
                    FROM public.user_favorite_sessions 
                    WHERE
                     session_id = %(session_id)s
                     {'AND user_id = %(userId)s' if user_id else ''};""",
                {"userId": user_id, "session_id": session_id})
        )
        r = await cur.fetchone()
        return r is not None


async def get_start_end_timestamp(project_id, user_id):
    async with pg_client.PostgresClient() as cur:
        await cur.execute(
            cur.mogrify(
                """SELECT max(start_ts) AS max_start_ts, min(start_ts) AS min_start_ts                                                
                    FROM public.user_favorite_sessions INNER JOIN sessions USING(session_id)
                    WHERE
                     user_favorite_sessions.user_id = %(userId)s
                     AND project_id = %(project_id)s;""",
                {"userId": user_id, "project_id": project_id})
        )
        r = await cur.fetchone()
    return (0, 0) if r is None else (r["min_start_ts"], r["max_start_ts"])
