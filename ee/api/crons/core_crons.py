import logging

from apscheduler.triggers.cron import CronTrigger

from chalicelib.core import unlock

logger = logging.getLogger(__name__)


async def unlock_cron() -> None:
    logger.info("validating license")
    unlock.check()
    logger.info(f"valid: {unlock.is_valid()}")


cron_jobs = [
    {"func": unlock_cron, "trigger": CronTrigger(day="*")},
]
