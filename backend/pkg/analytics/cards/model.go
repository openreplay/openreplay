package cards

import (
	"strings"
	"time"

	"github.com/go-playground/validator/v10"

	"openreplay/backend/pkg/analytics/model"
)

// CardBase Common fields for the Card entity
// The db tags map PostgreSQL column names for pgx struct scanning; db:"-"
// marks fields that never come from a query.
type CardBase struct {
	WidgetId      *int64         `json:"widgetId,omitempty" validate:"omitempty" db:"-"`
	MetricId      int64          `json:"metricId" validate:"omitempty" db:"-"`
	Name          string         `json:"name" validate:"required" db:"name"`
	IsPublic      bool           `json:"isPublic" validate:"omitempty" db:"is_public"`
	DefaultConfig map[string]any `json:"defaultConfig" db:"-"`
	Config        map[string]any `json:"config" db:"-"`
	Thumbnail     *string        `json:"thumbnail" validate:"omitempty,url" db:"thumbnail"`
	MetricType    string         `json:"metricType" validate:"required,oneof=timeseries table funnel pathAnalysis heatMap webVital" db:"metric_type"`
	MetricOf      string         `json:"metricOf" validate:"required" db:"metric_of"`
	MetricFormat  string         `json:"metricFormat" validate:"required,oneof=default sessionCount userCount eventCount percentage" db:"metric_format"`
	ViewType      string         `json:"viewType" validate:"required,oneof=lineChart areaChart barChart progressChart pieChart metric tableView table chart sunburst" db:"view_type"`
	MetricValue   []string       `json:"metricValue" validate:"omitempty" db:"metric_value"`
	Series        []model.Series `json:"series" validate:"required,dive" db:"-"`
	// The db tag makes pgx treat the embedded struct as a single field, so
	// the card_info JSON column decodes directly into it.
	CardInfo `db:"card_info"`
}

type CardInfo struct {
	Rows        *int64            `json:"rows"`
	StepsBefore *int64            `json:"stepsBefore"`
	StepsAfter  *int64            `json:"stepsAfter"`
	StartPoint  []model.Filter    `json:"startPoint"`
	Excludes    []model.Filter    `json:"excludes"`
	Breakdowns  []model.Breakdown `json:"breakdowns" validate:"omitempty,max=3,unique=Name,dive"`
}

// Card Fields specific to database operations
type Card struct {
	CardBase
	ProjectID  int64      `json:"projectId" validate:"required" db:"project_id"`
	UserID     int64      `json:"userId" validate:"required" db:"user_id"`
	CardID     int64      `json:"metricId" db:"metric_id"`
	CreatedAt  time.Time  `json:"createdAt" db:"created_at"`
	DeletedAt  *time.Time `json:"deletedAt,omitempty" db:"deleted_at"`
	EditedAt   *time.Time `json:"updatedAt,omitempty" db:"edited_at"`
	OwnerEmail *string    `json:"ownerEmail,omitempty" db:"email"`    // Email of the user who created the card
	OwnerName  *string    `json:"ownerName,omitempty" db:"user_name"` // Name of the user who created the card
}

type CardSeriesBase struct {
	Name      string             `json:"name" validate:"required"`
	CreatedAt time.Time          `json:"createdAt" validate:"omitempty"`
	DeletedAt *time.Time         `json:"deletedAt" validate:"omitempty"`
	Index     *int64             `json:"index" validate:"omitempty"`
	Filter    model.SeriesFilter `json:"filter"`
}

type CardSeries struct {
	SeriesID int64 `json:"seriesId" validate:"omitempty"`
	MetricID int64 `json:"metricId" validate:"omitempty"`
	CardSeriesBase
}

// CardCreateRequest Fields required for creating a card (from the frontend)
type CardCreateRequest struct {
	CardBase
}

type CardGetResponse struct {
	Card
	Series []model.Series `json:"series" db:"-"`
}

type CardUpdateRequest struct {
	CardBase
}

type CardListItem struct {
	CardID       int64      `json:"metricId"`
	ProjectID    int64      `json:"projectId"`
	UserID       int64      `json:"userId"`
	OwnerEmail   *string    `json:"ownerEmail,omitempty"`
	OwnerName    *string    `json:"ownerName,omitempty"`
	Name         string     `json:"name"`
	MetricType   string     `json:"metricType"`
	ViewType     string     `json:"viewType"`
	MetricOf     string     `json:"metricOf"`
	MetricValue  []string   `json:"metricValue"`
	MetricFormat string     `json:"metricFormat"`
	IsPublic     bool       `json:"isPublic"`
	CreatedAt    time.Time  `json:"createdAt"`
	EditedAt     *time.Time `json:"updatedAt,omitempty"`
	DeletedAt    *time.Time `json:"deletedAt,omitempty"`
}

type GetCardsResponsePaginated struct {
	Cards []CardListItem `json:"list"`
	Total int            `json:"total"`
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
		"edited_at":   "m.edited_at",
		"owner_email": "user_name",
		"metric_type": "m.metric_type",
	}
	SupportedSortOrders = map[string]bool{
		"asc":  true,
		"desc": true,
	}
)

// CardListFilter holds filtering criteria for listing cards.
type CardListFilter struct {
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
