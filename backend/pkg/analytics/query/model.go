package query

type Table string
type Column string
type MetricType string
type FilterType string
type EventOrder string

const (
	TableEvents   Table = "product_analytics.events"
	TableSessions Table = "experimental.sessions"
)

const (
	ColEventTime       Column = "main.created_at"
	ColEventName       Column = "main.`$event_name`"
	ColEventProjectID  Column = "main.project_id"
	ColEventProperties Column = "main.`$properties`"
	ColEventSessionID  Column = "main.session_id"
	ColEventURLPath    Column = "main.url_path"
	ColEventStatus     Column = "main.status"
)

const (
	ColSessionID        Column = "s.session_id"
	ColDuration         Column = "s.duration"
	ColUserCountry      Column = "s.user_country"
	ColUserCity         Column = "s.user_city"
	ColUserState        Column = "s.user_state"
	ColUserID           Column = "s.user_id"
	ColUserAnonymousID  Column = "s.user_anonymous_id"
	ColUserOS           Column = "s.user_os"
	ColUserBrowser      Column = "s.user_browser"
	ColUserDevice       Column = "s.user_device"
	ColUserDeviceType   Column = "s.user_device_type"
	ColRevID            Column = "s.rev_id"
	ColBaseReferrer     Column = "s.base_referrer"
	ColUtmSource        Column = "s.utm_source"
	ColUtmMedium        Column = "s.utm_medium"
	ColUtmCampaign      Column = "s.utm_campaign"
	ColMetadata1        Column = "s.metadata_1"
	ColSessionProjectID Column = "s.project_id"
	ColSessionIsNotNull Column = "isNotNull(s.duration)"
)

const (
	MetricTypeTimeseries MetricType = "timeseries"
	MetricTypeTable      MetricType = "table"
	MetricTypeFunnel     MetricType = "funnel"
)

const (
	EventOrderThen EventOrder = "then"
	EventOrderOr   EventOrder = "or"
	EventOrderAnd  EventOrder = "and"
)

type MetricPayload struct {
	StartTimestamp int64      `json:"startTimestamp"`
	EndTimestamp   int64      `json:"endTimestamp"`
	Density        int        `json:"density"`
	MetricOf       string     `json:"metricOf"`
	MetricType     MetricType `json:"metricType"`
	MetricFormat   string     `json:"metricFormat"`
	ViewType       string     `json:"viewType"`
	Name           string     `json:"name"`
	Series         []Series   `json:"series"`
	CompareTo      *string    `json:"compareTo"`
}

type Series struct {
	Name   string `json:"name"`
	Filter struct {
		Filters     []Filter   `json:"filters"`
		EventsOrder EventOrder `json:"eventsOrder"`
	} `json:"filter"`
}

type Filter struct {
	Type     FilterType `json:"type"`
	IsEvent  bool       `json:"isEvent"`
	Value    []string   `json:"value"`
	Operator string     `json:"operator"`
	Filters  []Filter   `json:"filters"`
}

const (
	FilterUserOs             FilterType = "userOs"
	FilterUserBrowser        FilterType = "userBrowser"
	FilterUserDevice         FilterType = "userDevice"
	FilterUserCountry        FilterType = "userCountry"
	FilterUserCity           FilterType = "userCity"
	FilterUserState          FilterType = "userState"
	FilterUserId             FilterType = "userId"
	FilterUserAnonymousId    FilterType = "userAnonymousId"
	FilterReferrer           FilterType = "referrer"
	FilterRevId              FilterType = "revId"
	FilterUserOsIos          FilterType = "userOsIos"
	FilterUserDeviceIos      FilterType = "userDeviceIos"
	FilterUserCountryIos     FilterType = "userCountryIos"
	FilterUserIdIos          FilterType = "userIdIos"
	FilterUserAnonymousIdIos FilterType = "userAnonymousIdIos"
	FilterRevIdIos           FilterType = "revIdIos"
	FilterDuration           FilterType = "duration"
	FilterPlatform           FilterType = "platform"
	FilterMetadata           FilterType = "metadata"
	FilterIssue              FilterType = "issue"
	FilterEventsCount        FilterType = "eventsCount"
	FilterUtmSource          FilterType = "utmSource"
	FilterUtmMedium          FilterType = "utmMedium"
	FilterUtmCampaign        FilterType = "utmCampaign"
	FilterThermalState       FilterType = "thermalState"
	FilterMainThreadCPU      FilterType = "mainThreadCPU"
	FilterViewComponent      FilterType = "viewComponent"
	FilterLogEvent           FilterType = "logEvent"
	FilterMemoryUsage        FilterType = "memoryUsage"
	FilterClick              FilterType = "click"
	FilterInput              FilterType = "input"
	FilterLocation           FilterType = "location"
	FilterCustom             FilterType = "customEvent"
	FilterFetch              FilterType = "fetch"
	FilterFetchStatusCode    FilterType = "status"
)

const (
	OperatorStringIs          = "is"
	OperatorStringIsAny       = "isAny"
	OperatorStringOn          = "on"
	OperatorStringOnAny       = "onAny"
	OperatorStringIsNot       = "isNot"
	OperatorStringIsUndefined = "isUndefined"
	OperatorStringNotOn       = "notOn"
	OperatorStringContains    = "contains"
	OperatorStringNotContains = "notContains"
	OperatorStringStartsWith  = "startsWith"
	OperatorStringEndsWith    = "endsWith"
)
