import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from decouple import config
from fastapi import FastAPI

from chalicelib.core import alerts_processor
from chalicelib.utils import pg_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logging.info(">>>>> starting up <<<<<")
    await pg_client.init()
    app.schedule.start()
    app.schedule.add_job(id="alerts_processor", **{"func": alerts_processor.process, "trigger": "interval",
                                                   "minutes": config("ALERTS_INTERVAL", cast=int, default=5),
                                                   "misfire_grace_time": 20})

    ap_logger.info(">Scheduled jobs:")
    for job in app.schedule.get_jobs():
        ap_logger.info({"Name": str(job.id), "Run Frequency": str(job.trigger), "Next Run": str(job.next_run_time)})

    # App listening
    yield

    # Shutdown
    logging.info(">>>>> shutting down <<<<<")
    app.schedule.shutdown(wait=False)
    await pg_client.terminate()


app = FastAPI(root_path=config("root_path", default="/alerts"), docs_url=config("docs_url", default=""),
              redoc_url=config("redoc_url", default=""), lifespan=lifespan)
logging.info("============= ALERTS =============")


@app.get("/")
async def root():
    return {"status": "Running"}


@app.get("/health")
async def get_health_status():
    return {"data": {
        "health": True,
        "details": {"version": config("version_number", default="unknown")}
    }}


app.schedule = AsyncIOScheduler()

loglevel = config("LOGLEVEL", default=logging.INFO)
print(f">Loglevel set to: {loglevel}")
logging.basicConfig(level=loglevel)
ap_logger = logging.getLogger('apscheduler')
ap_logger.setLevel(loglevel)
app.schedule = AsyncIOScheduler()

if config("LOCAL_DEV", default=False, cast=bool):
    @app.get('/trigger', tags=["private"])
    async def trigger_main_cron():
        logging.info("Triggering main cron")
        alerts_processor.process()
