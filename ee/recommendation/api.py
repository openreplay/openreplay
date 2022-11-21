import logging
from fastapi import FastAPI
from fastapi_utils.tasks import repeat_every
from utils import events_queue
from utils import pg_client

app = FastAPI()
first_boot=True


@app.get('/')
def home():
    return '<h1>This is a title</h1>'


@app.get('/value/{value}')
@app.put('/value/{value}')
def number(value: int):
    logging.info(f'> {value} as input. Testing queue with pg')
    events_queue.global_queue.put(value)


@app.on_event("startup")
@repeat_every(seconds=60*1) # every 5 mins
async def startup():
    global first_boot
    if first_boot:
        await pg_client.init()
        await events_queue.init(test=False)
        first_boot = False
    else:
        events_queue.global_queue.force_flush()


# @repeat_every(seconds=60*5) # 5 min
# def clean_up():
#     events_queue.force_flush()


@app.on_event("shutdown")
async def shutdown():
    await events_queue.terminate()
    await pg_client.terminate()
