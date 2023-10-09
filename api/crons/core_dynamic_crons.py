from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from chalicelib.core import telemetry
from chalicelib.core import weekly_report, jobs, health
from chalicelib.core import assist_stats


async def run_scheduled_jobs() -> None:
    jobs.execute_jobs()


async def weekly_report_cron() -> None:
    weekly_report.cron()


async def telemetry_cron() -> None:
    telemetry.compute()


async def health_cron() -> None:
    health.cron()


async def weekly_health_cron() -> None:
    health.weekly_cron()


async def assist_events_aggregates_cron() -> None:
    assist_stats.insert_aggregated_data()


cron_jobs = [
    {"func": telemetry_cron, "trigger": CronTrigger(day_of_week="*"),
     "misfire_grace_time": 60 * 60, "max_instances": 1},
    {"func": run_scheduled_jobs, "trigger": CronTrigger(day_of_week="*", hour=0, minute=15),
     "misfire_grace_time": 20, "max_instances": 1},
    {"func": weekly_report_cron, "trigger": CronTrigger(day_of_week="mon", hour=5),
     "misfire_grace_time": 60 * 60, "max_instances": 1},
    {"func": health_cron, "trigger": IntervalTrigger(hours=0, minutes=30, start_date="2023-04-01 0:0:0", jitter=300),
     "misfire_grace_time": 60 * 60, "max_instances": 1},
    {"func": weekly_health_cron, "trigger": CronTrigger(day_of_week="sun", hour=5),
     "misfire_grace_time": 60 * 60, "max_instances": 1},
    {"func": assist_events_aggregates_cron,
     "trigger": IntervalTrigger(hours=1, start_date="2023-04-01 0:0:0", jitter=10), }
]
