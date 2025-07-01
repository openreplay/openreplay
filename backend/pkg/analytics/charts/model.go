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
	MetricOfTableFetch      MetricOfTable = "FETCH"
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
	FilterPlatform        model.FilterType = "platform"
	FilterRevId           model.FilterType = "revId"
	FilterIssue           model.FilterType = "issue"
	FilterMetadata        model.FilterType = "metadata"
)

type DataPoint struct {
	Timestamp uint64 `json:"timestamp"`
	Count     uint64 `json:"count"`
}
