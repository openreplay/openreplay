import logging

from decouple import config

from . import smtp

logger = logging.getLogger(__name__)
logging.basicConfig(level=config("LOGLEVEL", default=logging.info))

if smtp.has_smtp():
    logger.info("valid SMTP configuration found")
else:
    logger.info("no SMTP configuration found or SMTP validation failed")
