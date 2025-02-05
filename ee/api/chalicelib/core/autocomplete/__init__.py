import logging

from decouple import config

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))

if config("EXP_AUTOCOMPLETE", cast=bool, default=False):
    logging.info(">>> Using experimental autocomplete")
    from . import autocomplete_ch as autocomplete
else:
    from . import autocomplete
