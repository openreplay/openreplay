import logging

from decouple import config

logger = logging.getLogger(__name__)
from . import custom_metrics as custom_metrics_legacy
from . import custom_metrics_ee as custom_metrics
from . import metrics_ch as metrics
from . import metrics as metrics_legacy

if config("EXP_AUTOCOMPLETE", cast=bool, default=False):
    logger.info(">>> Using experimental autocomplete")
else:
    from . import autocomplete as autocomplete

if config("EXP_ERRORS_SEARCH", cast=bool, default=False):
    logger.info(">>> Using experimental error search")
    from . import errors as errors_legacy
    from . import errors_exp as errors

    if config("EXP_ERRORS_GET", cast=bool, default=False):
        logger.info(">>> Using experimental error get")
else:
    from . import errors as errors

if config("EXP_SESSIONS_SEARCH_METRIC", cast=bool, default=False):
    logger.info(">>> Using experimental sessions search for metrics")

if config("EXP_FUNNELS", cast=bool, default=False):
    logger.info(">>> Using experimental funnels")
    from . import significance_exp as significance
else:
    from . import significance as significance
