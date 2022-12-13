from chalicelib.utils import events_queue


def pg_events_queue() -> None:
    events_queue.global_queue.force_flush()


ee_cron_jobs = [
    {"func": pg_events_queue, "trigger": "interval", "seconds": 60*5, "misfire_grace_time": 20},
]