from apscheduler.triggers.interval import IntervalTrigger
from core.llm_api import llm_api

async def force_run():
    llm_api.send_question_to_llm()

cron_jobs = [
    {"func": force_run, "trigger": IntervalTrigger(seconds=10), "misfire_grace_time": 60, "max_instances": 1},
]
