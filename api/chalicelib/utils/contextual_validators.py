import schemas
from fastapi import HTTPException, Depends
from or_dependencies import OR_context


def validate_contextual_payload(
        item: schemas.SessionsSearchPayloadSchema,
        context: schemas.CurrentContext = Depends(OR_context)
) -> schemas.SessionsSearchPayloadSchema:
    if context.project.platform == "web":
        for e in item.events:
            if e.type in [schemas.EventType.CLICK_MOBILE,
                          schemas.EventType.INPUT_MOBILE,
                          schemas.EventType.VIEW_MOBILE,
                          schemas.EventType.CUSTOM_MOBILE,
                          schemas.EventType.REQUEST_MOBILE,
                          schemas.EventType.ERROR_MOBILE,
                          schemas.EventType.SWIPE_MOBILE]:
                raise HTTPException(status_code=422,
                                    detail=f"Mobile event '{e.type}' not supported for web project")
    else:
        for e in item.events:
            if e.type in [schemas.EventType.CLICK,
                          schemas.EventType.INPUT,
                          schemas.EventType.LOCATION,
                          schemas.EventType.CUSTOM,
                          schemas.EventType.REQUEST,
                          schemas.EventType.REQUEST_DETAILS,
                          schemas.EventType.GRAPHQL,
                          schemas.EventType.STATE_ACTION,
                          schemas.EventType.ERROR,
                          schemas.EventType.TAG]:
                raise HTTPException(status_code=422,
                                    detail=f"Web event '{e.type}' not supported for mobile project")

    return item
