package model

import (
	"encoding/json"
	"fmt"
	analyticsModel "openreplay/backend/pkg/analytics/model"
	"sync"

	"github.com/go-playground/validator/v10"
)

type EventEntry struct {
	ProjectId              uint16                  `json:"-"`
	EventId                string                  `json:"event_id"`
	EventName              string                  `json:"$event_name"`
	CreatedAt              int64                   `json:"created_at"`
	DistinctId             string                  `json:"distinct_id"`
	SessionId              string                  `json:"session_id"`
	UserId                 *string                 `json:"$user_id,omitempty"`
	DeviceId               *string                 `json:"$device_id,omitempty"`
	Time                   *uint32                 `json:"$time,omitempty"`
	Source                 *string                 `json:"$source,omitempty"`
	DurationS              *uint16                 `json:"$duration_s,omitempty"`
	Properties             *map[string]interface{} `json:"properties,omitempty"`
	AutoProperties         *map[string]interface{} `json:"$properties,omitempty"`
	PropertiesRaw          *string                 `json:"-"`
	AutoPropertiesRaw      *string                 `json:"-"`
	Description            *string                 `json:"description,omitempty"`
	GroupId1               []string                `json:"group_id1,omitempty"`
	GroupId2               []string                `json:"group_id2,omitempty"`
	GroupId3               []string                `json:"group_id3,omitempty"`
	GroupId4               []string                `json:"group_id4,omitempty"`
	GroupId5               []string                `json:"group_id5,omitempty"`
	GroupId6               []string                `json:"group_id6,omitempty"`
	AutoCaptured           *bool                   `json:"$auto_captured,omitempty"`
	SdkEdition             *string                 `json:"$sdk_edition,omitempty"`
	SdkVersion             *string                 `json:"$sdk_version,omitempty"`
	Os                     *string                 `json:"$os,omitempty"`
	OsVersion              *string                 `json:"$os_version,omitempty"`
	Browser                *string                 `json:"$browser,omitempty"`
	BrowserVersion         *string                 `json:"$browser_version,omitempty"`
	Device                 *string                 `json:"$device,omitempty"`
	ScreenHeight           *uint16                 `json:"$screen_height,omitempty"`
	ScreenWidth            *uint16                 `json:"$screen_width,omitempty"`
	CurrentUrl             *string                 `json:"$current_url,omitempty"`
	CurrentPath            *string                 `json:"$current_path,omitempty"`
	InitialReferrer        *string                 `json:"$initial_referrer,omitempty"`
	ReferringDomain        *string                 `json:"$referring_domain,omitempty"`
	Referrer               *string                 `json:"$referrer,omitempty"`
	InitialReferringDomain *string                 `json:"$initial_referring_domain,omitempty"`
	SearchEngine           *string                 `json:"$search_engine,omitempty"`
	SearchEngineKeyword    *string                 `json:"$search_engine_keyword,omitempty"`
	UtmSource              *string                 `json:"utm_source,omitempty"`
	UtmMedium              *string                 `json:"utm_medium,omitempty"`
	UtmCampaign            *string                 `json:"utm_campaign,omitempty"`
	Country                *string                 `json:"$country,omitempty"`
	State                  *string                 `json:"$state,omitempty"`
	City                   *string                 `json:"$city,omitempty"`
	OrApiEndpoint          *string                 `json:"$or_api_endpoint,omitempty"`
	Timezone               *int8                   `json:"$timezone,omitempty"`
	IssueType              *string                 `json:"issue_type,omitempty"`
	IssueId                *string                 `json:"issue_id,omitempty"`
	ErrorId                *string                 `json:"error_id,omitempty"`
	Tags                   []string                `json:"$tags,omitempty"`
	Import                 *bool                   `json:"$import,omitempty"`
}

func (e *EventEntry) UnmarshalProperties() error {
	if e.PropertiesRaw != nil && *e.PropertiesRaw != "" && *e.PropertiesRaw != "null" {
		m := make(map[string]interface{})
		if err := json.Unmarshal([]byte(*e.PropertiesRaw), &m); err != nil {
			return fmt.Errorf("failed to unmarshal properties: %w", err)
		}
		e.Properties = &m
	}

	if e.AutoPropertiesRaw != nil && *e.AutoPropertiesRaw != "" && *e.AutoPropertiesRaw != "null" {
		m := make(map[string]interface{})
		if err := json.Unmarshal([]byte(*e.AutoPropertiesRaw), &m); err != nil {
			return fmt.Errorf("failed to unmarshal auto_properties: %w", err)
		}
		e.AutoProperties = &m
	}

	return nil
}

type EventsSearchRequest struct {
	Filters   []analyticsModel.Filter `json:"filters" validate:"omitempty,dive"`
	StartDate int64                   `json:"startTimestamp" validate:"required,min=946684800000"`
	EndDate   int64                   `json:"endTimestamp" validate:"required,min=946684800000,gtfield=StartDate"`
	SortBy    string                  `json:"sortBy" validate:"omitempty,validEventColumn"`
	SortOrder string                  `json:"sortOrder" validate:"omitempty,oneof=asc desc"`
	Limit     int                     `json:"limit" validate:"required,min=1,max=200"`
	Page      int                     `json:"page" validate:"required,min=1"`
	Columns   []string                `json:"columns" validate:"omitempty,dive,validEventColumn"`
}

type EventsSearchResponse struct {
	Total  uint64       `json:"total"`
	Events []EventEntry `json:"events"`
}

var (
	validate     *validator.Validate
	validateOnce sync.Once
)

func GetValidator() *validator.Validate {
	validateOnce.Do(func() {
		validate = validator.New()
		validate.RegisterStructValidation(analyticsModel.ValidateFilterFields, analyticsModel.Filter{})
		validate.RegisterValidation("validEventColumn", validateEventColumn)
	})
	return validate
}

func ValidateStruct(obj interface{}) error {
	return GetValidator().Struct(obj)
}

func validateEventColumn(fl validator.FieldLevel) bool {
	column := fl.Field().String()
	if column == "" {
		return true
	}
	_, ok := ColumnMapping[column]
	return ok || column == "created_at" || column == "time" || column == "distinct_id" || column == "$event_name"
}

var ColumnMapping = buildColumnMapping()

func buildColumnMapping() map[string]string {
	unquoted := []string{
		"event_id", "distinct_id", "session_id", "properties", "description",
		"group_id1", "group_id2", "group_id3", "group_id4", "group_id5", "group_id6",
		"utm_source", "utm_medium", "utm_campaign", "issue_type", "issue_id", "error_id",
	}
	quoted := []string{
		"$user_id", "$device_id", "$time", "$source", "$duration_s", "$properties",
		"$auto_captured", "$sdk_edition", "$sdk_version", "$os", "$os_version",
		"$browser", "$browser_version", "$device", "$screen_height", "$screen_width",
		"$current_url", "$current_path", "$initial_referrer", "$referring_domain",
		"$referrer", "$initial_referring_domain", "$search_engine", "$search_engine_keyword",
		"$country", "$state", "$city", "$or_api_endpoint", "$timezone", "$tags", "$import",
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

var filterToColumnMapping = map[string]string{
	"userBrowser":        "$browser",
	"userBrowserVersion": "$browser_version",
	"userOs":             "$os",
	"userOsVersion":      "$os_version",
	"userDevice":         "$device",
	"userCountry":        "$country",
	"userState":          "$state",
	"userCity":           "$city",
	"referrer":           "$referrer",
	"url":                "$current_url",
	"urlPath":            "$current_path",
	"fetchDuration":      "$duration_s",
	"autoCaptured":       "$auto_captured",
}

var FilterColumnMapping = buildFilterColumnMapping()

func buildFilterColumnMapping() map[string][]string {
	mapping := make(map[string][]string, len(filterToColumnMapping)+len(ColumnMapping))

	for filterKey, columnKey := range filterToColumnMapping {
		if dbCol, ok := ColumnMapping[columnKey]; ok {
			mapping[filterKey] = []string{dbCol, "singleColumn"}
		}
	}

	for columnKey, dbCol := range ColumnMapping {
		mapping[columnKey] = []string{dbCol, "singleColumn"}
	}

	return mapping
}

func GetFieldPointer(entry *EventEntry, column string) interface{} {
	switch column {
	case "$user_id":
		return &entry.UserId
	case "$device_id":
		return &entry.DeviceId
	case "$time":
		return &entry.Time
	case "$source":
		return &entry.Source
	case "$duration_s":
		return &entry.DurationS
	case "properties":
		return &entry.PropertiesRaw
	case "$properties":
		return &entry.AutoPropertiesRaw
	case "description":
		return &entry.Description
	case "group_id1":
		return &entry.GroupId1
	case "group_id2":
		return &entry.GroupId2
	case "group_id3":
		return &entry.GroupId3
	case "group_id4":
		return &entry.GroupId4
	case "group_id5":
		return &entry.GroupId5
	case "group_id6":
		return &entry.GroupId6
	case "$auto_captured":
		return &entry.AutoCaptured
	case "$sdk_edition":
		return &entry.SdkEdition
	case "$sdk_version":
		return &entry.SdkVersion
	case "$os":
		return &entry.Os
	case "$os_version":
		return &entry.OsVersion
	case "$browser":
		return &entry.Browser
	case "$browser_version":
		return &entry.BrowserVersion
	case "$device":
		return &entry.Device
	case "$screen_height":
		return &entry.ScreenHeight
	case "$screen_width":
		return &entry.ScreenWidth
	case "$current_url":
		return &entry.CurrentUrl
	case "$current_path":
		return &entry.CurrentPath
	case "$initial_referrer":
		return &entry.InitialReferrer
	case "$referring_domain":
		return &entry.ReferringDomain
	case "$referrer":
		return &entry.Referrer
	case "$initial_referring_domain":
		return &entry.InitialReferringDomain
	case "$search_engine":
		return &entry.SearchEngine
	case "$search_engine_keyword":
		return &entry.SearchEngineKeyword
	case "utm_source":
		return &entry.UtmSource
	case "utm_medium":
		return &entry.UtmMedium
	case "utm_campaign":
		return &entry.UtmCampaign
	case "$country":
		return &entry.Country
	case "$state":
		return &entry.State
	case "$city":
		return &entry.City
	case "$or_api_endpoint":
		return &entry.OrApiEndpoint
	case "$timezone":
		return &entry.Timezone
	case "issue_type":
		return &entry.IssueType
	case "issue_id":
		return &entry.IssueId
	case "error_id":
		return &entry.ErrorId
	case "$tags":
		return &entry.Tags
	case "$import":
		return &entry.Import
	default:
		return nil
	}
}

func GetAllEventColumns() []string {
	return []string{
		"event_id", "$user_id", "$device_id", "session_id", "$time", "$source",
		"$duration_s", "properties", "$properties", "description",
		"group_id1", "group_id2", "group_id3", "group_id4", "group_id5", "group_id6",
		"$auto_captured", "$sdk_edition", "$sdk_version",
		"$os", "$os_version", "$browser", "$browser_version", "$device",
		"$screen_height", "$screen_width", "$current_url", "$current_path",
		"$initial_referrer", "$referring_domain", "$referrer", "$initial_referring_domain",
		"$search_engine", "$search_engine_keyword",
		"utm_source", "utm_medium", "utm_campaign",
		"$country", "$state", "$city", "$or_api_endpoint", "$timezone",
		"issue_type", "issue_id", "error_id", "$tags", "$import",
	}
}
