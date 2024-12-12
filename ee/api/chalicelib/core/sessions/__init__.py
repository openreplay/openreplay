import logging

from decouple import config

logger = logging.getLogger(__name__)
from . import sessions as sessions_legacy

if config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
    logger.info(">>> Using experimental sessions search")
    from . import sessions_ch as sessions
else:
    from . import sessions

from chalicelib.core.sessions import sessions_devtool_ee as sessions_devtool
from chalicelib.core.sessions import sessions_viewed_ee as sessions_viewed
from chalicelib.core.sessions import sessions_favorite_ee as sessions_favorite
