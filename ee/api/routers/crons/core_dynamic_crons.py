from chalicelib.core import telemetry, unlock
from chalicelib.core import weekly_report, jobs
from decouple import config


async def run_scheduled_jobs() -> None:
    jobs.execute_jobs()


async def weekly_report2() -> None:
    weekly_report.cron()


async def telemetry_cron() -> None:
    telemetry.compute()


# @app.schedule(Cron('0/60', '*', '*', '*', '?', '*'))
def unlock_cron() -> None:
    print("validating license")
    unlock.check()
    print(f"valid: {unlock.is_valid()}")


cron_jobs = [
    {"func": unlock_cron, "trigger": "cron", "hour": "*"}
]

SINGLE_CRONS = [{"func": telemetry_cron, "trigger": "cron", "day_of_week": "*"},
                {"func": run_scheduled_jobs, "trigger": "interval", "seconds": 60, "misfire_grace_time": 20},
                {"func": weekly_report2, "trigger": "cron", "day_of_week": "mon", "hour": 5,
                 "misfire_grace_time": 60 * 60}]

if config("LOCAL_CRONS", default=False, cast=bool):
    cron_jobs += SINGLE_CRONS
