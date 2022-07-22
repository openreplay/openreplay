import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from decouple import config
from fastapi import FastAPI

from chalicelib.core import alerts_processor

app = FastAPI(root_path="/alerts", docs_url=config("docs_url", default=""), redoc_url=config("redoc_url", default=""))
print("============= ALERTS =============")


@app.get("/")
async def root():
    return {"status": "Running"}


app.schedule = AsyncIOScheduler()
app.schedule.start()
app.schedule.add_job(id="alerts_processor", **{"func": alerts_processor.process, "trigger": "interval",
                                               "minutes": config("ALERTS_INTERVAL", cast=int, default=5),
                                               "misfire_grace_time": 20})
for job in app.schedule.get_jobs():
    print({"Name": str(job.id), "Run Frequency": str(job.trigger), "Next Run": str(job.next_run_time)})

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))
logging.getLogger('apscheduler').setLevel(config("LOGLEVEL", default=logging.INFO))
