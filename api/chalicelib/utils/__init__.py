import logging

from decouple import config

from . import smtp

logger = logging.getLogger(__name__)
logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))

if smtp.has_smtp():
    logger.info("valid SMTP configuration found")
else:
    logger.info("no SMTP configuration found or SMTP validation failed")

if config("EXP_CH_DRIVER", cast=bool, default=True):
    logging.info(">>> Using new CH driver")
    from . import ch_client_exp as ch_client
else:
    from . import ch_client
