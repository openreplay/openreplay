from typing import Optional, List, Literal, Union, Annotated
from pydantic import Field

from .overrides import BaseModel
from .schemas import EventPropertiesSchema, SortOrderType, _TimedSchema, \
    _PaginatedSchema, PropertyFilterSchema


class EventSearchSchema(BaseModel):
    is_event: Literal[True] = True
    name: str = Field(...)
    properties: Optional[EventPropertiesSchema] = Field(default=None)


ProductAnalyticsGroupedFilter = Annotated[Union[EventSearchSchema, PropertyFilterSchema], \
    Field(discriminator='is_event')]


class EventsSearchPayloadSchema(_TimedSchema, _PaginatedSchema):
    filters: List[ProductAnalyticsGroupedFilter] = Field(...)
    sort: str = Field(default="startTs")
    order: SortOrderType = Field(default=SortOrderType.DESC)
