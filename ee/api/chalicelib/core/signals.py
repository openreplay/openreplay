import schemas
import logging
from chalicelib.utils import events_queue


def handle_frontend_signals_queued(project_id: int, user_id: int, data: schemas.SignalsSchema):
    try:
        events_queue.global_queue.put((project_id, user_id, data))
        return {'data': 'insertion succeded'}
    except Exception as e:
        logging.info(f'Error while inserting: {e}')
        return {'errors': [e]}
