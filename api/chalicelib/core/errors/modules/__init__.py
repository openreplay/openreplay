import logging

from decouple import config

logger = logging.getLogger(__name__)

if config("EXP_ERRORS_SEARCH", cast=bool, default=False):
    from chalicelib.core.sessions import sessions_ch as sessions
else:
    from chalicelib.core.sessions import sessions
