package model

import (
	"database/sql"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
)

type Table string
type Column string
type MetricType string
type FilterType string
type EventType string
type EventOrder string

type FilterGroup struct {
	Filters     []Filter   `json:"filters" validate:"dive"`
	EventsOrder EventOrder `json:"eventsOrder" validate:"required,oneof=then or and"`
}

type Series struct {
	Name      string        `json:"name"`
	Filter    FilterGroup   `json:"filter"`
	CreatedAt time.Time     `json:"createdAt" validate:"omitempty"`
	SeriesID  sql.NullInt64 `json:"seriesId,omitempty" validate:"omitempty"` // Optional, used for updates
	MetricID  sql.NullInt64 `json:"metricId,omitempty" validate:"omitempty"` // Optional, used for updates
	Index     sql.NullInt16 `json:"index,omitempty" validate:"omitempty"`    // Optional, used for ordering
}

type SeriesFilter struct {
	EventsOrder string   `json:"eventsOrder" validate:"required,oneof=then or and"`
	Filters     []Filter `json:"filters"`
}

var OperatorsSearchEvent []string = []string{"is", "isAny", "on", "onAny", "isNot", "isUndefined", "notOn", "contains", "notContains", "startsWith", "endsWith", "regex"}
var OperatorsClickEvent []string = []string{"selectorIs", "selectorIsAny", "selectorIsNot", "selectorIsUndefined", "selectorContains", "selectorNotContains", "selectorStartsWith", "selectorEndsWith"}
var OperatorsMath []string = []string{"=", "<", ">", "<=", ">="}

type Filter struct {
	Name          string     `json:"name" validate:"required_without=Type"` // excluded_with=Type
	Type          FilterType `json:"type" validate:"required_without=Name"` // This is only used if IsEvent is false
	Operator      string     `json:"operator" validate:"required,oneof=is isAny on onAny isNot isUndefined notOn contains notContains startsWith endsWith regex selectorIs selectorIsAny selectorIsNot selectorIsUndefined selectorContains selectorNotContains selectorStartsWith selectorEndsWith = < > <= >="`
	PropertyOrder string     `json:"propertyOrder" validate:"required_with=Name,oneof=or and"`
	Value         []string   `json:"value" validate:"required_with=Type,max=10,dive"`
	IsEvent       bool       `json:"isEvent"` // validate:"required" doesn't work with 'false' value
	DataType      string     `json:"dataType" validate:"omitempty,oneof=string number boolean integer"`
	AutoCaptured  bool       `json:"autoCaptured"`      // Indicates if the filter is auto-captured
	Filters       []Filter   `json:"filters,omitempty"` // Nested filters for complex conditions
	//	With such structure, a user can send an infinite nested filter, and the API will parse it
}

var ViewTypeTimeseries []string = []string{"lineChart", "areaChart", "barChart", "progressChart", "pieChart", "metric", "table"}
var ViewTypeTable []string = []string{"table"}
var ViewTypeOther []string = []string{"chart", "columnChart", "metric", "table", "list", "sunburst"}

var MetricOfTimeseries []string = []string{"sessionCount", "userCount", "eventCount"}
var MetricOfTable []string = []string{"userBrowser", "userDevice", "userCountry", "userId", "ISSUE", "LOCATION", "sessions", "jsException", "referrer", "REQUEST", "screenResolution"}
var MetricOfFunnel []string = []string{"sessionCount"}
var MetricOfHeatMap []string = []string{"heatMapUrl"}
var MetricOfPathAnalysis []string = []string{"sessionCount"}
var MetricOfWebVital []string = []string{"webVitalUrl"}

type MetricPayload struct {
	StartTimestamp  uint64     `json:"startTimestamp" validate:"required,min=946684800000"`
	EndTimestamp    uint64     `json:"endTimestamp" validate:"required,min=946684800000,gtfield=StartTimestamp"`
	Density         int        `json:"density" validate:"required,min=1,max=500"`
	MetricOf        string     `json:"metricOf" validate:"required,oneof=sessionCount userCount eventCount LOCATION userBrowser userDevice userCountry userId ISSUE sessions jsException referrer REQUEST screenResolution heatMapUrl webVitalUrl"`
	MetricType      MetricType `json:"metricType"`
	MetricValue     []string   `json:"metricValue"`
	MetricFormat    string     `json:"metricFormat" validate:"oneof=sessionCount userCount screenResolution eventCount"`
	ViewType        string     `json:"viewType" validate:"oneof=lineChart areaChart barChart progressChart pieChart metric table chart columnChart list sunburst"`
	Name            string     `json:"name"`
	Series          []Series   `json:"series" validate:"max=5,dive"`
	Limit           int        `json:"limit" validate:"required,min=1,max=200"`
	Page            int        `json:"page" validate:"required,min=1"`
	StartPoint      []Filter   `json:"startPoint" validate:"omitempty,dive"`
	Exclude         []Filter   `json:"excludes" validate:"omitempty,dive"`
	Rows            uint64     `json:"rows" validate:"omitempty,min=1,max=50"`
	Columns         uint64     `json:"stepsAfter"`
	PreviousColumns uint64     `json:"stepsBefore"`
	SortBy          string     `json:"sortBy"`
	SortOrder       string     `json:"sortOrder"`
}

func ValidateMetricFields(sl validator.StructLevel) {
	in := sl.Current().Interface().(MetricPayload)
	switch in.MetricType {
	case "timeseries":
		if !slices.Contains(MetricOfTimeseries, in.MetricOf) {
			sl.ReportError(in.MetricOf, "MetricOf", "metricOf", fmt.Sprintf("oneof:%s", strings.Join(MetricOfTimeseries, ",")), "")
		}
	case "table":
		if !slices.Contains(MetricOfTable, in.MetricOf) {
			sl.ReportError(in.MetricOf, "MetricOf", "metricOf", fmt.Sprintf("oneof:%s", strings.Join(MetricOfTable, ",")), "")
		}
		if in.MetricOf == "screenResolution" && in.MetricFormat != "sessionCount" {
			sl.ReportError(in.MetricFormat, "MetricFormat", "metricFormat", "equals sessionCount", "")
		}
	case "funnel":
		if !slices.Contains(MetricOfFunnel, in.MetricOf) {
			sl.ReportError(in.MetricOf, "MetricOf", "metricOf", fmt.Sprintf("oneof:%s", strings.Join(MetricOfFunnel, ",")), "")
		}
	case "heatMap", "heatmaps_session":
		if !slices.Contains(MetricOfHeatMap, in.MetricOf) {
			sl.ReportError(in.MetricOf, "MetricOf", "metricOf", fmt.Sprintf("oneof:%s", strings.Join(MetricOfHeatMap, ",")), "")
		}
	case "pathAnalysis":
		if !slices.Contains(MetricOfPathAnalysis, in.MetricOf) {
			sl.ReportError(in.MetricOf, "MetricOf", "metricOf", fmt.Sprintf("oneof:%s", strings.Join(MetricOfPathAnalysis, ",")), "")
		}
	case "webVital":
		if !slices.Contains(MetricOfWebVital, in.MetricOf) {
			sl.ReportError(in.MetricOf, "MetricOf", "metricOf", fmt.Sprintf("oneof:%s", strings.Join(MetricOfWebVital, ",")), "")
		}
	default:
		sl.ReportError(in.MetricType, "MetricType", "metricType", "unsupported", "")
	}

}

type Session struct {
	Duration              uint32            `json:"duration" ch:"duration"`
	ErrorsCount           int               `json:"errorsCount"`
	EventsCount           uint16            `json:"eventsCount" ch:"events_count"`
	IssueTypes            []string          `json:"issueTypes" ch:"issue_types"`
	Metadata              map[string]string `json:"metadata" ch:"metadata"`
	PagesCount            int               `json:"pagesCount" ch:"pages_count"`
	Platform              string            `json:"platform" ch:"platform"`
	ProjectId             uint16            `json:"projectId" ch:"project_id"`
	SessionId             string            `json:"sessionId" ch:"session_id"`
	StartTs               uint64            `json:"startTs" ch:"start_ts"`
	Timezone              string            `json:"timezone" ch:"timezone"`
	UserAnonymousId       *string           `json:"userAnonymousId" ch:"user_anonymous_id"`
	UserBrowser           string            `json:"userBrowser" ch:"user_browser"`
	UserCity              string            `json:"userCity" ch:"user_city"`
	UserCountry           string            `json:"userCountry" ch:"user_country"`
	UserDevice            *string           `json:"userDevice" ch:"user_device"`
	UserDeviceType        string            `json:"userDeviceType" ch:"user_device_type"`
	UserId                string            `json:"userId" ch:"user_id"`
	UserOs                string            `json:"userOs" ch:"user_os"`
	UserState             string            `json:"userState" ch:"user_state"`
	UserUuid              string            `json:"userUuid" ch:"user_uuid"`
	Viewed                bool              `json:"viewed" ch:"viewed"`
	TotalNumberOfSessions uint64            `json:"-" ch:"total_number_of_sessions"`
}

type SessionsSearchRequest struct {
	Filters     []Filter `json:"filters" validate:"omitempty,dive"`
	StartDate   int64    `json:"startTimestamp" validate:"required,min=946684800000"`
	EndDate     int64    `json:"endTimestamp" validate:"required,min=946684800000,gtfield=StartDate"`
	Sort        string   `json:"sort"`
	Order       string   `json:"order" validate:"omitempty,oneof=asc desc"`
	EventsOrder string   `json:"eventsOrder" validate:"required,oneof=then or and"`
	Limit       int      `json:"limit" validate:"required,min=1,max=200"`
	Page        int      `json:"page" validate:"required,min=1"`
	Series      []Series `json:"series" validate:"omitempty,max=5,dive"`
}

type GetSessionsResponse struct {
	Total    uint64    `json:"total" ch:"count"`
	Sessions []Session `json:"sessions" ch:"sessions"`
}

type PaginationParams struct {
	Limit  int
	Offset int
}

// SeriesSessionsResponse represents grouped sessions response for series queries
type SeriesSessionsResponse struct {
	Series []SeriesSessionData `json:"series"`
}

// SeriesSessionData represents sessions data for a single series
type SeriesSessionData struct {
	SeriesId   int64     `json:"seriesId"`
	Total      uint64    `json:"total"`
	SeriesName string    `json:"seriesName"`
	Sessions   []Session `json:"sessions"`
}
