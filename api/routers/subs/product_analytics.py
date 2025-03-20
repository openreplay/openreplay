import schemas
from chalicelib.core.product_analytics import events, properties
from fastapi import Depends
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app.get('/{projectId}/properties/search', tags=["product_analytics"])
def get_event_properties(projectId: int, event_name: str = None,
                         context: schemas.CurrentContext = Depends(OR_context)):
    if not event_name or len(event_name) == 0:
        return {"data": []}
    return {"data": properties.get_properties(project_id=projectId, event_name=event_name)}


@app.get('/{projectId}/events/names', tags=["dashboard"])
def get_all_events(projectId: int,
                   context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": events.get_events(project_id=projectId)}


@app.post('/{projectId}/events/search', tags=["dashboard"])
def search_events(projectId: int,
                  # data: schemas.CreateDashboardSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": events.search_events(project_id=projectId, data={})}
