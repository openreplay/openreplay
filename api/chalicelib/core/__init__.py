from decouple import config
import logging

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))

if config("EXP_CH_LAYER", cast=bool, default=True):
    from . import metrics_ch as metrics
    from . import metrics as metrics_legacy
else:
    from . import metrics
