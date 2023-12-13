from apscheduler.triggers.interval import IntervalTrigger

from chalicelib.utils import events_queue
from chalicelib.core import assist_stats

from decouple import config


async def pg_events_queue() -> None:
    events_queue.global_queue.force_flush()


async def assist_events_aggregates_cron() -> None:
    assist_stats.insert_aggregated_data()


# SINGLE_CRONS are crons that will be run the crons-service, they are a singleton crons
SINGLE_CRONS = [{"func": assist_events_aggregates_cron,
                 "trigger": IntervalTrigger(hours=1, start_date="2023-04-01 0:0:0", jitter=10)}]

# cron_jobs is the list of crons to run in main API service (so you will have as many runs as the number of instances of the API)
cron_jobs = [
    {"func": pg_events_queue, "trigger": IntervalTrigger(minutes=5), "misfire_grace_time": 20, "max_instances": 1}
]

if config("LOCAL_CRONS", default=False, cast=bool):
    cron_jobs += SINGLE_CRONS
