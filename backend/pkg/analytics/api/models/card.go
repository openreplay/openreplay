package models

import (
	"time"
)

// CardBase Common fields for the Card entity
type CardBase struct {
	Name          string         `json:"name" validate:"required"`
	IsPublic      bool           `json:"isPublic" validate:"omitempty"`
	DefaultConfig map[string]any `json:"defaultConfig"`
	Thumbnail     *string        `json:"thumbnail" validate:"omitempty,url"`
	MetricType    string         `json:"metricType" validate:"required,oneof=timeseries table funnel"`
	MetricOf      string         `json:"metricOf" validate:"required,oneof=session_count user_count"`
	MetricFormat  string         `json:"metricFormat" validate:"required,oneof=default percentage"`
	ViewType      string         `json:"viewType" validate:"required,oneof=line_chart table_view"`
	MetricValue   []string       `json:"metricValue" validate:"omitempty"`
	SessionID     *int64         `json:"sessionId" validate:"omitempty"`
	Series        []CardSeries   `json:"series" validate:"required,dive"`
}

// Card Fields specific to database operations
type Card struct {
	CardBase
	ProjectID int64      `json:"projectId" validate:"required"`
	UserID    int64      `json:"userId" validate:"required"`
	CardID    int64      `json:"cardId"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	EditedAt  *time.Time `json:"edited_at,omitempty"`
}

type CardSeries struct {
	SeriesID  int64        `json:"seriesId" validate:"omitempty"`
	MetricID  int64        `json:"metricId" validate:"omitempty"`
	Name      string       `json:"name" validate:"required"`
	CreatedAt time.Time    `json:"createdAt" validate:"omitempty"`
	DeletedAt *time.Time   `json:"deletedAt" validate:"omitempty"`
	Index     int64        `json:"index" validate:"required"`
	Filter    SeriesFilter `json:"filter"`
}

type SeriesFilter struct {
	EventOrder string       `json:"eventOrder" validate:"required,oneof=then or and"`
	Filters    []FilterItem `json:"filters"`
}

type FilterItem struct {
	Type           string   `json:"type" validate:"required"`
	Operator       string   `json:"operator" validate:"required"`
	Source         string   `json:"source" validate:"required"`
	SourceOperator string   `json:"sourceOperator" validate:"required"`
	Value          []string `json:"value" validate:"required,dive,required"`
	IsEvent        bool     `json:"isEvent"`
}

// CardCreateRequest Fields required for creating a card (from the frontend)
type CardCreateRequest struct {
	CardBase
}

type CardGetResponse struct {
	Card
}

type CardUpdateRequest struct {
	CardBase
}

type GetCardsResponse struct {
	Cards []Card `json:"cards"`
	Total int64  `json:"total"`
}

type DataPoint struct {
	Timestamp int64            `json:"timestamp"`
	Series    map[string]int64 `json:"series"`
}

type GetCardChartDataRequest struct {
	ProjectID    int64        `json:"projectId" validate:"required"`
	MetricType   string       `json:"metricType" validate:"required,oneof=timeseries table funnel"`
	MetricOf     string       `json:"metricOf" validate:"required,oneof=session_count user_count"`
	MetricFormat string       `json:"metricFormat" validate:"required,oneof=default percentage"`
	SessionID    int64        `json:"sessionId" validate:"required"`
	Series       []CardSeries `json:"series"`
}

type GetCardChartDataResponse struct {
	Data []DataPoint `json:"data"`
}
