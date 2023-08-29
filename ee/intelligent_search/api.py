from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from crons.base_crons import cron_jobs
from auth.auth_key import api_key_auth
from utils.declarations import LLMQuestion
from core.llm_api import llm_api
from fastapi.middleware.cors import CORSMiddleware
import logging


logging.basicConfig(level=logging.INFO)

class FastAPInScheduler(FastAPI):

    def __init__(self, **params):
        super().__init__(**params)
        self.schedule = AsyncIOScheduler()
        self.llm_conn = llm_api

    def start_schedule(self):
        self.schedule.start()

    def shutdown_schedule(self, **params):
        self.schedule.shutdown(**params)

    def add_job(self, id, **job):
        self.schedule.add_job(id=id, **job)


@asynccontextmanager
async def lifespan(app: FastAPInScheduler):
    app.start_schedule()
    for job in cron_jobs:
        app.add_job(id=job['func'].__name__, **job)
    yield
    app.shutdown_schedule(wait=False)
    app.llm_conn.send_all() # TODO: Send these responses somewhere

app = FastAPInScheduler(lifespan=lifespan)

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post('/llm/completion', dependencies=[Depends(api_key_auth)])
async def get_recommended_sessions(data: LLMQuestion):
    llm_api.add_question(data.question)
    response = llm_api.send_question_to_llm()
    if response:
        return {'response': response}
    else:
        return {'status': 500}


@app.get('/')
async def health():
    return {'status': 200}

