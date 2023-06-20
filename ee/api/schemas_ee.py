from enum import Enum
from typing import Optional, List, Union, Literal

from pydantic import BaseModel, Field, EmailStr
from pydantic import root_validator, validator

import schemas
from chalicelib.utils.TimeUTC import TimeUTC


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
    _transform_name = validator('name', pre=True, allow_reuse=True)(schemas.remove_whitespace)

    class Config:
        alias_generator = schemas.attribute_to_camel_case


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

    class Config:
        alias_generator = schemas.attribute_to_camel_case


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

    @root_validator(pre=True)
    def transform_order(cls, values):
        if values.get("order") is None:
            values["order"] = schemas.SortOrderType.desc
        else:
            values["order"] = values["order"].upper()
        return values

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
    userCity: str
    userState: str
    userDeviceType: str
    userAnonymousId: Optional[str]
    metadata: dict = Field(default={})


class AssistRecordUpdatePayloadSchema(BaseModel):
    name: str = Field(..., min_length=1)
    _transform_name = validator('name', pre=True, allow_reuse=True)(schemas.remove_whitespace)


class AssistRecordPayloadSchema(AssistRecordUpdatePayloadSchema):
    duration: int = Field(...)
    session_id: int = Field(...)

    class Config:
        alias_generator = schemas.attribute_to_camel_case


class AssistRecordSavePayloadSchema(AssistRecordPayloadSchema):
    key: str = Field(...)


class AssistRecordSearchPayloadSchema(schemas._PaginatedSchema, schemas._TimedSchema):
    user_id: Optional[int] = Field(default=None)
    query: Optional[str] = Field(default=None)
    order: Literal["asc", "desc"] = Field(default="desc")

    class Config:
        alias_generator = schemas.attribute_to_camel_case


# TODO: move these to schema when Insights is supported on PG
class MetricOfInsights(str, Enum):
    issue_categories = "issueCategories"


class CardSchema(schemas.CardSchema):
    metric_of: Union[schemas.MetricOfTimeseries, schemas.MetricOfTable, \
        schemas.MetricOfErrors, schemas.MetricOfPerformance, \
        schemas.MetricOfResources, schemas.MetricOfWebVitals, \
        schemas.MetricOfClickMap, MetricOfInsights] = Field(default=schemas.MetricOfTable.user_id)
    metric_value: List[Union[schemas.IssueType, InsightCategories]] = Field(default=[])

    @root_validator
    def restrictions(cls, values):
        return values

    @root_validator
    def validator(cls, values):
        values = super().validator(values)
        if values.get("metric_type") == schemas.MetricType.insights:
            assert values.get("view_type") == schemas.MetricOtherViewType.list_chart, \
                f"viewType must be 'list' for metricOf:{values.get('metric_of')}"
            assert isinstance(values.get("metric_of"), MetricOfInsights), \
                f"metricOf must be of type {MetricOfInsights} for metricType:{schemas.MetricType.insights}"
            if values.get("metric_value") is not None and len(values.get("metric_value")) > 0:
                for i in values.get("metric_value"):
                    assert isinstance(i, InsightCategories), \
                        f"metricValue should be of type [InsightCategories] for metricType:{schemas.MetricType.insights}"

        return values


class UpdateCardSchema(CardSchema):
    series: List[schemas.CardUpdateSeriesSchema] = Field(...)
