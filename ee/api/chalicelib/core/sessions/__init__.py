import logging

from decouple import config

logger = logging.getLogger(__name__)
from . import sessions as sessions_legacy

if config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
    logger.info(">>> Using experimental sessions search")
    from . import sessions_ch as sessions
    from . import sessions_search_exp as sessions_search
else:
    from . import sessions
    from . import sessions_search_exp

from chalicelib.core.sessions import sessions_viewed_ee as sessions_viewed
from chalicelib.core.sessions import sessions_favorite_ee as sessions_favorite
