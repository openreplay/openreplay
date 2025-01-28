TENANT_CONDITION = "tenant_id = %(tenant_id)s"
MOB_KEY = "encode(file_key,'hex') AS file_key,"


def get_file_key(project_id, session_id):
    from chalicelib.utils import pg_client
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            f"""\
            SELECT encode(file_key,'hex') AS file_key
            FROM public.sessions
            WHERE project_id = %(project_id)s
                AND session_id = %(session_id)s;""",
            {"project_id": project_id, "session_id": session_id}
        )
        cur.execute(query=query)

        data = cur.fetchone()
        file_key = None
        if data is not None:
            file_key = data['file_key']
    return {"fileKey": file_key}
