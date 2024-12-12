import logging

from decouple import config

logger = logging.getLogger(__name__)

if config("EXP_METRICS", cast=bool, default=False):
    logger.info(">>> Using experimental metrics")
    from chalicelib.core.metrics import heatmaps_ch as heatmaps
    from chalicelib.core.metrics import metrics_ch as metrics
else:
    from chalicelib.core.metrics import heatmaps
    from chalicelib.core.metrics import metrics
