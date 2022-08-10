from chalicelib.utils import helper, pg_client
from decouple import config


def get_by_session_id(session_id, project_id, start_ts, duration):
    with pg_client.PostgresClient() as cur:
        if duration is None or (type(duration) != 'int' and type(duration) != 'float') or duration < 0:
            duration = 0
        delta = config("events_ts_delta", cast=int, default=60 * 60) * 1000
        ch_query = """\
                SELECT
                      timestamp AS datetime,
                      url,
                      type,
                      resources.duration AS duration,
                      ttfb,
                      header_size,
                      encoded_body_size,
                      decoded_body_size,
                      success,
                      COALESCE(CASE WHEN status=0 THEN NULL ELSE status END, CASE WHEN success THEN 200 END) AS status
                FROM events.resources INNER JOIN sessions USING (session_id)
                WHERE session_id = %(session_id)s 
                    AND project_id= %(project_id)s
                    AND sessions.start_ts=%(start_ts)s
                    AND resources.timestamp>=%(res_start_ts)s
                    AND resources.timestamp<=%(res_end_ts)s;"""
        params = {"session_id": session_id, "project_id": project_id, "start_ts": start_ts, "duration": duration,
                  "res_start_ts": start_ts - delta, "res_end_ts": start_ts + duration + delta, }
        cur.execute(cur.mogrify(ch_query, params))
        rows = cur.fetchall()
        return helper.list_to_camel_case(rows)
