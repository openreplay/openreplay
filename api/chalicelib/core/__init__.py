from decouple import config
import logging

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))

if config("EXP_AUTOCOMPLETE", cast=bool, default=False):
    logging.info(">>> Using experimental autocomplete")
    from . import autocomplete_exp as autocomplete
else:
    from . import autocomplete as autocomplete
