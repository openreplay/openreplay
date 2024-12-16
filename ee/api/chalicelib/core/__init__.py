import logging

from decouple import config

logger = logging.getLogger(__name__)


if config("EXP_AUTOCOMPLETE", cast=bool, default=False):
    logger.info(">>> Using experimental autocomplete")
else:
    from . import autocomplete as autocomplete
