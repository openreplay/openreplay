from decouple import config

TENANT_ID = "-1"
if config("EXP_ALERTS", cast=bool, default=False):
    import chalicelib.core.sessions.sessions_ch as sessions
else:
    import chalicelib.core.sessions.sessions_pg as sessions

from . import helpers as alert_helpers
