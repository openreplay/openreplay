package analytics

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
	Name   string      `json:"name"`
	Filter FilterGroup `json:"filter"`
}

type Filter struct {
	Name          string   `json:"name" validate:"required"`
	Operator      string   `json:"operator" validate:"required"`
	PropertyOrder string   `json:"propertyOrder" validate:"required,oneof=then or and"`
	Value         []string `json:"value" validate:"required,dive,required"`
	IsEvent       bool     `json:"isEvent"`
	DataType      string   `json:"dataType" validate:"required,oneof=string number boolean integer"`
	AutoCaptured  bool     `json:"autoCaptured"`      // Indicates if the filter is auto-captured
	Filters       []Filter `json:"filters,omitempty"` // Nested filters for complex conditions
}
