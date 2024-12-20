import logging

from decouple import config

logger = logging.getLogger(__name__)
from . import sessions as sessions_legacy

if config("EXP_METRICS", cast=bool, default=False):
    from . import sessions_ch as sessions
else:
    from . import sessions
