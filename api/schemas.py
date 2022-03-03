from enum import Enum
from typing import Optional, List, Union, Literal

from pydantic import BaseModel, Field, EmailStr, HttpUrl, root_validator, validator

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


class EditUserAppearanceSchema(BaseModel):
    appearance: dict = Field(...)


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
    url: HttpUrl = Field(...)

    @validator('url')
    def transform_url(cls, v: HttpUrl):
        return HttpUrl.build(scheme=v.scheme, host=v.host)


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


class AlertDetectionChangeType(str, Enum):
    percent = "percent"
    change = "change"


class _AlertOptionSchema(BaseModel):
    message: List[_AlertMessageSchema] = Field([])
    currentPeriod: Literal[15, 30, 60, 120, 240, 1440] = Field(...)
    previousPeriod: Literal[15, 30, 60, 120, 240, 1440] = Field(15)
    lastNotification: Optional[int] = Field(None)
    renotifyInterval: Optional[int] = Field(720)
    change: Optional[AlertDetectionChangeType] = Field(None)


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
    # operator: Literal["<", ">", "<=", ">="] = Field(...)
    operator: MathOperator = Field(...)


class AlertDetectionMethod(str, Enum):
    threshold = "threshold"
    change = "change"


class AlertSchema(BaseModel):
    name: str = Field(...)
    detection_method: AlertDetectionMethod = Field(...)
    description: Optional[str] = Field(None)
    options: _AlertOptionSchema = Field(...)
    query: _AlertQuerySchema = Field(...)
    series_id: Optional[int] = Field(None)

    @root_validator(pre=True)
    def transform_alert(cls, values):
        if values.get("seriesId") is None and isinstance(values["query"]["left"], int):
            values["seriesId"] = values["query"]["left"]
            values["query"]["left"] = AlertColumn.custom

        return values

    @root_validator
    def alert_validator(cls, values):
        if values.get("query") is not None and values["query"].left == AlertColumn.custom:
            assert values.get("series_id") is not None, "series_id should not be null for CUSTOM alert"
        if values.get("detectionMethod") is not None \
                and values["detectionMethod"] == AlertDetectionMethod.change \
                and values.get("options") is not None:
            assert values["options"].change is not None, \
                "options.change should not be null for detection method 'change'"
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
    click = "CLICK"
    input = "INPUT"
    location = "LOCATION"
    custom = "CUSTOM"
    request = "REQUEST"
    request_details = "FETCH"
    graphql = "GRAPHQL"
    graphql_details = "GRAPHQL_DETAILS"
    state_action = "STATEACTION"
    error = "ERROR"
    click_ios = "CLICK_IOS"
    input_ios = "INPUT_IOS"
    view_ios = "VIEW_IOS"
    custom_ios = "CUSTOM_IOS"
    request_ios = "REQUEST_IOS"
    error_ios = "ERROR_IOS"


class PerformanceEventType(str, Enum):
    location_dom_complete = "DOM_COMPLETE"
    location_largest_contentful_paint_time = "LARGEST_CONTENTFUL_PAINT_TIME"
    time_between_events = "TIME_BETWEEN_EVENTS"
    location_ttfb = "TTFB"
    location_avg_cpu_load = "AVG_CPU_LOAD"
    location_avg_memory_usage = "AVG_MEMORY_USAGE"
    fetch_failed = "FETCH_FAILED"
    # fetch_duration = "FETCH_DURATION"


class FilterType(str, Enum):
    user_os = "USEROS"
    user_browser = "USERBROWSER"
    user_device = "USERDEVICE"
    user_country = "USERCOUNTRY"
    user_id = "USERID"
    user_anonymous_id = "USERANONYMOUSID"
    referrer = "REFERRER"
    rev_id = "REVID"
    # IOS
    user_os_ios = "USEROS_IOS"
    user_device_ios = "USERDEVICE_IOS"
    user_country_ios = "USERCOUNTRY_IOS"
    user_id_ios = "USERID_IOS"
    user_anonymous_id_ios = "USERANONYMOUSID_IOS"
    rev_id_ios = "REVID_IOS"
    #
    duration = "DURATION"
    platform = "PLATFORM"
    metadata = "METADATA"
    issue = "ISSUES"
    events_count = "EVENTS_COUNT"
    utm_source = "UTM_SOURCE"
    utm_medium = "UTM_MEDIUM"
    utm_campaign = "UTM_CAMPAIGN"


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
    _url = "FETCH_URL"
    _status_code = "FETCH_STATUS_CODE"
    _method = "FETCH_METHOD"
    _duration = "FETCH_DURATION"
    _request_body = "FETCH_REQUEST_BODY"
    _response_body = "FETCH_RESPONSE_BODY"


class GraphqlFilterType(str, Enum):
    _name = "GRAPHQL_NAME"
    _status_code = "GRAPHQL_STATUS_CODE"
    _method = "GRAPHQL_METHOD"
    _duration = "GRAPHQL_DURATION"
    _request_body = "GRAPHQL_REQUEST_BODY"
    _response_body = "GRAPHQL_RESPONSE_BODY"


class RequestGraphqlFilterSchema(BaseModel):
    type: Union[FetchFilterType, GraphqlFilterType] = Field(...)
    value: List[Union[int, str]] = Field(...)
    operator: Union[SearchEventOperator, MathOperator] = Field(...)


class _SessionSearchEventRaw(__MixedSearchFilter):
    is_event: bool = Field(default=True, const=True)
    value: List[str] = Field(...)
    type: Union[EventType, PerformanceEventType] = Field(...)
    operator: SearchEventOperator = Field(...)
    source: Optional[List[Union[ErrorSource, int, str]]] = Field(None)
    sourceOperator: Optional[MathOperator] = Field(None)
    filters: Optional[List[RequestGraphqlFilterSchema]] = Field(None)

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
                assert len(values.get("value", [])) == 2, \
                    f"must provide 2 Events as value for {PerformanceEventType.time_between_events}"
                assert isinstance(values["value"][0], _SessionSearchEventRaw) \
                       and isinstance(values["value"][1], _SessionSearchEventRaw), \
                    f"event should be of type  _SessionSearchEventRaw for {PerformanceEventType.time_between_events}"
                assert len(values["source"]) > 0 and isinstance(values["source"][0], int), \
                    f"source of type int if required for {PerformanceEventType.time_between_events}"
            else:
                for c in values["source"]:
                    assert isinstance(c, int), f"source value should be of type int for {values.get('type')}"
        elif values.get("type") == EventType.error and values.get("source") is None:
            values["source"] = [ErrorSource.js_exception]
        elif values.get("type") == EventType.request_details:
            assert isinstance(values.get("filters"), List) and len(values.get("filters", [])) > 0, \
                f"filters should be defined for {EventType.request_details.value}"
        elif values.get("type") == EventType.graphql_details:
            assert isinstance(values.get("filters"), List) and len(values.get("filters", [])) > 0, \
                f"filters should be defined for {EventType.graphql_details.value}"

        return values


class _SessionSearchEventSchema(_SessionSearchEventRaw):
    value: Union[List[Union[_SessionSearchEventRaw, str]], str] = Field(...)


class SessionSearchFilterSchema(__MixedSearchFilter):
    is_event: bool = Field(False, const=False)
    value: Union[Optional[Union[IssueType, PlatformType, int, str]],
                 Optional[List[Union[IssueType, PlatformType, int, str]]]] = Field(...)
    type: FilterType = Field(...)
    operator: Union[SearchEventOperator, MathOperator] = Field(...)
    source: Optional[Union[ErrorSource, str]] = Field(default=ErrorSource.js_exception)

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


class SessionsSearchPayloadSchema(BaseModel):
    events: List[_SessionSearchEventSchema] = Field([])
    filters: List[SessionSearchFilterSchema] = Field([])
    startDate: int = Field(None)
    endDate: int = Field(None)
    sort: str = Field(default="startTs")
    order: str = Field(default="DESC")
    events_order: Optional[SearchEventOrder] = Field(default=SearchEventOrder._then)
    group_by_user: bool = Field(default=False)

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
    is_public: bool = Field(False)

    class Config:
        alias_generator = attribute_to_camel_case


class UpdateFunnelSchema(FunnelSchema):
    name: Optional[str] = Field(None)
    filter: Optional[FunnelSearchPayloadSchema] = Field(None)
    is_public: Optional[bool] = Field(None)


class FunnelInsightsPayloadSchema(FlatSessionsSearchPayloadSchema):
    # class FunnelInsightsPayloadSchema(SessionsSearchPayloadSchema):
    sort: Optional[str] = Field(None)
    order: Optional[str] = Field(None)
    events_order: Optional[SearchEventOrder] = Field(default=SearchEventOrder._then, const=True)
    group_by_user: Optional[bool] = Field(default=False, const=True)


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


class CustomMetricSeriesFilterSchema(FlatSessionsSearchPayloadSchema):
    # class CustomMetricSeriesFilterSchema(SessionsSearchPayloadSchema):
    startDate: Optional[int] = Field(None)
    endDate: Optional[int] = Field(None)
    sort: Optional[str] = Field(None)
    order: Optional[str] = Field(None)
    group_by_user: Optional[bool] = Field(default=False, const=True)


class CustomMetricCreateSeriesSchema(BaseModel):
    series_id: Optional[int] = Field(None)
    name: Optional[str] = Field(None)
    index: Optional[int] = Field(None)
    filter: Optional[CustomMetricSeriesFilterSchema] = Field([])

    class Config:
        alias_generator = attribute_to_camel_case


class MetricTimeseriesViewType(str, Enum):
    line_chart = "lineChart"
    progress = "progress"


class MetricTableViewType(str, Enum):
    table = "table"
    pie_chart = "pieChart"


class MetricType(str, Enum):
    timeseries = "timeseries"
    table = "table"


class TableMetricOfType(str, Enum):
    user_os = FilterType.user_os.value
    user_browser = FilterType.user_browser.value
    user_device = FilterType.user_device.value
    user_country = FilterType.user_country.value
    user_id = FilterType.user_id.value
    issues = FilterType.issue.value
    visited_url = "VISITED_URL"


class TimeseriesMetricOfType(str, Enum):
    session_count = "sessionCount"


class CustomMetricSessionsPayloadSchema(FlatSessionsSearch):
    startDate: int = Field(TimeUTC.now(-7))
    endDate: int = Field(TimeUTC.now())

    class Config:
        alias_generator = attribute_to_camel_case


class CustomMetricChartPayloadSchema(CustomMetricSessionsPayloadSchema):
    density: int = Field(7)

    class Config:
        alias_generator = attribute_to_camel_case


class CreateCustomMetricsSchema(CustomMetricChartPayloadSchema):
    name: str = Field(...)
    series: List[CustomMetricCreateSeriesSchema] = Field(..., min_items=1)
    is_public: bool = Field(default=True, const=True)
    view_type: Union[MetricTimeseriesViewType, MetricTableViewType] = Field(MetricTimeseriesViewType.line_chart)
    metric_type: MetricType = Field(MetricType.timeseries)
    metric_of: Union[TableMetricOfType, TimeseriesMetricOfType] = Field(TableMetricOfType.user_id)
    metric_value: List[IssueType] = Field([])
    metric_format: Optional[str] = Field(None)

    # metricFraction: float = Field(None, gt=0, lt=1)
    # This is used to handle wrong values sent by the UI
    @root_validator(pre=True)
    def remove_metric_value(cls, values):
        if values.get("metricType") == MetricType.timeseries \
                or values.get("metricType") == MetricType.table \
                and values.get("metricOf") != TableMetricOfType.issues:
            values["metricValue"] = []
        return values

    @root_validator
    def validator(cls, values):
        if values.get("metric_type") == MetricType.table:
            assert isinstance(values.get("view_type"), MetricTableViewType), \
                f"viewType must be of type {MetricTableViewType} for metricType:{MetricType.table.value}"
            assert isinstance(values.get("metric_of"), TableMetricOfType), \
                f"metricOf must be of type {TableMetricOfType} for metricType:{MetricType.table.value}"
            if values.get("metric_of") != TableMetricOfType.issues:
                assert values.get("metric_value") is None or len(values.get("metric_value")) == 0, \
                    f"metricValue is only available for metricOf:{TableMetricOfType.issues.value}"
        elif values.get("metric_type") == MetricType.timeseries:
            assert isinstance(values.get("view_type"), MetricTimeseriesViewType), \
                f"viewType must be of type {MetricTimeseriesViewType} for metricType:{MetricType.timeseries.value}"
            assert isinstance(values.get("metric_of"), TimeseriesMetricOfType), \
                f"metricOf must be of type {TimeseriesMetricOfType} for metricType:{MetricType.timeseries.value}"
        return values

    class Config:
        alias_generator = attribute_to_camel_case


class CustomMetricUpdateSeriesSchema(CustomMetricCreateSeriesSchema):
    series_id: Optional[int] = Field(None)

    class Config:
        alias_generator = attribute_to_camel_case


class UpdateCustomMetricsSchema(CreateCustomMetricsSchema):
    series: List[CustomMetricUpdateSeriesSchema] = Field(..., min_items=1)


class UpdateCustomMetricsStatusSchema(BaseModel):
    active: bool = Field(...)


class SavedSearchSchema(FunnelSchema):
    filter: FlatSessionsSearchPayloadSchema = Field([])
