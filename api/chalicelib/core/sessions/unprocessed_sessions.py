import logging

from chalicelib.core import assist
from . import sessions

logger = logging.getLogger(__name__)


def check_exists(project_id, session_id, not_found_response) -> (int | None, dict | None):
    if session_id is None or not session_id.isnumeric():
        return session_id, not_found_response
    else:
        session_id = int(session_id)
    if not sessions.session_exists(project_id=project_id, session_id=session_id):
        logger.warning(f"{project_id}/{session_id} not found in DB.")
        if not assist.session_exists(project_id=project_id, session_id=session_id):
            logger.warning(f"{project_id}/{session_id} not found in Assist.")
            return session_id, not_found_response
    return session_id, None
