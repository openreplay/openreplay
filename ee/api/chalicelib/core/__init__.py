from decouple import config
import logging

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))

from . import sessions as sessions_legacy

if config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
    logging.info(">>> Using experimental sessions search")
    from . import sessions_exp as sessions
else:
    from . import sessions as sessions

if config("EXP_AUTOCOMPLETE", cast=bool, default=False):
    logging.info(">>> Using experimental autocomplete")
    from . import autocomplete_exp as autocomplete
else:
    from . import autocomplete as autocomplete

if config("EXP_ERRORS_SEARCH", cast=bool, default=False):
    logging.info(">>> Using experimental error search")
    from . import errors as errors_legacy
    from . import errors_exp as errors

    if config("EXP_ERRORS_GET", cast=bool, default=False):
        logging.info(">>> Using experimental error get")
else:
    from . import errors as errors

if config("EXP_SESSIONS_SEARCH_METRIC", cast=bool, default=False):
    logging.info(">>> Using experimental sessions search for metrics")

if config("EXP_ALERTS", cast=bool, default=False):
    logging.info(">>> Using experimental alerts")
    from . import alerts_processor_exp as alerts_processor
else:
    from . import alerts_processor as alerts_processor

if config("EXP_FUNNELS", cast=bool, default=False):
    logging.info(">>> Using experimental funnels")
    if not config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
        from . import sessions as sessions_legacy

    from . import significance_exp as significance
else:
    from . import significance as significance

if config("EXP_RESOURCES", cast=bool, default=False):
    logging.info(">>> Using experimental resources for session-replay")
