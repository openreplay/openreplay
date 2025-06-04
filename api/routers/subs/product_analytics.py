from typing import Annotated

from fastapi import Body, Depends, Query

import schemas
from chalicelib.core import metadata
from chalicelib.core.product_analytics import events, properties, autocomplete, filters
from or_dependencies import OR_context
from routers.base import get_routers
from typing import Optional

public_app, app, app_apikey = get_routers()


@app.get('/{projectId}/filters', tags=["product_analytics"])
def get_all_filters(projectId: int, context: schemas.CurrentContext = Depends(OR_context)):
    return {
        "data": {
            "events": events.get_events(project_id=projectId),
            "event": properties.get_all_properties(project_id=projectId),
            "session": filters.get_sessions_filters(project_id=projectId),
            "user": filters.get_users_filters(project_id=projectId),
            "metadata": metadata.get_for_filters(project_id=projectId)
        }
    }


@app.get('/{projectId}/events/names', tags=["product_analytics"])
def get_all_events(projectId: int, filter_query: Annotated[schemas.PaginatedSchema, Query()],
                   context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": events.get_events(project_id=projectId)}


@app.get('/{projectId}/properties/search', tags=["product_analytics"])
def get_event_properties(projectId: int, en: str = Query(default=None, description="event name"),
                         ac: bool = Query(description="auto captured"),
                         context: schemas.CurrentContext = Depends(OR_context)):
    if not en or len(en) == 0:
        return {"data": []}
    return {"data": properties.get_event_properties(project_id=projectId, event_name=en, auto_captured=ac)}


@app.post('/{projectId}/events/search', tags=["product_analytics"])
def search_events(projectId: int, data: schemas.EventsSearchPayloadSchema = Body(...),
                  context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": events.search_events(project_id=projectId, data=data)}


@app.get('/{projectId}/lexicon/events', tags=["product_analytics", "lexicon"])
def get_all_lexicon_events(projectId: int, filter_query: Annotated[schemas.PaginatedSchema, Query()],
                           context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": events.get_lexicon(project_id=projectId, page=filter_query)}


@app.get('/{projectId}/lexicon/properties', tags=["product_analytics", "lexicon"])
def get_all_lexicon_properties(projectId: int, filter_query: Annotated[schemas.PaginatedSchema, Query()],
                               context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": properties.get_lexicon(project_id=projectId, page=filter_query)}


@app.get('/{projectId}/events/autocomplete', tags=["autocomplete"])
def autocomplete_events(projectId: int, q: Optional[str] = None,
                        context: schemas.CurrentContext = Depends(OR_context)):
    return {"data": autocomplete.search_events(project_id=projectId, q=None if not q or len(q) == 0 else q)}


@app.get('/{projectId}/properties/autocomplete', tags=["autocomplete"])
def autocomplete_properties(projectId: int, propertyName: str, eventName: Optional[str] = None,
                            q: Optional[str] = None, context: schemas.CurrentContext = Depends(OR_context)):
    # Specify propertyName to get top values of that property
    # Specify eventName&propertyName to get top values of that property for the selected event
    return {"data": autocomplete.search_properties(project_id=projectId,
                                                   event_name=None if not eventName \
                                                                      or len(eventName) == 0 else eventName,
                                                   property_name=propertyName,
                                                   q=None if not q or len(q) == 0 else q)}
