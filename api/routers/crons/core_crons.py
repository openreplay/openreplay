from chalicelib.core import weekly_report, jobs


async def run_scheduled_jobs() -> None:
    jobs.execute_jobs()


async def weekly_report2() -> None:
    weekly_report.cron()


cron_jobs = [
    {"func": run_scheduled_jobs, "trigger": "interval", "seconds": 60, "misfire_grace_time": 20},
    {"func": weekly_report2, "trigger": "cron", "day_of_week": "mon", "hour": 5, "misfire_grace_time": 60 * 60}
]
