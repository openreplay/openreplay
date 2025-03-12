import logging

from decouple import config

logger = logging.getLogger(__name__)
from . import sessions_pg
from . import sessions_pg as sessions_legacy
from . import sessions_ch
from . import sessions_search as sessions_search_legacy

if config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
    logger.info(">>> Using experimental sessions search")
    from . import sessions_ch as sessions
    from . import sessions_search_exp as sessions_search
else:
    from . import sessions_pg as sessions
    from . import sessions_search as sessions_search
