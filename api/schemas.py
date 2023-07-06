from enum import Enum
from typing import Optional, List, Union, Literal, Any

from pydantic import BaseModel, Field, EmailStr, HttpUrl, root_validator, validator
from pydantic.types import Json

from chalicelib.utils.TimeUTC import TimeUTC
import re


def attribute_to_camel_case(snake_str):
    components = snake_str.split("_")
    return components[0] + ''.join(x.title() for x in components[1:])


def transform_email(email: str) -> str:
    return email.lower().strip() if isinstance(email, str) else email


def remove_whitespace(value: str) -> str:
    return " ".join(value.split()) if isinstance(value, str) else value


class _Grecaptcha(BaseModel):
    g_recaptcha_response: Optional[str] = Field(None, alias='g-recaptcha-response')


class UserLoginSchema(_Grecaptcha):
    email: EmailStr = Field(...)
    password: str = Field(...)
    _transform_email = validator('email', pre=True, allow_reuse=True)(transform_email)


class UserSignupSchema(UserLoginSchema):
    fullname: str = Field(...)
    organizationName: str = Field(...)

    class Config:
        alias_generator = attribute_to_camel_case


class EditAccountSchema(BaseModel):
    name: Optional[str] = Field(None)
    tenantName: Optional[str] = Field(None)
    opt_out: Optional[bool] = Field(None)

    _transform_name = validator('name', pre=True, allow_reuse=True)(remove_whitespace)
    _transform_tenantName = validator('tenantName', pre=True, allow_reuse=True)(remove_whitespace)


class ForgetPasswordPayloadSchema(_Grecaptcha):
    email: EmailStr = Field(...)

    _transform_email = validator('email', pre=True, allow_reuse=True)(transform_email)


class EditUserPasswordSchema(BaseModel):
    old_password: str = Field(...)
    new_password: str = Field(...)

    class Config:
        alias_generator = attribute_to_camel_case


class UpdateTenantSchema(BaseModel):
    name: Optional[str] = Field(None)
    opt_out: Optional[bool] = Field(None)
    tenant_name: Optional[str] = Field(None)

    class Config:
        alias_generator = attribute_to_camel_case


class CreateProjectSchema(BaseModel):
    name: str = Field(default="my first project")
    _transform_name = validator('name', pre=True, allow_reuse=True)(remove_whitespace)


class CurrentAPIContext(BaseModel):
    tenant_id: int = Field(...)


class CurrentContext(CurrentAPIContext):
    user_id: int = Field(...)
    email: EmailStr = Field(...)

    _transform_email = validator('email', pre=True, allow_reuse=True)(transform_email)


class AddCollaborationSchema(BaseModel):
    name: str = Field(...)
    url: HttpUrl = Field(...)
    _transform_name = validator('name', pre=True, allow_reuse=True)(remove_whitespace)
    _transform_url = validator('url', pre=True, allow_reuse=True)(remove_whitespace)


class EditCollaborationSchema(AddCollaborationSchema):
    name: Optional[str] = Field(None)


class CreateNotificationSchema(BaseModel):
    token: str = Field(...)
    notifications: List = Field(...)


class _TimedSchema(BaseModel):
    startTimestamp: int = Field(default=None)
    endTimestamp: int = Field(default=None)

    @root_validator
    def time_validator(cls, values):
        if values.get("startTimestamp") is not None and values.get("endTimestamp") is not None:
            assert values.get("startTimestamp") < values.get("endTimestamp"), \
                "endTimestamp must be greater than startTimestamp"
        return values


class NotificationsViewSchema(_TimedSchema):
    ids: Optional[List] = Field(default=[])
    startTimestamp: Optional[int] = Field(default=None)
    endTimestamp: Optional[int] = Field(default=None)


class GithubSchema(BaseModel):
    token: str = Field(...)


class JiraSchema(GithubSchema):
    username: str = Field(...)
    url: HttpUrl = Field(...)

    @validator('url')
    def transform_url(cls, v: HttpUrl):
        return HttpUrl.build(scheme=v.scheme.lower(), host=v.host.lower())


class CreateEditWebhookSchema(BaseModel):
    webhookId: Optional[int] = Field(None)
    endpoint: str = Field(...)
    authHeader: Optional[str] = Field(None)
    name: Optional[str] = Field(...)
    _transform_name = validator('name', pre=True, allow_reuse=True)(remove_whitespace)


class CreateMemberSchema(BaseModel):
    userId: Optional[int] = Field(None)
    name: str = Field(...)
    email: EmailStr = Field(...)
    admin: bool = Field(False)

    _transform_email = validator('email', pre=True, allow_reuse=True)(transform_email)
    _transform_name = validator('name', pre=True, allow_reuse=True)(remove_whitespace)


class EditMemberSchema(BaseModel):
    name: str = Field(...)
    email: EmailStr = Field(...)
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
    _transform_title = validator('title', pre=True, allow_reuse=True)(remove_whitespace)

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
    _transform_key = validator('key', pre=True, allow_reuse=True)(remove_whitespace)


class MetadataListSchema(BaseModel):
    list: List[MetadataBasicSchema] = Field(...)


class _AlertMessageSchema(BaseModel):
    type: str = Field(...)
    value: str = Field(...)


class AlertDetectionType(str, Enum):
    percent = "percent"
    change = "change"


class _AlertOptionSchema(BaseModel):
    message: List[_AlertMessageSchema] = Field([])
    currentPeriod: Literal[15, 30, 60, 120, 240, 1440] = Field(...)
    previousPeriod: Literal[15, 30, 60, 120, 240, 1440] = Field(15)
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
    description: Optional[str] = Field(None)
    options: _AlertOptionSchema = Field(...)
    query: _AlertQuerySchema = Field(...)
    series_id: Optional[int] = Field(None)

    @root_validator(pre=True)
    def transform_alert(cls, values):
        values["seriesId"] = None
        if isinstance(values["query"]["left"], int):
            values["seriesId"] = values["query"]["left"]
            values["query"]["left"] = AlertColumn.custom

        return values

    @root_validator
    def alert_validator(cls, values):
        if values.get("query") is not None and values["query"].left == AlertColumn.custom:
            assert values.get("series_id") is not None, "series_id should not be null for CUSTOM alert"
        return values

    class Config:
        alias_generator = attribute_to_camel_case


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
    click_ios = "clickIos"
    input_ios = "inputIos"
    view_ios = "viewIos"
    custom_ios = "customIos"
    request_ios = "requestIos"
    error_ios = "errorIos"


class PerformanceEventType(str, Enum):
    location_dom_complete = "domComplete"
    location_largest_contentful_paint_time = "largestContentfulPaintTime"
    time_between_events = "timeBetweenEvents"
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
    _on_text = "onText"


class IssueFilterOperator(str, Enum):
    _on_selector = ClickEventExtraOperator._on_selector.value


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


class MetricFormatType(str, Enum):
    session_count = 'sessionCount'


class __MixedSearchFilter(BaseModel):
    is_event: bool = Field(...)

    @root_validator(pre=True)
    def remove_duplicate_values(cls, values):
        if values.get("value") is not None:
            if len(values["value"]) > 0 \
                    and (isinstance(values["value"][0], int) or isinstance(values["value"][0], dict)):
                return values
            values["value"] = list(set(values["value"]))
        return values

    class Config:
        alias_generator = attribute_to_camel_case


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


class IssueFilterType(str, Enum):
    _selector = "CLICK_SELECTOR"


class RequestGraphqlFilterSchema(BaseModel):
    type: Union[FetchFilterType, GraphqlFilterType] = Field(...)
    value: List[Union[int, str]] = Field(...)
    operator: Union[SearchEventOperator, MathOperator] = Field(...)


class IssueFilterSchema(BaseModel):
    type: IssueFilterType = Field(...)
    value: List[str] = Field(...)
    operator: IssueFilterOperator = Field(...)


class _SessionSearchEventRaw(__MixedSearchFilter):
    is_event: bool = Field(default=True, const=True)
    value: List[str] = Field(...)
    type: Union[EventType, PerformanceEventType] = Field(...)
    operator: Union[SearchEventOperator, ClickEventExtraOperator] = Field(...)
    source: Optional[List[Union[ErrorSource, int, str]]] = Field(default=None)
    sourceOperator: Optional[MathOperator] = Field(default=None)
    filters: Optional[List[Union[RequestGraphqlFilterSchema, IssueFilterSchema]]] = Field(default=None)

    @root_validator(pre=True)
    def transform(cls, values):
        if values.get("type") is None:
            return values
        values["type"] = {
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
            "TIME_BETWEEN_EVENTS": PerformanceEventType.time_between_events.value,
            "TTFB": PerformanceEventType.location_ttfb.value,
            "AVG_CPU_LOAD": PerformanceEventType.location_avg_cpu_load.value,
            "AVG_MEMORY_USAGE": PerformanceEventType.location_avg_memory_usage.value,
            "FETCH_FAILED": PerformanceEventType.fetch_failed.value,
        }.get(values["type"], values["type"])
        return values

    @root_validator
    def event_validator(cls, values):
        if isinstance(values.get("type"), PerformanceEventType):
            if values.get("type") == PerformanceEventType.fetch_failed:
                return values
            # assert values.get("source") is not None, "source should not be null for PerformanceEventType"
            # assert isinstance(values["source"], list) and len(values["source"]) > 0, \
            #     "source should not be empty for PerformanceEventType"
            assert values.get("sourceOperator") is not None, \
                "sourceOperator should not be null for PerformanceEventType"
            if values["type"] == PerformanceEventType.time_between_events:
                assert values["sourceOperator"] != MathOperator._equal, \
                    f"{MathOperator._equal} is not allowed for duration of {PerformanceEventType.time_between_events}"
                assert len(values.get("value", [])) == 2, \
                    f"must provide 2 Events as value for {PerformanceEventType.time_between_events}"
                assert isinstance(values["value"][0], _SessionSearchEventRaw) \
                       and isinstance(values["value"][1], _SessionSearchEventRaw), \
                    f"event should be of type  _SessionSearchEventRaw for {PerformanceEventType.time_between_events}"
                assert len(values["source"]) > 0 and isinstance(values["source"][0], int), \
                    f"source of type int is required for {PerformanceEventType.time_between_events}"
            else:
                assert "source" in values, f"source is required for {values.get('type')}"
                assert isinstance(values["source"], list), f"source of type list is required for {values.get('type')}"
                for c in values["source"]:
                    assert isinstance(c, int), f"source value should be of type int for {values.get('type')}"
        elif values.get("type") == EventType.error and values.get("source") is None:
            values["source"] = [ErrorSource.js_exception]
        elif values.get("type") == EventType.request_details:
            assert isinstance(values.get("filters"), List) and len(values.get("filters", [])) > 0, \
                f"filters should be defined for {EventType.request_details}"
        elif values.get("type") == EventType.graphql:
            assert isinstance(values.get("filters"), List) and len(values.get("filters", [])) > 0, \
                f"filters should be defined for {EventType.graphql}"

        if isinstance(values.get("operator"), ClickEventExtraOperator):
            assert values.get("type") == EventType.click, \
                f"operator:{values['operator']} is only available for event-type: {EventType.click}"
        return values


class _SessionSearchEventSchema(_SessionSearchEventRaw):
    value: Union[List[Union[_SessionSearchEventRaw, str]], str] = Field(...)


def transform_old_FilterType(cls, values):
    if values.get("type") is None:
        return values
    values["type"] = {
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
        "UTM_CAMPAIGN": FilterType.utm_campaign.value
    }.get(values["type"], values["type"])
    return values


class SessionSearchFilterSchema(__MixedSearchFilter):
    is_event: bool = Field(False, const=False)
    # TODO: remove this if there nothing broken from the UI
    # value: Union[Optional[Union[IssueType, PlatformType, int, str]],
    # Optional[List[Union[IssueType, PlatformType, int, str]]]] = Field(...)
    value: List[Union[IssueType, PlatformType, int, str]] = Field(default=[])
    type: FilterType = Field(...)
    operator: Union[SearchEventOperator, MathOperator] = Field(...)
    source: Optional[Union[ErrorSource, str]] = Field(default=None)
    filters: List[IssueFilterSchema] = Field(default=[])

    transform = root_validator(pre=True, allow_reuse=True)(transform_old_FilterType)

    @root_validator
    def filter_validator(cls, values):
        if values.get("type") == FilterType.metadata:
            assert values.get("source") is not None and len(values["source"]) > 0, \
                "must specify a valid 'source' for metadata filter"
        elif values.get("type") == FilterType.issue:
            for v in values.get("value"):
                assert isinstance(v, IssueType), f"value should be of type IssueType for {values.get('type')} filter"
        elif values.get("type") == FilterType.platform:
            for v in values.get("value"):
                assert isinstance(v, PlatformType), \
                    f"value should be of type PlatformType for {values.get('type')} filter"
        elif values.get("type") == FilterType.events_count:
            assert isinstance(values.get("operator"), MathOperator), \
                f"operator should be of type MathOperator for {values.get('type')} filter"
            for v in values.get("value"):
                assert isinstance(v, int), f"value should be of type int for {values.get('type')} filter"
        else:
            assert isinstance(values.get("operator"), SearchEventOperator), \
                f"operator should be of type SearchEventOperator for {values.get('type')} filter"
        return values


class _PaginatedSchema(BaseModel):
    limit: int = Field(default=200, gt=0, le=200)
    page: int = Field(default=1, gt=0)


class SortOrderType(str, Enum):
    asc = "ASC"
    desc = "DESC"


class SessionsSearchPayloadSchema(_PaginatedSchema):
    events: List[_SessionSearchEventSchema] = Field([])
    filters: List[SessionSearchFilterSchema] = Field([])
    startDate: int = Field(None)
    endDate: int = Field(None)
    sort: str = Field(default="startTs")
    order: SortOrderType = Field(default=SortOrderType.desc)
    events_order: Optional[SearchEventOrder] = Field(default=SearchEventOrder._then)
    group_by_user: bool = Field(default=False)
    bookmarked: bool = Field(default=False)

    @root_validator(pre=True)
    def transform_order(cls, values):
        if values.get("sort") is None:
            values["sort"] = "startTs"

        if values.get("order") is None:
            values["order"] = SortOrderType.desc
        else:
            values["order"] = values["order"].upper()
        return values

    class Config:
        alias_generator = attribute_to_camel_case


class FlatSessionsSearch(BaseModel):
    events: Optional[List[_SessionSearchEventSchema]] = Field([])
    filters: List[Union[SessionSearchFilterSchema, _SessionSearchEventSchema]] = Field([])

    @root_validator(pre=True)
    def flat_to_original(cls, values):
        # in case the old search body was passed
        if len(values.get("events", [])) > 0:
            for v in values["events"]:
                v["isEvent"] = True
            for v in values.get("filters", []):
                v["isEvent"] = False
        else:
            n_filters = []
            n_events = []
            for v in values.get("filters", []):
                if v.get("isEvent"):
                    n_events.append(v)
                else:
                    v["isEvent"] = False
                    n_filters.append(v)
            values["events"] = n_events
            values["filters"] = n_filters
        return values


class FlatSessionsSearchPayloadSchema(FlatSessionsSearch, SessionsSearchPayloadSchema):
    pass


class SessionsSearchCountSchema(FlatSessionsSearchPayloadSchema):
    # class SessionsSearchCountSchema(SessionsSearchPayloadSchema):
    sort: Optional[str] = Field(default=None)
    order: Optional[str] = Field(default=None)


class FunnelSearchPayloadSchema(FlatSessionsSearchPayloadSchema):
    # class FunnelSearchPayloadSchema(SessionsSearchPayloadSchema):
    range_value: Optional[str] = Field(None)
    sort: Optional[str] = Field(None)
    order: Optional[str] = Field(None)
    events_order: Optional[SearchEventOrder] = Field(default=SearchEventOrder._then, const=True)
    group_by_user: Optional[bool] = Field(default=False, const=True)
    rangeValue: Optional[str] = Field(None)

    @root_validator(pre=True)
    def enforce_default_values(cls, values):
        values["eventsOrder"] = SearchEventOrder._then
        values["groupByUser"] = False
        return values

    class Config:
        alias_generator = attribute_to_camel_case


class FunnelSchema(BaseModel):
    name: str = Field(...)
    filter: FunnelSearchPayloadSchema = Field([])
    is_public: bool = Field(default=False)

    class Config:
        alias_generator = attribute_to_camel_case


class FunnelInsightsPayloadSchema(FlatSessionsSearchPayloadSchema):
    # class FunnelInsightsPayloadSchema(SessionsSearchPayloadSchema):
    sort: Optional[str] = Field(None)
    order: Optional[str] = Field(None)
    events_order: Optional[SearchEventOrder] = Field(default=SearchEventOrder._then, const=True)
    group_by_user: Optional[bool] = Field(default=False, const=True)
    rangeValue: Optional[str] = Field(None)


class ErrorStatus(str, Enum):
    all = 'all'
    unresolved = 'unresolved'
    resolved = 'resolved'
    ignored = 'ignored'


class ErrorSort(str, Enum):
    occurrence = 'occurrence'
    users_count = 'users'
    sessions_count = 'sessions'


class SearchErrorsSchema(FlatSessionsSearchPayloadSchema):
    sort: ErrorSort = Field(default=ErrorSort.occurrence)
    density: Optional[int] = Field(7)
    status: Optional[ErrorStatus] = Field(default=ErrorStatus.all)
    query: Optional[str] = Field(default=None)


class ProductAnalyticsFilterType(str, Enum):
    event_type = 'eventType'
    start_point = 'startPoint'
    user_id = FilterType.user_id.value


class ProductAnalyticsEventType(str, Enum):
    click = EventType.click.value
    input = EventType.input.value
    location = EventType.location.value
    custom_event = EventType.custom.value


class ProductAnalyticsFilter(BaseModel):
    type: ProductAnalyticsFilterType = Field(...)
    operator: Union[SearchEventOperator, ClickEventExtraOperator] = Field(...)
    value: List[Union[ProductAnalyticsEventType | str]] = Field(...)

    @root_validator
    def validator(cls, values):
        if values.get("type") == ProductAnalyticsFilterType.event_type:
            assert values.get("value") is not None and len(values["value"]) > 0, \
                f"value must be provided for type:{ProductAnalyticsFilterType.event_type}"
            assert isinstance(values["value"][0], ProductAnalyticsEventType), \
                f"value must be of type {ProductAnalyticsEventType} for type:{ProductAnalyticsFilterType.event_type}"

        return values


class PathAnalysisSchema(_TimedSchema):
    startTimestamp: int = Field(TimeUTC.now(delta_days=-1))
    endTimestamp: int = Field(TimeUTC.now())
    density: int = Field(7)
    filters: List[ProductAnalyticsFilter] = Field(default=[])
    type: Optional[str] = Field(default=None)

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


class CardSeriesFilterSchema(SearchErrorsSchema):
    startDate: Optional[int] = Field(default=None)
    endDate: Optional[int] = Field(default=None)
    sort: Optional[str] = Field(default=None)
    order: SortOrderType = Field(default=SortOrderType.desc)
    group_by_user: Optional[bool] = Field(default=False, const=True)


class CardSeriesSchema(BaseModel):
    series_id: Optional[int] = Field(None)
    name: Optional[str] = Field(None)
    index: Optional[int] = Field(None)
    filter: Optional[Union[CardSeriesFilterSchema | PathAnalysisSchema]] = Field(default=None)

    class Config:
        alias_generator = attribute_to_camel_case


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
    user_city = FilterType.user_city.value
    user_state = FilterType.user_state.value
    user_id = FilterType.user_id.value
    issues = FilterType.issue.value
    visited_url = "location"
    sessions = "sessions"
    errors = "jsException"


class MetricOfTimeseries(str, Enum):
    session_count = "sessionCount"


class MetricOfClickMap(str, Enum):
    click_map_url = "clickMapUrl"


class CardSessionsSchema(FlatSessionsSearch, _PaginatedSchema, _TimedSchema):
    startTimestamp: int = Field(TimeUTC.now(-7))
    endTimestamp: int = Field(TimeUTC.now())
    series: List[CardSeriesSchema] = Field(default=[])

    class Config:
        alias_generator = attribute_to_camel_case


class CardChartSchema(CardSessionsSchema):
    density: int = Field(7)


class CardConfigSchema(BaseModel):
    col: Optional[int] = Field(...)
    row: Optional[int] = Field(default=2)
    position: Optional[int] = Field(default=0)


class __CardSchema(BaseModel):
    name: Optional[str] = Field(...)
    is_public: bool = Field(default=True)
    default_config: CardConfigSchema = Field(..., alias="config")
    thumbnail: Optional[str] = Field(default=None)
    metric_format: Optional[MetricFormatType] = Field(default=None)

    class Config:
        alias_generator = attribute_to_camel_case


class CardSchema(__CardSchema, CardChartSchema):
    view_type: Union[MetricTimeseriesViewType, \
                     MetricTableViewType, MetricOtherViewType] = Field(...)
    metric_type: MetricType = Field(...)
    metric_of: Union[MetricOfTimeseries, MetricOfTable, MetricOfErrors, \
                     MetricOfPerformance, MetricOfResources, MetricOfWebVitals, \
                     MetricOfClickMap] = Field(default=MetricOfTable.user_id)
    metric_value: List[IssueType] = Field(default=[])
    is_template: bool = Field(default=False)

    # This is used to handle wrong values sent by the UI
    @root_validator(pre=True)
    def transform(cls, values):
        values["isTemplate"] = values.get("metricType") in [MetricType.errors, MetricType.performance,
                                                            MetricType.resources, MetricType.web_vital]
        if values.get("metricType") == MetricType.timeseries \
                or values.get("metricType") == MetricType.table \
                and values.get("metricOf") != MetricOfTable.issues:
            values["metricValue"] = []

        if values.get("metricType") in [MetricType.funnel, MetricType.pathAnalysis] and \
                values.get("series") is not None and len(values["series"]) > 0:
            values["series"] = [values["series"][0]]
        elif values.get("metricType") not in [MetricType.table,
                                              MetricType.timeseries,
                                              MetricType.insights,
                                              MetricType.click_map,
                                              MetricType.funnel,
                                              MetricType.pathAnalysis] \
                and values.get("series") is not None and len(values["series"]) > 0:
            values["series"] = []

        return values

    @root_validator
    def restrictions(cls, values):
        assert values.get("metric_type") != MetricType.insights, f"metricType:{MetricType.insights} not supported yet"
        return values

    @root_validator
    def validator(cls, values):
        if values.get("metric_type") == MetricType.timeseries:
            assert isinstance(values.get("view_type"), MetricTimeseriesViewType), \
                f"viewType must be of type {MetricTimeseriesViewType} for metricType:{MetricType.timeseries}"
            assert isinstance(values.get("metric_of"), MetricOfTimeseries), \
                f"metricOf must be of type {MetricOfTimeseries} for metricType:{MetricType.timeseries}"
        elif values.get("metric_type") == MetricType.table:
            assert isinstance(values.get("view_type"), MetricTableViewType), \
                f"viewType must be of type {MetricTableViewType} for metricType:{MetricType.table}"
            assert isinstance(values.get("metric_of"), MetricOfTable), \
                f"metricOf must be of type {MetricOfTable} for metricType:{MetricType.table}"
            if values.get("metric_of") in (MetricOfTable.sessions, MetricOfTable.errors):
                assert values.get("view_type") == MetricTableViewType.table, \
                    f"viewType must be '{MetricTableViewType.table}' for metricOf:{values['metric_of']}"
            if values.get("metric_of") != MetricOfTable.issues:
                assert values.get("metric_value") is None or len(values.get("metric_value")) == 0, \
                    f"metricValue is only available for metricOf:{MetricOfTable.issues}"
        elif values.get("metric_type") == MetricType.funnel:
            pass
            # allow UI sot send empty series for funnel
            # assert len(values["series"]) == 1, f"must have only 1 series for metricType:{MetricType.funnel}"
            # ignore this for now, let the UI send whatever he wants for metric_of
            # assert isinstance(values.get("metric_of"), MetricOfTimeseries), \
            #     f"metricOf must be of type {MetricOfTimeseries} for metricType:{MetricType.funnel}"
        elif values.get("metric_type") == MetricType.pathAnalysis:
            pass
        else:
            if values.get("metric_type") == MetricType.errors:
                assert isinstance(values.get("metric_of"), MetricOfErrors), \
                    f"metricOf must be of type {MetricOfErrors} for metricType:{MetricType.errors}"
            elif values.get("metric_type") == MetricType.performance:
                assert isinstance(values.get("metric_of"), MetricOfPerformance), \
                    f"metricOf must be of type {MetricOfPerformance} for metricType:{MetricType.performance}"
            elif values.get("metric_type") == MetricType.resources:
                assert isinstance(values.get("metric_of"), MetricOfResources), \
                    f"metricOf must be of type {MetricOfResources} for metricType:{MetricType.resources}"
            elif values.get("metric_type") == MetricType.web_vital:
                assert isinstance(values.get("metric_of"), MetricOfWebVitals), \
                    f"metricOf must be of type {MetricOfWebVitals} for metricType:{MetricType.web_vital}"
            elif values.get("metric_type") == MetricType.click_map:
                assert isinstance(values.get("metric_of"), MetricOfClickMap), \
                    f"metricOf must be of type {MetricOfClickMap} for metricType:{MetricType.click_map}"
                # Allow only LOCATION events for clickMap
                for s in values.get("series", []):
                    for f in s.filter.events:
                        assert f.type == EventType.location, f"only events of type:{EventType.location} are allowed for metricOf:{MetricType.click_map}"

            assert isinstance(values.get("view_type"), MetricOtherViewType), \
                f"viewType must be 'chart|list' for metricOf:{values.get('metric_of')}"

        return values

    class Config:
        alias_generator = attribute_to_camel_case


class CardUpdateSeriesSchema(CardSeriesSchema):
    series_id: Optional[int] = Field(None)

    class Config:
        alias_generator = attribute_to_camel_case


class UpdateCardSchema(CardSchema):
    series: List[CardUpdateSeriesSchema] = Field(...)


class UpdateCustomMetricsStatusSchema(BaseModel):
    active: bool = Field(...)


class SavedSearchSchema(FunnelSchema):
    filter: FlatSessionsSearchPayloadSchema = Field([])


class CreateDashboardSchema(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = Field(default='')
    is_public: bool = Field(default=False)
    is_pinned: bool = Field(default=False)
    metrics: Optional[List[int]] = Field(default=[])

    class Config:
        alias_generator = attribute_to_camel_case


class EditDashboardSchema(CreateDashboardSchema):
    is_public: Optional[bool] = Field(default=None)
    is_pinned: Optional[bool] = Field(default=None)


class UpdateWidgetPayloadSchema(BaseModel):
    config: dict = Field(default={})

    class Config:
        alias_generator = attribute_to_camel_case


class AddWidgetToDashboardPayloadSchema(UpdateWidgetPayloadSchema):
    metric_id: int = Field(...)

    class Config:
        alias_generator = attribute_to_camel_case


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

    transform = root_validator(pre=True, allow_reuse=True)(transform_old_FilterType)

    @root_validator
    def validator(cls, values):
        if values.get("type") is not None and values["type"] == LiveFilterType.metadata:
            assert values.get("source") is not None, "source should not be null for METADATA type"
            assert len(values.get("source")) > 0, "source should not be empty for METADATA type"
        return values


class LiveSessionsSearchPayloadSchema(_PaginatedSchema):
    filters: List[LiveSessionSearchFilterSchema] = Field([])
    sort: Union[LiveFilterType, str] = Field(default="TIMESTAMP")
    order: SortOrderType = Field(default=SortOrderType.desc)

    @root_validator(pre=True)
    def transform(cls, values):
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

    class Config:
        alias_generator = attribute_to_camel_case


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

    class Config:
        alias_generator = attribute_to_camel_case


class SessionNoteSchema(BaseModel):
    message: str = Field(..., min_length=2)
    tag: Optional[str] = Field(default=None)
    timestamp: int = Field(default=-1)
    is_public: bool = Field(default=False)

    class Config:
        alias_generator = attribute_to_camel_case


class SessionUpdateNoteSchema(SessionNoteSchema):
    message: Optional[str] = Field(default=None, min_length=2)
    timestamp: Optional[int] = Field(default=None, ge=-1)
    is_public: Optional[bool] = Field(default=None)

    @root_validator
    def validator(cls, values):
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

    class Config:
        alias_generator = attribute_to_camel_case


class _ClickMapSearchEventRaw(_SessionSearchEventRaw):
    type: Literal[EventType.location] = Field(...)


class FlatClickMapSessionsSearch(SessionsSearchPayloadSchema):
    events: Optional[List[_ClickMapSearchEventRaw]] = Field([])
    filters: List[Union[SessionSearchFilterSchema, _ClickMapSearchEventRaw]] = Field([])

    @root_validator(pre=True)
    def transform(cls, values):
        for f in values.get("filters", []):
            if f.get("type") == FilterType.duration:
                return values
        values["filters"] = values.get("filters", [])
        values["filters"].append({"value": [5000], "type": FilterType.duration,
                                  "operator": SearchEventOperator._is, "filters": []})
        return values

    @root_validator()
    def flat_to_original(cls, values):
        if len(values["events"]) > 0:
            return values
        n_filters = []
        n_events = []
        for v in values.get("filters", []):
            if isinstance(v, _ClickMapSearchEventRaw):
                n_events.append(v)
            else:
                n_filters.append(v)
        values["events"] = n_events
        values["filters"] = n_filters
        return values


class IssueAdvancedFilter(BaseModel):
    type: IssueFilterType = Field(default=IssueFilterType._selector)
    value: List[str] = Field(default=[])
    operator: SearchEventOperator = Field(default=SearchEventOperator._is)


class ClickMapFilterSchema(BaseModel):
    value: List[Literal[IssueType.click_rage, IssueType.dead_click]] = Field(default=[])
    type: Literal[FilterType.issue] = Field(...)
    operator: Literal[SearchEventOperator._is, MathOperator._equal] = Field(...)
    # source: Optional[Union[ErrorSource, str]] = Field(default=None)
    filters: List[IssueAdvancedFilter] = Field(default=[])


class GetHeatmapPayloadSchema(BaseModel):
    startDate: int = Field(TimeUTC.now(delta_days=-30))
    endDate: int = Field(TimeUTC.now())
    url: str = Field(...)
    # issues: List[Literal[IssueType.click_rage, IssueType.dead_click]] = Field(default=[])
    filters: List[ClickMapFilterSchema] = Field(default=[])
    click_rage: bool = Field(default=False)

    class Config:
        alias_generator = attribute_to_camel_case


class FeatureFlagVariant(BaseModel):
    variant_id: Optional[int] = Field(default=None)
    value: str = Field(...)
    description: Optional[str] = Field(default=None)
    payload: Optional[str] = Field(default=None)
    rollout_percentage: Optional[int] = Field(default=0, ge=0, le=100)

    class Config:
        alias_generator = attribute_to_camel_case


class FeatureFlagConditionFilterSchema(BaseModel):
    is_event: bool = Field(False, const=False)
    type: FilterType = Field(...)
    value: List[str] = Field(default=[], min_items=1)
    operator: Union[SearchEventOperator, MathOperator] = Field(...)


class FeatureFlagCondition(BaseModel):
    condition_id: Optional[int] = Field(default=None)
    name: str = Field(...)
    rollout_percentage: Optional[int] = Field(default=0)
    filters: List[FeatureFlagConditionFilterSchema] = Field(default=[])

    class Config:
        alias_generator = attribute_to_camel_case


class SearchFlagsSchema(_PaginatedSchema):
    limit: int = Field(default=15, gt=0, le=200)
    user_id: Optional[int] = Field(default=None)
    order: SortOrderType = Field(default=SortOrderType.desc)
    query: Optional[str] = Field(default=None)
    is_active: Optional[bool] = Field(default=None)

    class Config:
        alias_generator = attribute_to_camel_case


class FeatureFlagType(str, Enum):
    single_variant = "single"
    multi_variant = "multi"


class FeatureFlagStatus(BaseModel):
    is_active: bool = Field(...)

    class Config:
        alias_generator = attribute_to_camel_case


class FeatureFlagSchema(BaseModel):
    payload: Optional[str] = Field(default=None)
    flag_key: str = Field(..., regex=r'^[a-zA-Z0-9\-]+$')
    description: Optional[str] = Field(None)
    flag_type: FeatureFlagType = Field(default=FeatureFlagType.single_variant)
    is_persist: Optional[bool] = Field(default=False)
    is_active: Optional[bool] = Field(default=True)
    conditions: List[FeatureFlagCondition] = Field(default=[], min_items=1)
    variants: List[FeatureFlagVariant] = Field(default=[])

    class Config:
        alias_generator = attribute_to_camel_case
