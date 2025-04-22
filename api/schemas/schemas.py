from typing import Annotated, Any
from typing import Optional, List, Union, Literal

from pydantic import Field, EmailStr, HttpUrl, SecretStr, AnyHttpUrl
from pydantic import field_validator, model_validator, computed_field
from pydantic.functional_validators import BeforeValidator

from chalicelib.utils.TimeUTC import TimeUTC
from .overrides import BaseModel, Enum, ORUnion
from .transformers_validators import transform_email, remove_whitespace, remove_duplicate_values, single_to_list, \
    force_is_event, NAME_PATTERN, int_to_string, check_alphanumeric


class _GRecaptcha(BaseModel):
    g_recaptcha_response: Optional[str] = Field(default=None, alias='g-recaptcha-response')


class UserLoginSchema(_GRecaptcha):
    email: EmailStr = Field(...)
    password: SecretStr = Field(...)

    _transform_email = field_validator('email', mode='before')(transform_email)


class UserSignupSchema(UserLoginSchema):
    fullname: str = Field(..., min_length=1)
    organizationName: str = Field(..., min_length=1)

    _transform_fullname = field_validator('fullname', mode='before')(remove_whitespace)
    _transform_organizationName = field_validator('organizationName', mode='before')(remove_whitespace)

    _check_alphanumeric = field_validator('fullname', 'organizationName')(check_alphanumeric)


class EditAccountSchema(BaseModel):
    name: Optional[str] = Field(default=None)
    tenantName: Optional[str] = Field(default=None)
    opt_out: Optional[bool] = Field(default=None)

    _transform_name = field_validator('name', mode='before')(remove_whitespace)
    _transform_tenantName = field_validator('tenantName', mode='before')(remove_whitespace)
    _check_alphanumeric = field_validator('name', 'tenantName')(check_alphanumeric)


class ForgetPasswordPayloadSchema(_GRecaptcha):
    email: EmailStr = Field(...)

    _transform_email = field_validator('email', mode='before')(transform_email)


class EditUserPasswordSchema(BaseModel):
    old_password: SecretStr = Field(...)
    new_password: SecretStr = Field(...)


class CreateProjectSchema(BaseModel):
    name: str = Field(default="my first project", pattern=NAME_PATTERN)
    platform: Literal["web", "ios"] = Field(default="web")

    _transform_name = field_validator('name', mode='before')(remove_whitespace)


class ProjectContext(BaseModel):
    project_id: int = Field(..., gt=0)
    project_key: str = Field(...)
    name: str = Field(...)
    platform: Literal["web", "ios"] = Field(...)


class CurrentAPIContext(BaseModel):
    tenant_id: int = Field(...)
    project: Optional[ProjectContext] = Field(default=None)


class CurrentContext(CurrentAPIContext):
    user_id: int = Field(...)
    email: EmailStr = Field(...)
    role: str = Field(...)

    _transform_email = field_validator('email', mode='before')(transform_email)

    @computed_field
    @property
    def is_owner(self) -> bool:
        return self.role == "owner"

    @computed_field
    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @computed_field
    @property
    def is_member(self) -> bool:
        return self.role == "member"


class AddCollaborationSchema(BaseModel):
    name: str = Field(..., pattern=NAME_PATTERN)
    url: HttpUrl = Field(...)

    _transform_name = field_validator('name', mode='before')(remove_whitespace)
    _transform_url = field_validator('url', mode='before')(remove_whitespace)


class EditCollaborationSchema(AddCollaborationSchema):
    name: Optional[str] = Field(default=None, pattern=NAME_PATTERN)


class _TimedSchema(BaseModel):
    startTimestamp: int = Field(default=None)
    endTimestamp: int = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def transform_time(cls, values):
        if values.get("startTimestamp") is None and values.get("startDate") is not None:
            values["startTimestamp"] = values["startDate"]
        if values.get("endTimestamp") is None and values.get("endDate") is not None:
            values["endTimestamp"] = values["endDate"]
        return values

    @model_validator(mode="after")
    def __time_validator(self):
        if self.startTimestamp is not None:
            assert 0 <= self.startTimestamp, "startTimestamp must be greater or equal to 0"
        if self.endTimestamp is not None:
            assert 0 <= self.endTimestamp, "endTimestamp must be greater or equal to 0"
        if self.startTimestamp is not None and self.endTimestamp is not None:
            assert self.startTimestamp <= self.endTimestamp, \
                "endTimestamp must be greater or equal to startTimestamp"
        return self


class NotificationsViewSchema(_TimedSchema):
    ids: List[int] = Field(default_factory=list)
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
    processed_endpoint: AnyHttpUrl = Field(..., alias="endpoint")
    endpoint: Optional[str] = Field(default=None, doc_hidden=True)
    auth_header: Optional[str] = Field(default=None)
    name: str = Field(default="", max_length=100, pattern=NAME_PATTERN)

    _transform_name = field_validator('name', mode='before')(remove_whitespace)


class CreateMemberSchema(BaseModel):
    user_id: Optional[int] = Field(default=None)
    name: str = Field(...)
    email: EmailStr = Field(...)
    admin: Optional[bool] = Field(default=False)

    _transform_email = field_validator('email', mode='before')(transform_email)
    _transform_name = field_validator('name', mode='before')(remove_whitespace)


class EditMemberSchema(BaseModel):
    name: str = Field(...)
    email: EmailStr = Field(...)
    admin: bool = Field(default=False)

    _transform_email = field_validator('email', mode='before')(transform_email)
    _transform_name = field_validator('name', mode='before')(remove_whitespace)
    _check_alphanumeric = field_validator('name')(check_alphanumeric)


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
    region: bool = Field(default=False)


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
    api_key_id: Optional[str] = Field(default=None)
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


class _AlertMessageSchema(BaseModel):
    type: str = Field(...)
    value: str = Field(...)

    _transform_value = field_validator('value', mode='before')(int_to_string)


class AlertDetectionType(str, Enum):
    PERCENT = "percent"
    CHANGE = "change"


class _AlertOptionSchema(BaseModel):
    message: List[_AlertMessageSchema] = Field([])
    currentPeriod: Literal[15, 30, 60, 120, 240, 1440] = Field(...)
    previousPeriod: Literal[15, 30, 60, 120, 240, 1440] = Field(default=15)
    lastNotification: Optional[int] = Field(default=None)
    renotifyInterval: Optional[int] = Field(default=720)


class AlertColumn(str, Enum):
    PERFORMANCE__DOM_CONTENT_LOADED__AVERAGE = "performance.dom_content_loaded.average"
    PERFORMANCE__FIRST_MEANINGFUL_PAINT__AVERAGE = "performance.first_meaningful_paint.average"
    PERFORMANCE__PAGE_LOAD_TIME__AVERAGE = "performance.page_load_time.average"
    PERFORMANCE__DOM_BUILD_TIME__AVERAGE = "performance.dom_build_time.average"
    PERFORMANCE__SPEED_INDEX__AVERAGE = "performance.speed_index.average"
    PERFORMANCE__PAGE_RESPONSE_TIME__AVERAGE = "performance.page_response_time.average"
    PERFORMANCE__TTFB__AVERAGE = "performance.ttfb.average"
    PERFORMANCE__TIME_TO_RENDER__AVERAGE = "performance.time_to_render.average"
    PERFORMANCE__CRASHES__COUNT = "performance.crashes.count"
    ERRORS__JAVASCRIPT__COUNT = "errors.javascript.count"
    ERRORS__BACKEND__COUNT = "errors.backend.count"
    CUSTOM = "CUSTOM"


class MathOperator(str, Enum):
    EQUAL = "="
    LESS = "<"
    GREATER = ">"
    LESS_EQ = "<="
    GREATER_EQ = ">="


class _AlertQuerySchema(BaseModel):
    left: Union[AlertColumn, int] = Field(...)
    right: float = Field(...)
    operator: MathOperator = Field(...)


class AlertDetectionMethod(str, Enum):
    THRESHOLD = "threshold"
    CHANGE = "change"


class AlertSchema(BaseModel):
    name: str = Field(..., pattern=NAME_PATTERN)
    detection_method: AlertDetectionMethod = Field(...)
    change: Optional[AlertDetectionType] = Field(default=AlertDetectionType.CHANGE)
    description: Optional[str] = Field(default=None)
    options: _AlertOptionSchema = Field(...)
    query: _AlertQuerySchema = Field(...)
    series_id: Optional[int] = Field(default=None, doc_hidden=True)

    @model_validator(mode="after")
    def transform_alert(self):
        self.series_id = None
        if isinstance(self.query.left, int):
            self.series_id = self.query.left
            self.query.left = AlertColumn.CUSTOM

        return self


class SourcemapUploadPayloadSchema(BaseModel):
    urls: List[str] = Field(..., alias="URL")


class ErrorSource(str, Enum):
    JS_EXCEPTION = "js_exception"
    BUGSNAG = "bugsnag"
    CLOUDWATCH = "cloudwatch"
    DATADOG = "datadog"
    NEWRELIC = "newrelic"
    ROLLBAR = "rollbar"
    SENTRY = "sentry"
    STACKDRIVER = "stackdriver"
    SUMOLOGIC = "sumologic"


class EventType(str, Enum):
    CLICK = "click"
    INPUT = "input"
    LOCATION = "location"
    CUSTOM = "custom"
    REQUEST = "request"
    REQUEST_DETAILS = "fetch"
    GRAPHQL = "graphql"
    STATE_ACTION = "stateAction"
    ERROR = "error"
    TAG = "tag"
    CLICK_MOBILE = "clickMobile"
    INPUT_MOBILE = "inputMobile"
    VIEW_MOBILE = "viewMobile"
    CUSTOM_MOBILE = "customMobile"
    REQUEST_MOBILE = "requestMobile"
    ERROR_MOBILE = "errorMobile"
    SWIPE_MOBILE = "swipeMobile"


class PerformanceEventType(str, Enum):
    LOCATION_DOM_COMPLETE = "domComplete"
    LOCATION_LARGEST_CONTENTFUL_PAINT_TIME = "largestContentfulPaintTime"
    LOCATION_TTFB = "ttfb"
    LOCATION_AVG_CPU_LOAD = "avgCpuLoad"
    LOCATION_AVG_MEMORY_USAGE = "avgMemoryUsage"
    FETCH_FAILED = "fetchFailed"
    # fetch_duration = "FETCH_DURATION"


class FilterType(str, Enum):
    USER_OS = "userOs"
    USER_BROWSER = "userBrowser"
    USER_DEVICE = "userDevice"
    USER_COUNTRY = "userCountry"
    USER_CITY = "userCity"
    USER_STATE = "userState"
    USER_ID = "userId"
    USER_ANONYMOUS_ID = "userAnonymousId"
    REFERRER = "referrer"
    REV_ID = "revId"
    # IOS
    USER_OS_MOBILE = "userOsIos"
    USER_DEVICE_MOBILE = "userDeviceIos"
    USER_COUNTRY_MOBILE = "userCountryIos"
    USER_ID_MOBILE = "userIdIos"
    USER_ANONYMOUS_ID_MOBILE = "userAnonymousIdIos"
    REV_ID_MOBILE = "revIdIos"
    #
    DURATION = "duration"
    PLATFORM = "platform"
    METADATA = "metadata"
    ISSUE = "issue"
    EVENTS_COUNT = "eventsCount"
    UTM_SOURCE = "utmSource"
    UTM_MEDIUM = "utmMedium"
    UTM_CAMPAIGN = "utmCampaign"
    # Mobile conditions
    THERMAL_STATE = "thermalState"
    MAIN_THREAD_CPU = "mainThreadCPU"
    VIEW_COMPONENT = "viewComponent"
    LOG_EVENT = "logEvent"
    CLICK_EVENT = "clickEvent"
    MEMORY_USAGE = "memoryUsage"


class SearchEventOperator(str, Enum):
    IS = "is"
    IS_ANY = "isAny"
    ON = "on"
    ON_ANY = "onAny"
    IS_NOT = "isNot"
    IS_UNDEFINED = "isUndefined"
    NOT_ON = "notOn"
    CONTAINS = "contains"
    NOT_CONTAINS = "notContains"
    STARTS_WITH = "startsWith"
    ENDS_WITH = "endsWith"


class ClickEventExtraOperator(str, Enum):
    IS = "selectorIs"
    IS_ANY = "selectorIsAny"
    IS_NOT = "selectorIsNot"
    IS_UNDEFINED = "selectorIsUndefined"
    CONTAINS = "selectorContains"
    NOT_CONTAINS = "selectorNotContains"
    STARTS_WITH = "selectorStartsWith"
    ENDS_WITH = "selectorEndsWith"


class PlatformType(str, Enum):
    MOBILE = "mobile"
    DESKTOP = "desktop"
    TABLET = "tablet"


class SearchEventOrder(str, Enum):
    THEN = "then"
    OR = "or"
    AND = "and"


class IssueType(str, Enum):
    CLICK_RAGE = 'click_rage'
    DEAD_CLICK = 'dead_click'
    EXCESSIVE_SCROLLING = 'excessive_scrolling'
    BAD_REQUEST = 'bad_request'
    MISSING_RESOURCE = 'missing_resource'
    MEMORY = 'memory'
    CPU = 'cpu'
    SLOW_RESOURCE = 'slow_resource'
    SLOW_PAGE_LOAD = 'slow_page_load'
    CRASH = 'crash'
    CUSTOM = 'custom'
    JS_EXCEPTION = 'js_exception'
    MOUSE_THRASHING = 'mouse_thrashing'
    # IOS
    TAP_RAGE = 'tap_rage'


class MetricFormatType(str, Enum):
    SESSION_COUNT = 'sessionCount'


class MetricExtendedFormatType(str, Enum):
    SESSION_COUNT = 'sessionCount'
    USER_COUNT = 'userCount'


class FetchFilterType(str, Enum):
    FETCH_URL = "fetchUrl"
    FETCH_STATUS_CODE = "fetchStatusCode"
    FETCH_METHOD = "fetchMethod"
    FETCH_DURATION = "fetchDuration"
    FETCH_REQUEST_BODY = "fetchRequestBody"
    FETCH_RESPONSE_BODY = "fetchResponseBody"


class GraphqlFilterType(str, Enum):
    GRAPHQL_NAME = "graphqlName"
    GRAPHQL_METHOD = "graphqlMethod"
    GRAPHQL_REQUEST_BODY = "graphqlRequestBody"
    GRAPHQL_RESPONSE_BODY = "graphqlResponseBody"


class RequestGraphqlFilterSchema(BaseModel):
    type: Union[FetchFilterType, GraphqlFilterType] = Field(...)
    value: List[Union[int, str]] = Field(...)
    operator: Union[SearchEventOperator, MathOperator] = Field(...)

    @model_validator(mode="before")
    @classmethod
    def _transform_data(cls, values):
        if values.get("type") in [FetchFilterType.FETCH_DURATION, FetchFilterType.FETCH_STATUS_CODE]:
            values["value"] = [int(v) for v in values["value"] if v is not None and str(v).isnumeric()]
        return values


class SessionSearchEventSchema2(BaseModel):
    is_event: Literal[True] = True
    value: List[Union[str, int]] = Field(...)
    type: Union[EventType, PerformanceEventType] = Field(...)
    operator: Union[SearchEventOperator, ClickEventExtraOperator] = Field(...)
    source: Optional[List[Union[ErrorSource, int, str]]] = Field(default=None)
    sourceOperator: Optional[MathOperator] = Field(default=None)
    filters: Optional[List[RequestGraphqlFilterSchema]] = Field(default_factory=list)

    _remove_duplicate_values = field_validator('value', mode='before')(remove_duplicate_values)
    _single_to_list_values = field_validator('value', mode='before')(single_to_list)

    @model_validator(mode="after")
    def event_validator(self):
        if isinstance(self.type, PerformanceEventType):
            if self.type == PerformanceEventType.FETCH_FAILED:
                return self

            assert self.sourceOperator is not None, \
                "sourceOperator should not be null for PerformanceEventType"
            assert self.source is not None, f"source is required for {self.type}"
            assert isinstance(self.source, list), f"source of type list is required for {self.type}"
            for c in self.source:
                assert isinstance(c, int), f"source value should be of type int for {self.type}"
        elif self.type == EventType.ERROR and self.source is None:
            self.source = [ErrorSource.JS_EXCEPTION]
        elif self.type == EventType.REQUEST_DETAILS:
            assert isinstance(self.filters, List) and len(self.filters) > 0, \
                f"filters should be defined for {EventType.REQUEST_DETAILS}"
        elif self.type == EventType.GRAPHQL:
            assert isinstance(self.filters, List) and len(self.filters) > 0, \
                f"filters should be defined for {EventType.GRAPHQL}"

        if isinstance(self.operator, ClickEventExtraOperator):
            assert self.type == EventType.CLICK, \
                f"operator:{self.operator} is only available for event-type: {EventType.CLICK}"
        return self


class SessionSearchFilterSchema(BaseModel):
    is_event: Literal[False] = False
    value: List[Union[IssueType, PlatformType, int, str]] = Field(default_factory=list)
    type: FilterType = Field(...)
    operator: Union[SearchEventOperator, MathOperator] = Field(...)
    source: Optional[Union[ErrorSource, str]] = Field(default=None)

    _remove_duplicate_values = field_validator('value', mode='before')(remove_duplicate_values)
    _single_to_list_values = field_validator('value', mode='before')(single_to_list)

    @model_validator(mode="before")
    @classmethod
    def _transform_data(cls, values):
        if values.get("source") is not None:
            if isinstance(values["source"], list):
                if len(values["source"]) == 0:
                    values["source"] = None
                elif len(values["source"]) == 1:
                    values["source"] = values["source"][0]
                else:
                    raise ValueError(f"Unsupported multi-values source")
        return values

    @model_validator(mode="after")
    def filter_validator(self):
        if self.type == FilterType.METADATA:
            assert self.source is not None and len(self.source) > 0, \
                "must specify a valid 'source' for metadata filter"
        elif self.type == FilterType.ISSUE:
            for i, v in enumerate(self.value):
                if IssueType.has_value(v):
                    self.value[i] = IssueType(v)
                else:
                    raise ValueError(f"value should be of type IssueType for {self.type} filter")
        elif self.type == FilterType.PLATFORM:
            for i, v in enumerate(self.value):
                if PlatformType.has_value(v):
                    self.value[i] = PlatformType(v)
                else:
                    raise ValueError(f"value should be of type PlatformType for {self.type} filter")
        elif self.type == FilterType.EVENTS_COUNT:
            if MathOperator.has_value(self.operator):
                self.operator = MathOperator(self.operator)
            else:
                raise ValueError(f"operator should be of type MathOperator for {self.type} filter")

            for v in self.value:
                assert isinstance(v, int), f"value should be of type int for {self.type} filter"
        else:
            if SearchEventOperator.has_value(self.operator):
                self.operator = SearchEventOperator(self.operator)
            else:
                raise ValueError(f"operator should be of type SearchEventOperator for {self.type} filter")

        return self


class _PaginatedSchema(BaseModel):
    limit: int = Field(default=200, gt=0, le=200)
    page: int = Field(default=1, gt=0)


class SortOrderType(str, Enum):
    ASC = "ASC"
    DESC = "DESC"


def add_missing_is_event(values: dict):
    if values.get("isEvent") is None:
        values["isEvent"] = (EventType.has_value(values["type"])
                             or PerformanceEventType.has_value(values["type"])
                             or ProductAnalyticsSelectedEventType.has_value(values["type"]))
    return values


# this type is created to allow mixing events&filters and specifying a discriminator
GroupedFilterType = Annotated[Union[SessionSearchFilterSchema, SessionSearchEventSchema2],
Field(discriminator='is_event'), BeforeValidator(add_missing_is_event)]


class SessionsSearchPayloadSchema(_TimedSchema, _PaginatedSchema):
    events: List[SessionSearchEventSchema2] = Field(default_factory=list, doc_hidden=True)
    filters: List[GroupedFilterType] = Field(default_factory=list)
    sort: str = Field(default="startTs")
    order: SortOrderType = Field(default=SortOrderType.DESC)
    events_order: Optional[SearchEventOrder] = Field(default=SearchEventOrder.THEN)
    group_by_user: bool = Field(default=False)
    bookmarked: bool = Field(default=False)

    @model_validator(mode="before")
    @classmethod
    def transform_order(cls, values):
        if values.get("sort") is None:
            values["sort"] = "startTs"

        if values.get("order") is None:
            values["order"] = SortOrderType.DESC
        else:
            values["order"] = values["order"].upper()
        return values

    @model_validator(mode="before")
    @classmethod
    def add_missing_attributes(cls, values):
        # in case isEvent is wrong:
        for f in values.get("filters") or []:
            if EventType.has_value(f["type"]) and not f.get("isEvent"):
                f["isEvent"] = True
            elif FilterType.has_value(f["type"]) and f.get("isEvent"):
                f["isEvent"] = False

        # in case the old search payload was passed
        for v in values.get("events") or []:
            v["isEvent"] = True

        return values

    @model_validator(mode="before")
    @classmethod
    def remove_wrong_filter_values(cls, values):
        for f in values.get("filters", []):
            vals = []
            for v in f.get("value", []):
                if f.get("type", "") == FilterType.DURATION.value and v is None:
                    v = 0
                if v is not None and (f.get("type", "") != FilterType.DURATION.value
                                      or str(v).isnumeric()):
                    vals.append(v)
            f["value"] = vals
        return values

    @model_validator(mode="after")
    def split_filters_events(self):
        n_filters = []
        n_events = []
        for v in self.filters:
            if v.is_event:
                n_events.append(v)
            else:
                n_filters.append(v)
        self.events = n_events
        self.filters = n_filters
        return self

    @field_validator("filters", mode="after")
    @classmethod
    def merge_identical_filters(cls, values):
        # ignore 'issue' type as it could be used for step-filters and tab-filters at the same time
        i = 0
        while i < len(values):
            if values[i].is_event or values[i].type == FilterType.ISSUE:
                if values[i].type == FilterType.ISSUE:
                    values[i] = remove_duplicate_values(values[i])
                i += 1
                continue
            j = i + 1
            while j < len(values):
                if values[i].type == values[j].type \
                        and values[i].operator == values[j].operator \
                        and (values[i].type != FilterType.METADATA or values[i].source == values[j].source):
                    values[i].value += values[j].value
                    del values[j]
                else:
                    j += 1
            values[i] = remove_duplicate_values(values[i])
            i += 1

        return values


class ErrorStatus(str, Enum):
    ALL = 'all'
    UNRESOLVED = 'unresolved'
    RESOLVED = 'resolved'
    IGNORED = 'ignored'


class ErrorSort(str, Enum):
    OCCURRENCE = 'occurrence'
    USERS_COUNT = 'users'
    SESSIONS_COUNT = 'sessions'


class SearchErrorsSchema(SessionsSearchPayloadSchema):
    sort: ErrorSort = Field(default=ErrorSort.OCCURRENCE)
    density: Optional[int] = Field(default=7)
    status: Optional[ErrorStatus] = Field(default=ErrorStatus.ALL)
    query: Optional[str] = Field(default=None)


class ProductAnalyticsSelectedEventType(str, Enum):
    CLICK = EventType.CLICK.value
    INPUT = EventType.INPUT.value
    LOCATION = EventType.LOCATION.value
    CUSTOM_EVENT = EventType.CUSTOM.value


class PathAnalysisSubFilterSchema(BaseModel):
    is_event: Literal[True] = True
    value: List[str] = Field(...)
    type: ProductAnalyticsSelectedEventType = Field(...)
    operator: Union[SearchEventOperator, ClickEventExtraOperator] = Field(...)

    _remove_duplicate_values = field_validator('value', mode='before')(remove_duplicate_values)

    @model_validator(mode="before")
    @classmethod
    def __force_is_event(cls, values):
        values["isEvent"] = True
        return values


class _ProductAnalyticsFilter(BaseModel):
    is_event: Literal[False] = False
    type: FilterType
    operator: Union[SearchEventOperator, ClickEventExtraOperator, MathOperator] = Field(...)
    value: List[Union[IssueType, PlatformType, int, str]] = Field(...)
    source: Optional[str] = Field(default=None)

    _remove_duplicate_values = field_validator('value', mode='before')(remove_duplicate_values)


class _ProductAnalyticsEventFilter(BaseModel):
    is_event: Literal[True] = True
    type: ProductAnalyticsSelectedEventType
    operator: Union[SearchEventOperator, ClickEventExtraOperator, MathOperator] = Field(...)
    # TODO: support session metadata filters
    value: List[Union[IssueType, PlatformType, int, str]] = Field(...)

    _remove_duplicate_values = field_validator('value', mode='before')(remove_duplicate_values)


# this type is created to allow mixing events&filters and specifying a discriminator for PathAnalysis series filter
ProductAnalyticsFilter = Annotated[Union[_ProductAnalyticsFilter, _ProductAnalyticsEventFilter],
Field(discriminator='is_event')]


class PathAnalysisSchema(_TimedSchema, _PaginatedSchema):
    density: int = Field(default=7)
    filters: List[ProductAnalyticsFilter] = Field(default_factory=list)
    type: Optional[str] = Field(default=None)

    _transform_filters = field_validator('filters', mode='before') \
        (force_is_event(events_enum=[ProductAnalyticsSelectedEventType]))


class MobileSignPayloadSchema(BaseModel):
    keys: List[str] = Field(...)


class CardSeriesFilterSchema(SearchErrorsSchema):
    sort: Optional[str] = Field(default=None)
    order: SortOrderType = Field(default=SortOrderType.DESC)
    group_by_user: Literal[False] = False


class CardSeriesSchema(BaseModel):
    series_id: Optional[int] = Field(default=None)
    name: Optional[str] = Field(default=None)
    index: Optional[int] = Field(default=None)
    filter: Optional[CardSeriesFilterSchema] = Field(default=None)


class MetricTimeseriesViewType(str, Enum):
    LINE_CHART = "lineChart"
    AREA_CHART = "areaChart"
    BAR_CHART = "barChart"
    PROGRESS_CHART = "progressChart"
    PIE_CHART = "pieChart"
    METRIC_CHART = "metric"
    TABLE_CHART = "table"


class MetricTableViewType(str, Enum):
    TABLE_CHART = "table"


class MetricOtherViewType(str, Enum):
    OTHER_CHART = "chart"
    COLUMN_CHART = "columnChart"
    METRIC_CHART = "metric"
    TABLE_CHART = "table"
    LIST_CHART = "list"


class MetricType(str, Enum):
    TIMESERIES = "timeseries"
    TABLE = "table"
    FUNNEL = "funnel"
    PATH_ANALYSIS = "pathAnalysis"
    RETENTION = "retention"
    STICKINESS = "stickiness"
    HEAT_MAP = "heatMap"


class MetricOfTable(str, Enum):
    USER_BROWSER = FilterType.USER_BROWSER.value
    USER_DEVICE = FilterType.USER_DEVICE.value
    USER_COUNTRY = FilterType.USER_COUNTRY.value
    USER_ID = FilterType.USER_ID.value
    ISSUES = FilterType.ISSUE.value
    VISITED_URL = "location"
    SESSIONS = "sessions"
    ERRORS = "jsException"
    REFERRER = "referrer"
    FETCH = EventType.REQUEST_DETAILS.value


class MetricOfTimeseries(str, Enum):
    SESSION_COUNT = "sessionCount"
    USER_COUNT = "userCount"


class MetricOfFunnels(str, Enum):
    SESSION_COUNT = MetricOfTimeseries.SESSION_COUNT.value


class MetricOfHeatMap(str, Enum):
    HEAT_MAP_URL = "heatMapUrl"


class MetricOfPathAnalysis(str, Enum):
    session_count = MetricOfTimeseries.SESSION_COUNT.value


# class CardSessionsSchema(SessionsSearchPayloadSchema):
class CardSessionsSchema(_TimedSchema, _PaginatedSchema):
    startTimestamp: int = Field(default=TimeUTC.now(-7))
    endTimestamp: int = Field(default=TimeUTC.now())
    density: int = Field(default=7, ge=1, le=200)
    series: List[CardSeriesSchema] = Field(default_factory=list)

    # events: List[SessionSearchEventSchema2] = Field(default_factory=list, doc_hidden=True)
    filters: List[GroupedFilterType] = Field(default_factory=list)

    compare_to: Optional[List[str]] = Field(default=None)

    # Used mainly for PathAnalysis, and could be used by other cards
    hide_excess: Optional[bool] = Field(default=False, description="Hide extra values")

    _transform_filters = field_validator('filters', mode='before') \
        (force_is_event(events_enum=[EventType, PerformanceEventType]))

    @model_validator(mode="before")
    @classmethod
    def remove_wrong_filter_values(cls, values):
        for f in values.get("filters", []):
            vals = []
            for v in f.get("value", []):
                if v is not None:
                    vals.append(v)
            f["value"] = vals
        return values

    @model_validator(mode="before")
    @classmethod
    def __enforce_default(cls, values):
        if values.get("startTimestamp") is None:
            values["startTimestamp"] = TimeUTC.now(-7)

        if values.get("endTimestamp") is None:
            values["endTimestamp"] = TimeUTC.now()

        return values

    @model_validator(mode="after")
    def __enforce_default_after(self):
        for s in self.series:
            if s.filter is not None:
                s.filter.limit = self.limit
                s.filter.page = self.page
                s.filter.startTimestamp = self.startTimestamp
                s.filter.endTimestamp = self.endTimestamp

        return self

    # UI is expecting filters to override the full series' filters
    @model_validator(mode="after")
    def __override_series_filters_with_outer_filters(self):
        if len(self.filters) > 0:
            events = []
            filters = []
            for f in self.filters:
                if f.is_event:
                    events.append(f)
                else:
                    filters.append(f)
            for s in self.series:
                s.filter.events = events
                s.filter.filters = filters
        self.filters = []
        return self


class CardConfigSchema(BaseModel):
    col: Optional[int] = Field(default=None)
    row: Optional[int] = Field(default=2)
    position: Optional[int] = Field(default=0)


class __CardSchema(CardSessionsSchema):
    name: Optional[str] = Field(default=None)
    is_public: bool = Field(default=True)
    default_config: CardConfigSchema = Field(default=CardConfigSchema(), alias="config")
    thumbnail: Optional[str] = Field(default=None)
    metric_format: Optional[MetricFormatType] = Field(default=None)
    view_type: Any
    metric_type: MetricType = Field(...)
    metric_of: Any
    metric_value: List[IssueType] = Field(default_factory=list)
    # This is used to save the selected session for heatmaps
    session_id: Optional[int] = Field(default=None)
    # This is used to specify the number of top values for PathAnalysis
    rows: int = Field(default=3, ge=1, le=10)


class CardTimeSeries(__CardSchema):
    metric_type: Literal[MetricType.TIMESERIES]
    metric_of: MetricOfTimeseries = Field(default=MetricOfTimeseries.SESSION_COUNT)
    view_type: MetricTimeseriesViewType

    @model_validator(mode="before")
    @classmethod
    def __enforce_default(cls, values):
        values["metricValue"] = []
        return values

    @model_validator(mode="after")
    def __transform(self):
        self.metric_of = MetricOfTimeseries(self.metric_of)
        return self


class CardTable(__CardSchema):
    metric_type: Literal[MetricType.TABLE]
    metric_of: MetricOfTable = Field(default=MetricOfTable.USER_ID)
    view_type: MetricTableViewType = Field(...)
    metric_format: MetricExtendedFormatType = Field(default=MetricExtendedFormatType.SESSION_COUNT)

    @model_validator(mode="before")
    @classmethod
    def __enforce_default(cls, values):
        if values.get("metricOf") is not None and values.get("metricOf") != MetricOfTable.ISSUES:
            values["metricValue"] = []
        return values

    @model_validator(mode="after")
    def __enforce_AND_operator(self):
        self.metric_of = MetricOfTable(self.metric_of)
        if self.metric_of in (MetricOfTable.VISITED_URL, MetricOfTable.FETCH, \
                              MetricOfTable.VISITED_URL.value, MetricOfTable.FETCH.value):
            for s in self.series:
                if s.filter is not None:
                    s.filter.events_order = SearchEventOrder.AND
        return self

    @model_validator(mode="after")
    def __transform(self):
        self.metric_of = MetricOfTable(self.metric_of)
        return self

    @model_validator(mode="after")
    def __validator(self):
        if self.metric_of not in (MetricOfTable.ISSUES, MetricOfTable.USER_BROWSER,
                                  MetricOfTable.USER_DEVICE, MetricOfTable.USER_COUNTRY,
                                  MetricOfTable.VISITED_URL, MetricOfTable.REFERRER,
                                  MetricOfTable.FETCH):
            assert self.metric_format == MetricExtendedFormatType.SESSION_COUNT, \
                f'metricFormat:{MetricExtendedFormatType.USER_COUNT.value} is not supported for this metricOf'
        return self


class CardFunnel(__CardSchema):
    metric_type: Literal[MetricType.FUNNEL]
    metric_of: MetricOfFunnels = Field(default=MetricOfFunnels.SESSION_COUNT)
    view_type: MetricOtherViewType = Field(...)
    metric_format: MetricExtendedFormatType = Field(default=MetricExtendedFormatType.SESSION_COUNT)

    @model_validator(mode="before")
    @classmethod
    def __enforce_default(cls, values):
        if values.get("metricOf") and not MetricOfFunnels.has_value(values["metricOf"]):
            values["metricOf"] = MetricOfFunnels.SESSION_COUNT
        # values["viewType"] = MetricOtherViewType.OTHER_CHART
        if values.get("series") is not None and len(values["series"]) > 0:
            values["series"] = [values["series"][0]]
        return values

    @model_validator(mode="after")
    def __transform(self):
        self.metric_of = MetricOfFunnels(self.metric_of)
        return self


class CardHeatMap(__CardSchema):
    metric_type: Literal[MetricType.HEAT_MAP]
    metric_of: MetricOfHeatMap = Field(default=MetricOfHeatMap.HEAT_MAP_URL)
    view_type: MetricOtherViewType = Field(...)

    @model_validator(mode="before")
    @classmethod
    def __enforce_default(cls, values):
        return values

    @model_validator(mode="after")
    def __transform(self):
        self.metric_of = MetricOfHeatMap(self.metric_of)
        return self


class CardPathAnalysisSeriesSchema(CardSeriesSchema):
    name: Optional[str] = Field(default=None)
    filter: PathAnalysisSchema = Field(...)
    density: int = Field(default=4, ge=2, le=10)

    @model_validator(mode="before")
    @classmethod
    def __enforce_default(cls, values):
        if values.get("filter") is None and values.get("startTimestamp") and values.get("endTimestamp"):
            values["filter"] = PathAnalysisSchema(startTimestamp=values["startTimestamp"],
                                                  endTimestamp=values["endTimestamp"],
                                                  density=values.get("density", 4))
        return values


class CardPathAnalysis(__CardSchema):
    metric_type: Literal[MetricType.PATH_ANALYSIS]
    metric_of: MetricOfPathAnalysis = Field(default=MetricOfPathAnalysis.session_count)
    view_type: MetricOtherViewType = Field(...)
    metric_value: List[ProductAnalyticsSelectedEventType] = Field(default_factory=list)
    density: int = Field(default=4, ge=2, le=10)
    rows: int = Field(default=5, ge=1, le=10)

    start_type: Literal["start", "end"] = Field(default="start")
    start_point: List[PathAnalysisSubFilterSchema] = Field(default_factory=list)
    excludes: List[PathAnalysisSubFilterSchema] = Field(default_factory=list)

    series: List[CardPathAnalysisSeriesSchema] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def __enforce_default(cls, values):
        values["viewType"] = MetricOtherViewType.OTHER_CHART.value
        if values.get("series") is not None and len(values["series"]) > 0:
            values["series"] = [values["series"][0]]
        return values

    @model_validator(mode="after")
    def __clean_start_point_and_enforce_metric_value(self):
        start_point = []
        for s in self.start_point:
            if len(s.value) == 0:
                continue
            start_point.append(s)
            # self.metric_value.append(s.type)

        self.start_point = start_point
        # self.metric_value = remove_duplicate_values(self.metric_value)

        return self

    @model_validator(mode="after")
    def __validator(self):
        s_e_values = {}
        exclude_values = {}
        for f in self.start_point:
            s_e_values[f.type] = s_e_values.get(f.type, []) + f.value

        for f in self.excludes:
            exclude_values[f.type] = exclude_values.get(f.type, []) + f.value

        assert len(
            self.start_point) <= 1, \
            f"Only 1 startPoint with multiple values OR 1 endPoint with multiple values is allowed"
        for t in exclude_values:
            for v in t:
                assert v not in s_e_values.get(t, []), f"startPoint and endPoint cannot be excluded, value: {v}"

        return self


# Union of cards-schemas that doesn't change between FOSS and EE
__cards_union_base = Union[
    CardTimeSeries, CardTable, CardFunnel, CardHeatMap, CardPathAnalysis]
CardSchema = ORUnion(__cards_union_base, discriminator='metric_type')


class UpdateCardStatusSchema(BaseModel):
    active: bool = Field(...)


class SavedSearchSchema(BaseModel):
    name: str = Field(...)
    is_public: bool = Field(default=False)
    filter: SessionsSearchPayloadSchema = Field([])


class ProjectConditions(BaseModel):
    condition_id: Optional[int] = Field(default=None)
    name: str = Field(...)
    capture_rate: int = Field(..., ge=0, le=100)
    filters: List[GroupedFilterType] = Field(default_factory=list)


class ProjectSettings(BaseModel):
    rate: int = Field(..., ge=0, le=100)
    conditional_capture: bool = Field(default=False)
    conditions: List[ProjectConditions] = Field(default_factory=list)


class CreateDashboardSchema(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = Field(default='')
    is_public: bool = Field(default=False)
    is_pinned: bool = Field(default=False)
    metrics: Optional[List[int]] = Field(default_factory=list)


class EditDashboardSchema(CreateDashboardSchema):
    is_public: Optional[bool] = Field(default=None)
    is_pinned: Optional[bool] = Field(default=None)


class UpdateWidgetPayloadSchema(BaseModel):
    config: dict = Field(default_factory=dict)


class AddWidgetToDashboardPayloadSchema(UpdateWidgetPayloadSchema):
    metric_id: int = Field(...)


class TemplatePredefinedUnits(str, Enum):
    MILLISECOND = "ms"
    SECOND = "s"
    MINUTE = "min"
    MEMORY = "mb"
    FRAME = "f/s"
    PERCENTAGE = "%"
    COUNT = "count"


class LiveFilterType(str, Enum):
    USER_OS = FilterType.USER_OS.value
    USER_BROWSER = FilterType.USER_BROWSER.value
    USER_DEVICE = FilterType.USER_DEVICE.value
    USER_COUNTRY = FilterType.USER_COUNTRY.value
    USER_CITY = FilterType.USER_CITY.value
    USER_STATE = FilterType.USER_STATE.value
    USER_ID = FilterType.USER_ID.value
    USER_ANONYMOUS_ID = FilterType.USER_ANONYMOUS_ID.value
    REV_ID = FilterType.REV_ID.value
    PLATFORM = FilterType.PLATFORM.value
    PAGE_TITLE = "pageTitle"
    SESSION_ID = "sessionId"
    METADATA = FilterType.METADATA.value
    USER_UUID = "userUuid"
    TRACKER_VERSION = "trackerVersion"
    USER_BROWSER_VERSION = "userBrowserVersion"
    USER_DEVICE_TYPE = "userDeviceType"


class LiveSessionSearchFilterSchema(BaseModel):
    value: Union[List[str], str] = Field(...)
    type: LiveFilterType = Field(...)
    source: Optional[str] = Field(default=None)
    operator: Literal[SearchEventOperator.IS, SearchEventOperator.CONTAINS] \
        = Field(default=SearchEventOperator.CONTAINS)

    @model_validator(mode="after")
    def __validator(self):
        if self.type is not None and self.type == LiveFilterType.METADATA:
            assert self.source is not None, "source should not be null for METADATA type"
            assert len(self.source) > 0, "source should not be empty for METADATA type"
        return self


class LiveSessionsSearchPayloadSchema(_PaginatedSchema):
    filters: List[LiveSessionSearchFilterSchema] = Field([])
    sort: Union[LiveFilterType, str] = Field(default="TIMESTAMP")
    order: SortOrderType = Field(default=SortOrderType.DESC)

    @model_validator(mode="before")
    @classmethod
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
                if i.get("type") == LiveFilterType.PLATFORM:
                    i["type"] = LiveFilterType.USER_DEVICE_TYPE
        if values.get("sort") is not None:
            if values["sort"].lower() == "startts":
                values["sort"] = "TIMESTAMP"
        return values


class IntegrationType(str, Enum):
    GITHUB = "GITHUB"
    JIRA = "JIRA"
    SLACK = "SLACK"
    MS_TEAMS = "MSTEAMS"
    SENTRY = "SENTRY"
    BUGSNAG = "BUGSNAG"
    ROLLBAR = "ROLLBAR"
    ELASTICSEARCH = "ELASTICSEARCH"
    DATADOG = "DATADOG"
    SUMOLOGIC = "SUMOLOGIC"
    STACKDRIVER = "STACKDRIVER"
    CLOUDWATCH = "CLOUDWATCH"
    NEWRELIC = "NEWRELIC"
    DYNATRACE = "DYNATRACE"


class SearchNoteSchema(_PaginatedSchema):
    sort: str = Field(default="createdAt")
    order: SortOrderType = Field(default=SortOrderType.DESC)
    tags: Optional[List[str]] = Field(default_factory=list)
    shared_only: bool = Field(default=False)
    mine_only: bool = Field(default=False)
    search: Optional[str] = Field(default=None)


class SessionNoteSchema(BaseModel):
    message: Optional[str] = Field(None, max_length=250)
    tag: Optional[str] = Field(default=None)
    timestamp: int = Field(default=-1)
    is_public: bool = Field(default=False)
    thumbnail: Optional[str] = Field(default=None)
    start_at: int = Field(default=None)
    end_at: int = Field(default=None)


class SessionUpdateNoteSchema(SessionNoteSchema):
    message: Optional[str] = Field(default=None, min_length=2)
    timestamp: Optional[int] = Field(default=None, ge=-1)
    is_public: Optional[bool] = Field(default=None)

    @model_validator(mode="after")
    def __validator(self):
        assert self.message is not None or self.timestamp is not None or self.is_public is not None, \
            "at least 1 attribute should be provided for update"
        return self


class WebhookType(str, Enum):
    WEBHOOK = "webhook"
    SLACK = "slack"
    EMAIL = "email"
    MSTEAMS = "msteams"


class SearchCardsSchema(_PaginatedSchema):
    order: SortOrderType = Field(default=SortOrderType.DESC)
    shared_only: bool = Field(default=False)
    mine_only: bool = Field(default=False)
    query: Optional[str] = Field(default=None)


class MetricSortColumnType(str, Enum):
    NAME = "name"
    METRIC_TYPE = "metric_type"
    METRIC_OF = "metric_of"
    IS_PUBLIC = "is_public"
    CREATED_AT = "created_at"
    EDITED_AT = "edited_at"


class MetricFilterColumnType(str, Enum):
    NAME = "name"
    METRIC_TYPE = "metric_type"
    METRIC_OF = "metric_of"
    IS_PUBLIC = "is_public"
    USER_ID = "user_id"
    CREATED_AT = "created_at"
    EDITED_AT = "edited_at"


class MetricListSort(BaseModel):
    field: Optional[str] = Field(default=None)
    order: Optional[str] = Field(default=SortOrderType.DESC)


class MetricFilter(BaseModel):
    type: Optional[str] = Field(default=None)
    query: Optional[str] = Field(default=None)


class MetricSearchSchema(_PaginatedSchema):
    filter: Optional[MetricFilter] = Field(default=None)
    sort: Optional[MetricListSort] = Field(default=MetricListSort())
    shared_only: bool = Field(default=False)
    mine_only: bool = Field(default=False)


class _HeatMapSearchEventRaw(SessionSearchEventSchema2):
    type: Literal[EventType.LOCATION] = Field(...)


class HeatMapSessionsSearch(SessionsSearchPayloadSchema):
    events: Optional[List[_HeatMapSearchEventRaw]] = Field(default_factory=list)
    filters: List[Union[SessionSearchFilterSchema, _HeatMapSearchEventRaw]] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def __transform(cls, values):
        for f in values.get("filters", []):
            if f.get("type") == FilterType.DURATION:
                return values
        values["filters"] = values.get("filters", [])
        values["filters"].append({"value": [5000], "type": FilterType.DURATION,
                                  "operator": SearchEventOperator.IS, "filters": []})
        return values


class HeatMapFilterSchema(BaseModel):
    value: List[Literal[IssueType.CLICK_RAGE, IssueType.DEAD_CLICK]] = Field(default_factory=list)
    type: Literal[FilterType.ISSUE] = Field(...)
    operator: Literal[SearchEventOperator.IS, MathOperator.EQUAL] = Field(...)


class GetHeatMapPayloadSchema(_TimedSchema):
    url: Optional[str] = Field(default=None)
    filters: List[HeatMapFilterSchema] = Field(default_factory=list)
    click_rage: bool = Field(default=False)
    operator: Literal[SearchEventOperator.IS, SearchEventOperator.STARTS_WITH,
    SearchEventOperator.CONTAINS, SearchEventOperator.ENDS_WITH] = Field(default=SearchEventOperator.STARTS_WITH)


class GetClickMapPayloadSchema(GetHeatMapPayloadSchema):
    pass


class FeatureFlagVariant(BaseModel):
    variant_id: Optional[int] = Field(default=None)
    value: str = Field(...)
    description: Optional[str] = Field(default=None)
    payload: Optional[str] = Field(default=None)
    rollout_percentage: Optional[int] = Field(default=0, ge=0, le=100)


class FeatureFlagConditionFilterSchema(BaseModel):
    is_event: Literal[False] = False
    type: FilterType = Field(...)
    value: List[str] = Field(default_factory=list, min_length=1)
    operator: Union[SearchEventOperator, MathOperator] = Field(...)
    source: Optional[str] = Field(default=None)
    sourceOperator: Optional[Union[SearchEventOperator, MathOperator]] = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def __force_is_event(cls, values):
        values["isEvent"] = False
        return values


class FeatureFlagCondition(BaseModel):
    condition_id: Optional[int] = Field(default=None)
    name: str = Field(...)
    rollout_percentage: Optional[int] = Field(default=0)
    filters: List[FeatureFlagConditionFilterSchema] = Field(default_factory=list)


class SearchFlagsSchema(_PaginatedSchema):
    limit: int = Field(default=15, gt=0, le=200)
    user_id: Optional[int] = Field(default=None)
    order: SortOrderType = Field(default=SortOrderType.DESC)
    query: Optional[str] = Field(default=None)
    is_active: Optional[bool] = Field(default=None)


class FeatureFlagType(str, Enum):
    SINGLE_VARIANT = "single"
    MULTI_VARIANT = "multi"


class FeatureFlagStatus(BaseModel):
    is_active: bool = Field(...)


class FeatureFlagSchema(BaseModel):
    payload: Optional[str] = Field(default=None)
    flag_key: str = Field(..., pattern=r'^[a-zA-Z0-9\-]+$')
    description: Optional[str] = Field(default=None)
    flag_type: FeatureFlagType = Field(default=FeatureFlagType.SINGLE_VARIANT)
    is_persist: Optional[bool] = Field(default=False)
    is_active: Optional[bool] = Field(default=True)
    conditions: List[FeatureFlagCondition] = Field(default_factory=list, min_length=1)
    variants: List[FeatureFlagVariant] = Field(default_factory=list)


class ModuleType(str, Enum):
    ASSIST = "assist"
    NOTES = "notes"
    BUG_REPORTS = "bug-reports"
    OFFLINE_RECORDINGS = "offline-recordings"
    ALERTS = "alerts"
    ASSIST_STATS = "assist-stats"
    RECOMMENDATIONS = "recommendations"
    FEATURE_FLAGS = "feature-flags"
    USABILITY_TESTS = "usability-tests"


class ModuleStatus(BaseModel):
    module: ModuleType = Field(...)
    status: bool = Field(...)


class TagUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, pattern='^[a-zA-Z0-9\" -]*$')


class TagCreate(TagUpdate):
    selector: str = Field(..., min_length=1, max_length=255)
    ignoreClickRage: bool = Field(default=False)
    ignoreDeadClick: bool = Field(default=False)


class ScopeSchema(BaseModel):
    scope: int = Field(default=1, ge=1, le=2)
