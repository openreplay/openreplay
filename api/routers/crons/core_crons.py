from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from chalicelib.core import health


async def health_cron() -> None:
    health.cron()


async def weekly_health_cron() -> None:
    health.weekly_cron()


cron_jobs = [
    {"func": health_cron, "trigger": IntervalTrigger(hours=0, minutes=30, start_date="2023-01-01 0:0:0", jitter=300),
     "misfire_grace_time": 60 * 60, "max_instances": 1},
    {"func": weekly_health_cron, "trigger": CronTrigger(day_of_week="sun", hour=5),
     "misfire_grace_time": 60 * 60, "max_instances": 1}
]
