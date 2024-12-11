from decouple import config

TENANT_ID = "-1"
if config("EXP_ALERTS", cast=bool, default=False):
    from chalicelib.core.sessions import sessions_ch as sessions
else:
    from chalicelib.core.sessions import sessions

from . import helpers as alert_helpers
