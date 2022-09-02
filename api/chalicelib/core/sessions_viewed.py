from chalicelib.utils import pg_client


def view_session(project_id, user_id, session_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""INSERT INTO public.user_viewed_sessions(user_id, session_id) 
                            VALUES (%(userId)s,%(sessionId)s)
                            ON CONFLICT DO NOTHING;""",
                        {"userId": user_id, "sessionId": session_id})
        )
