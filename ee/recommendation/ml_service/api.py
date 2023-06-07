from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from utils import pg_client
from core.model_handler import recommendation_model
from utils.declarations import FeedbackRecommendation
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from crons.base_crons import cron_jobs
from auth.auth_key import api_key_auth
from core import feedback
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    await pg_client.init()
    await feedback.init()
    await recommendation_model.update()
    app.schedule.start()
    for job in cron_jobs:
        app.schedule.add_job(id=job['func'].__name__, **job)
    yield
    app.schedule.shutdown(wait=False)
    await feedback.terminate()
    await pg_client.terminate()

app = FastAPI(lifespan=lifespan)
app.schedule = AsyncIOScheduler()

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

# @app.on_event('startup')
# async def startup():
#     await pg_client.init()
#     await feedback.init()
#     await recommendation_model.update()
#     app.schedule.start()
#     for job in cron_jobs:
#         app.schedule.add_job(id=job['func'].__name__, **job)
#
#
# @app.on_event('shutdown')
# async def shutdown():
#     app.schedule.shutdown(wait=False)
#     await feedback.terminate()
#     await pg_client.terminate()


@app.get('/recommendations/{user_id}/{project_id}', dependencies=[Depends(api_key_auth)])
async def get_recommended_sessions(user_id: int, project_id: int):
    recommendations = recommendation_model.get_recommendations(user_id, project_id)
    return {'userId': user_id,
            'projectId': project_id,
            'recommendations': recommendations
            }


@app.get('/recommendations/{projectId}/{viewerId}/{sessionId}', dependencies=[Depends(api_key_auth)])
async def already_gave_feedback(projectId: int, viewerId: int, sessionId: int):
    return feedback.has_feedback((viewerId, sessionId, projectId))


@app.post('/recommendations/feedback', dependencies=[Depends(api_key_auth)])
async def get_feedback(data: FeedbackRecommendation):
    try:
        feedback.global_queue.put(tuple(data.dict().values()))
    except Exception as e:
        return {'error': e}
    return {'success': 1}


@app.get('/')
async def health():
    return {'status': 200}
