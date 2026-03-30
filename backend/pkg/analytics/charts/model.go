package charts

import "openreplay/backend/pkg/analytics/model"

const (
	MetricTypeTimeseries model.MetricType = "timeseries"
	MetricTypeTable      model.MetricType = "table"
	MetricTypeFunnel     model.MetricType = "funnel"
	MetricTypeHeatmap    model.MetricType = "heatMap"
	MetricTypeSession    model.MetricType = "heatmaps_session"
	MetricUserJourney    model.MetricType = "pathAnalysis"
	MetricWebVitals      model.MetricType = "webVital"
)

type MetricOfTable string

const (
	MetricOfTableLocation   MetricOfTable = "LOCATION" // TOP Pages
	MetricOfTableBrowser    MetricOfTable = "userBrowser"
	MetricOfTableReferrer   MetricOfTable = "referrer"
	MetricOfTableUserId     MetricOfTable = "userId"
	MetricOfTableCountry    MetricOfTable = "userCountry"
	MetricOfTableDevice     MetricOfTable = "userDevice"
	MetricOfTableFetch      MetricOfTable = "REQUEST"
	MetricOfTableResolution MetricOfTable = "screenResolution"
)

const (
	FilterUserId          model.FilterType = "userId"
	FilterUserAnonymousId model.FilterType = "userAnonymousId"
	FilterReferrer        model.FilterType = "referrer"
	FilterDuration        model.FilterType = "duration"
	FilterUtmSource       model.FilterType = "utmSource"
	FilterUtmMedium       model.FilterType = "utmMedium"
	FilterUtmCampaign     model.FilterType = "utmCampaign"
	FilterUserCountry     model.FilterType = "userCountry"
	FilterUserCity        model.FilterType = "userCity"
	FilterUserState       model.FilterType = "userState"
	FilterUserOs          model.FilterType = "userOs"
	FilterUserBrowser     model.FilterType = "userBrowser"
	FilterUserDevice      model.FilterType = "userDevice"
	FilterUserDeviceType  model.FilterType = "userDeviceType"
	FilterPlatform        model.FilterType = "platform"
	FilterRevId           model.FilterType = "revId"
	FilterIssue           model.FilterType = "issue"
	FilterMetadata        model.FilterType = "metadata"
)

type DataPoint struct {
	Timestamp uint64 `json:"timestamp" ch:"timestamp"`
	Count     uint64 `json:"count" ch:"count"`
}

const MaxBreakdowns = 3

const MaxBreakdownCardinality = 1000

type breakdownKey struct {
	Timestamp uint64
	Values    [MaxBreakdowns]string
}

var mainColumns = map[string][]string{
	"userDevice":         {"sessions.user_device", "singleColumn"},
	"referrer":           {"$referrer", "singleColumn"},
	"fetchDuration":      {"$duration_s", "singleColumn"},
	"ISSUE":              {"issue_types", "singleColumn"},
	"userCountry":        {"$country", "singleColumn"},
	"userCity":           {"$city", "singleColumn"},
	"userState":          {"$state", "singleColumn"},
	"userOs":             {"$os", "singleColumn"},
	"userOsVersion":      {"$os_version", "singleColumn"},
	"userBrowser":        {"$browser", "singleColumn"},
	"userBrowserVersion": {"$browser_version", "singleColumn"},
	"metadata":           {"metadata", "singleColumn"},
	"issue_type":         {"issue_types", "arrayColumn"},
	"url":                {"$current_url", "singleColumn"},
	"urlPath":            {"$current_path", "singleColumn"},
	"utmSource":          {"utm_source", "singleColumn"},
	"utmMedium":          {"utm_medium", "singleColumn"},
	"utmCampaign":        {"utm_campaign", "singleColumn"},
	"userDeviceType":     {"$device", "singleColumn"},
}

var mainSessionsColumns = map[string][]string{
	"user_device":          {"user_device", "singleColumn"},
	"referrer":             {"referrer", "singleColumn"},
	"fetch_duration":       {"duration", "singleColumn"},
	"ISSUE":                {"issue_types", "arrayColumn"},
	"user_country":         {"user_country", "singleColumn"},
	"user_city":            {"user_city", "singleColumn"},
	"user_state":           {"user_state", "singleColumn"},
	"user_os":              {"user_os", "singleColumn"},
	"user_os_version":      {"user_os_version", "singleColumn"},
	"user_browser":         {"user_browser", "singleColumn"},
	"user_browser_version": {"user_browser_version", "singleColumn"},
	"issue_type":           {"issue_types", "arrayColumn"},
	"user_id":              {"user_id", "singleColumn"},
	"user_anonymous_id":    {"user_anonymous_id", "singleColumn"},
	"utm_source":           {"utm_source", "singleColumn"},
	"utm_medium":           {"utm_medium", "singleColumn"},
	"utm_campaign":         {"utm_campaign", "singleColumn"},
	"user_device_type":     {"user_device_type", "singleColumn"},
}
