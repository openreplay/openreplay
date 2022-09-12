from decouple import config
import logging

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))

if config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
    print(">>> Using experimental sessions search")
    from . import sessions as sessions_legacy
    from . import sessions_exp as sessions
else:
    from . import sessions as sessions

if config("EXP_AUTOCOMPLETE", cast=bool, default=False):
    print(">>> Using experimental autocomplete")
    from . import autocomplete_exp as autocomplete
else:
    from . import autocomplete as autocomplete

if config("EXP_ERRORS_SEARCH", cast=bool, default=False):
    print(">>> Using experimental error search")
    from . import errors_exp as errors
else:
    from . import errors as errors

if config("EXP_METRICS", cast=bool, default=False):
    print(">>> Using experimental metrics")
    from . import metrics_exp as metrics
else:
    from . import metrics as metrics

if config("EXP_ALERTS", cast=bool, default=False):
    print(">>> Using experimental alerts")
    from . import alerts_processor_exp as alerts_processor
else:
    from . import alerts_processor as alerts_processor

if config("EXP_FUNNELS", cast=bool, default=False):
    print(">>> Using experimental funnels")
    if not config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
        from . import sessions as sessions_legacy

    from . import significance_exp as significance
else:
    from . import significance as significance

if config("EXP_RESOURCES", cast=bool, default=False):
    print(">>> Using experimental resources for session-replay")
