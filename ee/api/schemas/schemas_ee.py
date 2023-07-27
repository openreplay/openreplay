from typing import Optional, List, Union, Literal

from pydantic import Field, EmailStr, field_validator, model_validator

from . import schemas
from chalicelib.utils.TimeUTC import TimeUTC
from .overrides import BaseModel, Enum
from .overrides import transform_email, remove_whitespace, remove_duplicate_values, \
    single_to_list, ORUnion


class Permissions(str, Enum):
    session_replay = "SESSION_REPLAY"
    dev_tools = "DEV_TOOLS"
    # errors = "ERRORS"
    metrics = "METRICS"
    assist_live = "ASSIST_LIVE"
    assist_call = "ASSIST_CALL"
    feature_flags = "FEATURE_FLAGS"


class CurrentContext(schemas.CurrentContext):
    permissions: List[Optional[Permissions]] = Field(...)


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


class InsightCategories(str, Enum):
    errors = "errors"
    network = "network"
    rage = "rage"
    resources = "resources"


class GetInsightsSchema(schemas._TimedSchema):
    startTimestamp: int = Field(default=TimeUTC.now(-7))
    endTimestamp: int = Field(default=TimeUTC.now())
    metricValue: List[InsightCategories] = Field(default=[])
    series: List[schemas.CardSeriesSchema] = Field(default=[])


class CreateMemberSchema(schemas.CreateMemberSchema):
    roleId: Optional[int] = Field(None)


class EditMemberSchema(BaseModel):
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
    order: schemas.SortOrderType = Field(default=schemas.SortOrderType.desc)

    @model_validator(mode="before")
    def transform_order(cls, values):
        if values.get("order") is None:
            values["order"] = schemas.SortOrderType.desc
        else:
            values["order"] = values["order"].upper()
        return values


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
    userCity: str
    userState: str
    userDeviceType: str
    userAnonymousId: Optional[str]
    metadata: dict = Field(default={})


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


# TODO: move these to schema when Insights is supported on PG
class CardInsights(schemas.CardInsights):
    metric_value: List[InsightCategories] = Field(default=[])

    @model_validator(mode='after')
    def restrictions(cls, values):
        return values


CardSchema = ORUnion(Union[schemas.__cards_union_base, CardInsights], discriminator='metric_type')
