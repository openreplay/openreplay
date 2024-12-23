package cards

import (
	"github.com/go-playground/validator/v10"
	"strings"
	"time"
)

// CardBase Common fields for the Card entity
type CardBase struct {
	Name          string           `json:"name" validate:"required"`
	IsPublic      bool             `json:"isPublic" validate:"omitempty"`
	DefaultConfig map[string]any   `json:"defaultConfig"`
	Config        map[string]any   `json:"config"`
	Thumbnail     *string          `json:"thumbnail" validate:"omitempty,url"`
	MetricType    string           `json:"metricType" validate:"required,oneof=timeseries table funnel"`
	MetricOf      string           `json:"metricOf" validate:"required,oneof=session_count user_count"`
	MetricFormat  string           `json:"metricFormat" validate:"required,oneof=default percentage"`
	ViewType      string           `json:"viewType" validate:"required,oneof=line_chart table_view"`
	MetricValue   []string         `json:"metricValue" validate:"omitempty"`
	SessionID     *int64           `json:"sessionId" validate:"omitempty"`
	Series        []CardSeriesBase `json:"series" validate:"required,dive"`
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

type CardSeriesBase struct {
	Name      string       `json:"name" validate:"required"`
	CreatedAt time.Time    `json:"createdAt" validate:"omitempty"`
	DeletedAt *time.Time   `json:"deletedAt" validate:"omitempty"`
	Index     int64        `json:"index" validate:"required"`
	Filter    SeriesFilter `json:"filter"`
}

type CardSeries struct {
	SeriesID int64 `json:"seriesId" validate:"omitempty"`
	MetricID int64 `json:"metricId" validate:"omitempty"`
	CardSeriesBase
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
	Series []CardSeries `json:"series"`
}

type CardUpdateRequest struct {
	CardBase
}

type GetCardsResponse struct {
	Cards []Card `json:"cards"`
}

type GetCardsResponsePaginated struct {
	Cards []Card `json:"cards"`
	Total int    `json:"total"`
}

/************************************************************
 * CardListFilter and Sorter
 */

// Supported filters, fields, and orders
var (
	SupportedFilterKeys = map[string]bool{
		"name":          true,
		"metric_type":   true,
		"dashboard_ids": true,
	}
	SupportedSortFields = map[string]string{
		"name":        "m.name",
		"created_at":  "m.created_at",
		"metric_type": "m.metric_type",
	}
	SupportedSortOrders = map[string]bool{
		"asc":  true,
		"desc": true,
	}
)

// CardListFilter holds filtering criteria for listing cards.
type CardListFilter struct {
	// Keys: "name" (string), "metric_type" (string), "dashboard_ids" ([]int)
	Filters map[string]interface{} `validate:"supportedFilters"`
}

// CardListSort holds sorting criteria.
type CardListSort struct {
	Field string `validate:"required,supportedSortField"`
	Order string `validate:"required,supportedSortOrder"`
}

// Validator singleton
var validate *validator.Validate

func GetValidator() *validator.Validate {
	if validate == nil {
		validate = validator.New()
		// Register custom validations
		_ = validate.RegisterValidation("supportedFilters", supportedFiltersValidator)
		_ = validate.RegisterValidation("supportedSortField", supportedSortFieldValidator)
		_ = validate.RegisterValidation("supportedSortOrder", supportedSortOrderValidator)
	}
	return validate
}

func ValidateStruct(obj interface{}) error {
	return GetValidator().Struct(obj)
}

// Custom validations
func supportedFiltersValidator(fl validator.FieldLevel) bool {
	filters, ok := fl.Field().Interface().(map[string]interface{})
	if !ok {
		return false
	}
	for k := range filters {
		if !SupportedFilterKeys[k] {
			return false
		}
	}
	return true
}

func supportedSortFieldValidator(fl validator.FieldLevel) bool {
	field := strings.ToLower(fl.Field().String())
	_, ok := SupportedSortFields[field]
	return ok
}

func supportedSortOrderValidator(fl validator.FieldLevel) bool {
	order := strings.ToLower(fl.Field().String())
	return SupportedSortOrders[order]
}

// Filter helpers
func (f *CardListFilter) GetNameFilter() *string {
	if val, ok := f.Filters["name"].(string); ok && val != "" {
		return &val
	}
	return nil
}

func (f *CardListFilter) GetMetricTypeFilter() *string {
	if val, ok := f.Filters["metric_type"].(string); ok && val != "" {
		return &val
	}
	return nil
}

func (f *CardListFilter) GetDashboardIDs() []int {
	if val, ok := f.Filters["dashboard_ids"].([]int); ok && len(val) > 0 {
		return val
	}
	return nil
}

// Sort helpers
func (s *CardListSort) GetSQLField() string {
	return SupportedSortFields[strings.ToLower(s.Field)]
}

func (s *CardListSort) GetSQLOrder() string {
	return strings.ToUpper(s.Order)
}
