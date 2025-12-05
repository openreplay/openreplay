package model

import (
	"openreplay/backend/pkg/analytics/filters"
)

func init() {
	filters.RegisterCustomValidation("validateUserColumn", filters.ValidateUserColumn)
}

var ColumnMapping = buildColumnMapping()

func buildColumnMapping() map[string]string {
	mapping := filters.BuildColumnMapping(filters.UserColumns)
	mapping["project_id"] = "project_id"
	mapping["_deleted_at"] = "_deleted_at"
	mapping["_timestamp"] = "_timestamp"
	mapping["$current_path"] = `"$current_path"`
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
	var err error
	u.Properties, err = filters.UnmarshalJSONProperties(u.PropertiesRaw)
	return err
}

type SearchUsersRequest struct {
	Filters   []filters.Filter          `json:"filters" validate:"omitempty,dive"`
	Query     string                    `json:"query" validate:"omitempty,max=100"`
	Limit     int                       `json:"limit" validate:"omitempty,min=1,max=200"`
	Page      int                       `json:"page" validate:"omitempty,min=1"`
	SortBy    filters.UserColumn        `json:"sortBy" validate:"omitempty,validateUserColumn"`
	SortOrder filters.SortOrderType     `json:"sortOrder" validate:"omitempty,oneof=asc desc"`
	Columns   []filters.UserColumn      `json:"columns" validate:"omitempty,dive,validateUserColumn"`
}

type SearchUsersResponse struct {
	Total uint64 `json:"total"`
	Users []User `json:"users"`
}
