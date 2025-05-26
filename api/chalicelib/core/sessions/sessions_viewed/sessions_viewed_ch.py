import logging

from decouple import config

from chalicelib.utils import ch_client, exp_ch_helper
from .sessions_viewed import view_session as _view_session

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))


def view_session(project_id, user_id, session_id):
    _view_session(project_id=project_id, user_id=user_id, session_id=session_id)
    try:
        with ch_client.ClickHouseClient() as cur:
            query = f"""INSERT INTO {exp_ch_helper.get_user_viewed_sessions_table()}(project_id, user_id, session_id) 
                        VALUES (%(project_id)s,%(userId)s,%(sessionId)s);"""
            params = {"userId": user_id, "sessionId": session_id, "project_id": project_id}
            cur.execute(query=query, parameters=params)
    except Exception as err:
        logging.error("------- Exception while adding viewed session to CH")
        logging.error(err)
