import logging

from decouple import config

logger = logging.getLogger(__name__)
from . import sessions as sessions_legacy

if config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
    logger.info(">>> Using experimental sessions search")
    from . import sessions_ch as sessions
else:
    from . import sessions
