import logging

from decouple import config

logger = logging.getLogger(__name__)
from . import custom_metrics_ee as custom_metrics
from . import metrics_ch as metrics

if config("EXP_AUTOCOMPLETE", cast=bool, default=False):
    logger.info(">>> Using experimental autocomplete")
else:
    from . import autocomplete as autocomplete

if config("EXP_SESSIONS_SEARCH_METRIC", cast=bool, default=False):
    logger.info(">>> Using experimental sessions search for metrics")

if config("EXP_FUNNELS", cast=bool, default=False):
    logger.info(">>> Using experimental funnels")
    from . import significance_exp as significance
else:
    from . import significance as significance
