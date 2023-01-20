from apscheduler.triggers.interval import IntervalTrigger

from chalicelib.utils import events_queue


async def pg_events_queue() -> None:
    events_queue.global_queue.force_flush()


ee_cron_jobs = [
    {"func": pg_events_queue, "trigger": IntervalTrigger(minutes=5), "misfire_grace_time": 20, "max_instances": 1},
]
