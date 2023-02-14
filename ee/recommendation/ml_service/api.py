from fastapi import FastAPI
from main import ServedModel
from utils.declarations import ModelDescription

app = FastAPI()
model = ServedModel()

@app.get('/recommendations/{user_id}/{project_id}')
async def get_recommended_sessions(user_id: int, project_id: int):
    recommendations = model.get_recommendations(user_id, project_id)
    return {'user_id': user_id,
            'project_id': project_id,
            'recommendations': recommendations
            }

@app.post('/update-model')
async def update_model(model_info: ModelDescription):
    model.load_model(model_name=model_info.model_name,
                     model_version=model_info.model_version
                     )
    return {'info': 'success'}
