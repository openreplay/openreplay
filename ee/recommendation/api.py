import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
# from fastapi_utils.tasks import repeat_every
from utils import events_queue
from utils import pg_client

app = FastAPI()
app.schedule = AsyncIOScheduler()

@app.get('/')
def home():
    return '<h1>This is a title</h1>'


@app.get('/value/{value}')
@app.put('/value/{value}')
def number(value: int):
    logging.info(f'> {value} as input. Testing queue with pg')
    events_queue.global_queue.put(value)


@app.on_event("startup")
async def startup():
    await pg_client.init()
    await events_queue.init(test=False)
    app.schedule.start()


@app.schedule.scheduled_job("interval", seconds=60*1)
def clean_up():
    events_queue.global_queue.force_flush()


@app.on_event("shutdown")
async def shutdown():
    await events_queue.terminate()
    await pg_client.terminate()
