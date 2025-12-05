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
	UserID             string                  `json:"$user_id" db:"$user_id" validate:"required"`
	Email              string                  `json:"$email" db:"$email" validate:"omitempty,email"`
	Name               string                  `json:"$name" db:"$name" validate:"omitempty"`
	FirstName          string                  `json:"$first_name" db:"$first_name" validate:"omitempty"`
	LastName           string                  `json:"$last_name" db:"$last_name" validate:"omitempty"`
	Phone              string                  `json:"$phone,omitempty" db:"$phone" validate:"omitempty"`
	Avatar             string                  `json:"$avatar,omitempty" db:"$avatar" validate:"omitempty,url"`
	CreatedAt          int64                   `json:"$created_at,omitempty" db:"$created_at" validate:"omitempty"`
	Properties         *map[string]interface{} `json:"properties,omitempty"`
	PropertiesRaw      *string                 `json:"-"`
	DistinctIDs        []string                `json:"distinct_ids,omitempty"`
	GroupID1           []string                `json:"group_id1,omitempty" db:"group_id1"`
	GroupID2           []string                `json:"group_id2,omitempty" db:"group_id2"`
	GroupID3           []string                `json:"group_id3,omitempty" db:"group_id3"`
	GroupID4           []string                `json:"group_id4,omitempty" db:"group_id4"`
	GroupID5           []string                `json:"group_id5,omitempty" db:"group_id5"`
	GroupID6           []string                `json:"group_id6,omitempty" db:"group_id6"`
	SDKEdition         string                  `json:"$sdk_edition,omitempty" db:"$sdk_edition" validate:"omitempty"`
	SDKVersion         string                  `json:"$sdk_version,omitempty" db:"$sdk_version" validate:"omitempty"`
	CurrentUrl         string                  `json:"$current_url,omitempty" db:"$current_url" validate:"omitempty,url"`
	InitialReferrer    string                  `json:"$initial_referrer,omitempty" db:"$initial_referrer" validate:"omitempty"`
	ReferringDomain    string                  `json:"$referring_domain,omitempty" db:"$referring_domain" validate:"omitempty"`
	InitialUtmSource   string                  `json:"initial_utm_source,omitempty" db:"initial_utm_source" validate:"omitempty"`
	InitialUtmMedium   string                  `json:"initial_utm_medium,omitempty" db:"initial_utm_medium" validate:"omitempty"`
	InitialUtmCampaign string                  `json:"initial_utm_campaign,omitempty" db:"initial_utm_campaign" validate:"omitempty"`
	Country            string                  `json:"$country,omitempty" db:"$country" validate:"omitempty,len=2"`
	State              string                  `json:"$state,omitempty" db:"$state" validate:"omitempty"`
	City               string                  `json:"$city,omitempty" db:"$city" validate:"omitempty"`
	OrAPIEndpoint      string                  `json:"$or_api_endpoint,omitempty" db:"$or_api_endpoint" validate:"omitempty"`
	Timezone           int8                    `json:"$timezone,omitempty" db:"$timezone" validate:"omitempty"`
	FirstEventAt       int64                   `json:"$first_event_at,omitempty" db:"$first_event_at" validate:"omitempty"`
	LastSeen           int64                   `json:"$last_seen,omitempty" db:"$last_seen" validate:"omitempty"`
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

type UserActivityRequest struct {
	StartDate      int64                 `json:"startTimestamp" validate:"required,min=946684800000"`
	EndDate        int64                 `json:"endTimestamp" validate:"required,min=946684800000,gtfield=StartDate"`
	HideEvents     []string              `json:"hideEvents" validate:"omitempty"`
	Limit          int                   `json:"limit" validate:"omitempty,min=1,max=200"`
	Page           int                   `json:"page" validate:"omitempty,min=1"`
	SortBy         string                `json:"sortBy" validate:"omitempty,oneof=created_at $event_name"`
	SortOrder      filters.SortOrderType `json:"sortOrder" validate:"omitempty,oneof=asc desc"`
}

type UserEvent struct {
	EventID   string `json:"event_id"`
	EventName string `json:"$event_name"`
	CreatedAt int64  `json:"created_at"`
}

type UserActivityResponse struct {
	Total  uint64      `json:"total"`
	Events []UserEvent `json:"events"`
}

func GetFieldPointer(user *User, column string) interface{} {
	switch filters.UserColumn(column) {
	case filters.UserColumnUserID:
		return &user.UserID
	case filters.UserColumnEmail:
		return &user.Email
	case filters.UserColumnName:
		return &user.Name
	case filters.UserColumnFirstName:
		return &user.FirstName
	case filters.UserColumnLastName:
		return &user.LastName
	case filters.UserColumnPhone:
		return &user.Phone
	case filters.UserColumnAvatar:
		return &user.Avatar
	case filters.UserColumnCreatedAt:
		return &user.CreatedAt
	case filters.UserColumnProperties:
		return &user.PropertiesRaw
	case filters.UserColumnGroupID1:
		return &user.GroupID1
	case filters.UserColumnGroupID2:
		return &user.GroupID2
	case filters.UserColumnGroupID3:
		return &user.GroupID3
	case filters.UserColumnGroupID4:
		return &user.GroupID4
	case filters.UserColumnGroupID5:
		return &user.GroupID5
	case filters.UserColumnGroupID6:
		return &user.GroupID6
	case filters.UserColumnSDKEdition:
		return &user.SDKEdition
	case filters.UserColumnSDKVersion:
		return &user.SDKVersion
	case filters.UserColumnCurrentURL:
		return &user.CurrentUrl
	case filters.UserColumnInitialReferrer:
		return &user.InitialReferrer
	case filters.UserColumnReferringDomain:
		return &user.ReferringDomain
	case filters.UserColumnInitialUtmSource:
		return &user.InitialUtmSource
	case filters.UserColumnInitialUtmMedium:
		return &user.InitialUtmMedium
	case filters.UserColumnInitialUtmCampaign:
		return &user.InitialUtmCampaign
	case filters.UserColumnCountry:
		return &user.Country
	case filters.UserColumnState:
		return &user.State
	case filters.UserColumnCity:
		return &user.City
	case filters.UserColumnOrAPIEndpoint:
		return &user.OrAPIEndpoint
	case filters.UserColumnTimezone:
		return &user.Timezone
	case filters.UserColumnFirstEventAt:
		return &user.FirstEventAt
	case filters.UserColumnLastSeen:
		return &user.LastSeen
	default:
		return nil
	}
}
