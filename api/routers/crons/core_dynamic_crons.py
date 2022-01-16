from chalicelib.core import telemetry


def telemetry_cron() -> None:
    telemetry.compute()


cron_jobs = [
    {"func": telemetry_cron, "trigger": "cron", "day_of_week": "*"}
]
