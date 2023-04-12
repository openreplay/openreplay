from apscheduler.triggers.cron import CronTrigger

from chalicelib.core import telemetry
from chalicelib.core import weekly_report, jobs


async def run_scheduled_jobs() -> None:
    jobs.execute_jobs()


async def weekly_report2() -> None:
    weekly_report.cron()


async def telemetry_cron() -> None:
    telemetry.compute()


cron_jobs = [
    {"func": telemetry_cron, "trigger": CronTrigger(day_of_week="*"),
     "misfire_grace_time": 60 * 60, "max_instances": 1},
    {"func": run_scheduled_jobs, "trigger": CronTrigger(day_of_week="*", hour=0, minute=15),
     "misfire_grace_time": 20, "max_instances": 1},
    {"func": weekly_report2, "trigger": CronTrigger(day_of_week="mon", hour=5),
     "misfire_grace_time": 60 * 60, "max_instances": 1}
]
