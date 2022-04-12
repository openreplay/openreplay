from chalicelib.utils import helper, pg_client


def get_by_session_id(session_id, project_id):
    with pg_client.PostgresClient() as cur:
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
                      COALESCE(status, CASE WHEN success THEN 200 END) AS status
                FROM events.resources INNER JOIN sessions USING (session_id)
                WHERE session_id = %(session_id)s AND project_id= %(project_id)s;"""
        params = {"session_id": session_id, "project_id": project_id}
        cur.execute(cur.mogrify(ch_query, params))
        rows = cur.fetchall()
        return helper.list_to_camel_case(rows)
