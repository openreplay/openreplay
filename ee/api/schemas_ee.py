from typing import Optional, List, Literal

from pydantic import BaseModel, Field

import schemas
from chalicelib.utils.TimeUTC import TimeUTC


class RolePayloadSchema(BaseModel):
    name: str = Field(...)
    description: Optional[str] = Field(None)
    permissions: List[str] = Field(...)
    all_projects: bool = Field(True)
    projects: List[int] = Field([])

    class Config:
        alias_generator = schemas.attribute_to_camel_case


class CreateMemberSchema(schemas.CreateMemberSchema):
    roleId: Optional[int] = Field(None)


class EditMemberSchema(schemas.EditMemberSchema):
    roleId: int = Field(...)


class TrailSearchPayloadSchema(schemas._PaginatedSchema):
    startDate: int = Field(default=TimeUTC.now(-7))
    endDate: int = Field(default=TimeUTC.now(1))
    user_id: Optional[int] = Field(default=None)
    query: Optional[str] = Field(default=None)
    action: Optional[str] = Field(default=None)
    order: Literal["asc", "desc"] = Field(default="desc")

    class Config:
        alias_generator = schemas.attribute_to_camel_case
