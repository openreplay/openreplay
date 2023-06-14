from . import smtp
import logging
from decouple import config

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))

if smtp.has_smtp():
    logging.info("valid SMTP configuration found")
else:
    logging.info("no SMTP configuration found or SMTP validation failed")
