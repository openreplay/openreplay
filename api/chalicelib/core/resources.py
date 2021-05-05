from chalicelib.utils import helper, pg_client


def get_by_session_id(session_id):
    with pg_client.PostgresClient() as cur:
        ch_query = """\
                SELECT
                      timestamp AS datetime,
                      url,
                      type,
                      duration,
                      ttfb,
                      header_size,
                      encoded_body_size,
                      decoded_body_size,
                      success
                FROM events.resources
                WHERE session_id = %(session_id)s;"""
        params = {"session_id": session_id}
        cur.execute(cur.mogrify(ch_query, params))
        rows = cur.fetchall()
        return helper.list_to_camel_case(rows)
