package filters

import (
	"github.com/go-playground/validator/v10"
)

const (
	DefaultLimit = 50
	MaxLimit     = 200
	MinLimit     = 1
	DefaultPage  = 1
)

type EventColumn string

const (
	EventColumnEventID                EventColumn = "event_id"
	EventColumnEventName              EventColumn = "$event_name"
	EventColumnCreatedAt              EventColumn = "created_at"
	EventColumnDistinctID             EventColumn = "distinct_id"
	EventColumnSessionID              EventColumn = "session_id"
	EventColumnUserID                 EventColumn = "$user_id"
	EventColumnDeviceID               EventColumn = "$device_id"
	EventColumnTime                   EventColumn = "$time"
	EventColumnSource                 EventColumn = "$source"
	EventColumnDurationS              EventColumn = "$duration_s"
	EventColumnProperties             EventColumn = "properties"
	EventColumnAutoProperties         EventColumn = "$properties"
	EventColumnDescription            EventColumn = "description"
	EventColumnGroupID1               EventColumn = "group_id1"
	EventColumnGroupID2               EventColumn = "group_id2"
	EventColumnGroupID3               EventColumn = "group_id3"
	EventColumnGroupID4               EventColumn = "group_id4"
	EventColumnGroupID5               EventColumn = "group_id5"
	EventColumnGroupID6               EventColumn = "group_id6"
	EventColumnAutoCaptured           EventColumn = "$auto_captured"
	EventColumnSDKEdition             EventColumn = "$sdk_edition"
	EventColumnSDKVersion             EventColumn = "$sdk_version"
	EventColumnOS                     EventColumn = "$os"
	EventColumnOSVersion              EventColumn = "$os_version"
	EventColumnBrowser                EventColumn = "$browser"
	EventColumnBrowserVersion         EventColumn = "$browser_version"
	EventColumnDevice                 EventColumn = "$device"
	EventColumnScreenHeight           EventColumn = "$screen_height"
	EventColumnScreenWidth            EventColumn = "$screen_width"
	EventColumnCurrentURL             EventColumn = "$current_url"
	EventColumnCurrentPath            EventColumn = "$current_path"
	EventColumnInitialReferrer        EventColumn = "$initial_referrer"
	EventColumnReferringDomain        EventColumn = "$referring_domain"
	EventColumnReferrer               EventColumn = "$referrer"
	EventColumnInitialReferringDomain EventColumn = "$initial_referring_domain"
	EventColumnSearchEngine           EventColumn = "$search_engine"
	EventColumnSearchEngineKeyword    EventColumn = "$search_engine_keyword"
	EventColumnUtmSource              EventColumn = "utm_source"
	EventColumnUtmMedium              EventColumn = "utm_medium"
	EventColumnUtmCampaign            EventColumn = "utm_campaign"
	EventColumnCountry                EventColumn = "$country"
	EventColumnState                  EventColumn = "$state"
	EventColumnCity                   EventColumn = "$city"
	EventColumnOrAPIEndpoint          EventColumn = "$or_api_endpoint"
	EventColumnTimezone               EventColumn = "$timezone"
	EventColumnIssueType              EventColumn = "issue_type"
	EventColumnIssueID                EventColumn = "issue_id"
	EventColumnErrorID                EventColumn = "error_id"
	EventColumnTags                   EventColumn = "$tags"
	EventColumnImport                 EventColumn = "$import"
)

type UserColumn string

const (
	UserColumnUserID             UserColumn = "$user_id"
	UserColumnEmail              UserColumn = "$email"
	UserColumnName               UserColumn = "$name"
	UserColumnFirstName          UserColumn = "$first_name"
	UserColumnLastName           UserColumn = "$last_name"
	UserColumnPhone              UserColumn = "$phone"
	UserColumnAvatar             UserColumn = "$avatar"
	UserColumnCreatedAt          UserColumn = "$created_at"
	UserColumnCountry            UserColumn = "$country"
	UserColumnState              UserColumn = "$state"
	UserColumnCity               UserColumn = "$city"
	UserColumnTimezone           UserColumn = "$timezone"
	UserColumnFirstEventAt       UserColumn = "$first_event_at"
	UserColumnLastSeen           UserColumn = "$last_seen"
	UserColumnSDKEdition         UserColumn = "$sdk_edition"
	UserColumnSDKVersion         UserColumn = "$sdk_version"
	UserColumnCurrentURL         UserColumn = "$current_url"
	UserColumnInitialReferrer    UserColumn = "$initial_referrer"
	UserColumnReferringDomain    UserColumn = "$referring_domain"
	UserColumnInitialUtmSource   UserColumn = "initial_utm_source"
	UserColumnInitialUtmMedium   UserColumn = "initial_utm_medium"
	UserColumnInitialUtmCampaign UserColumn = "initial_utm_campaign"
	UserColumnProperties         UserColumn = "properties"
	UserColumnGroupID1           UserColumn = "group_id1"
	UserColumnGroupID2           UserColumn = "group_id2"
	UserColumnGroupID3           UserColumn = "group_id3"
	UserColumnGroupID4           UserColumn = "group_id4"
	UserColumnGroupID5           UserColumn = "group_id5"
	UserColumnGroupID6           UserColumn = "group_id6"
	UserColumnOrAPIEndpoint      UserColumn = "$or_api_endpoint"
)

type FilterOperatorType string

const (
	FilterOperatorIs                  FilterOperatorType = "is"
	FilterOperatorIsAny               FilterOperatorType = "isAny"
	FilterOperatorOn                  FilterOperatorType = "on"
	FilterOperatorOnAny               FilterOperatorType = "onAny"
	FilterOperatorIsNot               FilterOperatorType = "isNot"
	FilterOperatorIsUndefined         FilterOperatorType = "isUndefined"
	FilterOperatorNotOn               FilterOperatorType = "notOn"
	FilterOperatorContains            FilterOperatorType = "contains"
	FilterOperatorNotContains         FilterOperatorType = "notContains"
	FilterOperatorStartsWith          FilterOperatorType = "startsWith"
	FilterOperatorEndsWith            FilterOperatorType = "endsWith"
	FilterOperatorRegex               FilterOperatorType = "regex"
	FilterOperatorSelectorIs          FilterOperatorType = "selectorIs"
	FilterOperatorSelectorIsAny       FilterOperatorType = "selectorIsAny"
	FilterOperatorSelectorIsNot       FilterOperatorType = "selectorIsNot"
	FilterOperatorSelectorIsUndefined FilterOperatorType = "selectorIsUndefined"
	FilterOperatorSelectorContains    FilterOperatorType = "selectorContains"
	FilterOperatorSelectorNotContains FilterOperatorType = "selectorNotContains"
	FilterOperatorSelectorStartsWith  FilterOperatorType = "selectorStartsWith"
	FilterOperatorSelectorEndsWith    FilterOperatorType = "selectorEndsWith"
	FilterOperatorEqual               FilterOperatorType = "="
	FilterOperatorLessThan            FilterOperatorType = "<"
	FilterOperatorGreaterThan         FilterOperatorType = ">"
	FilterOperatorLessEqual           FilterOperatorType = "<="
	FilterOperatorGreaterEqual        FilterOperatorType = ">="
	FilterOperatorNotEqual            FilterOperatorType = "!="
	FilterOperatorTrue                FilterOperatorType = "true"
	FilterOperatorFalse               FilterOperatorType = "false"
	FilterOperatorIn                  FilterOperatorType = "in"
	FilterOperatorNotIn               FilterOperatorType = "notIn"
	FilterOperatorEquals              FilterOperatorType = "equals"
	FilterOperatorNotEquals           FilterOperatorType = "notEquals"
	FilterOperatorNot                 FilterOperatorType = "not"
	FilterOperatorOff                 FilterOperatorType = "off"
	FilterOperatorLt                  FilterOperatorType = "lt"
	FilterOperatorGt                  FilterOperatorType = "gt"
	FilterOperatorLte                 FilterOperatorType = "lte"
	FilterOperatorGte                 FilterOperatorType = "gte"
	FilterOperatorLessThanAlias       FilterOperatorType = "lessThan"
	FilterOperatorGreaterThanAlias    FilterOperatorType = "greaterThan"
	FilterOperatorLessEqualAlias      FilterOperatorType = "lessThanOrEqual"
	FilterOperatorGreaterEqualAlias   FilterOperatorType = "greaterThanOrEqual"
	FilterOperatorDoesNotContain      FilterOperatorType = "doesNotContain"
)

type SortOrderType string

const (
	SortOrderAsc  SortOrderType = "asc"
	SortOrderDesc SortOrderType = "desc"
)

// Operators that require toString wrapper for Dynamic columns when used with multiple values
var OperatorsRequiringToString = map[FilterOperatorType]bool{
	FilterOperatorIn:               true,
	FilterOperatorNotIn:            true,
	FilterOperatorIs:               true,
	FilterOperatorEquals:           true,
	FilterOperatorOn:               true,
	FilterOperatorIsNot:            true,
	FilterOperatorNotEquals:        true,
	FilterOperatorNot:              true,
	FilterOperatorOff:              true,
	FilterOperatorNotOn:            true,
	FilterOperatorEqual:            true,
	FilterOperatorNotEqual:         true,
	FilterOperatorContains:         true,
	FilterOperatorNotContains:      true,
	FilterOperatorDoesNotContain:   true,
	FilterOperatorStartsWith:       true,
	FilterOperatorEndsWith:         true,
	FilterOperatorRegex:            true,
}

type PropertyOrderType string

const (
	PropertyOrderOr  PropertyOrderType = "or"
	PropertyOrderAnd PropertyOrderType = "and"
)

type DataTypeType string

const (
	DataTypeString  DataTypeType = "string"
	DataTypeNumber  DataTypeType = "number"
	DataTypeBoolean DataTypeType = "boolean"
	DataTypeInteger DataTypeType = "integer"
)

type Filter struct {
	Name          string             `json:"name" validate:"required_without=Type"`
	Operator      FilterOperatorType `json:"operator" validate:"required,oneof=is isAny on onAny isNot isUndefined notOn contains notContains startsWith endsWith regex selectorIs selectorIsAny selectorIsNot selectorIsUndefined selectorContains selectorNotContains selectorStartsWith selectorEndsWith = < > <= >= != true false in notIn equals notEquals not off lt gt lte gte lessThan greaterThan lessThanOrEqual greaterThanOrEqual doesNotContain"`
	PropertyOrder PropertyOrderType  `json:"propertyOrder" validate:"omitempty,oneof=or and"`
	Value         []string           `json:"value" validate:"required_with=Type,max=10,dive"`
	IsEvent       bool               `json:"isEvent"`
	DataType      DataTypeType       `json:"dataType" validate:"omitempty,oneof=string number boolean integer"`
	AutoCaptured  bool               `json:"autoCaptured"`
	Filters       []Filter           `json:"filters,omitempty"`
}

func ValidateFilterFields(sl validator.StructLevel) {
	filter := sl.Current().Interface().(Filter)
	if filter.IsEvent && filter.PropertyOrder == "" {
		sl.ReportError(filter.PropertyOrder, "PropertyOrder", "propertyOrder", "required", "")
	}
}

var EventColumns = []EventColumn{
	EventColumnEventID,
	EventColumnEventName,
	EventColumnCreatedAt,
	EventColumnDistinctID,
	EventColumnSessionID,
	EventColumnUserID,
	EventColumnDeviceID,
	EventColumnTime,
	EventColumnSource,
	EventColumnDurationS,
	EventColumnProperties,
	EventColumnAutoProperties,
	EventColumnDescription,
	EventColumnGroupID1,
	EventColumnGroupID2,
	EventColumnGroupID3,
	EventColumnGroupID4,
	EventColumnGroupID5,
	EventColumnGroupID6,
	EventColumnAutoCaptured,
	EventColumnSDKEdition,
	EventColumnSDKVersion,
	EventColumnOS,
	EventColumnOSVersion,
	EventColumnBrowser,
	EventColumnBrowserVersion,
	EventColumnDevice,
	EventColumnScreenHeight,
	EventColumnScreenWidth,
	EventColumnCurrentURL,
	EventColumnCurrentPath,
	EventColumnInitialReferrer,
	EventColumnReferringDomain,
	EventColumnReferrer,
	EventColumnInitialReferringDomain,
	EventColumnSearchEngine,
	EventColumnSearchEngineKeyword,
	EventColumnUtmSource,
	EventColumnUtmMedium,
	EventColumnUtmCampaign,
	EventColumnCountry,
	EventColumnState,
	EventColumnCity,
	EventColumnOrAPIEndpoint,
	EventColumnTimezone,
	EventColumnIssueType,
	EventColumnIssueID,
	EventColumnErrorID,
	EventColumnTags,
	EventColumnImport,
}

var UserColumns = []UserColumn{
	UserColumnUserID,
	UserColumnEmail,
	UserColumnName,
	UserColumnFirstName,
	UserColumnLastName,
	UserColumnPhone,
	UserColumnAvatar,
	UserColumnCreatedAt,
	UserColumnCountry,
	UserColumnState,
	UserColumnCity,
	UserColumnTimezone,
	UserColumnFirstEventAt,
	UserColumnLastSeen,
	UserColumnSDKEdition,
	UserColumnSDKVersion,
	UserColumnCurrentURL,
	UserColumnInitialReferrer,
	UserColumnReferringDomain,
	UserColumnInitialUtmSource,
	UserColumnInitialUtmMedium,
	UserColumnInitialUtmCampaign,
	UserColumnProperties,
	UserColumnGroupID1,
	UserColumnGroupID2,
	UserColumnGroupID3,
	UserColumnGroupID4,
	UserColumnGroupID5,
	UserColumnGroupID6,
	UserColumnOrAPIEndpoint,
}

var FilterOperators = []FilterOperatorType{
	FilterOperatorIs,
	FilterOperatorIsAny,
	FilterOperatorOn,
	FilterOperatorOnAny,
	FilterOperatorIsNot,
	FilterOperatorIsUndefined,
	FilterOperatorNotOn,
	FilterOperatorContains,
	FilterOperatorNotContains,
	FilterOperatorStartsWith,
	FilterOperatorEndsWith,
	FilterOperatorRegex,
	FilterOperatorSelectorIs,
	FilterOperatorSelectorIsAny,
	FilterOperatorSelectorIsNot,
	FilterOperatorSelectorIsUndefined,
	FilterOperatorSelectorContains,
	FilterOperatorSelectorNotContains,
	FilterOperatorSelectorStartsWith,
	FilterOperatorSelectorEndsWith,
	FilterOperatorEqual,
	FilterOperatorLessThan,
	FilterOperatorGreaterThan,
	FilterOperatorLessEqual,
	FilterOperatorGreaterEqual,
	FilterOperatorNotEqual,
	FilterOperatorTrue,
	FilterOperatorFalse,
	FilterOperatorIn,
	FilterOperatorNotIn,
	FilterOperatorEquals,
	FilterOperatorNotEquals,
	FilterOperatorNot,
	FilterOperatorOff,
	FilterOperatorLt,
	FilterOperatorGt,
	FilterOperatorLte,
	FilterOperatorGte,
	FilterOperatorLessThanAlias,
	FilterOperatorGreaterThanAlias,
	FilterOperatorLessEqualAlias,
	FilterOperatorGreaterEqualAlias,
	FilterOperatorDoesNotContain,
}

var SortOrders = []SortOrderType{
	SortOrderAsc,
	SortOrderDesc,
}

var PropertyOrders = []PropertyOrderType{
	PropertyOrderOr,
	PropertyOrderAnd,
}

var DataTypes = []DataTypeType{
	DataTypeString,
	DataTypeNumber,
	DataTypeBoolean,
	DataTypeInteger,
}
