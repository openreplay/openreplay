print("============= CRONS =============")

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from decouple import config
from fastapi import FastAPI

from routers.crons import core_crons, core_dynamic_crons

app = FastAPI()


@app.get("/")
async def root():
    return {"status": "Running"}


app.schedule = AsyncIOScheduler()
app.schedule.start()

if not config("LOCAL_CRONS", default=False, cast=bool):
    for job in core_crons.cron_jobs + core_dynamic_crons.cron_jobs + core_dynamic_crons.SINGLE_CRONS:
        app.schedule.add_job(id=job["func"].__name__, **job)

    logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))
    logging.getLogger('apscheduler').setLevel(config("LOGLEVEL", default=logging.INFO))

else:
    print("Nothing to do because LOCAL_CRONS mode is enabled.")
