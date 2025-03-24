from typing import Optional, List

from pydantic import Field

from .overrides import BaseModel
from .schemas import EventPropertiesSchema, SortOrderType, _TimedSchema, \
    _PaginatedSchema, PropertyFilterSchema


class EventSearchSchema(BaseModel):
    event_name: str = Field(...)
    properties: Optional[EventPropertiesSchema] = Field(default=None)


class EventsSearchPayloadSchema(_TimedSchema, _PaginatedSchema):
    events: List[EventSearchSchema] = Field(default_factory=list, description="operator between events is OR")
    filters: List[PropertyFilterSchema] = Field(default_factory=list, description="operator between filters is AND")
    sort: str = Field(default="startTs")
    order: SortOrderType = Field(default=SortOrderType.DESC)
