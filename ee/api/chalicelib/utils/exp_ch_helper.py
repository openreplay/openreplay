from chalicelib.utils.TimeUTC import TimeUTC
from decouple import config
import logging

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))

if config("EXP_7D_MV", cast=bool, default=True):
    print(">>> Using experimental last 7 days materialized views")


def get_main_events_table(timestamp):
    return "experimental.events_l7d_mv" \
        if config("EXP_7D_MV", cast=bool, default=True) \
           and timestamp >= TimeUTC.now(delta_days=-7) else "experimental.events"


def get_main_sessions_table(timestamp):
    return "experimental.sessions_l7d_mv" \
        if config("EXP_7D_MV", cast=bool, default=True) \
           and timestamp >= TimeUTC.now(delta_days=-7) else "experimental.sessions"


def get_main_resources_table(timestamp):
    return "experimental.resources_l7d_mv" \
        if config("EXP_7D_MV", cast=bool, default=True) \
           and timestamp >= TimeUTC.now(delta_days=-7) else "experimental.resources"


def get_autocomplete_table(timestamp=0):
    return "experimental.autocomplete"


def get_user_favorite_sessions_table(timestamp=0):
    return "experimental.user_favorite_sessions"


def get_user_viewed_sessions_table(timestamp=0):
    return "experimental.user_viewed_sessions"


def get_user_viewed_errors_table(timestamp=0):
    return "experimental.user_viewed_errors"


def get_main_js_errors_sessions_table(timestamp=0):
    return "experimental.js_errors_sessions_mv"  # \
    # if config("EXP_7D_MV", cast=bool, default=True) \
    #    and timestamp >= TimeUTC.now(delta_days=-7) else "experimental.events"
