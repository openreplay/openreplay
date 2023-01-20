from chalicelib.utils import pg_client, helper
from chalicelib.core import events


def get_customs_by_sessionId(session_id, project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(f"""\
            SELECT 
                c.*,
                '{events.EventType.CUSTOM_IOS.ui_type}' AS type
            FROM {events.EventType.CUSTOM_IOS.table} AS c
            WHERE 
              c.session_id = %(session_id)s
            ORDER BY c.timestamp;""",
                                {"project_id": project_id, "session_id": session_id})
                    )
        rows = cur.fetchall()
    return helper.dict_to_camel_case(rows)


def get_by_sessionId(session_id, project_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(f"""
            SELECT 
                c.*,
                '{events.EventType.CLICK_IOS.ui_type}' AS type
            FROM {events.EventType.CLICK_IOS.table} AS c
            WHERE 
              c.session_id = %(session_id)s
            ORDER BY c.timestamp;""",
                                {"project_id": project_id, "session_id": session_id})
                    )
        rows = cur.fetchall()

        cur.execute(cur.mogrify(f"""
            SELECT 
                i.*,
                '{events.EventType.INPUT_IOS.ui_type}' AS type
            FROM {events.EventType.INPUT_IOS.table} AS i
            WHERE 
              i.session_id = %(session_id)s
            ORDER BY i.timestamp;""",
                                {"project_id": project_id, "session_id": session_id})
                    )
        rows += cur.fetchall()
        cur.execute(cur.mogrify(f"""
            SELECT 
                v.*,
                '{events.EventType.VIEW_IOS.ui_type}' AS type
            FROM {events.EventType.VIEW_IOS.table} AS v
            WHERE 
              v.session_id = %(session_id)s
            ORDER BY v.timestamp;""", {"project_id": project_id, "session_id": session_id}))
        rows += cur.fetchall()
        rows = helper.list_to_camel_case(rows)
        rows = sorted(rows, key=lambda k: k["timestamp"])
    return rows


def get_crashes_by_session_id(session_id):
    with pg_client.PostgresClient() as cur:
        cur.execute(cur.mogrify(f"""
                    SELECT cr.*,uc.*, cr.timestamp - s.start_ts AS time
                    FROM {events.EventType.ERROR_IOS.table} AS cr INNER JOIN public.crashes_ios AS uc USING (crash_id) INNER JOIN public.sessions AS s USING (session_id)
                    WHERE
                      cr.session_id = %(session_id)s
                    ORDER BY timestamp;""", {"session_id": session_id}))
        errors = cur.fetchall()
        return helper.list_to_camel_case(errors)
