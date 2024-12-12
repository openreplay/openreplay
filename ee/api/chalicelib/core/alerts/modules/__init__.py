from decouple import config

TENANT_ID = "tenant_id"
if config("EXP_ALERTS", cast=bool, default=False):
    if config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
        from chalicelib.core.sessions import sessions
    else:
        from chalicelib.core.sessions import sessions_ch as sessions
else:
    if config("EXP_SESSIONS_SEARCH", cast=bool, default=False):
        from chalicelib.core.sessions import sessions_ch as sessions
    else:
        from chalicelib.core.sessions import sessions


from . import helpers as alert_helpers
