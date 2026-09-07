import logging

from chalicelib.utils import pg_client

logger = logging.getLogger(__name__)


def store_client_id(client_id: str, user_id: int):
    with pg_client.PostgresClient() as cur:
        query = cur.mogrify(
            """
            INSERT INTO public.mcp_app_users(user_id, client_id)
            VALUES (%(user_id)s, %(client_id)s) ON CONFLICT DO NOTHING;""",
            {"client_id": client_id, "user_id": user_id, },
        )
        cur.execute(query=query)
