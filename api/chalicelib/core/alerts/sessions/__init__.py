from decouple import config

if config("EXP_ALERTS", cast=bool, default=False):
    from chalicelib.core.sessions_ch import *
else:
    from chalicelib.core.sessions import *
