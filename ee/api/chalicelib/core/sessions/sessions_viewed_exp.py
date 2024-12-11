from chalicelib.utils import ch_client, exp_ch_helper
import logging
from decouple import config

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))


def view_session(project_id, user_id, session_id):
    try:
        with ch_client.ClickHouseClient() as cur:
            query = f"""INSERT INTO {exp_ch_helper.get_user_viewed_sessions_table()}(project_id, user_id, session_id) 
                        VALUES (%(project_id)s,%(userId)s,%(sessionId)s);"""
            params = {"userId": user_id, "sessionId": session_id, "project_id": project_id}
            cur.execute(query=query, params=params)
    except Exception as err:
        logging.error("------- Exception while adding viewed session to CH")
        logging.error(err)
