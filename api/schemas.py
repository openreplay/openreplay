from enum import Enum
from typing import Optional, List, Literal, Union

from pydantic import BaseModel, Field, EmailStr, HttpUrl

from chalicelib.utils.TimeUTC import TimeUTC


def attribute_to_camel_case(snake_str):
    components = snake_str.split("_")
    return components[0] + ''.join(x.title() for x in components[1:])


class _Grecaptcha(BaseModel):
    g_recaptcha_response: Optional[str] = Field(None, alias='g-recaptcha-response')


class UserLoginSchema(_Grecaptcha):
    email: EmailStr = Field(...)
    password: str = Field(...)


class UserSignupSchema(UserLoginSchema):
    fullname: str = Field(...)
    organizationName: str = Field(...)
    projectName: str = Field(default="my first project")

    class Config:
        alias_generator = attribute_to_camel_case


class EditUserSchema(BaseModel):
    name: Optional[str] = Field(None)
    email: Optional[str] = Field(None)
    admin: Optional[bool] = Field(False)
    appearance: Optional[dict] = Field({})


class ForgetPasswordPayloadSchema(_Grecaptcha):
    email: str = Field(...)


class EditUserPasswordSchema(BaseModel):
    old_password: str = Field(...)
    new_password: str = Field(...)

    class Config:
        alias_generator = attribute_to_camel_case


class UpdateTenantSchema(BaseModel):
    name: Optional[str] = Field(None)
    opt_out: Optional[bool] = Field(None)

    class Config:
        alias_generator = attribute_to_camel_case


class CreateProjectSchema(BaseModel):
    name: str = Field("my first project")


class CurrentAPIContext(BaseModel):
    tenant_id: int = Field(...)


class CurrentContext(CurrentAPIContext):
    user_id: int = Field(...)
    email: str = Field(...)


class AddSlackSchema(BaseModel):
    name: str = Field(...)
    url: HttpUrl = Field(...)


class EditSlackSchema(BaseModel):
    name: Optional[str] = Field(None)
    url: HttpUrl = Field(...)


class SearchErrorsSchema(BaseModel):
    platform: Optional[str] = Field(None)
    startDate: Optional[int] = Field(TimeUTC.now(-7))
    endDate: Optional[int] = Field(TimeUTC.now())
    density: Optional[int] = Field(7)
    sort: Optional[str] = Field(None)
    order: Optional[str] = Field(None)


class EmailNotificationSchema(BaseModel):
    notification: str = Field(...)
    destination: str = Field(...)


class AlertNotificationSchema(BaseModel):
    auth: str = Field(...)
    notifications: List[EmailNotificationSchema] = Field(...)


class CreateNotificationSchema(BaseModel):
    token: str = Field(...)
    notifications: List = Field(...)


class NotificationsViewSchema(BaseModel):
    ids: Optional[List] = Field(default=[])
    startTimestamp: Optional[int] = Field(default=None)
    endTimestamp: Optional[int] = Field(default=None)


class JiraGithubSchema(BaseModel):
    provider: str = Field(...)
    username: str = Field(...)
    token: str = Field(...)
    url: str = Field(...)


class CreateEditWebhookSchema(BaseModel):
    webhookId: Optional[int] = Field(None)
    endpoint: str = Field(...)
    authHeader: Optional[str] = Field(None)
    name: Optional[str] = Field(...)


class CreateMemberSchema(BaseModel):
    userId: Optional[int] = Field(None)
    name: str = Field(...)
    email: str = Field(...)
    admin: bool = Field(False)


class EditMemberSchema(BaseModel):
    name: str = Field(...)
    email: str = Field(...)
    admin: bool = Field(False)


class EditPasswordByInvitationSchema(BaseModel):
    invitation: str = Field(...)
    passphrase: str = Field(..., alias="pass")
    password: str = Field(...)


class AssignmentSchema(BaseModel):
    assignee: str = Field(...)
    description: str = Field(...)
    title: str = Field(...)
    issue_type: str = Field(...)

    class Config:
        alias_generator = attribute_to_camel_case


class CommentAssignmentSchema(BaseModel):
    message: str = Field(...)


class IntegrationNotificationSchema(BaseModel):
    comment: Optional[str] = Field(None)


class GdprSchema(BaseModel):
    maskEmails: bool = Field(...)
    sampleRate: int = Field(...)
    maskNumbers: bool = Field(...)
    defaultInputMode: str = Field(...)


class SampleRateSchema(BaseModel):
    rate: int = Field(...)
    captureAll: bool = Field(False)


class WeeklyReportConfigSchema(BaseModel):
    weekly_report: bool = Field(True)

    class Config:
        alias_generator = attribute_to_camel_case


class GetHeatmapPayloadSchema(BaseModel):
    startDate: int = Field(TimeUTC.now(delta_days=-30))
    endDate: int = Field(TimeUTC.now())
    url: str = Field(...)


class DatadogSchema(BaseModel):
    apiKey: str = Field(...)
    applicationKey: str = Field(...)


class StackdriverSchema(BaseModel):
    serviceAccountCredentials: str = Field(...)
    logName: str = Field(...)


class NewrelicSchema(BaseModel):
    applicationId: str = Field(...)
    xQueryKey: str = Field(...)
    region: str = Field(...)


class RollbarSchema(BaseModel):
    accessToken: str = Field(...)


class BugsnagBasicSchema(BaseModel):
    authorizationToken: str = Field(...)


class BugsnagSchema(BugsnagBasicSchema):
    bugsnagProjectId: str = Field(...)


class CloudwatchBasicSchema(BaseModel):
    awsAccessKeyId: str = Field(...)
    awsSecretAccessKey: str = Field(...)
    region: str = Field(...)


class CloudwatchSchema(CloudwatchBasicSchema):
    logGroupName: str = Field(...)


class ElasticsearchBasicSchema(BaseModel):
    host: str = Field(...)
    port: int = Field(...)
    apiKeyId: str = Field(...)
    apiKey: str = Field(...)


class ElasticsearchSchema(ElasticsearchBasicSchema):
    indexes: str = Field(...)


class SumologicSchema(BaseModel):
    accessId: str = Field(...)
    accessKey: str = Field(...)
    region: str = Field(...)


class MetadataBasicSchema(BaseModel):
    index: Optional[int] = Field(None)
    key: str = Field(...)


class MetadataListSchema(BaseModel):
    list: List[MetadataBasicSchema] = Field(...)


class EmailPayloadSchema(BaseModel):
    auth: str = Field(...)
    email: EmailStr = Field(...)
    link: str = Field(...)
    message: str = Field(...)


class WeeklyReportPayloadSchema(BaseModel):
    auth: str = Field(...)
    email: EmailStr = Field(...)
    data: dict = Field(...)


class MemberInvitationPayloadSchema(BaseModel):
    auth: str = Field(...)
    email: EmailStr = Field(...)
    invitation_link: str = Field(...)
    client_id: str = Field(...)
    sender_name: str = Field(...)

    class Config:
        alias_generator = attribute_to_camel_case


class ErrorIdsPayloadSchema(BaseModel):
    errors: List[str] = Field([])


class _AlertMessageSchema(BaseModel):
    type: str = Field(...)
    value: str = Field(...)


class _AlertOptionSchema(BaseModel):
    message: List[_AlertMessageSchema] = Field([])
    currentPeriod: int = Field(...)
    previousPeriod: int = Field(...)
    lastNotification: Optional[int] = Field(None)
    renotifyInterval: Optional[int] = Field(720)


class AlertColumn(str, Enum):
    performance__dom_content_loaded__average = "performance.dom_content_loaded.average"
    performance__first_meaningful_paint__average = "performance.first_meaningful_paint.average"
    performance__page_load_time__average = "performance.page_load_time.average"
    performance__dom_build_time__average = "performance.dom_build_time.average"
    performance__speed_index__average = "performance.speed_index.average"
    performance__page_response_time__average = "performance.page_response_time.average"
    performance__ttfb__average = "performance.ttfb.average"
    performance__time_to_render__average = "performance.time_to_render.average"
    performance__image_load_time__average = "performance.image_load_time.average"
    performance__request_load_time__average = "performance.request_load_time.average"
    resources__load_time__average = "resources.load_time.average"
    resources__missing__count = "resources.missing.count"
    errors__4xx_5xx__count = "errors.4xx_5xx.count"
    errors__4xx__count = "errors.4xx.count"
    errors__5xx__count = "errors.5xx.count"
    errors__javascript__impacted_sessions__count = "errors.javascript.impacted_sessions.count"
    performance__crashes__count = "performance.crashes.count"
    errors__javascript__count = "errors.javascript.count"
    errors__backend__count = "errors.backend.count"


class _AlertQuerySchema(BaseModel):
    left: AlertColumn = Field(...)
    right: float = Field(...)
    operator: Literal["<", ">", "<=", ">="] = Field(...)


class AlertSchema(BaseModel):
    name: str = Field(...)
    detectionMethod: str = Field(...)
    description: Optional[str] = Field(None)
    options: _AlertOptionSchema = Field(...)
    query: _AlertQuerySchema = Field(...)


class SourcemapUploadPayloadSchema(BaseModel):
    urls: List[str] = Field(..., alias="URL")


class SearchEventOperator(str, Enum):
    _is = "is"
    _is_any = "isAny"
    _on = "on"
    _on_any = "onAny"
    _isnot = "isNot"
    _noton = "notOn"
    _contains = "contains"
    _notcontains = "notContains"
    _starts_with = "startsWith"
    _ends_with = "endsWith"


class PlatformType(str, Enum):
    mobile = "mobile"
    desktop = "desktop"


class _SessionSearchEventSchema(BaseModel):
    custom: Optional[str] = Field(None)
    key: Optional[str] = Field(None)
    value: Union[Optional[str], Optional[List[str]]] = Field(...)
    type: str = Field(...)
    operator: SearchEventOperator = Field(...)
    source: Optional[str] = Field(...)


class _SessionSearchFilterSchema(_SessionSearchEventSchema):
    value: List[str] = Field(...)


class SessionsSearchPayloadSchema(BaseModel):
    events: List[_SessionSearchEventSchema] = Field([])
    filters: List[_SessionSearchFilterSchema] = Field([])
    # custom:dict=Field(...)
    # rangeValue:str=Field(...)
    startDate: int = Field(None)
    endDate: int = Field(None)
    sort: str = Field(...)
    order: str = Field(default="DESC")
    platform: Optional[PlatformType] = Field(None)


class FunnelSearchPayloadSchema(SessionsSearchPayloadSchema):
    range_value: Optional[str] = Field(None)
    sort: Optional[str] = Field(None)
    order: Optional[str] = Field(None)

    class Config:
        alias_generator = attribute_to_camel_case


class FunnelSchema(BaseModel):
    name: str = Field(...)
    filter: FunnelSearchPayloadSchema = Field([])
    is_public: bool = Field(False)

    class Config:
        alias_generator = attribute_to_camel_case


class UpdateFunnelSchema(FunnelSchema):
    name: Optional[str] = Field(None)
    filter: Optional[FunnelSearchPayloadSchema] = Field(None)
    is_public: Optional[bool] = Field(None)


class FunnelInsightsPayloadSchema(SessionsSearchPayloadSchema):
    sort: Optional[str] = Field(None)
    order: Optional[str] = Field(None)


class MetricPayloadSchema(BaseModel):
    startTimestamp: int = Field(TimeUTC.now(delta_days=-1))
    endTimestamp: int = Field(TimeUTC.now())
    density: int = Field(7)
    filters: List[dict] = Field([])
    type: Optional[str] = Field(None)

    class Config:
        alias_generator = attribute_to_camel_case


class AssistSearchPayloadSchema(BaseModel):
    filters: List[dict] = Field([])


class SentrySchema(BaseModel):
    projectSlug: str = Field(...)
    organizationSlug: str = Field(...)
    token: str = Field(...)


class MobileSignPayloadSchema(BaseModel):
    keys: List[str] = Field(...)
