package model

import (
	"openreplay/backend/pkg/analytics/filters"
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
	var err error
	e.Properties, err = filters.UnmarshalJSONProperties(e.PropertiesRaw)
	if err != nil {
		return err
	}

	e.AutoProperties, err = filters.UnmarshalJSONProperties(e.AutoPropertiesRaw)
	if err != nil {
		return err
	}

	return nil
}

type EventsSearchRequest struct {
	Filters   []filters.Filter        `json:"filters" validate:"omitempty,dive"`
	StartDate int64                   `json:"startTimestamp" validate:"required,min=946684800000"`
	EndDate   int64                   `json:"endTimestamp" validate:"required,min=946684800000,gtfield=StartDate"`
	SortBy    filters.EventColumn     `json:"sortBy" validate:"omitempty,validEventColumn"`
	SortOrder filters.SortOrderType   `json:"sortOrder" validate:"omitempty,oneof=asc desc"`
	Limit     int                     `json:"limit" validate:"required,min=1,max=200"`
	Page      int                     `json:"page" validate:"required,min=1"`
	Columns   []filters.EventColumn   `json:"columns" validate:"omitempty,dive,validEventColumn"`
}

type EventsSearchResponse struct {
	Total  uint64       `json:"total"`
	Events []EventEntry `json:"events"`
}

func init() {
	filters.RegisterCustomValidation("validEventColumn", filters.ValidateEventColumn)
}

var ColumnMapping = filters.BuildColumnMapping(filters.EventColumns)

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
	switch filters.EventColumn(column) {
	case filters.EventColumnUserID:
		return &entry.UserId
	case filters.EventColumnDeviceID:
		return &entry.DeviceId
	case filters.EventColumnTime:
		return &entry.Time
	case filters.EventColumnSource:
		return &entry.Source
	case filters.EventColumnDurationS:
		return &entry.DurationS
	case filters.EventColumnProperties:
		return &entry.PropertiesRaw
	case filters.EventColumnAutoProperties:
		return &entry.AutoPropertiesRaw
	case filters.EventColumnDescription:
		return &entry.Description
	case filters.EventColumnGroupID1:
		return &entry.GroupId1
	case filters.EventColumnGroupID2:
		return &entry.GroupId2
	case filters.EventColumnGroupID3:
		return &entry.GroupId3
	case filters.EventColumnGroupID4:
		return &entry.GroupId4
	case filters.EventColumnGroupID5:
		return &entry.GroupId5
	case filters.EventColumnGroupID6:
		return &entry.GroupId6
	case filters.EventColumnAutoCaptured:
		return &entry.AutoCaptured
	case filters.EventColumnSDKEdition:
		return &entry.SdkEdition
	case filters.EventColumnSDKVersion:
		return &entry.SdkVersion
	case filters.EventColumnOS:
		return &entry.Os
	case filters.EventColumnOSVersion:
		return &entry.OsVersion
	case filters.EventColumnBrowser:
		return &entry.Browser
	case filters.EventColumnBrowserVersion:
		return &entry.BrowserVersion
	case filters.EventColumnDevice:
		return &entry.Device
	case filters.EventColumnScreenHeight:
		return &entry.ScreenHeight
	case filters.EventColumnScreenWidth:
		return &entry.ScreenWidth
	case filters.EventColumnCurrentURL:
		return &entry.CurrentUrl
	case filters.EventColumnCurrentPath:
		return &entry.CurrentPath
	case filters.EventColumnInitialReferrer:
		return &entry.InitialReferrer
	case filters.EventColumnReferringDomain:
		return &entry.ReferringDomain
	case filters.EventColumnReferrer:
		return &entry.Referrer
	case filters.EventColumnInitialReferringDomain:
		return &entry.InitialReferringDomain
	case filters.EventColumnSearchEngine:
		return &entry.SearchEngine
	case filters.EventColumnSearchEngineKeyword:
		return &entry.SearchEngineKeyword
	case filters.EventColumnUtmSource:
		return &entry.UtmSource
	case filters.EventColumnUtmMedium:
		return &entry.UtmMedium
	case filters.EventColumnUtmCampaign:
		return &entry.UtmCampaign
	case filters.EventColumnCountry:
		return &entry.Country
	case filters.EventColumnState:
		return &entry.State
	case filters.EventColumnCity:
		return &entry.City
	case filters.EventColumnOrAPIEndpoint:
		return &entry.OrApiEndpoint
	case filters.EventColumnTimezone:
		return &entry.Timezone
	case filters.EventColumnIssueType:
		return &entry.IssueType
	case filters.EventColumnIssueID:
		return &entry.IssueId
	case filters.EventColumnErrorID:
		return &entry.ErrorId
	case filters.EventColumnTags:
		return &entry.Tags
	case filters.EventColumnImport:
		return &entry.Import
	default:
		return nil
	}
}


