from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from core.model_handler import recommendation_model


async def update_model():
    """Update list of models to download."""
    await recommendation_model.update()


async def download_model():
    """Download next model in list."""
    await recommendation_model.download_next()

cron_jobs = [
    {"func": update_model, "trigger": CronTrigger(hour=0), "misfire_grace_time": 60, "max_instances": 1},
    {"func": download_model, "trigger": IntervalTrigger(seconds=10), "misfire_grace_time": 60, "max_instances": 1},
]
