import schemas
from chalicelib.core import sessions
from chalicelib.utils import pg_client, helper
from chalicelib.utils.TimeUTC import TimeUTC


def get_session_notes(tenant_id, project_id, session_id, user_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""SELECT sessions_notes.*
                                FROM sessions_notes
                                WHERE sessions_notes.project_id = %(project_id)s
                                  AND sessions_notes.deleted_at IS NULL
                                  AND sessions_notes.session_id = %(session_id)s
                                  AND (sessions_notes.user_id = %(user_id)s 
                                        OR sessions_notes.is_public)
                                ORDER BY created_at DESC;""",
                            {"project_id": project_id, "user_id": user_id,
                             "tenant_id": tenant_id, "session_id": session_id})

        cur.execute(query=query)
        rows = cur.fetchall()
        rows = helper.list_to_camel_case(rows)
        for row in rows:
            row["createdAt"] = TimeUTC.datetime_to_timestamp(row["createdAt"])
    return rows


def get_all_notes_by_project_id(tenant_id, project_id, user_id, data: schemas.SearchNoteSchema):
    with pg_client.PostgresClient() as cur:
        conditions = ["sessions_notes.project_id = %(project_id)s", "sessions_notes.deleted_at IS NULL",
                      "(sessions_notes.user_id = %(user_id)s OR sessions_notes.is_public)"]
        extra_params = {}
        if data.tags and len(data.tags) > 0:
            k = "tag"
            conditions.append(sessions._multiple_conditions(f"%({k})s = ANY (s.tags)", data.tags, value_key=k))
            extra_params = sessions._multiple_values(data.tags, value_key=k)
        query = cur.mogrify(f"""SELECT sessions_notes.*
                                FROM sessions_notes
                                WHERE {" AND ".join(conditions)}
                                ORDER BY created_at {data.order}
                                LIMIT {data.limit} OFFSET {data.limit * (data.page - 1)};""",
                            {"project_id": project_id, "user_id": user_id, "tenant_id": tenant_id, **extra_params})

        cur.execute(query=query)
        rows = cur.fetchall()
        rows = helper.list_to_camel_case(rows)
        for row in rows:
            row["createdAt"] = TimeUTC.datetime_to_timestamp(row["createdAt"])
    return rows


def create(tenant_id, user_id, project_id, session_id, data: schemas.SessionNoteSchema):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(f"""INSERT INTO public.sessions_notes (message, user_id, tags, session_id, project_id, timestamp, is_public)
                            VALUES (%(message)s, %(user_id)s, %(tags)s, %(session_id)s, %(project_id)s, %(timestamp)s, %(is_public)s)
                            RETURNING *;""",
                            {"user_id": user_id, "project_id": project_id, "session_id": session_id, **data.dict()})
        cur.execute(query)
        result = helper.dict_to_camel_case(cur.fetchone())
        if result:
            result["createdAt"] = TimeUTC.datetime_to_timestamp(result["createdAt"])
    return result


def edit(tenant_id, user_id, project_id, note_id, data: schemas.SessionUpdateNoteSchema):
    sub_query = []
    if data.message is not None:
        sub_query.append("message = %(message)s")
    if data.tags is not None:
        sub_query.append("tags = %(tags)s")
    if data.is_public is not None:
        sub_query.append("is_public = %(is_public)s")
    if data.timestamp is not None:
        sub_query.append("timestamp = %(timestamp)s")
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify(f"""\
                            UPDATE public.sessions_notes
                            SET 
                              {" ,".join(sub_query)} 
                            WHERE 
                                project_id = %(project_id)s
                                AND user_id = %(user_id)s
                                AND note_id = %(note_id)s
                                AND deleted_at ISNULL
                            RETURNING *;""",
                        {"project_id": project_id, "user_id": user_id, "note_id": note_id, **data.dict()})
        )
        row = helper.dict_to_camel_case(cur.fetchone())
        if row:
            row["createdAt"] = TimeUTC.datetime_to_timestamp(row["createdAt"])
        return row


def delete(tenant_id, user_id, project_id, note_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(
            cur.mogrify("""\
                            UPDATE public.sessions_notes 
                            SET deleted_at = timezone('utc'::text, now())
                            WHERE 
                                note_id = %(note_id)s
                                AND project_id = %(project_id)s\
                                AND user_id = %(user_id)s
                                AND deleted_at ISNULL;""",
                        {"project_id": project_id, "user_id": user_id, "note_id": note_id})
        )
        return {"data": {"state": "success"}}
