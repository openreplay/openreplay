import logging

from decouple import config

from chalicelib.utils import ch_client, exp_ch_helper

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))


def add_viewed_error(project_id, user_id, error_id):
    with ch_client.ClickHouseClient() as cur:
        query = f"""INSERT INTO {exp_ch_helper.get_user_viewed_errors_table()}(project_id,user_id, error_id) 
                    VALUES (%(project_id)s,%(userId)s,%(error_id)s);"""
        params = {"userId": user_id, "error_id": error_id, "project_id": project_id}
        cur.execute(query=query, params=params)
