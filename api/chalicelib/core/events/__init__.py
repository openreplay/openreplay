import logging

from decouple import config

logger = logging.getLogger(__name__)

if config("EXP_EVENTS", cast=bool, default=False):
    logger.info(">>> Using experimental events replay")
    from . import events_ch as events
else:
    from . import events_pg as events
