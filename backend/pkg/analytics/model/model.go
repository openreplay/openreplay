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

type MetricPayload struct {
	StartTimestamp  int64      `json:"startTimestamp"`
	EndTimestamp    int64      `json:"endTimestamp"`
	Density         int        `json:"density"`
	MetricOf        string     `json:"metricOf"`
	MetricType      MetricType `json:"metricType"`
	MetricValue     []string   `json:"metricValue"`
	MetricFormat    string     `json:"metricFormat"`
	ViewType        string     `json:"viewType"`
	Name            string     `json:"name"`
	Series          []Series   `json:"series"`
	Limit           int        `json:"limit"`
	Page            int        `json:"page"`
	StartPoint      []Filter   `json:"startPoint"`
	Exclude         []Filter   `json:"excludes"`
	Rows            uint64     `json:"rows"`
	Columns         uint64     `json:"stepsAfter"`
	PreviousColumns uint64     `json:"stepsBefore"`
}
