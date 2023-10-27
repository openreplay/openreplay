from fastapi import Depends, Body

import schemas
from chalicelib.utils import assist_helper
from or_dependencies import OR_context
from routers import core
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app_apikey.get('/v1/assist/credentials', tags=["api"])
def get_assist_credentials():
    credentials = assist_helper.get_temporary_credentials()
    if "errors" in credentials:
        return credentials
    return {"data": credentials}


@app_apikey.get('/v1/{projectKey}/assist/sessions', tags=["api"])
def get_sessions_live(projectKey: str, userId: str = None, context: schemas.CurrentContext = Depends(OR_context)):
    return core.get_sessions_live(projectId=context.project.project_id, userId=userId, context=context)


@app_apikey.post('/v1/{projectKey}/assist/sessions', tags=["api"])
def sessions_live(projectKey: str, data: schemas.LiveSessionsSearchPayloadSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    return core.sessions_live(projectId=context.project.project_id, data=data, context=context)
