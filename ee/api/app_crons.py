print("============= CRONS =============")
import asyncio
import sys

from routers.crons import core_dynamic_crons

ACTIONS = {
    "TELEMETRY": core_dynamic_crons.telemetry_cron,
    "JOB": core_dynamic_crons.run_scheduled_jobs,
    "REPORT": core_dynamic_crons.weekly_report
}


def default_action(action):
    async def _func():
        print(f"{action} not found in crons-definitions")
        print("possible actions:")
        print(ACTIONS.keys())

    return _func


async def process(action):
    await ACTIONS.get(action.upper(), default_action(action))()


if __name__ == '__main__':
    if len(sys.argv) < 2 or len(sys.argv[1]) < 1:
        print("please provide actions as argument\npossible actions:")
        print(ACTIONS.keys())
    else:
        print(f"action: {sys.argv[1]}")
        asyncio.run(process(sys.argv[1]))
