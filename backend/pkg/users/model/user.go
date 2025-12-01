package model

import (
	analyticsModel "openreplay/backend/pkg/analytics/model"
	"sync"

	"github.com/go-playground/validator/v10"
)

var (
	validate     *validator.Validate
	validateOnce sync.Once
)

func GetValidator() *validator.Validate {
	validateOnce.Do(func() {
		validate = validator.New()
		validate.RegisterStructValidation(analyticsModel.ValidateFilterFields, analyticsModel.Filter{})
		validate.RegisterValidation("validEventColumn", validateUserColumn)
	})
	return validate
}

func ValidateStruct(obj interface{}) error {
	return GetValidator().Struct(obj)
}

func validateUserColumn(fl validator.FieldLevel) bool {
	column := fl.Field().String()
	if column == "" {
		return true
	}
	_, ok := ColumnMapping[column]
	return ok || column == "created_at" || column == "name" || column == "userId"
}

var ColumnMapping = buildColumnMapping()

func buildColumnMapping() map[string]string {
	unquoted := []string{
		"created_at", "name", "user_id",
	}
	quoted := []string{
		"$user_id",
	}

	mapping := make(map[string]string, len(unquoted)+len(quoted))
	for _, col := range unquoted {
		mapping[col] = col
	}
	for _, col := range quoted {
		mapping[col] = `"` + col + `"`
	}
	return mapping
}

type User struct {
	ProjectID          string `json:"-"`
	UserID             string `json:"userID"`
	Email              string `json:"email"`
	Name               string `json:"name"`
	FirstName          string `json:"firstName"`
	LastName           string `json:"lastName"`
	Phone              string `json:"phone"`
	Avatar             string `json:"avatar"`
	Properties         string `json:"properties"`
	SDKEdition         string `json:"sdkEdition"`
	SDKVersion         string `json:"sdkVersion"`
	CurrentUrl         string `json:"currentUrl"`
	InitialReferrer    string `json:"initialReferrer"`
	ReferringDomain    string `json:"referringDomain"`
	InitialUtmSource   string `json:"initialUtmSource"`
	InitialUtmMedium   string `json:"initialUtmMedium"`
	InitialUtmCampaign string `json:"initialUtmCampaign"`
	Country            string `json:"country"`
	State              string `json:"state"`
	OrAPIEndpoint      string `json:"orApiEndpoint"`
	Timezone           string `json:"timezone"`
	FirstEventAt       string `json:"firstEventAt"`
	LastSeen           string `json:"lastSeen"`
	CreatedAt          int64  `json:"createdAt"`
}

type UserFilter struct{}

type SearchUsersRequest struct {
	Filters   []UserFilter `json:"filters" validate:"omitempty,dive"`
	Limit     int          `json:"limit" validate:"omitempty,min=1,max=200"`
	Page      int          `json:"page" validate:"omitempty,min=1"`
	SortBy    string       `json:"sortBy" validate:"omitempty,validUserColumn"`
	SortOrder string       `json:"sortOrder" validate:"omitempty,oneof=asc desc"`
	Columns   []string     `json:"columns" validate:"omitempty,dive,validUserColumn"`
}

type SearchUsersResponse struct {
	Total uint64 `json:"total"`
	Users []User `json:"users"`
}
