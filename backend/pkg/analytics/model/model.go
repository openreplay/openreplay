package model

import (
	"time"
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

type Filter struct {
	Name          string     `json:"name" validate:"required"`
	Type          FilterType `json:"type" validate:"required"` // TODO - to be removed
	Operator      string     `json:"operator" validate:"required"`
	PropertyOrder string     `json:"propertyOrder" validate:"required,oneof=then or and"`
	Value         []string   `json:"value" validate:"required,dive,required"`
	IsEvent       bool       `json:"isEvent"`
	DataType      string     `json:"dataType" validate:"required,oneof=string number boolean integer"`
	AutoCaptured  bool       `json:"autoCaptured"`      // Indicates if the filter is auto-captured
	Filters       []Filter   `json:"filters,omitempty"` // Nested filters for complex conditions
}

// TODO: add validation using github.com/go-playground/validator (you can follow the previous structure for guidance)
type MetricPayload struct {
	StartTimestamp  int64      `json:"startTimestamp" validate:"required,min=946684800000"`
	EndTimestamp    int64      `json:"endTimestamp" validate:"required,min=946684800000"`
	Density         int        `json:"density" validate:"required,min=1,max=500"`
	MetricOf        string     `json:"metricOf" validate:"required"`
	MetricType      MetricType `json:"metricType"`
	MetricValue     []string   `json:"metricValue"`
	MetricFormat    string     `json:"metricFormat,oneof=sessionCount userCount screenResolution"`
	ViewType        string     `json:"viewType"`
	Name            string     `json:"name"`
	Series          []Series   `json:"series"`
	Limit           int        `json:"limit" validate:"required,min=1,max=200"`
	Page            int        `json:"page" validate:"required,min=1"`
	StartPoint      []Filter   `json:"startPoint"`
	Exclude         []Filter   `json:"excludes"`
	Rows            uint64     `json:"rows"`
	Columns         uint64     `json:"stepsAfter"`
	PreviousColumns uint64     `json:"stepsBefore"`
	SortBy          string     `json:"sortBy"`
	SortOrder       string     `json:"sortOrder"`
}

type Session struct {
	Duration        uint32            `json:"duration"`
	ErrorsCount     int               `json:"errorsCount"`
	EventsCount     uint16            `json:"eventsCount"`
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
