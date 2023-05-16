from fastapi import FastAPI, Depends
from utils import pg_client
from core.model_handler import recommendation_model
from utils.declarations import FeedbackRecommendation
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from crons.base_crons import cron_jobs
from auth.auth_key import api_key_auth
from core import feedback


app = FastAPI()
app.schedule = AsyncIOScheduler()


@app.on_event('startup')
async def startup():
    await pg_client.init()
    await feedback.init()
    await recommendation_model.update()
    app.schedule.start()
    for job in cron_jobs:
        app.schedule.add_job(id=job['func'].__name__, **job)

@app.on_event("shutdown")
async def shutdown():
    app.schedule.shutdown(wait=False)
    await feedback.terminate()
    await pg_client.terminate()

@app.get('/recommendations/{user_id}/{project_id}', dependencies=[Depends(api_key_auth)])
async def get_recommended_sessions(user_id: int, project_id: int):
    recommendations = recommendation_model.get_recommendations(user_id, project_id)
    return {'user_id': user_id,
            'project_id': project_id,
            'recommendations': str(recommendations)
            }


@app.post('/recommendations/feedback', dependencies=[Depends(api_key_auth)])
async def get_feedback(data: FeedbackRecommendation):
    try:
        feedback.global_queue.put(tuple(data.dict().values()))
    except Exception as e:
        return {'error': e}
    return {'success': 1}


@app.get('/')
async def health():
    return 200
