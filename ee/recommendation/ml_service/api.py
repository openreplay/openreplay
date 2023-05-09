from fastapi import FastAPI
from utils import pg_client
from core.model_handler import recommendation_model
from utils.declarations import FeedbackRecommendation
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from crons.base_crons import cron_jobs
from core import feedback


app = FastAPI()
app.schedule = AsyncIOScheduler()


@app.on_event('startup')
async def startup():
    await pg_client.init()
    await feedback.init()
    app.schedule.start()
    for job in cron_jobs:
        app.schedule.add_job(id=job['func'].__name__, **job)

@app.on_event("shutdown")
async def shutdown():
    app.schedule.shutdown(wait=False)
    await feedback.terminate()
    await pg_client.terminate()

@app.get('/recommendations/{user_id}/{project_id}')
async def get_recommended_sessions(user_id: int, project_id: int):
    recommendations = recommendation_model.get_recommendations(user_id, project_id)
    return {'user_id': user_id,
            'project_id': project_id,
            'recommendations': str(recommendations)
            }


@app.post('/recommendations/feedback')
async def get_feedback(data: FeedbackRecommendation):
    try:
        feedback.global_queue.put(tuple(data.dict().values()))
    except Exception as e:
        return {'error': e}
    return {'success': 1}

# @app.post('/update-model')
# async def update_model(model_info: ModelDescription):
#     recommendation_model.load_model(model_name=model_info.model_name,
#                      model_version=model_info.model_version
#                      )
#     return {'info': 'success'}
