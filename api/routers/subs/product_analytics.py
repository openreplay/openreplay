from typing import Annotated

from fastapi import Body, Depends, Query

import schemas
from chalicelib.core.product_analytics import events, properties
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app.get('/{projectId}/events/names', tags=["product_analytics"])
def get_all_events(projectId: int, filter_query: Annotated[schemas.PaginatedSchema, Query()],
                   context: schemas.CurrentContext = Depends(OR_context)):
    return {
        "data": {
            "events": events.get_events(project_id=projectId, page=filter_query),
            "filters": {}
        }
    }


@app.get('/{projectId}/properties/search', tags=["product_analytics"])
def get_event_properties(projectId: int, event_name: str = None,
                         context: schemas.CurrentContext = Depends(OR_context)):
    if not event_name or len(event_name) == 0:
        return {"data": []}
    return {"data": properties.get_properties(project_id=projectId, event_name=event_name)}


@app.post('/{projectId}/events/search', tags=["product_analytics"])
def search_events(projectId: int, data: schemas.EventsSearchPayloadSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": events.search_events(project_id=projectId, data=data)}
