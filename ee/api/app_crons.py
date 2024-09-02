print("============= CRONS =============")
import asyncio
import logging
import sys

from crons import core_dynamic_crons, ee_crons

logger = logging.getLogger(__name__)
ACTIONS = {
    "TELEMETRY": core_dynamic_crons.telemetry_cron,
    "JOB": core_dynamic_crons.run_scheduled_jobs,
    "REPORT": core_dynamic_crons.weekly_report,
    "PROJECTS_STATS": core_dynamic_crons.health_cron,
    "FIX_PROJECTS_STATS": core_dynamic_crons.weekly_health_cron,
    "ASSIST_STATS": ee_crons.assist_events_aggregates_cron,
}


def default_action(action):
    async def _func():
        logger.warning(f"{action} not found in crons-definitions")
        logger.warning("possible actions:")
        logger.warning(list(ACTIONS.keys()))

    return _func


async def process(action):
    await ACTIONS.get(action.upper(), default_action(action))()


if __name__ == '__main__':
    if len(sys.argv) < 2 or len(sys.argv[1]) < 1:
        logger.warning("please provide actions as argument\npossible actions:")
        logger.warning(list(ACTIONS.keys()))
    else:
        logger.info(f"action: {sys.argv[1]}")
        asyncio.run(process(sys.argv[1]))
