package filters_catalog

// FilterTypeDef bundles the wire/JSON name with the Python-format string used
// as the input to StringToID. The EnumStr looks like "FilterType.REFERRER"
// because Python's `class FilterType(str, Enum)` inherits `Enum.__str__`,
// so f-strings interpolate the member as "ClassName.MEMBER" rather than
// the value. The live system's IDs depend on this format.
type FilterTypeDef struct {
	Name    string
	EnumStr string
}

var (
	// Session filters
	FTReferrer           = FilterTypeDef{Name: "referrer", EnumStr: "FilterType.REFERRER"}
	FTDuration           = FilterTypeDef{Name: "duration", EnumStr: "FilterType.DURATION"}
	FTUTMSource          = FilterTypeDef{Name: "utmSource", EnumStr: "FilterType.UTM_SOURCE"}
	FTUTMMedium          = FilterTypeDef{Name: "utmMedium", EnumStr: "FilterType.UTM_MEDIUM"}
	FTUTMCampaign        = FilterTypeDef{Name: "utmCampaign", EnumStr: "FilterType.UTM_CAMPAIGN"}
	FTUserCountry        = FilterTypeDef{Name: "userCountry", EnumStr: "FilterType.USER_COUNTRY"}
	FTUserCity           = FilterTypeDef{Name: "userCity", EnumStr: "FilterType.USER_CITY"}
	FTUserState          = FilterTypeDef{Name: "userState", EnumStr: "FilterType.USER_STATE"}
	FTUserOS             = FilterTypeDef{Name: "userOs", EnumStr: "FilterType.USER_OS"}
	FTUserBrowser        = FilterTypeDef{Name: "userBrowser", EnumStr: "FilterType.USER_BROWSER"}
	FTUserBrowserVersion = FilterTypeDef{Name: "userBrowserVersion", EnumStr: "FilterType.USER_BROWSER_VERSION"}
	FTUserDevice         = FilterTypeDef{Name: "userDevice", EnumStr: "FilterType.USER_DEVICE"}
	FTUserDeviceType     = FilterTypeDef{Name: "userDeviceType", EnumStr: "FilterType.USER_DEVICE_TYPE"}
	FTRevID              = FilterTypeDef{Name: "revId", EnumStr: "FilterType.REV_ID"}
	FTIssue              = FilterTypeDef{Name: "issue", EnumStr: "FilterType.ISSUE"}
	// User filters
	FTUserID     = FilterTypeDef{Name: "userId", EnumStr: "FilterType.USER_ID"}
	FTDistinctID = FilterTypeDef{Name: "distinct_id", EnumStr: "FilterType.DISTINCT_ID"}
)

// IssueType — single entry from the static issue types catalog
// (api/chalicelib/core/issues/issues_ch.py:67-132).
type IssueType struct {
	Type         string `json:"type"`
	Visible      bool   `json:"visible"`
	Order        int    `json:"order"`
	Name         string `json:"name"`
	AutoCaptured bool   `json:"autoCaptured"`
}

// IssueTypes is the static catalog of issue categories. Order is significant —
// the frontend renders in this order.
var IssueTypes = []IssueType{
	{Type: "js_exception", Visible: true, Order: 0, Name: "Errors", AutoCaptured: true},
	{Type: "bad_request", Visible: true, Order: 1, Name: "Bad Requests", AutoCaptured: true},
	{Type: "missing_resource", Visible: true, Order: 2, Name: "Missing Images", AutoCaptured: true},
	{Type: "click_rage", Visible: true, Order: 3, Name: "Click Rage", AutoCaptured: true},
	{Type: "dead_click", Visible: true, Order: 4, Name: "Dead Clicks", AutoCaptured: true},
	{Type: "memory", Visible: true, Order: 5, Name: "High Memory", AutoCaptured: true},
	{Type: "cpu", Visible: true, Order: 6, Name: "High CPU", AutoCaptured: true},
	{Type: "crash", Visible: true, Order: 7, Name: "Crashes", AutoCaptured: true},
	{Type: "incident", Visible: true, Order: 8, Name: "Incident", AutoCaptured: false},
}

// PredefinedEvent holds metadata for a built-in event type.
// Description is intentionally left blank for now; only the map keys are used
// by the /pa/{projectId}/filters endpoint as a fallback when ClickHouse returns
// no rows.
type PredefinedEvent struct {
	Description string
}

// PredefinedEvents is the set of built-in web event types
// (port of PREDEFINED_EVENTS from api/chalicelib/core/pa/events.py).
var PredefinedEvents = map[string]PredefinedEvent{
	"CLICK":       {},
	"INPUT":       {},
	"LOCATION":    {},
	"ERROR":       {},
	"REQUEST":     {},
	"ISSUE":       {},
	"PERFORMANCE": {},
}

// PredefinedEventsOrder preserves api/chalicelib/core/product_analytics/events.py:30-52
// (PREDEFINED_EVENTS dict insertion order). Use this — not the map — when you need
// deterministic output that matches Python's response.
var PredefinedEventsOrder = []string{
	"CLICK", "INPUT", "LOCATION", "ERROR", "REQUEST", "ISSUE", "PERFORMANCE",
}

// PredefinedEventsMobile is the set of built-in mobile event types
// (port of PREDEFINED_EVENTS_MOBILE from events.py).
var PredefinedEventsMobile = map[string]PredefinedEvent{
	"TAP":     {},
	"INPUT":   {},
	"SWIPE":   {},
	"REQUEST": {},
	"CRASH":   {},
	"ISSUE":   {},
}

// PredefinedEventsMobileOrder preserves the dict order in events.py:54-73.
var PredefinedEventsMobileOrder = []string{
	"TAP", "INPUT", "SWIPE", "REQUEST", "CRASH", "ISSUE",
}

// ExcludedEvents holds event-type keys that must never appear in the
// /pa/{projectId}/filters response (port of EXCLUDED_EVENTS from events.py).
var ExcludedEvents = map[string]struct{}{
	"CUSTOM":      {},
	"TAG_TRIGGER": {},
}

// PredefinedProperty holds metadata for a built-in event property.
type PredefinedProperty struct {
	Type           string
	IsPredefined   bool
	PossibleValues []any
	IsConditional  bool
}

// PredefinedProperties is the set of known event properties
// (port of PREDEFINED_PROPERTIES from api/chalicelib/core/pa/properties.py).
// Keys are snake_case — the caller converts camelCase CH column names before
// looking up. PossibleValues is nil for entries that don't set it; callers
// must coerce nil to []any{} when building the JSON response.
var PredefinedProperties = map[string]PredefinedProperty{
	"label":                       {Type: "String", IsConditional: true},
	"hesitation_time":             {Type: "UInt32"},
	"name":                        {Type: "String", IsConditional: true},
	"payload":                     {Type: "String"},
	"level":                       {Type: "Enum8"},
	"message":                     {Type: "String"},
	"context":                     {Type: "Enum8"},
	"url_host":                    {Type: "String", IsConditional: true},
	"url_path":                    {Type: "String", IsConditional: true},
	"first_contentful_paint_time": {Type: "UInt16"},
	"speed_index":                 {Type: "UInt16"},
	"min_fps":                     {Type: "UInt8"},
	"max_fps":                     {Type: "UInt8"},
	"min_cpu":                     {Type: "UInt8"},
	"max_cpu":                     {Type: "UInt8"},
	"min_used_js_heap_size":       {Type: "UInt64"},
	"max_used_js_heap_size":       {Type: "UInt64"},
	"method": {
		Type:           "Enum8",
		IsPredefined:   true,
		PossibleValues: []any{"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTION"},
		IsConditional:  true,
	},
	"status":        {Type: "UInt16", IsConditional: true},
	"success":       {Type: "UInt8"},
	"request_body":  {Type: "String"},
	"response_body": {Type: "String"},
	"selector":      {Type: "String", IsConditional: true},
	"duration":      {Type: "UInt16", IsConditional: true},
	"normalized_x":  {Type: "UInt16", IsConditional: true},
	"normalized_y":  {Type: "UInt16", IsConditional: true},
}

// PredefinedPropertiesOrder preserves the dict order in
// api/chalicelib/core/product_analytics/properties.py:75-220 (PREDEFINED_PROPERTIES).
var PredefinedPropertiesOrder = []string{
	"label", "hesitation_time", "name", "payload", "level", "message", "context",
	"url_host", "url_path", "first_contentful_paint_time", "speed_index",
	"min_fps", "max_fps", "min_cpu", "max_cpu",
	"min_used_js_heap_size", "max_used_js_heap_size",
	"method", "status", "success", "request_body", "response_body",
	"selector", "duration", "normalized_x", "normalized_y",
}

// ExcludedProperties holds property keys that must never appear in the
// /pa/{projectId}/filters response (port of EXCLUDED_PROPERTIES from properties.py).
var ExcludedProperties = map[string]struct{}{
	"message_id":  {},
	"error_id":    {},
	"tag_id":      {},
	"web_vitals":  {},
	"user_device": {},
}

// OREventDisplayName returns the human-readable display name for a built-in
// event type key (port of or_event_display_name from events.py).
func OREventDisplayName(eventName string) string {
	switch eventName {
	case "CLICK":
		return "Click"
	case "INPUT":
		return "Text Input"
	case "LOCATION":
		return "Page View"
	case "ERROR":
		return "Error"
	case "REQUEST":
		return "Network Request"
	case "PERFORMANCE":
		return "Performance"
	case "ISSUE":
		return "Issue"
	case "INCIDENT":
		return "Incident"
	case "TAG_TRIGGER":
		return "Tag"
	case "TAP":
		return "Tap"
	case "SWIPE":
		return "Swipe"
	case "CRASH":
		return "Crash"
	}
	return ""
}

// ORPropertyDisplayName returns the human-readable display name for a property
// key (port of or_property_display_name from properties.py).
func ORPropertyDisplayName(name string) string {
	switch name {
	case "label":
		return "Label"
	case "hesitation_time":
		return "Hesitation Time"
	case "name":
		return "Name"
	case "payload":
		return "Payload"
	case "level":
		return "Level"
	case "source":
		return "Source"
	case "duration":
		return "Duration"
	case "context":
		return "Context"
	case "url_host":
		return "Hostname"
	case "url_path":
		return "Path"
	case "url_hostpath":
		return "URL Host and Path"
	case "request_start":
		return "Request Start"
	case "response_start":
		return "Response Start"
	case "response_end":
		return "Response End"
	case "dom_content_loaded_event_start":
		return "DOM Content Loaded Event Start"
	case "dom_content_loaded_event_end":
		return "DOM Content Loaded Event End"
	case "load_event_start":
		return "Load Event Start"
	case "load_event_end":
		return "Load Event End"
	case "first_paint":
		return "First Paint"
	case "first_contentful_paint_time":
		return "First Contentful-paint Time"
	case "speed_index":
		return "Speed Index"
	case "visually_complete":
		return "Visually Complete"
	case "time_to_interactive":
		return "Time To Interactive"
	case "ttfb":
		return "Time To First Byte"
	case "ttlb":
		return "Time To Last Byte"
	case "response_time":
		return "Response Time"
	case "dom_building_time":
		return "DOM Building Time"
	case "dom_content_loaded_event_time":
		return "DOM Content Loaded Event Time"
	case "load_event_time":
		return "Load Event Time"
	case "min_fps":
		return "Minimum Frame Rate"
	case "avg_fps":
		return "Average Frame Rate"
	case "max_fps":
		return "Maximum Frame Rate"
	case "min_cpu":
		return "Minimum CPU"
	case "avg_cpu":
		return "Average CPU"
	case "max_cpu":
		return "Maximum CPU"
	case "min_total_js_heap_size":
		return "Minimum Total JS Heap Size"
	case "avg_total_js_heap_size":
		return "Average Total JS Heap Size"
	case "max_total_js_heap_size":
		return "Maximum Total JS Heap Size"
	case "min_used_js_heap_size":
		return "Minimum Used JS Heap Size"
	case "avg_used_js_heap_size":
		return "Average Used JS Heap Size"
	case "max_used_js_heap_size":
		return "Maximum Used JS Heap Size"
	case "success":
		return "Success"
	case "request_body":
		return "Request Body"
	case "response_body":
		return "Response Body"
	case "transfer_size":
		return "Transfer Size"
	case "selector":
		return "CSS Selector"
	case "normalized_x":
		return "Normalized X"
	case "normalized_y":
		return "Normalized Y"
	case "message_id":
		return "Message ID"
	case "cls":
		return "Cumulative Layout Shift"
	case "lcp":
		return "Largest Contentful Paint"
	case "issue_type":
		return "Issue Type"
	case "url":
		return "URL"
	case "user_device":
		return "Device"
	case "user_device_type":
		return "Platform"
	case "message":
		return "Error Message"
	case "method":
		return "HTTP Method"
	case "status":
		return "Status Code"
	case "userState":
		return "State/Province"
	case "incident":
		return "Incident Reported By User"
	case "page_title":
		return "Page Title"
	}
	return ""
}

// CountryCodes is the static catalog of ISO 3166-1 alpha-2 country codes.
// Order is significant; the frontend renders in this order.
var CountryCodes = []string{
	"AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM",
	"AW", "AU", "AT", "AZ", "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ",
	"BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR", "IO", "BN", "BG", "BF",
	"BI", "CV", "KH", "CM", "CA", "KY", "CF", "TD", "CL", "CN", "CX", "CC",
	"CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ",
	"DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET",
	"FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF", "GA", "GM", "GE", "DE",
	"GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY",
	"HT", "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE",
	"IM", "IL", "IT", "JM", "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "KR",
	"KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MO",
	"MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX",
	"FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP",
	"NL", "NC", "NZ", "NI", "NE", "NG", "NU", "NF", "MK", "MP", "NO", "OM",
	"PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PN", "PL", "PT", "PR",
	"QA", "RE", "RO", "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC",
	"WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI",
	"SB", "SO", "ZA", "GS", "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH",
	"SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK", "TO", "TT", "TN", "TR",
	"TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU",
	"VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW",
}
