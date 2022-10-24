import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from decouple import config
from fastapi import FastAPI
from chalicelib.utils import pg_client

from chalicelib.core import alerts_processor

app = FastAPI(root_path="/alerts", docs_url=config("docs_url", default=""), redoc_url=config("redoc_url", default=""))
logging.info("============= ALERTS =============")


@app.get("/")
async def root():
    return {"status": "Running"}


app.schedule = AsyncIOScheduler()

loglevel = config("LOGLEVEL", default=logging.INFO)
print(f">Loglevel set to: {loglevel}")
logging.basicConfig(level=loglevel)
ap_logger = logging.getLogger('apscheduler')
ap_logger.setLevel(loglevel)
app.schedule = AsyncIOScheduler()


@app.on_event("startup")
async def startup():
    logging.info(">>>>> starting up <<<<<")
    await pg_client.init()
    app.schedule.start()
    app.schedule.add_job(id="alerts_processor", **{"func": alerts_processor.process, "trigger": "interval",
                                                   "minutes": config("ALERTS_INTERVAL", cast=int, default=5),
                                                   "misfire_grace_time": 20})

    ap_logger.info(">Scheduled jobs:")
    for job in app.schedule.get_jobs():
        ap_logger.info({"Name": str(job.id), "Run Frequency": str(job.trigger), "Next Run": str(job.next_run_time)})


@app.on_event("shutdown")
async def shutdown():
    logging.info(">>>>> shutting down <<<<<")
    app.schedule.shutdown(wait=False)
    await pg_client.terminate()


@app.get('/private/shutdown', tags=["private"])
async def stop_server():
    logging.info("Requested shutdown")
    await shutdown()
    import os, signal
    os.kill(1, signal.SIGTERM)
