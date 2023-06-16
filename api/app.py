import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from decouple import config
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.responses import StreamingResponse

from chalicelib.utils import helper
from chalicelib.utils import pg_client
from routers import core, core_dynamic
from crons import core_crons, core_dynamic_crons
from routers.subs import insights, metrics, v1_api, health

loglevel = config("LOGLEVEL", default=logging.INFO)
print(f">Loglevel set to: {loglevel}")
logging.basicConfig(level=loglevel)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logging.info(">>>>> starting up <<<<<")
    ap_logger = logging.getLogger('apscheduler')
    ap_logger.setLevel(loglevel)

    app.schedule = AsyncIOScheduler()
    await pg_client.init()
    app.schedule.start()

    for job in core_crons.cron_jobs + core_dynamic_crons.cron_jobs:
        app.schedule.add_job(id=job["func"].__name__, **job)

    ap_logger.info(">Scheduled jobs:")
    for job in app.schedule.get_jobs():
        ap_logger.info({"Name": str(job.id), "Run Frequency": str(job.trigger), "Next Run": str(job.next_run_time)})

    # App listening
    yield

    # Shutdown
    logging.info(">>>>> shutting down <<<<<")
    app.schedule.shutdown(wait=False)
    await pg_client.terminate()


app = FastAPI(root_path=config("root_path", default="/api"), docs_url=config("docs_url", default=""),
              redoc_url=config("redoc_url", default=""), lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware('http')
async def or_middleware(request: Request, call_next):
    if helper.TRACK_TIME:
        import time
        now = int(time.time() * 1000)
    response: StreamingResponse = await call_next(request)
    if helper.TRACK_TIME:
        now = int(time.time() * 1000) - now
        if now > 500:
            logging.info(f"Execution time: {now} ms")
    return response


origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(core.public_app)
app.include_router(core.app)
app.include_router(core.app_apikey)
app.include_router(core_dynamic.public_app)
app.include_router(core_dynamic.app)
app.include_router(core_dynamic.app_apikey)
app.include_router(metrics.app)
app.include_router(insights.app)
app.include_router(v1_api.app_apikey)
app.include_router(health.public_app)
app.include_router(health.app)
app.include_router(health.app_apikey)

# @app.get('/private/shutdown', tags=["private"])
# async def stop_server():
#     logging.info("Requested shutdown")
#     await shutdown()
#     import os, signal
#     os.kill(1, signal.SIGTERM)
