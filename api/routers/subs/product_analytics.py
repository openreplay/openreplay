from typing import Annotated, Optional

from fastapi import Body, Depends, Query

import schemas
from chalicelib.core import assist, metadata
from chalicelib.core.product_analytics import (
    autocomplete,
    autocomplete_simple,
    events,
    filters,
    properties,
)
from chalicelib.utils import helper
from or_dependencies import OR_context
from routers.base import get_routers

public_app, app, app_apikey = get_routers()


@app.get("/{projectId}/filters", tags=["product_analytics"])
def get_all_filters(
        projectId: int, context: schemas.CurrentContext = Depends(OR_context)
):
    return {
        "data": {
            "events": events.get_events(
                project_id=projectId, platform=context.project.platform
            ),
            "event": properties.get_all_properties(project_id=projectId),
            "session": filters.get_sessions_filters(project_id=projectId),
            "user": filters.get_users_filters(project_id=projectId),
            "users": filters.get_users_filters_identified(project_id=projectId),
            "metadata": metadata.get_for_filters(project_id=projectId),
        }
    }


@app.get("/{projectId}/events/names", tags=["product_analytics"])
def get_all_events(
        projectId: int,
        filter_query: Annotated[schemas.PaginatedSchema, Query()],
        context: schemas.CurrentContext = Depends(OR_context),
):
    return {
        "data": events.get_events(
            project_id=projectId, platform=context.project.platform
        )
    }


@app.get("/{projectId}/properties/search", tags=["product_analytics"])
def get_event_properties(
        projectId: int,
        en: str = Query(default=None, description="event name"),
        ac: bool = Query(description="auto captured"),
        context: schemas.CurrentContext = Depends(OR_context),
):
    if not en or len(en) == 0:
        return {"data": []}
    return {
        "data": properties.get_event_properties(
            project_id=projectId, event_name=en, auto_captured=ac
        )
                + filters.get_global_filters(project_id=projectId)
    }


@app.post("/{projectId}/events/search", tags=["product_analytics"])
def search_events(
        projectId: int,
        data: schemas.EventsSearchPayloadSchema = Body(...),
        context: schemas.CurrentContext = Depends(OR_context),
):
    return {"data": events.search_events(project_id=projectId, data=data)}


@app.get("/{projectId}/lexicon/events", tags=["product_analytics", "lexicon"])
def get_all_lexicon_events(
        projectId: int,
        filter_query: Annotated[schemas.PaginatedSchema, Query()],
        context: schemas.CurrentContext = Depends(OR_context),
):
    return {"data": events.get_lexicon(project_id=projectId, page=filter_query)}


@app.get("/{projectId}/lexicon/properties", tags=["product_analytics", "lexicon"])
def get_all_lexicon_properties(
        projectId: int,
        filter_query: Annotated[schemas.PaginatedSchema, Query()],
        context: schemas.CurrentContext = Depends(OR_context),
):
    return {"data": properties.get_lexicon(project_id=projectId, page=filter_query)}


@app.get("/{projectId}/events/autocomplete", tags=["autocomplete"])
def autocomplete_events(
        projectId: int,
        q: Optional[str] = None,
        context: schemas.CurrentContext = Depends(OR_context),
):
    return {
        "data": autocomplete.search_events(
            project_id=projectId, q=None if not q or len(q) == 0 else q
        )
    }


@app.get("/{projectId}/properties/autocomplete", tags=["autocomplete"])
def autocomplete_properties(
        projectId: int,
        propertyName: str,
        eventName: Optional[str] = None,
        userId: Optional[str] = None,
        scope: Optional[str] = None,
        q: Optional[str] = None,
        ac: bool = Query(description="auto captured"),
        live: bool = False,
        context: schemas.CurrentContext = Depends(OR_context),
):
    if live:
        return assist.autocomplete(project_id=projectId, q=q, key=eventName)
    # Auto-captured properties should be transformed from camelCase to snake_case
    if ac:
        propertyName = helper.key_to_snake_case(propertyName)
    # restrict autocomplete-simple to auto-captured properties only
    # (for the moment as we don't have other way to tell if it belongs to events or something else)
    if scope == "sessions" \
            or scope == "users" and propertyName in autocomplete_simple.USERS_SIMPLE_PROPERTIES \
            or scope == "events" and propertyName in autocomplete_simple.EVENTS_SIMPLE_PROPERTIES:
        return {
            "data": autocomplete_simple.search_simple_property(
                project_id=projectId, name=propertyName, source=scope, q=q
            )
        }
    elif scope == "users":
        return {
            "data": autocomplete.search_users_properties(
                project_id=projectId,
                user_id=None if not userId or len(userId) == 0 else userId,
                property_name=propertyName,
                q=None if not q or len(q) == 0 else q,
            )
        }

    return {
        "data": autocomplete.search_events_properties(
            project_id=projectId,
            event_name=None if not eventName or len(eventName) == 0 else eventName,
            property_name=propertyName,
            q=None if not q or len(q) == 0 else q,
        )
    }
