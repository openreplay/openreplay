package model

import (
	"encoding/json"
	"fmt"
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
		validate.RegisterValidation("validateUserColumn", validateUserColumn)
		validate.RegisterValidation("validateFilterOperator", validateFilterOperator)
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
	validColumns := map[string]bool{
		"$user_id":             true,
		"$email":               true,
		"$name":                true,
		"$first_name":          true,
		"$last_name":           true,
		"$phone":               true,
		"$avatar":              true,
		"$created_at":          true,
		"$country":             true,
		"$state":               true,
		"$city":                true,
		"$timezone":            true,
		"$first_event_at":      true,
		"$last_seen":           true,
		"$sdk_edition":         true,
		"$sdk_version":         true,
		"$current_url":         true,
		"$initial_referrer":    true,
		"$referring_domain":    true,
		"initial_utm_source":   true,
		"initial_utm_medium":   true,
		"initial_utm_campaign": true,
		"properties":           true,
		"group_id1":            true,
		"group_id2":            true,
		"group_id3":            true,
		"group_id4":            true,
		"group_id5":            true,
		"group_id6":            true,
		"project_id":           true,
		"$or_api_endpoint":     true,
	}
	return validColumns[column]
}

func validateFilterOperator(fl validator.FieldLevel) bool {
	operator := fl.Field().String()
	validOperators := map[string]bool{
		"is":          true,
		"isAny":       true,
		"isNot":       true,
		"isUndefined": true,
		"contains":    true,
		"notContains": true,
		"startsWith":  true,
		"endsWith":    true,
		"=":           true,
		"<":           true,
		">":           true,
		"<=":          true,
		">=":          true,
		"!=":          true,
	}
	return validOperators[operator]
}

var ColumnMapping = buildColumnMapping()

func buildColumnMapping() map[string]string {
	quotedColumns := []string{
		"$user_id",
		"$email",
		"$name",
		"$first_name",
		"$last_name",
		"$phone",
		"$avatar",
		"$created_at",
		"$country",
		"$state",
		"$city",
		"$timezone",
		"$first_event_at",
		"$last_seen",
		"$sdk_edition",
		"$sdk_version",
		"$current_url",
		"$current_path",
		"$initial_referrer",
		"$referring_domain",
		"$or_api_endpoint",
	}

	unquotedColumns := []string{
		"project_id",
		"properties",
		"group_id1",
		"group_id2",
		"group_id3",
		"group_id4",
		"group_id5",
		"group_id6",
		"initial_utm_source",
		"initial_utm_medium",
		"initial_utm_campaign",
		"_deleted_at",
		"_timestamp",
	}

	mapping := make(map[string]string, len(quotedColumns)+len(unquotedColumns))
	for _, col := range quotedColumns {
		mapping[col] = `"` + col + `"`
	}
	for _, col := range unquotedColumns {
		mapping[col] = col
	}
	return mapping
}

type User struct {
	ProjectID          uint16                  `json:"-" db:"project_id"`
	UserID             string                  `json:"userId" db:"$user_id" validate:"required"`
	Email              string                  `json:"email" db:"$email" validate:"omitempty,email"`
	Name               string                  `json:"name" db:"$name" validate:"omitempty"`
	FirstName          string                  `json:"firstName" db:"$first_name" validate:"omitempty"`
	LastName           string                  `json:"lastName" db:"$last_name" validate:"omitempty"`
	Phone              string                  `json:"phone" db:"$phone" validate:"omitempty"`
	Avatar             string                  `json:"avatar" db:"$avatar" validate:"omitempty,url"`
	CreatedAt          int64                   `json:"createdAt" db:"$created_at" validate:"omitempty"`
	Properties         *map[string]interface{} `json:"properties,omitempty"`
	PropertiesRaw      *string                 `json:"-"`
	GroupID1           []string                `json:"groupId1,omitempty" db:"group_id1"`
	GroupID2           []string                `json:"groupId2,omitempty" db:"group_id2"`
	GroupID3           []string                `json:"groupId3,omitempty" db:"group_id3"`
	GroupID4           []string                `json:"groupId4,omitempty" db:"group_id4"`
	GroupID5           []string                `json:"groupId5,omitempty" db:"group_id5"`
	GroupID6           []string                `json:"groupId6,omitempty" db:"group_id6"`
	SDKEdition         string                  `json:"sdkEdition,omitempty" db:"$sdk_edition" validate:"omitempty"`
	SDKVersion         string                  `json:"sdkVersion,omitempty" db:"$sdk_version" validate:"omitempty"`
	CurrentUrl         string                  `json:"currentUrl,omitempty" db:"$current_url" validate:"omitempty,url"`
	InitialReferrer    string                  `json:"initialReferrer,omitempty" db:"$initial_referrer" validate:"omitempty"`
	ReferringDomain    string                  `json:"referringDomain,omitempty" db:"$referring_domain" validate:"omitempty"`
	InitialUtmSource   string                  `json:"initialUtmSource,omitempty" db:"initial_utm_source" validate:"omitempty"`
	InitialUtmMedium   string                  `json:"initialUtmMedium,omitempty" db:"initial_utm_medium" validate:"omitempty"`
	InitialUtmCampaign string                  `json:"initialUtmCampaign,omitempty" db:"initial_utm_campaign" validate:"omitempty"`
	Country            string                  `json:"country,omitempty" db:"$country" validate:"omitempty,len=2"`
	State              string                  `json:"state,omitempty" db:"$state" validate:"omitempty"`
	City               string                  `json:"city,omitempty" db:"$city" validate:"omitempty"`
	OrAPIEndpoint      string                  `json:"orApiEndpoint,omitempty" db:"$or_api_endpoint" validate:"omitempty"`
	Timezone           int8                    `json:"timezone,omitempty" db:"$timezone" validate:"omitempty"`
	FirstEventAt       int64                   `json:"firstEventAt,omitempty" db:"$first_event_at" validate:"omitempty"`
	LastSeen           int64                   `json:"lastSeen,omitempty" db:"$last_seen" validate:"omitempty"`
}

func (u *User) UnmarshalProperties() error {
	if u.PropertiesRaw != nil && *u.PropertiesRaw != "" && *u.PropertiesRaw != "null" {
		m := make(map[string]interface{})
		if err := json.Unmarshal([]byte(*u.PropertiesRaw), &m); err != nil {
			return fmt.Errorf("failed to unmarshal properties: %w", err)
		}
		u.Properties = &m
	}
	return nil
}

func (u *User) MarshalProperties() (string, error) {
	if u.Properties == nil {
		return "{}", nil
	}
	data, err := json.Marshal(u.Properties)
	if err != nil {
		return "", fmt.Errorf("failed to marshal properties: %w", err)
	}
	return string(data), nil
}

type UserFilter struct {
	Name     string   `json:"name" validate:"required,validateUserColumn"`
	Operator string   `json:"operator" validate:"required,validateFilterOperator"`
	Value    []string `json:"value" validate:"required,min=1,max=10,dive"`
}

type SearchUsersRequest struct {
	Filters   []UserFilter `json:"filters" validate:"omitempty,dive"`
	Query     string       `json:"query" validate:"omitempty,max=100"`
	Limit     int          `json:"limit" validate:"omitempty,min=1,max=200"`
	Page      int          `json:"page" validate:"omitempty,min=1"`
	SortBy    string       `json:"sortBy" validate:"omitempty,validateUserColumn"`
	SortOrder string       `json:"sortOrder" validate:"omitempty,oneof=asc desc"`
	Columns   []string     `json:"columns" validate:"omitempty,dive,validateUserColumn"`
}

type SearchUsersResponse struct {
	Total uint64 `json:"total"`
	Users []User `json:"users"`
}