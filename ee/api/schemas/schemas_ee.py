from typing import Optional, List, Union, Literal

from pydantic import Field, EmailStr, field_validator, model_validator

from chalicelib.utils.TimeUTC import TimeUTC
from . import schemas
from .overrides import BaseModel, Enum, ORUnion
from .transformers_validators import remove_whitespace


class Permissions(str, Enum):
    SESSION_REPLAY = "SESSION_REPLAY"
    DEV_TOOLS = "DEV_TOOLS"
    # errors = "ERRORS"
    METRICS = "METRICS"
    ASSIST_LIVE = "ASSIST_LIVE"
    ASSIST_CALL = "ASSIST_CALL"
    FEATURE_FLAGS = "FEATURE_FLAGS"
    SPOT = "SPOT"
    SPOT_PUBLIC = "SPOT_PUBLIC"


class ServicePermissions(str, Enum):
    SESSION_REPLAY = "SERVICE_SESSION_REPLAY"
    DEV_TOOLS = "SERVICE_DEV_TOOLS"
    ASSIST_LIVE = "SERVICE_ASSIST_LIVE"
    ASSIST_CALL = "SERVICE_ASSIST_CALL"
    READ_NOTES = "SERVICE_READ_NOTES"


class CurrentContext(schemas.CurrentContext):
    permissions: List[Union[Permissions, ServicePermissions]] = Field(...)
    service_account: bool = Field(default=False)

    @model_validator(mode="before")
    @classmethod
    def remove_unsupported_perms(cls, values):
        if values.get("permissions") is not None:
            perms = []
            for p in values["permissions"]:
                if Permissions.has_value(p) or ServicePermissions.has_value(p):
                    perms.append(p)
            values["permissions"] = perms
        return values


class RolePayloadSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)
    description: Optional[str] = Field(default=None)
    permissions: List[Permissions] = Field(...)
    all_projects: bool = Field(default=True)
    projects: List[int] = Field(default=[])
    _transform_name = field_validator('name', mode="before")(remove_whitespace)


class SignalsSchema(BaseModel):
    timestamp: int = Field(...)
    action: str = Field(...)
    source: str = Field(...)
    category: str = Field(...)
    data: dict = Field(default={})


class CreateMemberSchema(schemas.CreateMemberSchema):
    roleId: Optional[int] = Field(default=None)


class EditMemberSchema(BaseModel):
    name: str = Field(...)
    email: EmailStr = Field(...)
    admin: bool = Field(default=False)
    roleId: int = Field(...)


class TrailSearchPayloadSchema(schemas._PaginatedSchema):
    limit: int = Field(default=200, gt=0)
    startDate: int = Field(default=TimeUTC.now(-7))
    endDate: int = Field(default=TimeUTC.now(1))
    user_id: Optional[int] = Field(default=None)
    query: Optional[str] = Field(default=None)
    action: Optional[str] = Field(default=None)
    order: schemas.SortOrderType = Field(default=schemas.SortOrderType.DESC)

    @model_validator(mode="before")
    @classmethod
    def transform_order(cls, values):
        if values.get("order") is None:
            values["order"] = schemas.SortOrderType.DESC
        else:
            values["order"] = values["order"].upper()
        return values


class SessionModel(BaseModel):
    duration: int
    errorsCount: int
    eventsCount: int
    favorite: bool = Field(default=False)
    issueScore: int
    issueTypes: List[schemas.IssueType] = Field(default=[])
    metadata: dict = Field(default={})
    pagesCount: int
    platform: str
    projectId: int
    sessionId: str
    startTs: int
    timezone: Optional[str]
    userAnonymousId: Optional[str]
    userBrowser: str
    userCity: str
    userCountry: str
    userDevice: Optional[str]
    userDeviceType: str
    userId: Optional[str]
    userOs: str
    userState: str
    userUuid: str
    viewed: bool = Field(default=False)


class AssistRecordUpdatePayloadSchema(BaseModel):
    name: str = Field(..., min_length=1)
    _transform_name = field_validator('name', mode="before")(remove_whitespace)


class AssistRecordPayloadSchema(AssistRecordUpdatePayloadSchema):
    duration: int = Field(...)
    session_id: int = Field(...)


class AssistRecordSavePayloadSchema(AssistRecordPayloadSchema):
    key: str = Field(...)


class AssistRecordSearchPayloadSchema(schemas._PaginatedSchema, schemas._TimedSchema):
    user_id: Optional[int] = Field(default=None)
    query: Optional[str] = Field(default=None)
    order: Literal["asc", "desc"] = Field(default="desc")
