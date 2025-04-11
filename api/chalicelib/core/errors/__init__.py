import logging

from decouple import config

logger = logging.getLogger(__name__)

from . import errors_pg as errors_legacy

if config("EXP_ERRORS_SEARCH", cast=bool, default=False):
    logger.info(">>> Using experimental error search")
    from . import errors_ch as errors
else:
    from . import errors_pg as errors
