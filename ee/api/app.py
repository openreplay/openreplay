import logging
import queue

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from decouple import config
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette import status
from starlette.responses import StreamingResponse, JSONResponse

from chalicelib.utils import helper
from chalicelib.utils import pg_client
from routers import core, core_dynamic, ee, saml
from routers.crons import core_crons
from routers.crons import core_dynamic_crons
from routers.subs import dashboard, insights, metrics, v1_api_ee
from routers.subs import v1_api

app = FastAPI(root_path="/api", docs_url=config("docs_url", default=""), redoc_url=config("redoc_url", default=""))
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware('http')
async def or_middleware(request: Request, call_next):
    from chalicelib.core import unlock
    if not unlock.is_valid():
        return JSONResponse(content={"errors": ["expired license"]}, status_code=status.HTTP_403_FORBIDDEN)

    global OR_SESSION_TOKEN
    OR_SESSION_TOKEN = request.headers.get('vnd.openreplay.com.sid', request.headers.get('vnd.asayer.io.sid'))
    try:
        if helper.TRACK_TIME:
            import time
            now = int(time.time() * 1000)
        response: StreamingResponse = await call_next(request)
        if helper.TRACK_TIME:
            now = int(time.time() * 1000) - now
            if now > 500:
                print(f"Execution time: {now} ms")
    except Exception as e:
        pg_client.close()
        raise e
    pg_client.close()
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
app.include_router(saml.public_app)
app.include_router(saml.app)
app.include_router(saml.app_apikey)
app.include_router(dashboard.app)
app.include_router(metrics.app)
app.include_router(insights.app)
app.include_router(v1_api.app_apikey)
app.include_router(v1_api_ee.app_apikey)

app.queue_system = queue.Queue()
app.schedule = AsyncIOScheduler()
app.schedule.start()

for job in core_crons.cron_jobs + core_dynamic_crons.cron_jobs:
    app.schedule.add_job(id=job["func"].__name__, **job)
from chalicelib.core import traces

app.schedule.add_job(id="trace_worker", **traces.cron_jobs[0])

for job in app.schedule.get_jobs():
    print({"Name": str(job.id), "Run Frequency": str(job.trigger), "Next Run": str(job.next_run_time)})

logging.basicConfig(level=config("LOGLEVEL", default=logging.INFO))
logging.getLogger('apscheduler').setLevel(config("LOGLEVEL", default=logging.INFO))
