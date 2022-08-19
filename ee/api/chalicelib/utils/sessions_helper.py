from chalicelib.utils.TimeUTC import TimeUTC


def get_main_events_table(timestamp):
    return "final.events_l7d_mv" if timestamp >= TimeUTC.now(delta_days=-7) else "final.events"


def get_main_sessions_table(timestamp):
    return "final.sessions_l7d_mv" if timestamp >= TimeUTC.now(delta_days=-7) else "final.sessions"


def get_main_resources_table(timestamp):
    return "final.resources"
