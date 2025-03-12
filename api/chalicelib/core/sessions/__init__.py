import logging

from decouple import config

logger = logging.getLogger(__name__)
from . import sessions_pg
from . import sessions_pg as sessions_legacy
from . import sessions_ch

if config("EXP_METRICS", cast=bool, default=False):
    from . import sessions_ch as sessions
else:
    from . import sessions_pg as sessions
