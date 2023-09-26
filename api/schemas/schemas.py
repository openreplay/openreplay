from typing import Annotated, Any
from typing import Optional, List, Union, Literal

from pydantic import Field, EmailStr, HttpUrl, SecretStr, AnyHttpUrl
from pydantic import field_validator, model_validator, computed_field

from chalicelib.utils.TimeUTC import TimeUTC
from .overrides import BaseModel, Enum
from .overrides import transform_email, remove_whitespace, remove_duplicate_values, \
    single_to_list, ORUnion


# def transform_old_FilterType(cls, values):
def transform_old_filter_type(cls, values):
    if values.get("type") is None:
        return values
    values["type"] = {
        # filters
        "USEROS": FilterType.user_os.value,
        "USERBROWSER": FilterType.user_browser.value,
        "USERDEVICE": FilterType.user_device.value,
        "USERCOUNTRY": FilterType.user_country.value,
        "USERID": FilterType.user_id.value,
        "USERANONYMOUSID": FilterType.user_anonymous_id.value,
        "REFERRER": FilterType.referrer.value,
        "REVID": FilterType.rev_id.value,
        "USEROS_IOS": FilterType.user_os_ios.value,
        "USERDEVICE_IOS": FilterType.user_device_ios.value,
        "USERCOUNTRY_IOS": FilterType.user_country_ios.value,
        "USERID_IOS": FilterType.user_id_ios.value,
        "USERANONYMOUSID_IOS": FilterType.user_anonymous_id_ios.value,
        "REVID_IOS": FilterType.rev_id_ios.value,
        "DURATION": FilterType.duration.value,
        "PLATFORM": FilterType.platform.value,
        "METADATA": FilterType.metadata.value,
        "ISSUE": FilterType.issue.value,
        "EVENTS_COUNT": FilterType.events_count.value,
        "UTM_SOURCE": FilterType.utm_source.value,
        "UTM_MEDIUM": FilterType.utm_medium.value,
        "UTM_CAMPAIGN": FilterType.utm_campaign.value,
        # events:
        "CLICK": EventType.click.value,
        "INPUT": EventType.input.value,
        "LOCATION": EventType.location.value,
        "CUSTOM": EventType.custom.value,
        "REQUEST": EventType.request.value,
        "FETCH": EventType.request_details.value,
        "GRAPHQL": EventType.graphql.value,
        "STATEACTION": EventType.state_action.value,
        "ERROR": EventType.error.value,
        "CLICK_IOS": EventType.click_ios.value,
        "INPUT_IOS": EventType.input_ios.value,
        "VIEW_IOS": EventType.view_ios.value,
        "CUSTOM_IOS": EventType.custom_ios.value,
        "REQUEST_IOS": EventType.request_ios.value,
        "ERROR_IOS": EventType.error_ios.value,
        "DOM_COMPLETE": PerformanceEventType.location_dom_complete.value,
        "LARGEST_CONTENTFUL_PAINT_TIME": PerformanceEventType.location_largest_contentful_paint_time.value,
        "TTFB": PerformanceEventType.location_ttfb.value,
        "AVG_CPU_LOAD": PerformanceEventType.location_avg_cpu_load.value,
        "AVG_MEMORY_USAGE": PerformanceEventType.location_avg_memory_usage.value,
        "FETCH_FAILED": PerformanceEventType.fetch_failed.value,
    }.get(values["type"], values["type"])
    return values


class _GRecaptcha(BaseModel):
    g_recaptcha_response: Optional[str] = Field(default=None, alias='g-recaptcha-response')


class UserLoginSchema(_GRecaptcha):
    email: EmailStr = Field(...)
    password: SecretStr = Field(...)

    _transform_email = field_validator('email', mode='before')(transform_email)


class UserSignupSchema(UserLoginSchema):
    fullname: str = Field(..., le=0)
    organizationName: str = Field(..., le=0)

    _transform_fullname = field_validator('fullname', mode='before')(remove_whitespace)
    _transform_organizationName = field_validator('organizationName', mode='before')(remove_whitespace)


class EditAccountSchema(BaseModel):
    name: Optional[str] = Field(default=None)
    tenantName: Optional[str] = Field(default=None)
    opt_out: Optional[bool] = Field(default=None)

    _transform_name = field_validator('name', mode='before')(remove_whitespace)
    _transform_tenantName = field_validator('tenantName', mode='before')(remove_whitespace)


class ForgetPasswordPayloadSchema(_GRecaptcha):
    email: EmailStr = Field(...)

    _transform_email = field_validator('email', mode='before')(transform_email)


class EditUserPasswordSchema(BaseModel):
    old_password: SecretStr = Field(...)
    new_password: SecretStr = Field(...)


# class UpdateTenantSchema(BaseModel):
#     name: Optional[str] = Field(default=None)
#     opt_out: Optional[bool] = Field(default=None)
#     tenant_name: Optional[str] = Field(default=None)


class CreateProjectSchema(BaseModel):
    name: str = Field(default="my first project")
    platform: Literal["web", "ios"] = Field(default="web")

    _transform_name = field_validator('name', mode='before')(remove_whitespace)


class CurrentAPIContext(BaseModel):
    tenant_id: int = Field(...)


class CurrentContext(CurrentAPIContext):
    user_id: int = Field(...)
    email: EmailStr = Field(...)

    _transform_email = field_validator('email', mode='before')(transform_email)


class AddCollaborationSchema(BaseModel):
    name: str = Field(...)
    url: HttpUrl = Field(...)

    _transform_name = field_validator('name', mode='before')(remove_whitespace)
    _transform_url = field_validator('url', mode='before')(remove_whitespace)


class EditCollaborationSchema(AddCollaborationSchema):
    name: Optional[str] = Field(default=None)


# class CreateNotificationSchema(BaseModel):
#     token: str = Field(...)
#     notifications: List = Field(...)


class _TimedSchema(BaseModel):
    startTimestamp: int = Field(default=None)
    endTimestamp: int = Field(default=None)

    @model_validator(mode='before')
    def transform_time(cls, values):
        if values.get("startTimestamp") is None and values.get("startDate") is not None:
            values["startTimestamp"] = values["startDate"]
        if values.get("endTimestamp") is None and values.get("endDate") is not None:
            values["endTimestamp"] = values["endDate"]
        return values

    @model_validator(mode='after')
    def __time_validator(cls, values):
        if values.startTimestamp is not None:
            assert 0 <= values.startTimestamp, "startTimestamp must be greater or equal to 0"
        if values.endTimestamp is not None:
            assert 0 <= values.endTimestamp, "endTimestamp must be greater or equal to 0"
        if values.startTimestamp is not None and values.endTimestamp is not None:
            assert values.startTimestamp <= values.endTimestamp, \
                "endTimestamp must be greater or equal to startTimestamp"
        return values


class NotificationsViewSchema(_TimedSchema):
    ids: List[int] = Field(default=[])
    startTimestamp: Optional[int] = Field(default=None)
    endTimestamp: Optional[int] = Field(default=None)


class IssueTrackingIntegration(BaseModel):
    token: str = Field(...)


class IssueTrackingGithubSchema(IssueTrackingIntegration):
    pass


class IssueTrackingJiraSchema(IssueTrackingIntegration):
    username: str = Field(...)
    url: HttpUrl = Field(...)

    @field_validator('url')
    @classmethod
    def transform_url(cls, v: HttpUrl):
        return HttpUrl.build(scheme=v.scheme.lower(), host=v.host.lower())


class WebhookSchema(BaseModel):
    webhook_id: Optional[int] = Field(default=None)
    endpoint: AnyHttpUrl = Field(...)
    auth_header: Optional[str] = Field(default=None)
    name: str = Field(default="", max_length=100)

    _transform_name = field_validator('name', mode='before')(remove_whitespace)


class CreateMemberSchema(BaseModel):
    user_id: Optional[int] = Field(default=None)
    name: str = Field(...)
    email: EmailStr = Field(...)
    admin: bool = Field(default=False)

    _transform_email = field_validator('email', mode='before')(transform_email)
    _transform_name = field_validator('name', mode='before')(remove_whitespace)


class EditMemberSchema(BaseModel):
    name: str = Field(...)
    email: EmailStr = Field(...)
    admin: bool = Field(default=False)

    _transform_email = field_validator('email', mode='before')(transform_email)
    _transform_name = field_validator('name', mode='before')(remove_whitespace)


class EditPasswordByInvitationSchema(BaseModel):
    invitation: str = Field(...)
    passphrase: str = Field(..., alias="pass")
    password: SecretStr = Field(...)


class AssignmentSchema(BaseModel):
    assignee: str = Field(...)
    description: str = Field(...)
    title: str = Field(...)
    issue_type: str = Field(...)

    _transform_title = field_validator('title', mode='before')(remove_whitespace)


class CommentAssignmentSchema(BaseModel):
    message: str = Field(...)


class IntegrationNotificationSchema(BaseModel):
    comment: Optional[str] = Field(default=None)


class GdprSchema(BaseModel):
    maskEmails: bool = Field(...)
    sampleRate: int = Field(...)
    maskNumbers: bool = Field(...)
    defaultInputMode: str = Field(...)


class SampleRateSchema(BaseModel):
    rate: int = Field(..., ge=0, le=100)
    capture_all: bool = Field(default=False)


class WeeklyReportConfigSchema(BaseModel):
    weekly_report: bool = Field(default=True)


class IntegrationBase(BaseModel):
    pass


class IntegrationSentrySchema(IntegrationBase):
    project_slug: str = Field(...)
    organization_slug: str = Field(...)
    token: str = Field(...)


class IntegrationDatadogSchema(IntegrationBase):
    api_key: str = Field(...)
    application_key: str = Field(...)


class IntegartionStackdriverSchema(IntegrationBase):
    service_account_credentials: str = Field(...)
    log_name: str = Field(...)


class IntegrationNewrelicSchema(IntegrationBase):
    application_id: str = Field(...)
    x_query_key: str = Field(...)
    region: str = Field(...)


class IntegrationRollbarSchema(IntegrationBase):
    access_token: str = Field(...)


class IntegrationBugsnagBasicSchema(IntegrationBase):
    authorization_token: str = Field(...)


class IntegrationBugsnagSchema(IntegrationBugsnagBasicSchema):
    bugsnag_project_id: str = Field(...)


class IntegrationCloudwatchBasicSchema(IntegrationBase):
    aws_access_key_id: str = Field(...)
    aws_secret_access_key: str = Field(...)
    region: str = Field(...)


class IntegrationCloudwatchSchema(IntegrationCloudwatchBasicSchema):
    log_group_name: str = Field(...)


class IntegrationElasticsearchTestSchema(IntegrationBase):
    host: str = Field(...)
    port: int = Field(...)
    api_key_id: str = Field(...)
    api_key: str = Field(...)


class IntegrationElasticsearchSchema(IntegrationElasticsearchTestSchema):
    indexes: str = Field(...)


class IntegrationSumologicSchema(IntegrationBase):
    access_id: str = Field(...)
    access_key: str = Field(...)
    region: str = Field(...)


class MetadataSchema(BaseModel):
    index: Optional[int] = Field(default=None)
    key: str = Field(...)

    _transform_key = field_validator('key', mode='before')(remove_whitespace)


# class MetadataListSchema(BaseModel):
#     list: List[MetadataSchema] = Field(...)


class EmailPayloadSchema(BaseModel):
    auth: str = Field(...)
    email: EmailStr = Field(...)
    link: str = Field(...)
    message: str = Field(...)

    _transform_email = field_validator('email', mode='before')(transform_email)


class MemberInvitationPayloadSchema(BaseModel):
    auth: str = Field(...)
    email: EmailStr = Field(...)
    invitation_link: str = Field(...)
    client_id: str = Field(...)
    sender_name: str = Field(...)

    _transform_email = field_validator('email', mode='before')(transform_email)


class _AlertMessageSchema(BaseModel):
    type: str = Field(...)
    value: str = Field(...)


class AlertDetectionType(str, Enum):
    percent = "percent"
    change = "change"


class _AlertOptionSchema(BaseModel):
    message: List[_AlertMessageSchema] = Field([])
    currentPeriod: Literal[15, 30, 60, 120, 240, 1440] = Field(...)
    previousPeriod: Literal[15, 30, 60, 120, 240, 1440] = Field(default=15)
    lastNotification: Optional[int] = Field(default=None)
    renotifyInterval: Optional[int] = Field(default=720)


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
    custom = "CUSTOM"


class MathOperator(str, Enum):
    _equal = "="
    _less = "<"
    _greater = ">"
    _less_eq = "<="
    _greater_eq = ">="


class _AlertQuerySchema(BaseModel):
    left: Union[AlertColumn, int] = Field(...)
    right: float = Field(...)
    operator: MathOperator = Field(...)


class AlertDetectionMethod(str, Enum):
    threshold = "threshold"
    change = "change"


class AlertSchema(BaseModel):
    name: str = Field(...)
    detection_method: AlertDetectionMethod = Field(...)
    change: Optional[AlertDetectionType] = Field(default=AlertDetectionType.change)
    description: Optional[str] = Field(default=None)
    options: _AlertOptionSchema = Field(...)
    query: _AlertQuerySchema = Field(...)
    series_id: Optional[int] = Field(default=None, doc_hidden=True)

    @model_validator(mode="after")
    def transform_alert(cls, values):
        values.series_id = None
        if isinstance(values.query.left, int):
            values.series_id = values.query.left
            values.query.left = AlertColumn.custom

        return values


class SourcemapUploadPayloadSchema(BaseModel):
    urls: List[str] = Field(..., alias="URL")


class ErrorSource(str, Enum):
    js_exception = "js_exception"
    bugsnag = "bugsnag"
    cloudwatch = "cloudwatch"
    datadog = "datadog"
    newrelic = "newrelic"
    rollbar = "rollbar"
    sentry = "sentry"
    stackdriver = "stackdriver"
    sumologic = "sumologic"


class EventType(str, Enum):
    click = "click"
    input = "input"
    location = "location"
    custom = "custom"
    request = "request"
    request_details = "fetch"
    graphql = "graphql"
    state_action = "stateAction"
    error = "error"
    click_ios = "tapIos"
    input_ios = "inputIos"
    view_ios = "viewIos"
    custom_ios = "customIos"
    request_ios = "requestIos"
    error_ios = "errorIos"
    swipe_ios = "swipeIos"


class PerformanceEventType(str, Enum):
    location_dom_complete = "domComplete"
    location_largest_contentful_paint_time = "largestContentfulPaintTime"
    location_ttfb = "ttfb"
    location_avg_cpu_load = "avgCpuLoad"
    location_avg_memory_usage = "avgMemoryUsage"
    fetch_failed = "fetchFailed"
    # fetch_duration = "FETCH_DURATION"


class FilterType(str, Enum):
    user_os = "userOs"
    user_browser = "userBrowser"
    user_device = "userDevice"
    user_country = "userCountry"
    user_city = "userCity"
    user_state = "userState"
    user_id = "userId"
    user_anonymous_id = "userAnonymousId"
    referrer = "referrer"
    rev_id = "revId"
    # IOS
    user_os_ios = "userOsIos"
    user_device_ios = "userDeviceIos"
    user_country_ios = "userCountryIos"
    user_id_ios = "userIdIos"
    user_anonymous_id_ios = "userAnonymousIdIos"
    rev_id_ios = "revIdIos"
    #
    duration = "duration"
    platform = "platform"
    metadata = "metadata"
    issue = "issue"
    events_count = "eventsCount"
    utm_source = "utmSource"
    utm_medium = "utmMedium"
    utm_campaign = "utmCampaign"


class SearchEventOperator(str, Enum):
    _is = "is"
    _is_any = "isAny"
    _on = "on"
    _on_any = "onAny"
    _is_not = "isNot"
    _is_undefined = "isUndefined"
    _not_on = "notOn"
    _contains = "contains"
    _not_contains = "notContains"
    _starts_with = "startsWith"
    _ends_with = "endsWith"


class ClickEventExtraOperator(str, Enum):
    _on_selector = "onSelector"


class PlatformType(str, Enum):
    mobile = "mobile"
    desktop = "desktop"
    tablet = "tablet"


class SearchEventOrder(str, Enum):
    _then = "then"
    _or = "or"
    _and = "and"


class IssueType(str, Enum):
    click_rage = 'click_rage'
    dead_click = 'dead_click'
    excessive_scrolling = 'excessive_scrolling'
    bad_request = 'bad_request'
    missing_resource = 'missing_resource'
    memory = 'memory'
    cpu = 'cpu'
    slow_resource = 'slow_resource'
    slow_page_load = 'slow_page_load'
    crash = 'crash'
    custom = 'custom'
    js_exception = 'js_exception'
    mouse_thrashing = 'mouse_thrashing'
    # IOS
    tap_rage = 'tap_rage'


class MetricFormatType(str, Enum):
    session_count = 'sessionCount'


class HttpMethod(str, Enum):
    _get = 'GET'
    _head = 'HEAD'
    _post = 'POST'
    _put = 'PUT'
    _delete = 'DELETE'
    _connect = 'CONNECT'
    _option = 'OPTIONS'
    _trace = 'TRACE'
    _patch = 'PATCH'


class FetchFilterType(str, Enum):
    _url = "fetchUrl"  # FETCH_URL
    _status_code = "fetchStatusCode"  # FETCH_STATUS_CODE
    _method = "fetchMethod"  # FETCH_METHOD
    _duration = "fetchDuration"  # FETCH_DURATION
    _request_body = "fetchRequestBody"  # FETCH_REQUEST_BODY
    _response_body = "fetchResponseBody"  # FETCH_RESPONSE_BODY


class GraphqlFilterType(str, Enum):
    _name = "graphqlName"  # GRAPHQL_NAME
    _method = "graphqlMethod"  # GRAPHQL_METHOD
    _request_body = "graphqlRequestBody"  # GRAPHQL_REQUEST_BODY
    _response_body = "graphqlResponseBody"  # GRAPHQL_RESPONSE_BODY


class RequestGraphqlFilterSchema(BaseModel):
    type: Union[FetchFilterType, GraphqlFilterType] = Field(...)
    value: List[Union[int, str]] = Field(...)
    operator: Union[SearchEventOperator, MathOperator] = Field(...)


# class SessionSearchEventRaw(BaseModel):
class SessionSearchEventSchema2(BaseModel):
    # is_event: bool = Field(default=True, const=True)
    is_event: Literal[True] = True
    value: List[str] = Field(...)
    type: Union[EventType, PerformanceEventType] = Field(...)
    operator: Union[SearchEventOperator, ClickEventExtraOperator] = Field(...)
    source: Optional[List[Union[ErrorSource, int, str]]] = Field(default=None)
    sourceOperator: Optional[MathOperator] = Field(default=None)
    filters: Optional[List[RequestGraphqlFilterSchema]] = Field(default=[])

    _remove_duplicate_values = field_validator('value', mode='before')(remove_duplicate_values)
    _single_to_list_values = field_validator('value', mode='before')(single_to_list)
    _transform = model_validator(mode='before')(transform_old_filter_type)

    @model_validator(mode='after')
    def event_validator(cls, values):
        if isinstance(values.type, PerformanceEventType):
            if values.type == PerformanceEventType.fetch_failed:
                return values
            # assert values.get("source") is not None, "source should not be null for PerformanceEventType"
            # assert isinstance(values["source"], list) and len(values["source"]) > 0, \
            #     "source should not be empty for PerformanceEventType"
            assert values.sourceOperator is not None, \
                "sourceOperator should not be null for PerformanceEventType"
            assert "source" in values, f"source is required for {values.type}"
            assert isinstance(values.source, list), f"source of type list is required for {values.type}"
            for c in values["source"]:
                assert isinstance(c, int), f"source value should be of type int for {values.type}"
        elif values.type == EventType.error and values.source is None:
            values.source = [ErrorSource.js_exception]
        elif values.type == EventType.request_details:
            assert isinstance(values.filters, List) and len(values.filters) > 0, \
                f"filters should be defined for {EventType.request_details}"
        elif values.type == EventType.graphql:
            assert isinstance(values.filters, List) and len(values.filters) > 0, \
                f"filters should be defined for {EventType.graphql}"

        if isinstance(values.operator, ClickEventExtraOperator):
            assert values.type == EventType.click, \
                f"operator:{values.operator} is only available for event-type: {EventType.click}"
        return values


# class _SessionSearchEventSchema(SessionSearchEventRaw):
#     value: Union[List[Union[SessionSearchEventRaw, str]], str] = Field(...)
class SessionSearchFilterSchema(BaseModel):
    # class SessionSearchFilterSchema(ORBaseModel):
    # is_event: bool = Field(False, const=False)
    is_event: Literal[False] = False
    value: List[Union[IssueType, PlatformType, int, str]] = Field(default=[])
    type: FilterType = Field(...)
    operator: Union[SearchEventOperator, MathOperator] = Field(...)
    source: Optional[Union[ErrorSource, str]] = Field(default=None)

    _remove_duplicate_values = field_validator('value', mode='before')(remove_duplicate_values)
    _transform = model_validator(mode='before')(transform_old_filter_type)
    _single_to_list_values = field_validator('value', mode='before')(single_to_list)

    @model_validator(mode='after')
    def filter_validator(cls, values):
        if values.type == FilterType.metadata:
            assert values.source is not None and len(values.source) > 0, \
                "must specify a valid 'source' for metadata filter"
        elif values.type == FilterType.issue:
            for v in values.value:
                # assert isinstance(v, IssueType), f"value should be of type IssueType for {values.type} filter"
                if IssueType.has_value(v):
                    v = IssueType(v)
                else:
                    raise ValueError(f"value should be of type IssueType for {values.type} filter")
        elif values.type == FilterType.platform:
            for v in values.value:
                # assert isinstance(v, PlatformType), f"value should be of type PlatformType for {values.type} filter"
                if PlatformType.has_value(v):
                    v = PlatformType(v)
                else:
                    raise ValueError(f"value should be of type PlatformType for {values.type} filter")
        elif values.type == FilterType.events_count:
            # assert isinstance(values.operator, MathOperator), \
            #     f"operator should be of type MathOperator for {values.type} filter"
            if values.operator in MathOperator.has_value(values.operator):
                values.operator = MathOperator(values.operator)
            else:
                raise ValueError(f"operator should be of type MathOperator for {values.type} filter")

            for v in values.value:
                assert isinstance(v, int), f"value should be of type int for {values.type} filter"
        else:
            # assert isinstance(values.operator, SearchEventOperator), \
            #     f"operator should be of type SearchEventOperator for {values.type} filter"
            if SearchEventOperator.has_value(values.operator):
                values.operator = SearchEventOperator(values.operator)
            else:
                raise ValueError(f"operator should be of type SearchEventOperator for {values.type} filter")

        return values


class _PaginatedSchema(BaseModel):
    limit: int = Field(default=200, gt=0, le=200)
    page: int = Field(default=1, gt=0)


class SortOrderType(str, Enum):
    asc = "ASC"
    desc = "DESC"


# this type is created to allow mixing events&filters and specifying a discriminator
GroupedFilterType = Annotated[Union[SessionSearchFilterSchema, SessionSearchEventSchema2], \
    Field(discriminator='is_event')]


class SessionsSearchPayloadSchema(_TimedSchema, _PaginatedSchema):
    events: List[SessionSearchEventSchema2] = Field(default=[], doc_hidden=True)
    filters: List[GroupedFilterType] = Field(default=[])
    sort: str = Field(default="startTs")
    order: SortOrderType = Field(default=SortOrderType.desc)
    events_order: Optional[SearchEventOrder] = Field(default=SearchEventOrder._then)
    group_by_user: bool = Field(default=False)
    bookmarked: bool = Field(default=False)

    @model_validator(mode="before")
    def transform_order(cls, values):
        if values.get("sort") is None:
            values["sort"] = "startTs"

        if values.get("order") is None:
            values["order"] = SortOrderType.desc
        else:
            values["order"] = values["order"].upper()
        return values

    @model_validator(mode="before")
    def add_missing_attributes(cls, values):
        # in case the old search body was passed
        if len(values.get("events", [])) > 0:
            for v in values["events"]:
                v["isEvent"] = True
            for v in values.get("filters", []):
                v["isEvent"] = False
        else:
            for v in values.get("filters", []):
                if v.get("isEvent") is None:
                    v["isEvent"] = False
        return values

    @model_validator(mode="after")
    def split_filters_events(cls, values):
        # in case the old search body was passed
        n_filters = []
        n_events = []
        for v in values.filters:
            if v.is_event:
                n_events.append(v)
            else:
                n_filters.append(v)
        values.events = n_events
        values.filters = n_filters
        return values


# class FlatSessionsSearch(BaseModel):
#     events: Optional[List[_SessionSearchEventSchema]] = Field([])
#     filters: List[Union[SessionSearchFilterSchema, _SessionSearchEventSchema]] = Field([])
#
#     @root_validator(pre=True)
#     def flat_to_original(cls, values):
#         # in case the old search body was passed
#         if len(values.get("events", [])) > 0:
#             for v in values["events"]:
#                 v["isEvent"] = True
#             for v in values.get("filters", []):
#                 v["isEvent"] = False
#         else:
#             n_filters = []
#             n_events = []
#             for v in values.get("filters", []):
#                 if v.get("isEvent"):
#                     n_events.append(v)
#                 else:
#                     v["isEvent"] = False
#                     n_filters.append(v)
#             values["events"] = n_events
#             values["filters"] = n_filters
#         return values


# class SessionsSearchCountSchema(FlatSessionsSearchPayloadSchema):
#     # class SessionsSearchCountSchema(SessionsSearchPayloadSchema):
#     sort: Optional[str] = Field(default=None)
#     order: Optional[str] = Field(default=None)

#
# # class FunnelSearchPayloadSchema(FlatSessionsSearchPayloadSchema):
# class FunnelSearchPayloadSchema(SessionsSearchPayloadSchema):
#     range_value: Optional[str] = Field(default=None)
#     sort: Optional[str] = Field(default=None)
#     order: Optional[str] = Field(default=None)
#     events_order: Literal[SearchEventOrder._then] = SearchEventOrder._then
#     group_by_user: Literal[False] = False
#
#     @model_validator(mode="before")
#     def __enforce_default_values(cls, values):
#         values["eventsOrder"] = SearchEventOrder._then
#         values["groupByUser"] = False
#         return values


#
# class FunnelSchema(BaseModel):
#     name: str = Field(...)
#     filter: FunnelSearchPayloadSchema = Field([])


#
# # class FunnelInsightsPayloadSchema(FlatSessionsSearchPayloadSchema):
# class FunnelInsightsPayloadSchema(SessionsSearchPayloadSchema):
#     sort: Optional[str] = Field(None)
#     order: Optional[str] = Field(None)
#     events_order: Optional[SearchEventOrder] = Field(default=SearchEventOrder._then, const=True)
#     group_by_user: Optional[bool] = Field(default=False, const=True)
#     rangeValue: Optional[str] = Field(None)
#

class ErrorStatus(str, Enum):
    all = 'all'
    unresolved = 'unresolved'
    resolved = 'resolved'
    ignored = 'ignored'


class ErrorSort(str, Enum):
    occurrence = 'occurrence'
    users_count = 'users'
    sessions_count = 'sessions'


# class SearchErrorsSchema(FlatSessionsSearchPayloadSchema):
class SearchErrorsSchema(SessionsSearchPayloadSchema):
    sort: ErrorSort = Field(default=ErrorSort.occurrence)
    density: Optional[int] = Field(default=7)
    status: Optional[ErrorStatus] = Field(default=ErrorStatus.all)
    query: Optional[str] = Field(default=None)


class ProductAnalyticsSelectedEventType(str, Enum):
    click = EventType.click.value
    input = EventType.input.value
    location = EventType.location.value
    custom_event = EventType.custom.value


class ProductAnalyticsFilterType(str, Enum):
    start_point = 'startPoint'
    end_point = 'endPoint'
    exclude = 'exclude'


class PathAnalysisSubFilterSchema(BaseModel):
    is_event: Literal[True] = True
    value: List[str] = Field(...)
    type: ProductAnalyticsSelectedEventType = Field(...)
    operator: Union[SearchEventOperator, ClickEventExtraOperator] = Field(...)

    _remove_duplicate_values = field_validator('value', mode='before')(remove_duplicate_values)


class ProductAnalyticsFilter(BaseModel):
    type: FilterType
    operator: Union[SearchEventOperator, ClickEventExtraOperator, MathOperator] = Field(...)
    # TODO: support session metadat filters
    value: List[Union[IssueType, PlatformType, int, str]] = Field(...)

    _remove_duplicate_values = field_validator('value', mode='before')(remove_duplicate_values)


class PathAnalysisSchema(_TimedSchema, _PaginatedSchema):
    density: int = Field(default=7)
    filters: List[ProductAnalyticsFilter] = Field(default=[])
    type: Optional[str] = Field(default=None)


class MobileSignPayloadSchema(BaseModel):
    keys: List[str] = Field(...)


class CardSeriesFilterSchema(SearchErrorsSchema):
    sort: Optional[str] = Field(default=None)
    order: SortOrderType = Field(default=SortOrderType.desc)
    group_by_user: Literal[False] = False


class CardSeriesSchema(BaseModel):
    series_id: Optional[int] = Field(default=None)
    name: Optional[str] = Field(default=None)
    index: Optional[int] = Field(default=None)
    filter: Optional[CardSeriesFilterSchema] = Field(default=None)


class MetricTimeseriesViewType(str, Enum):
    line_chart = "lineChart"
    progress = "progress"
    area_chart = "areaChart"


class MetricTableViewType(str, Enum):
    table = "table"
    pie_chart = "pieChart"


class MetricOtherViewType(str, Enum):
    other_chart = "chart"
    list_chart = "list"


class MetricType(str, Enum):
    timeseries = "timeseries"
    table = "table"
    funnel = "funnel"
    errors = "errors"
    performance = "performance"
    resources = "resources"
    web_vital = "webVitals"
    pathAnalysis = "pathAnalysis"
    retention = "retention"
    stickiness = "stickiness"
    click_map = "clickMap"
    insights = "insights"


class MetricOfErrors(str, Enum):
    calls_errors = "callsErrors"  # calls_errors
    domains_errors_4xx = "domainsErrors4xx"  # domains_errors_4xx
    domains_errors_5xx = "domainsErrors5xx"  # domains_errors_5xx
    errors_per_domains = "errorsPerDomains"  # errors_per_domains
    errors_per_type = "errorsPerType"  # errors_per_type
    impacted_sessions_by_js_errors = "impactedSessionsByJsErrors"  # impacted_sessions_by_js_errors
    resources_by_party = "resourcesByParty"  # resources_by_party


class MetricOfPerformance(str, Enum):
    cpu = "cpu"  # cpu
    crashes = "crashes"  # crashes
    fps = "fps"  # fps
    impacted_sessions_by_slow_pages = "impactedSessionsBySlowPages"  # impacted_sessions_by_slow_pages
    memory_consumption = "memoryConsumption"  # memory_consumption
    pages_dom_buildtime = "pagesDomBuildtime"  # pages_dom_buildtime
    pages_response_time = "pagesResponseTime"  # pages_response_time
    pages_response_time_distribution = "pagesResponseTimeDistribution"  # pages_response_time_distribution
    resources_vs_visually_complete = "resourcesVsVisuallyComplete"  # resources_vs_visually_complete
    sessions_per_browser = "sessionsPerBrowser"  # sessions_per_browser
    slowest_domains = "slowestDomains"  # slowest_domains
    speed_location = "speedLocation"  # speed_location
    time_to_render = "timeToRender"  # time_to_render


class MetricOfResources(str, Enum):
    missing_resources = "missingResources"  # missing_resources
    resources_count_by_type = "resourcesCountByType"  # resources_count_by_type
    resources_loading_time = "resourcesLoadingTime"  # resources_loading_time
    resource_type_vs_response_end = "resourceTypeVsResponseEnd"  # resource_type_vs_response_end
    slowest_resources = "slowestResources"  # slowest_resources


class MetricOfWebVitals(str, Enum):
    avg_cpu = "avgCpu"  # avg_cpu
    avg_dom_content_loaded = "avgDomContentLoaded"  # avg_dom_content_loaded
    avg_dom_content_load_start = "avgDomContentLoadStart"  # avg_dom_content_load_start
    avg_first_contentful_pixel = "avgFirstContentfulPixel"  # avg_first_contentful_pixel
    avg_first_paint = "avgFirstPaint"  # avg_first_paint
    avg_fps = "avgFps"  # avg_fps
    avg_image_load_time = "avgImageLoadTime"  # avg_image_load_time
    avg_page_load_time = "avgPageLoadTime"  # avg_page_load_time
    avg_pages_dom_buildtime = "avgPagesDomBuildtime"  # avg_pages_dom_buildtime
    avg_pages_response_time = "avgPagesResponseTime"  # avg_pages_response_time
    avg_request_load_time = "avgRequestLoadTime"  # avg_request_load_time
    avg_response_time = "avgResponseTime"  # avg_response_time
    avg_session_duration = "avgSessionDuration"  # avg_session_duration
    avg_till_first_byte = "avgTillFirstByte"  # avg_till_first_byte
    avg_time_to_interactive = "avgTimeToInteractive"  # avg_time_to_interactive
    avg_time_to_render = "avgTimeToRender"  # avg_time_to_render
    avg_used_js_heap_size = "avgUsedJsHeapSize"  # avg_used_js_heap_size
    avg_visited_pages = "avgVisitedPages"  # avg_visited_pages
    count_requests = "countRequests"  # count_requests
    count_sessions = "countSessions"  # count_sessions


class MetricOfTable(str, Enum):
    user_os = FilterType.user_os.value
    user_browser = FilterType.user_browser.value
    user_device = FilterType.user_device.value
    user_country = FilterType.user_country.value
    # user_city = FilterType.user_city.value
    # user_state = FilterType.user_state.value
    user_id = FilterType.user_id.value
    issues = FilterType.issue.value
    visited_url = "location"
    sessions = "sessions"
    errors = "jsException"


class MetricOfTimeseries(str, Enum):
    session_count = "sessionCount"


class MetricOfFunnels(str, Enum):
    session_count = MetricOfTimeseries.session_count.value


class MetricOfClickMap(str, Enum):
    click_map_url = "clickMapUrl"


class MetricOfPathAnalysis(str, Enum):
    session_count = MetricOfTimeseries.session_count.value


# class CardSessionsSchema(FlatSessionsSearch, _PaginatedSchema, _TimedSchema):
class CardSessionsSchema(SessionsSearchPayloadSchema):
    startTimestamp: int = Field(default=TimeUTC.now(-7))
    endTimestamp: int = Field(defautl=TimeUTC.now())
    density: int = Field(default=7, ge=1, le=200)
    series: List[CardSeriesSchema] = Field(default=[])

    # Used mainly for PathAnalysis, and could be used by other cards
    hide_excess: Optional[bool] = Field(default=False, description="Hide extra values")

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        if values.get("startTimestamp") is None:
            values["startTimestamp"] = TimeUTC.now(-7)

        if values.get("endTimestamp") is None:
            values["endTimestamp"] = TimeUTC.now()

        for s in values.get("series", []):
            if s.get("filter") is not None:
                s["filter"]["startTimestamp"] = values["startTimestamp"]
                s["filter"]["endTimestamp"] = values["endTimestamp"]

        return values

    @model_validator(mode="after")
    def __enforce_default_after(cls, values):
        for s in values.series:
            if s.filter is not None:
                s.filter.limit = values.limit
                s.filter.page = values.page

        return values


#
#
# class CardChartSchema(CardSessionsSchema):
#     density: int = Field(default=7)


class CardConfigSchema(BaseModel):
    col: Optional[int] = Field(default=None)
    row: Optional[int] = Field(default=2)
    position: Optional[int] = Field(default=0)


# class CardSchema(CardChartSchema):
class __CardSchema(CardSessionsSchema):
    name: Optional[str] = Field(default=None)
    is_public: bool = Field(default=True)
    default_config: CardConfigSchema = Field(default=CardConfigSchema(), alias="config")
    thumbnail: Optional[str] = Field(default=None)
    metric_format: Optional[MetricFormatType] = Field(default=None)

    # view_type: Union[MetricTimeseriesViewType, \
    #     MetricTableViewType, MetricOtherViewType] = Field(...)
    view_type: Any
    metric_type: MetricType = Field(...)
    # metric_of: Union[MetricOfTimeseries, MetricOfTable, MetricOfErrors, \
    #     MetricOfPerformance, MetricOfResources, MetricOfWebVitals, \
    #     MetricOfClickMap] = Field(default=MetricOfTable.user_id)
    metric_of: Any
    metric_value: List[IssueType] = Field(default=[])

    @computed_field
    @property
    def is_template(self) -> bool:
        return self.metric_type in [MetricType.errors, MetricType.performance,
                                    MetricType.resources, MetricType.web_vital]

    # TODO: finish the reset of these conditions
    # @model_validator(mode='after')
    # def __validator(cls, values):
    #     if values.metric_type == MetricType.click_map:
    #         # assert isinstance(values.metric_of, MetricOfClickMap), \
    #         #     f"metricOf must be of type {MetricOfClickMap} for metricType:{MetricType.click_map}"
    #         for s in values.series:
    #             for f in s.filter.events:
    #                 assert f.type == EventType.location, f"only events of type:{EventType.location} are allowed for metricOf:{MetricType.click_map}"
    #     return values


class CardTimeSeries(__CardSchema):
    metric_type: Literal[MetricType.timeseries]
    metric_of: MetricOfTimeseries = Field(default=MetricOfTimeseries.session_count)
    view_type: MetricTimeseriesViewType

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        values["metricValue"] = []
        return values

    @model_validator(mode="after")
    def __transform(cls, values):
        values.metric_of = MetricOfTimeseries(values.metric_of)
        return values


class CardTable(__CardSchema):
    metric_type: Literal[MetricType.table]
    metric_of: MetricOfTable = Field(default=MetricOfTable.user_id)
    view_type: MetricTableViewType = Field(...)

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        if values.get("metricOf") is not None and values.get("metricOf") != MetricOfTable.issues:
            values["metricValue"] = []
        return values

    @model_validator(mode="after")
    def __transform(cls, values):
        values.metric_of = MetricOfTable(values.metric_of)
        return values


class CardFunnel(__CardSchema):
    metric_type: Literal[MetricType.funnel]
    metric_of: MetricOfFunnels = Field(default=MetricOfFunnels.session_count)
    view_type: MetricOtherViewType = Field(...)

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        values["metricOf"] = MetricOfFunnels.session_count
        values["viewType"] = MetricOtherViewType.other_chart
        if values.get("series") is not None and len(values["series"]) > 0:
            values["series"] = [values["series"][0]]
        return values

    @model_validator(mode="after")
    def __transform(cls, values):
        values.metric_of = MetricOfTimeseries(values.metric_of)
        return values


class CardErrors(__CardSchema):
    metric_type: Literal[MetricType.errors]
    metric_of: MetricOfErrors = Field(default=MetricOfErrors.impacted_sessions_by_js_errors)
    view_type: MetricOtherViewType = Field(...)

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        values["series"] = []
        return values

    @model_validator(mode="after")
    def __transform(cls, values):
        values.metric_of = MetricOfErrors(values.metric_of)
        return values


class CardPerformance(__CardSchema):
    metric_type: Literal[MetricType.performance]
    metric_of: MetricOfPerformance = Field(default=MetricOfPerformance.cpu)
    view_type: MetricOtherViewType = Field(...)

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        values["series"] = []
        return values

    @model_validator(mode="after")
    def __transform(cls, values):
        values.metric_of = MetricOfPerformance(values.metric_of)
        return values


class CardResources(__CardSchema):
    metric_type: Literal[MetricType.resources]
    metric_of: MetricOfResources = Field(default=MetricOfResources.missing_resources)
    view_type: MetricOtherViewType = Field(...)

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        values["series"] = []
        return values

    @model_validator(mode="after")
    def __transform(cls, values):
        values.metric_of = MetricOfResources(values.metric_of)
        return values


class CardWebVital(__CardSchema):
    metric_type: Literal[MetricType.web_vital]
    metric_of: MetricOfWebVitals = Field(default=MetricOfWebVitals.avg_cpu)
    view_type: MetricOtherViewType = Field(...)

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        values["series"] = []
        return values

    @model_validator(mode="after")
    def __transform(cls, values):
        values.metric_of = MetricOfWebVitals(values.metric_of)
        return values


class CardClickMap(__CardSchema):
    metric_type: Literal[MetricType.click_map]
    metric_of: MetricOfClickMap = Field(default=MetricOfClickMap.click_map_url)
    view_type: MetricOtherViewType = Field(...)

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        return values

    @model_validator(mode="after")
    def __transform(cls, values):
        values.metric_of = MetricOfClickMap(values.metric_of)
        return values


class MetricOfInsights(str, Enum):
    issue_categories = "issueCategories"


class CardInsights(__CardSchema):
    metric_type: Literal[MetricType.insights]
    metric_of: MetricOfInsights = Field(default=MetricOfInsights.issue_categories)
    view_type: MetricOtherViewType = Field(...)

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        values["view_type"] = MetricOtherViewType.list_chart
        return values

    @model_validator(mode="after")
    def __transform(cls, values):
        values.metric_of = MetricOtherViewType(values.metric_of)
        return values

    @model_validator(mode='after')
    def restrictions(cls, values):
        raise ValueError(f"metricType:{MetricType.insights} not supported yet.")


# class CardPathAnalysisSchema(BaseModel):
class CardPathAnalysisSchema(CardSessionsSchema):
    filter: PathAnalysisSchema = Field(...)
    density: int = Field(default=4, ge=2, le=10)

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        if values.get("filter") is None and values.get("startTimestamp") and values.get("endTimestamp"):
            values["filter"] = PathAnalysisSchema(startTimestamp=values["startTimestamp"],
                                                  endTimestamp=values["endTimestamp"],
                                                  density=values["density"])
        return values


class CardPathAnalysis(__CardSchema):
    metric_type: Literal[MetricType.pathAnalysis]
    metric_of: MetricOfPathAnalysis = Field(default=MetricOfPathAnalysis.session_count)
    view_type: MetricOtherViewType = Field(...)
    metric_value: List[ProductAnalyticsSelectedEventType] = Field(default=[ProductAnalyticsSelectedEventType.location])
    density: int = Field(default=4, ge=2, le=10)

    start_type: Literal["start", "end"] = Field(default="start")
    start_point: List[PathAnalysisSubFilterSchema] = Field(default=[])
    exclude: List[PathAnalysisSubFilterSchema] = Field(default=[])

    series: List[CardPathAnalysisSchema] = Field(default=[])

    @model_validator(mode="before")
    def __enforce_default(cls, values):
        values["viewType"] = MetricOtherViewType.other_chart.value
        if values.get("series") is not None and len(values["series"]) > 0:
            values["series"] = [values["series"][0]]
        return values

    @model_validator(mode="after")
    def __enforce_metric_value(cls, values):
        metric_value = []
        for s in values.start_point:
            metric_value.append(s.type)

        if len(metric_value) > 0:
            metric_value = remove_duplicate_values(metric_value)
            values.metric_value = metric_value

        return values

    # @model_validator(mode="after")
    # def __transform(cls, values):
    #     # values.metric_of = MetricOfClickMap(values.metric_of)
    #     return values
    @model_validator(mode='after')
    def __validator(cls, values):
        # Path analysis should have only 1 start-point with multiple values OR 1 end-point with multiple values
        # start-point's value and end-point's value should not be excluded

        s_e_values = {}
        exclude_values = {}
        for f in values.start_point:
            s_e_values[f.type] = s_e_values.get(f.type, []) + f.value

        for f in values.exclude:
            exclude_values[f.type] = exclude_values.get(f.type, []) + f.value

        assert len(
            values.start_point) <= 1, f"Only 1 startPoint with multiple values OR 1 endPoint with multiple values is allowed"
        for t in exclude_values:
            for v in t:
                assert v not in s_e_values.get(t, []), f"startPoint and endPoint cannot be excluded, value: {v}"

        return values


# Union of cards-schemas that doesn't change between FOSS and EE
__cards_union_base = Union[
    CardTimeSeries, CardTable, CardFunnel,
    CardErrors, CardPerformance, CardResources,
    CardWebVital, CardClickMap,
    CardPathAnalysis]
CardSchema = ORUnion(Union[__cards_union_base, CardInsights], discriminator='metric_type')


# class UpdateCustomMetricsStatusSchema(BaseModel):
class UpdateCardStatusSchema(BaseModel):
    active: bool = Field(...)


class SavedSearchSchema(BaseModel):
    name: str = Field(...)
    is_public: bool = Field(default=False)
    filter: SessionsSearchPayloadSchema = Field([])


class CreateDashboardSchema(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = Field(default='')
    is_public: bool = Field(default=False)
    is_pinned: bool = Field(default=False)
    metrics: Optional[List[int]] = Field(default=[])


class EditDashboardSchema(CreateDashboardSchema):
    is_public: Optional[bool] = Field(default=None)
    is_pinned: Optional[bool] = Field(default=None)


class UpdateWidgetPayloadSchema(BaseModel):
    config: dict = Field(default={})


class AddWidgetToDashboardPayloadSchema(UpdateWidgetPayloadSchema):
    metric_id: int = Field(...)


class TemplatePredefinedUnits(str, Enum):
    millisecond = "ms"
    second = "s"
    minute = "min"
    memory = "mb"
    frame = "f/s"
    percentage = "%"
    count = "count"


class LiveFilterType(str, Enum):
    user_os = FilterType.user_os.value
    user_browser = FilterType.user_browser.value
    user_device = FilterType.user_device.value
    user_country = FilterType.user_country.value
    user_id = FilterType.user_id.value
    user_anonymous_id = FilterType.user_anonymous_id.value
    rev_id = FilterType.rev_id.value
    platform = FilterType.platform.value
    page_title = "pageTitle"
    session_id = "sessionId"
    metadata = FilterType.metadata.value
    user_UUID = "userUuid"
    tracker_version = "trackerVersion"
    user_browser_version = "userBrowserVersion"
    user_device_type = "userDeviceType"


class LiveSessionSearchFilterSchema(BaseModel):
    value: Union[List[str], str] = Field(...)
    type: LiveFilterType = Field(...)
    source: Optional[str] = Field(default=None)
    operator: Literal[SearchEventOperator._is, \
        SearchEventOperator._contains] = Field(default=SearchEventOperator._contains)

    transform = model_validator(mode='before')(transform_old_filter_type)

    @model_validator(mode='after')
    def __validator(cls, values):
        if values.type is not None and values.type == LiveFilterType.metadata:
            assert values.source is not None, "source should not be null for METADATA type"
            assert len(values.source) > 0, "source should not be empty for METADATA type"
        return values


class LiveSessionsSearchPayloadSchema(_PaginatedSchema):
    filters: List[LiveSessionSearchFilterSchema] = Field([])
    sort: Union[LiveFilterType, str] = Field(default="TIMESTAMP")
    order: SortOrderType = Field(default=SortOrderType.desc)

    @model_validator(mode="before")
    def __transform(cls, values):
        if values.get("order") is not None:
            values["order"] = values["order"].upper()
        if values.get("filters") is not None:
            i = 0
            while i < len(values["filters"]):
                if values["filters"][i]["value"] is None or len(values["filters"][i]["value"]) == 0:
                    del values["filters"][i]
                else:
                    i += 1
            for i in values["filters"]:
                if i.get("type") == LiveFilterType.platform:
                    i["type"] = LiveFilterType.user_device_type
        if values.get("sort") is not None:
            if values["sort"].lower() == "startts":
                values["sort"] = "TIMESTAMP"
        return values


class IntegrationType(str, Enum):
    github = "GITHUB"
    jira = "JIRA"
    slack = "SLACK"
    ms_teams = "MSTEAMS"
    sentry = "SENTRY"
    bugsnag = "BUGSNAG"
    rollbar = "ROLLBAR"
    elasticsearch = "ELASTICSEARCH"
    datadog = "DATADOG"
    sumologic = "SUMOLOGIC"
    stackdriver = "STACKDRIVER"
    cloudwatch = "CLOUDWATCH"
    newrelic = "NEWRELIC"


class SearchNoteSchema(_PaginatedSchema):
    sort: str = Field(default="createdAt")
    order: SortOrderType = Field(default=SortOrderType.desc)
    tags: Optional[List[str]] = Field(default=[])
    shared_only: bool = Field(default=False)
    mine_only: bool = Field(default=False)


class SessionNoteSchema(BaseModel):
    message: str = Field(..., min_length=2)
    tag: Optional[str] = Field(default=None)
    timestamp: int = Field(default=-1)
    is_public: bool = Field(default=False)


class SessionUpdateNoteSchema(SessionNoteSchema):
    message: Optional[str] = Field(default=None, min_length=2)
    timestamp: Optional[int] = Field(default=None, ge=-1)
    is_public: Optional[bool] = Field(default=None)

    @model_validator(mode='after')
    def __validator(cls, values):
        assert len(values.keys()) > 0, "at least 1 attribute should be provided for update"
        c = 0
        for v in values.values():
            if v is not None and (not isinstance(v, str) or len(v) > 0):
                c += 1
                break
        assert c > 0, "at least 1 value should be provided for update"
        return values


class WebhookType(str, Enum):
    webhook = "webhook"
    slack = "slack"
    email = "email"
    msteams = "msteams"


class SearchCardsSchema(_PaginatedSchema):
    order: SortOrderType = Field(default=SortOrderType.desc)
    shared_only: bool = Field(default=False)
    mine_only: bool = Field(default=False)
    query: Optional[str] = Field(default=None)


class _ClickMapSearchEventRaw(SessionSearchEventSchema2):
    type: Literal[EventType.location] = Field(...)


# class FlatClickMapSessionsSearch(SessionsSearchPayloadSchema):
class ClickMapSessionsSearch(SessionsSearchPayloadSchema):
    events: Optional[List[_ClickMapSearchEventRaw]] = Field(default=[])
    filters: List[Union[SessionSearchFilterSchema, _ClickMapSearchEventRaw]] = Field(default=[])

    @model_validator(mode="before")
    def __transform(cls, values):
        for f in values.get("filters", []):
            if f.get("type") == FilterType.duration:
                return values
        values["filters"] = values.get("filters", [])
        values["filters"].append({"value": [5000], "type": FilterType.duration,
                                  "operator": SearchEventOperator._is, "filters": []})
        return values

    # @model_validator(mode='after')
    # def flat_to_original(cls, values):
    #     if len(values.events) > 0:
    #         return values
    #     n_filters = []
    #     n_events = []
    #     for v in values.filters:
    #         if isinstance(v, _ClickMapSearchEventRaw):
    #             n_events.append(v)
    #         else:
    #             n_filters.append(v)
    #     values.events = n_events
    #     values.filters = n_filters
    #     return values


class ClickMapFilterSchema(BaseModel):
    value: List[Literal[IssueType.click_rage, IssueType.dead_click]] = Field(default=[])
    type: Literal[FilterType.issue] = Field(...)
    operator: Literal[SearchEventOperator._is, MathOperator._equal] = Field(...)


class GetHeatmapPayloadSchema(_TimedSchema):
    url: str = Field(...)
    # issues: List[Literal[IssueType.click_rage, IssueType.dead_click]] = Field(default=[])
    filters: List[ClickMapFilterSchema] = Field(default=[])
    click_rage: bool = Field(default=False)


class FeatureFlagVariant(BaseModel):
    variant_id: Optional[int] = Field(default=None)
    value: str = Field(...)
    description: Optional[str] = Field(default=None)
    payload: Optional[str] = Field(default=None)
    rollout_percentage: Optional[int] = Field(default=0, ge=0, le=100)


class FeatureFlagConditionFilterSchema(BaseModel):
    is_event: Literal[False] = False
    type: FilterType = Field(...)
    value: List[str] = Field(default=[], min_length=1)
    operator: Union[SearchEventOperator, MathOperator] = Field(...)
    source: Optional[str] = Field(default=None)
    sourceOperator: Optional[Union[SearchEventOperator, MathOperator]] = Field(default=None)


class FeatureFlagCondition(BaseModel):
    condition_id: Optional[int] = Field(default=None)
    name: str = Field(...)
    rollout_percentage: Optional[int] = Field(default=0)
    filters: List[FeatureFlagConditionFilterSchema] = Field(default=[])


class SearchFlagsSchema(_PaginatedSchema):
    limit: int = Field(default=15, gt=0, le=200)
    user_id: Optional[int] = Field(default=None)
    order: SortOrderType = Field(default=SortOrderType.desc)
    query: Optional[str] = Field(default=None)
    is_active: Optional[bool] = Field(default=None)


class FeatureFlagType(str, Enum):
    single_variant = "single"
    multi_variant = "multi"


class FeatureFlagStatus(BaseModel):
    is_active: bool = Field(...)


class FeatureFlagSchema(BaseModel):
    payload: Optional[str] = Field(default=None)
    flag_key: str = Field(..., pattern=r'^[a-zA-Z0-9\-]+$')
    description: Optional[str] = Field(default=None)
    flag_type: FeatureFlagType = Field(default=FeatureFlagType.single_variant)
    is_persist: Optional[bool] = Field(default=False)
    is_active: Optional[bool] = Field(default=True)
    conditions: List[FeatureFlagCondition] = Field(default=[], min_length=1)
    variants: List[FeatureFlagVariant] = Field(default=[])


class ModuleStatus(BaseModel):
    module: Literal["assist", "notes", "bug-reports",
    "offline-recordings", "alerts"] = Field(..., description="Possible values: notes, bugs, live")
    status: bool = Field(...)
