import logging

from decouple import config

logger = logging.getLogger(__name__)

if config("EXP_METRICS", cast=bool, default=False):
    import chalicelib.core.sessions.sessions_ch as sessions
else:
    import chalicelib.core.sessions.sessions_pg as sessions

from chalicelib.core.sessions import sessions_mobs
