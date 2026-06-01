import logging

from chalicelib.utils import pg_client

logger = logging.getLogger(__name__)


def session_exists(project_id, session_id):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify("""SELECT 1
                               FROM public.sessions
                               WHERE session_id = %(session_id)s
                                 AND project_id = %(project_id)s LIMIT 1;""",
                            {"project_id": project_id, "session_id": session_id})
        cur.execute(query)
        row = cur.fetchone()
    return row is not None
