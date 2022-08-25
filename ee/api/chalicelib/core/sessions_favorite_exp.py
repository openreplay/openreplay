import logging

from decouple import config

from chalicelib.utils import ch_client, exp_ch_helper

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))


def add_favorite_session(project_id, user_id, session_id, sign=1):
    try:
        with ch_client.ClickHouseClient() as cur:
            query = f"""INSERT INTO {exp_ch_helper.get_user_favorite_sessions_table()}(project_id,user_id, session_id, sign) 
                        VALUES (%(project_id)s,%(userId)s,%(sessionId)s,%(sign)s);"""
            params = {"userId": user_id, "sessionId": session_id, "project_id": project_id, "sign": sign}
            cur.execute(query=query, params=params)

    except Exception as err:
        logging.error("------- Exception while adding favorite session to CH")
        logging.error(err)


def remove_favorite_session(project_id, user_id, session_id):
    add_favorite_session(project_id=project_id, user_id=user_id, session_id=session_id, sign=-1)
