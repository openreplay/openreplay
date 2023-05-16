from apscheduler.triggers.cron import CronTrigger
from core.model_handler import recommendation_model


async def update_model():
    await recommendation_model.update()

cron_jobs = [
    {"func": update_model, "trigger": CronTrigger(hour=0), "max_instances": 1},
]
