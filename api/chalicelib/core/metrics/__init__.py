import logging

from decouple import config

logger = logging.getLogger(__name__)

if config("EXP_METRICS", cast=bool, default=False):
    logger.info(">>> Using experimental metrics")
else:
    pass