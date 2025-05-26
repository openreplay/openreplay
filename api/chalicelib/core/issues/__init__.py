import logging

from decouple import config

logger = logging.getLogger(__name__)

if config("EXP_EVENTS", cast=bool, default=False):
    logger.info(">>> Using experimental issues")
    from . import issues_ch as issues
else:
    from . import issues_pg as issues
