import logging

from chalicelib.core.errors.errors_viewed import *
from chalicelib.utils import ch_client, exp_ch_helper

_add_viewed_error = add_viewed_error
logger = logging.getLogger(__name__)


def add_viewed_error(project_id, user_id, error_id):
    _add_viewed_error(project_id=project_id, user_id=user_id, error_id=error_id)
    with ch_client.ClickHouseClient() as cur:
        query = f"""INSERT INTO {exp_ch_helper.get_user_viewed_errors_table()}(project_id,user_id, error_id) 
                    VALUES (%(project_id)s,%(userId)s,%(error_id)s);"""
        params = {"userId": user_id, "error_id": error_id, "project_id": project_id}
        cur.execute(query=query, params=params)
