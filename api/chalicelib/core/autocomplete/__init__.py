import logging

from decouple import config

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))

logging.info(">>> Using experimental autocomplete")
from . import autocomplete_ch as autocomplete
