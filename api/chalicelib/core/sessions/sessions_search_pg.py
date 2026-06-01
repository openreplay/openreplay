import logging

from chalicelib.core import metadata
from chalicelib.utils import pg_client, helper

logger = logging.getLogger(__name__)

SESSION_PROJECTION_BASE_COLS = """s.project_id,
s.session_id::text AS session_id,
s.user_uuid,
s.user_id,
s.user_os,
s.user_browser,
s.user_device,
s.user_device_type,
s.user_country,
s.user_city,
s.user_state,
s.start_ts,
s.duration,
s.events_count,
s.pages_count,
s.errors_count,
s.user_anonymous_id,
s.platform,
s.timezone,
to_jsonb(s.issue_types) AS issue_types """

SESSION_PROJECTION_COLS = SESSION_PROJECTION_BASE_COLS + """,
favorite_sessions.session_id NOTNULL            AS favorite,
COALESCE((SELECT TRUE
 FROM public.user_viewed_sessions AS fs
 WHERE s.session_id = fs.session_id
   AND fs.user_id = %(userId)s LIMIT 1), FALSE) AS viewed """


def search_sessions_by_ids(project_id: int, session_ids: list, sort_by: str = 'session_id',
                           ascending: bool = False) -> dict:
    if session_ids is None or len(session_ids) == 0:
        return {"total": 0, "sessions": [], "_src": 1}
    with pg_client.PostgresClient() as cur:
        meta_keys = metadata.get(project_id=project_id)
        params = {"project_id": project_id, "session_ids": tuple(session_ids)}
        order_direction = 'ASC' if ascending else 'DESC'
        main_query = cur.mogrify(f"""SELECT {SESSION_PROJECTION_BASE_COLS}
                                            {"," if len(meta_keys) > 0 else ""}{",".join([f'metadata_{m["index"]}' for m in meta_keys])}
                                     FROM public.sessions AS s
                                        WHERE project_id=%(project_id)s 
                                            AND session_id IN %(session_ids)s
                                     ORDER BY {sort_by} {order_direction};""", params)

        cur.execute(main_query)
        rows = cur.fetchall()
        if len(meta_keys) > 0:
            for s in rows:
                s["metadata"] = {}
                for m in meta_keys:
                    s["metadata"][m["key"]] = s.pop(f'metadata_{m["index"]}')
    return {"total": len(rows), "sessions": helper.list_to_camel_case(rows), "_src": 1}
