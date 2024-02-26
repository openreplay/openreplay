from chalicelib.utils import pg_client


async def view_session(project_id, user_id, session_id):
    async with pg_client.cursor() as cur:
        await cur.execute(
            cur.mogrify("""INSERT INTO public.user_viewed_sessions(user_id, session_id) 
                            VALUES (%(userId)s,%(session_id)s)
                            ON CONFLICT DO NOTHING;""",
                        {"userId": user_id, "session_id": session_id})
        )
