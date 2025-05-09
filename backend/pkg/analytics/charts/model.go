package charts

type Table string
type Column string
type MetricType string
type FilterType string
type EventType string
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
	MetricTypeHeatmap    MetricType = "heatmaps"
	MetricTypeSession    MetricType = "heatmaps_session"
	MetricUserJourney    MetricType = "pathAnalysis"
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
	MetricValue    []string   `json:"metricValue"`
	MetricFormat   string     `json:"metricFormat"`
	ViewType       string     `json:"viewType"`
	Name           string     `json:"name"`
	Series         []Series   `json:"series"`
	Limit          int        `json:"limit"`
	Page           int        `json:"page"`
	StartPoint     []Filter   `json:"startPoint"`
	Exclude        []Filter   `json:"exclude"`
	Rows           uint64     `json:"rows"`
	Columns        uint64     `json:"columns"`
}

type MetricOfTable string

const (
	MetricOfTableLocation MetricOfTable = "url_path" // TOP Pages
	MetricOfTableBrowser  MetricOfTable = "user_browser"
	MetricOfTableReferrer MetricOfTable = "referrer"
	MetricOfTableUserId   MetricOfTable = "user_id"
	MetricOfTableCountry  MetricOfTable = "user_country"
	MetricOfTableDevice   MetricOfTable = "user_device"
	MetricOfTableFetch    MetricOfTable = "fetch"

	//MetricOfTableIssues   MetricOfTable = "issues"
	//MetricOfTableSessions MetricOfTable = "sessions"
	//MetricOfTableErrors   MetricOfTable = "errors"
)

type FilterGroup struct {
	Filters     []Filter   `json:"filters"`
	EventsOrder EventOrder `json:"eventsOrder"`
}

type Series struct {
	Name   string      `json:"name"`
	Filter FilterGroup `json:"filter"`
}

type Filter struct {
	Type     FilterType `json:"type"`
	IsEvent  bool       `json:"isEvent"`
	Value    []string   `json:"value"`
	Operator string     `json:"operator"`
	Source   string     `json:"source,omitempty"`
	Filters  []Filter   `json:"filters"`
}

const (
	FilterUserId          FilterType = "userId"
	FilterUserAnonymousId FilterType = "userAnonymousId"
	FilterReferrer        FilterType = "referrer"
	FilterDuration        FilterType = "duration"
	FilterUtmSource       FilterType = "utmSource"
	FilterUtmMedium       FilterType = "utmMedium"
	FilterUtmCampaign     FilterType = "utmCampaign"
	FilterUserCountry     FilterType = "userCountry"
	FilterUserCity        FilterType = "userCity"
	FilterUserState       FilterType = "userState"
	FilterUserOs          FilterType = "userOs"
	FilterUserBrowser     FilterType = "userBrowser"
	FilterUserDevice      FilterType = "userDevice"
	FilterPlatform        FilterType = "platform"
	FilterRevId           FilterType = "revId"
	FilterIssue           FilterType = "issue"
	FilterMetadata        FilterType = "metadata"
)

// Event filters
const (
	FilterClick           FilterType = "click"
	FilterInput           FilterType = "input"
	FilterLocation        FilterType = "location"
	FilterTag             FilterType = "tag"
	FilterCustom          FilterType = "customEvent"
	FilterFetch           FilterType = "fetch"
	FilterFetchStatusCode FilterType = "fetchStatusCode" // Subfilter
	FilterGraphQLRequest  FilterType = "graphql"
	FilterStateAction     FilterType = "stateAction"
	FilterError           FilterType = "error"
	FilterAvgCpuLoad      FilterType = "avgCpuLoad"
	FilterAvgMemoryUsage  FilterType = "avgMemoryUsage"
)

// MOBILE FILTERS
const (
	FilterUserOsIos          FilterType = "userOsIos"
	FilterUserDeviceIos      FilterType = "userDeviceIos"
	FilterUserCountryIos     FilterType = "userCountryIos"
	FilterUserIdIos          FilterType = "userIdIos"
	FilterUserAnonymousIdIos FilterType = "userAnonymousIdIos"
	FilterRevIdIos           FilterType = "revIdIos"
)

const (
	OperatorStringIs          = "is"
	OperatorStringIsAny       = "isAny"
	OperatorStringOn          = "on"
	OperatorStringOnAny       = "onAny"
	OperatorStringIsNot       = "isNot"
	OperatorStringIsUndefined = "isUndefined"
	OperatorStringNotOn       = "notOn"
	OperatorContains          = "contains"
	OperatorStringNotContains = "notContains"
	OperatorStringStartsWith  = "startsWith"
	OperatorStringEndsWith    = "endsWith"
)

type DataPoint struct {
	Timestamp uint64 `json:"timestamp"`
	Count     uint64 `json:"count"`
}

//type TimeseriesResponse struct {
//	Data []DataPoint `json:"data"`
//}
