from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, HttpUrl

from chalicelib.utils.TimeUTC import TimeUTC
from chalicelib.utils.helper import key_to_camel_case


class _Grecaptcha(BaseModel):
    g_recaptcha_response: Optional[str] = Field(None, alias='g-recaptcha-response')


class UserLoginSchema(_Grecaptcha):
    email: EmailStr = Field(...)
    password: str = Field(...)


class UserSignupSchema(UserLoginSchema):
    fullname: str = Field(...)
    organizationName: str = Field(...)

    class Config:
        alias_generator = key_to_camel_case


class EditUserSchema(BaseModel):
    name: str = Field(...)
    email: str = Field(...)
    admin: bool = Field(False)
    appearance: dict = Field({})


class ForgetPasswordPayloadSchema(_Grecaptcha):
    email: str = Field(...)


class EditUserPasswordSchema(BaseModel):
    old_password: str = Field(...)
    new_password: str = Field(...)


class UpdateTenantSchema(BaseModel):
    name: Optional[str] = Field(None)
    opt_out: Optional[bool] = Field(None)

    class Config:
        alias_generator = key_to_camel_case


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
    platform: Optional[str] = Field(...)
    startDate: Optional[int] = Field(TimeUTC.now(-7))
    endDate: Optional[int] = Field(TimeUTC.now())
    density: Optional[int] = Field(7)
    sort: Optional[str] = Field(None)
    order: Optional[str] = Field(None)


#     TODO: events and filters

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
    ids: Optional[List] = Field(...)
    startTimestamp: int = Field(...)
    endTimestamp: int = Field(...)


class JiraGithubSchema(BaseModel):
    provider: str = Field(...)
    username: str = Field(...)
    token: str = Field(...)
    url: str = Field(...)


class CreateEditWebhookSchema(BaseModel):
    webhookId: Optional[int] = Field(...)
    endpoint: str = Field(...)
    authHeader: Optional[str] = Field(...)
    name: Optional[str] = Field(...)


class CreateMemberSchema(BaseModel):
    userId: Optional[int] = Field(...)
    name: str = Field(...)
    email: str = Field(...)
    admin: bool = Field(False)


class EditMemberSchema(BaseModel):
    name: str = Field(...)
    email: str = Field(...)
    admin: bool = Field(False)


class EditPasswordByInvitationSchema(BaseModel):
    token: str = Field(...)
    invitation: str = Field(...)
    passphrase: str = Field(..., alias="pass")
    password: str = Field(...)


class AssignmentSchema(BaseModel):
    assignee: str = Field(...)
    description: str = Field(...)
    title: str = Field(...)
    issue_type: str = Field(...)


class CommentAssignmentSchema(BaseModel):
    message: str = Field(...)


class IntegrationNotificationSchema(BaseModel):
    comment: str = Field(...)


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
    index: Optional[int] = Field(...)
    key: str = Field(...)


class MetadataSchema(MetadataBasicSchema):
    index: int = Field(...)


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


class ErrorIdsPayloadSchema(BaseModel):
    errors: List[str] = Field([])


class _AlertMessageSchema(BaseModel):
    type: str = Field(...)
    value: str = Field(...)


class _AlertOptionSchema(BaseModel):
    message: List[_AlertMessageSchema] = Field([])
    currentPeriod: int = Field(...)
    previousPeriod: int = Field(...)
    lastNotification: Optional[int] = Field(...)
    renotifyInterval: int = Field(...)


class _AlertQuerySchema(BaseModel):
    left: float = Field(...)
    right: float = Field(...)
    operator: str = Field(...)


class AlertSchema(BaseModel):
    name: str = Field(...)
    detectionMethod: str = Field(...)
    description: Optional[str] = Field(...)
    options: _AlertOptionSchema = Field(...)
    query: _AlertQuerySchema = Field(...)


class SessionsFilterSchema(BaseModel):
    pass


class FunnelSchema(BaseModel):
    name: str = Field(...)
    filter: SessionsFilterSchema = Field([])
    is_public: bool = Field(False)


class SourcemapUploadPayloadSchema(BaseModel):
    urls: List[str] = Field(..., alias="URL")


class _SessionSearchEventSchema(BaseModel):
    value: Optional[str] = Field(...)
    type: str = Field(...)
    operator: str = Field(...)
    source: Optional[str] = Field(...)


class _SessionSearchFilterSchema(_SessionSearchEventSchema):
    value: List[str] = Field(...)


class SessionsSearchPayloadSchema(BaseModel):
    events: List[_SessionSearchEventSchema] = Field([])
    filters: List[_SessionSearchFilterSchema] = Field([])
    # custom:dict=Field(...)
    # rangeValue:str=Field(...)
    startDate: int = Field(...)
    endDate: int = Field(...)
    sort: str = Field(...)
    order: str = Field(...)


class MetricPayloadSchema(BaseModel):
    start_timestamp: int = Field(TimeUTC.now(delta_days=-1))
    end_timestamp: int = Field(TimeUTC.now())
    density: int = Field(7)
    filters: List[dict] = Field([])
