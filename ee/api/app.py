import logging
import queue
import time
from contextlib import asynccontextmanager

import psycopg_pool
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from decouple import config
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from psycopg import AsyncConnection
from starlette import status
from starlette.responses import StreamingResponse, JSONResponse

from chalicelib.core import traces
from chalicelib.utils import events_queue
from chalicelib.utils import helper
from chalicelib.utils import pg_client
from routers import core, core_dynamic
from routers import ee

if config("ENABLE_SSO", cast=bool, default=True):
    from routers import saml
from crons import core_crons, ee_crons, core_dynamic_crons
from routers.subs import insights, metrics, v1_api, health, usability_tests
from routers.subs import v1_api_ee

loglevel = config("LOGLEVEL", default=logging.WARNING)
print(f">Loglevel set to: {loglevel}")
logging.basicConfig(level=loglevel)

from psycopg.rows import dict_row


class ORPYAsyncConnection(AsyncConnection):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, row_factory=dict_row, **kwargs)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logging.info(">>>>> starting up <<<<<")
    ap_logger = logging.getLogger('apscheduler')
    ap_logger.setLevel(loglevel)

    app.schedule = AsyncIOScheduler()
    app.queue_system = queue.Queue()
    await pg_client.init()
    await events_queue.init()
    app.schedule.start()

    for job in core_crons.cron_jobs + core_dynamic_crons.cron_jobs + traces.cron_jobs + ee_crons.ee_cron_jobs:
        app.schedule.add_job(id=job["func"].__name__, **job)

    ap_logger.info(">Scheduled jobs:")
    for job in app.schedule.get_jobs():
        ap_logger.info({"Name": str(job.id), "Run Frequency": str(job.trigger), "Next Run": str(job.next_run_time)})

    database = {
        "host": config("pg_host", default="localhost"),
        "dbname": config("pg_dbname", default="orpy"),
        "user": config("pg_user", default="orpy"),
        "password": config("pg_password", default="orpy"),
        "port": config("pg_port", cast=int, default=5432),
        "application_name": "AIO" + config("APP_NAME", default="PY"),
    }

    database = psycopg_pool.AsyncConnectionPool(kwargs=database, connection_class=ORPYAsyncConnection,
                                                min_size=config("PG_AIO_MINCONN", cast=int, default=1),
                                                max_size=config("PG_AIO_MAXCONN", cast=int, default=5), )
    app.state.postgresql = database

    # App listening
    yield

    # Shutdown
    await database.close()
    logging.info(">>>>> shutting down <<<<<")
    app.schedule.shutdown(wait=True)
    await traces.process_traces_queue()
    await events_queue.terminate()
    await pg_client.terminate()


app = FastAPI(root_path=config("root_path", default="/api"), docs_url=config("docs_url", default=""),
              redoc_url=config("redoc_url", default=""), lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware('http')
async def or_middleware(request: Request, call_next):
    from chalicelib.core import unlock
    if not unlock.is_valid():
        return JSONResponse(content={"errors": ["expired license"]}, status_code=status.HTTP_403_FORBIDDEN)

    if helper.TRACK_TIME:
        now = time.time()
    try:
        response: StreamingResponse = await call_next(request)
    except:
        logging.error(f"{request.method}: {request.url.path} FAILED!")
        raise
    if response.status_code // 100 != 2:
        logging.warning(f"{request.method}:{request.url.path} {response.status_code}!")
    if helper.TRACK_TIME:
        now = time.time() - now
        if now > 2:
            now = round(now, 2)
            logging.warning(f"Execution time: {now} s for {request.method}: {request.url.path}")
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
app.include_router(ee.public_app)
app.include_router(ee.app)
app.include_router(ee.app_apikey)
app.include_router(metrics.app)
app.include_router(insights.app)
app.include_router(v1_api.app_apikey)
app.include_router(v1_api_ee.app_apikey)
app.include_router(health.public_app)
app.include_router(health.app)
app.include_router(health.app_apikey)

app.include_router(usability_tests.public_app)
app.include_router(usability_tests.app)
app.include_router(usability_tests.app_apikey)

if config("ENABLE_SSO", cast=bool, default=True):
    app.include_router(saml.public_app)
    app.include_router(saml.app)
    app.include_router(saml.app_apikey)
