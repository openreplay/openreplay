package model

import (
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
	Filters     []Filter   `json:"filters"`
	EventsOrder EventOrder `json:"eventsOrder"`
}

type Series struct {
	Name      string      `json:"name"`
	Filter    FilterGroup `json:"filter"`
	CreatedAt time.Time   `json:"createdAt" validate:"omitempty"`
	DeletedAt *time.Time  `json:"deletedAt" validate:"omitempty"`
	SeriesID  int64       `json:"seriesId,omitempty"` // Optional, used for updates
	MetricID  int64       `json:"metricId,omitempty"` // Optional, used for updates
	Index     *int64      `json:"index,omitempty"`    // Optional, used for ordering
}

type SeriesFilter struct {
	EventsOrder string   `json:"eventsOrder" validate:"required,oneof=then or and"`
	Filters     []Filter `json:"filters"`
}

var OperatorsSearchEvent []string = []string{"is", "isAny", "on", "onAny", "isNot", "isUndefined", "notOn", "contains", "notContains", "startsWith", "endsWith", "regex"}
var OperatorsClickEvent []string = []string{"selectorIs", "selectorIsAny", "selectorIsNot", "selectorIsUndefined", "selectorContains", "selectorNotContains", "selectorStartsWith", "selectorEndsWith"}
var OperatorsMath []string = []string{"=", "<", ">", "<=", ">="}

type Filter struct {
	Name          string     `json:"name" validate:"required,min=1,max=100"`
	Type          FilterType `json:"type" validate:"required"` // This is only used if IsEvent is false
	Operator      string     `json:"operator" validate:"required, oneof=is isAny on onAny isNot isUndefined notOn contains notContains startsWith endsWith regex selectorIs selectorIsAny selectorIsNot selectorIsUndefined selectorContains selectorNotContains selectorStartsWith selectorEndsWith = < > <= >="`
	PropertyOrder string     `json:"propertyOrder" validate:"required,oneof=or and"`
	Value         []string   `json:"value" validate:"required,dive,required,min=0,max=10"`
	IsEvent       bool       `json:"isEvent" validate:"required"`
	DataType      string     `json:"dataType" validate:"required,oneof=string number boolean integer"`
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
	MetricFormat    string     `json:"metricFormat" validate:"oneof=sessionCount userCount screenResolution"`
	ViewType        string     `json:"viewType" validate:"oneof=lineChart areaChart barChart progressChart pieChart metric table chart columnChart list sunburst"`
	Name            string     `json:"name"`
	Series          []Series   `json:"series" validate:"min=0,max=5,dive"`
	Limit           int        `json:"limit" validate:"required,min=1,max=200"`
	Page            int        `json:"page" validate:"required,min=1"`
	StartPoint      []Filter   `json:"startPoint"`
	Exclude         []Filter   `json:"excludes"`
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
	Duration        uint32            `json:"duration"`
	ErrorsCount     int               `json:"errorsCount"`
	EventsCount     uint16            `json:"eventsCount"`
	IssueScore      int64             `json:"issueScore"`
	IssueTypes      []string          `json:"issueTypes"`
	Metadata        map[string]string `json:"metadata"`
	PagesCount      int               `json:"pagesCount"`
	Platform        string            `json:"platform"`
	ProjectId       uint16            `json:"projectId"`
	SessionId       string            `json:"sessionId"`
	StartTs         uint64            `json:"startTs"`
	Timezone        string            `json:"timezone"`
	UserAnonymousId *string           `json:"userAnonymousId"`
	UserBrowser     string            `json:"userBrowser"`
	UserCity        string            `json:"userCity"`
	UserCountry     string            `json:"userCountry"`
	UserDevice      *string           `json:"userDevice"`
	UserDeviceType  string            `json:"userDeviceType"`
	UserId          string            `json:"userId"`
	UserOs          string            `json:"userOs"`
	UserState       string            `json:"userState"`
	UserUuid        string            `json:"userUuid"`
	Viewed          bool              `json:"viewed"`
}

type SessionsSearchRequest struct {
	Filters     []Filter `json:"filters"`
	StartDate   int64    `json:"startTimestamp"`
	EndDate     int64    `json:"endTimestamp"`
	Sort        string   `json:"sort"`
	Order       string   `json:"order"`
	EventsOrder string   `json:"eventsOrder"`
	Limit       int      `json:"limit"`
	Page        int      `json:"page"`
	Series      []Series `json:"series"`
}

type GetSessionsResponse struct {
	Total    uint64    `json:"total"`
	Sessions []Session `json:"sessions"`
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
