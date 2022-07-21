from typing import Optional, List, Literal

from pydantic import BaseModel, Field, EmailStr

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


class EditUserSchema(schemas.EditUserSchema):
    roleId: Optional[int] = Field(None)


class EditMemberSchema(EditUserSchema):
    name: str = Field(...)
    email: EmailStr = Field(...)
    admin: bool = Field(False)
    roleId: int = Field(...)


class TrailSearchPayloadSchema(schemas._PaginatedSchema):
    limit: int = Field(default=200, gt=0)
    startDate: int = Field(default=TimeUTC.now(-7))
    endDate: int = Field(default=TimeUTC.now(1))
    user_id: Optional[int] = Field(default=None)
    query: Optional[str] = Field(default=None)
    action: Optional[str] = Field(default=None)
    order: Literal["asc", "desc"] = Field(default="desc")

    class Config:
        alias_generator = schemas.attribute_to_camel_case


class SessionModel(BaseModel):
    viewed: bool = Field(default=False)
    userId: Optional[str]
    userOs: str
    duration: int
    favorite: bool = Field(default=False)
    platform: str
    startTs: int
    userUuid: str
    projectId: int
    sessionId: str
    issueScore: int
    issueTypes: List[schemas.IssueType] = Field(default=[])
    pagesCount: int
    userDevice: Optional[str]
    errorsCount: int
    eventsCount: int
    userBrowser: str
    userCountry: str
    userDeviceType: str
    userAnonymousId: Optional[str]
    metadata: dict = Field(default={})
