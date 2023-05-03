from fastapi import FastAPI
from utils import pg_client
from core.model_handler import recommendation_model
from utils.declarations import ModelDescription
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from crons.base_crons import cron_jobs

app = FastAPI()
app.schedule = AsyncIOScheduler()


@app.on_event('startup')
async def startup():
    await pg_client.init()
    app.schedule.start()
    for job in cron_jobs:
        app.schedule.add_job(id=job['func'].__name__, **job)

@app.on_event("shutdown")
async def shutdown():
    app.schedule.shutdown(wait=False)
    await pg_client.terminate()

@app.get('/recommendations/{user_id}/{project_id}')
async def get_recommended_sessions(user_id: int, project_id: int):
    recommendations = recommendation_model.get_recommendations(user_id, project_id)
    return {'user_id': user_id,
            'project_id': project_id,
            'recommendations': str(recommendations)
            }

# @app.post('/update-model')
# async def update_model(model_info: ModelDescription):
#     recommendation_model.load_model(model_name=model_info.model_name,
#                      model_version=model_info.model_version
#                      )
#     return {'info': 'success'}
