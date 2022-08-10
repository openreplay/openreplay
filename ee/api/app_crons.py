print("============= CRONS =============")
import sys
import asyncio

from routers.crons import core_dynamic_crons


def default_action(action):
    async def _func():
        print(f"{action} not found in crons-definitions")

    return _func


async def process(action):
    await {
        "TELEMETRY": core_dynamic_crons.telemetry_cron,
        "JOB": core_dynamic_crons.run_scheduled_jobs,
        "REPORT": core_dynamic_crons.weekly_report2
    }.get(action.upper(), default_action(action))()


if __name__ == '__main__':
    if len(sys.argv) < 2 or len(sys.argv[1]) < 1:
        print("please provide actions as argument")
    else:
        print(f"action: {sys.argv[1]}")
        asyncio.run(process(sys.argv[1]))
