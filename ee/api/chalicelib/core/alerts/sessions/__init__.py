from decouple import config

if config("EXP_ALERTS", cast=bool, default=False):
    if config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
        from chalicelib.core.sessions import *
    else:
        from chalicelib.core.sessions_legacy import *
else:
    if config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
        from chalicelib.core.sessions_legacy import *
    else:
        from chalicelib.core.sessions import *
