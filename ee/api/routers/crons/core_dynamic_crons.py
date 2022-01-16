from chalicelib.core import telemetry, unlock


def telemetry_cron() -> None:
    telemetry.compute()


# @app.schedule(Cron('0/60', '*', '*', '*', '?', '*'))
def unlock_cron() -> None:
    print("validating license")
    unlock.check()
    print(f"valid: {unlock.is_valid()}")


cron_jobs = [
    {"func": telemetry_cron, "trigger": "cron", "day_of_week": "*"},
    {"func": unlock_cron, "trigger": "cron", "hour": "*"}
]
