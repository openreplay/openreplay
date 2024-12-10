import logging

from decouple import config

logger = logging.getLogger(__name__)
if config("EXP_ALERTS", cast=bool, default=False):
    logging.info(">>> Using experimental alerts")
    from . import alerts_processor_ch as alerts_processor
else:
    from . import alerts_processor as alerts_processor
