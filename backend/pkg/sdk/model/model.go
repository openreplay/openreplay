package model

import (
	"encoding/json"
	"log"
	"strconv"
	"time"
)

type UserActionType string

const (
	UserActionIdentify          UserActionType = "identity"
	UserActionSetProperty       UserActionType = "set_property"
	UserActionSetPropertyOnce   UserActionType = "set_property_once"
	UserActionIncrementProperty UserActionType = "increment_property"
	UserActionDelete            UserActionType = "delete_user"
)

type UserAction struct {
	Type      UserActionType         `json:"type"`
	UserID    string                 `json:"user_id"`
	Payload   map[string]interface{} `json:"payload"`
	Timestamp int64                  `json:"timestamp"`
}

type Event struct {
	Name      string          `json:"name"` // custom user's name
	Payload   json.RawMessage `json:"payload"`
	Timestamp int64           `json:"timestamp"`
}

type SdkData struct {
	UserActions []UserAction `json:"user_actions"`
	Events      []Event      `json:"events"`
}

type SdkDataBatch struct {
	Data SdkData `json:"data"`
}

func NewUser(userID string) *User {
	return &User{
		UserID:     userID,
		Properties: make(map[string]interface{}),
	}
}

type User struct {
	ProjectID     uint16                 `ch:"project_id"`
	UserID        string                 `ch:"$user_id"`
	Name          string                 `ch:"$name"`
	Email         string                 `ch:"$email"`
	FirstName     string                 `ch:"$first_name"`
	LastName      string                 `ch:"$last_name"`
	Phone         string                 `ch:"$phone"`
	Avatar        string                 `ch:"$avatar"`
	Properties    map[string]interface{} `ch:"properties"`
	GroupID1      []string               `ch:"group_id1"`
	GroupID2      []string               `ch:"group_id2"`
	GroupID3      []string               `ch:"group_id3"`
	GroupID4      []string               `ch:"group_id4"`
	GroupID5      []string               `ch:"group_id5"`
	GroupID6      []string               `ch:"group_id6"`
	SdkEdition    string                 `ch:"$sdk_edition"`
	SdkVersion    string                 `ch:"$sdk_version"`
	CurrentUrl    string                 `ch:"$current_url"`
	InitialRef    string                 `ch:"$initial_referrer"`
	RefDomain     string                 `ch:"$referring_domain"`
	UtmSource     string                 `ch:"initial_utm_source"`
	UtmMedium     string                 `ch:"initial_utm_medium"`
	UtmCampaign   string                 `ch:"initial_utm_campaign"`
	Country       string                 `ch:"$country"`
	State         string                 `ch:"$state"`
	City          string                 `ch:"$city"`
	OrApiEndpoint string                 `ch:"$or_api_endpoint"`
	FirstEventAt  time.Time              `ch:"$first_event_at"`
}

var defaultUserProperties = map[string]struct{}{
	"email":      {},
	"name":       {},
	"first_name": {},
	"last_name":  {},
	"phone":      {},
	"avatar":     {},
}

func isDefaultUserProperty(property string) bool {
	_, ok := defaultUserProperties[property]
	return ok
}

func (u *User) SetProperty(key string, value interface{}) {
	if !isDefaultUserProperty(key) {
		u.Properties[key] = value
		return
	}
	stringValue, ok := value.(string)
	if !ok {
		return
	}
	switch key {
	case "email":
		u.Email = stringValue
	case "name":
		u.Name = stringValue
	case "first_name":
		u.FirstName = stringValue
	case "last_name":
		u.LastName = stringValue
	case "phone":
		u.Phone = stringValue
	case "avatar":
		u.Avatar = stringValue
	}
}

func (u *User) SetPropertyOnce(key string, value interface{}) {
	if !isDefaultUserProperty(key) {
		if _, ok := u.Properties[key]; !ok {
			u.Properties[key] = value
		}
		return
	}
	stringValue, ok := value.(string)
	if !ok {
		return
	}
	switch key {
	case "email":
		if u.Email == "" {
			u.Email = stringValue
		}
	case "name":
		if u.Name == "" {
			u.Name = stringValue
		}
	case "first_name":
		if u.FirstName == "" {
			u.FirstName = stringValue
		}
	case "last_name":
		if u.LastName == "" {
			u.LastName = stringValue
		}
	case "phone":
		if u.Phone == "" {
			u.Phone = stringValue
		}
	case "avatar":
		if u.Avatar == "" {
			u.Avatar = stringValue
		}
	}
}

func (u *User) IncrementProperty(key string, value interface{}) {
	intVal, ok := toInt(value)
	if !ok {
		return
	}
	curr := u.Properties[key]
	intCurr, ok := toInt(curr)
	if !ok {
		return
	}
	u.Properties[key] = intCurr + intVal
}

func toInt(v interface{}) (int, bool) {
	if v == nil {
		return 0, true // consider as an empty value
	}
	switch n := v.(type) {
	case int:
		return n, true
	case int32:
		return int(n), true
	case int64:
		return int(n), true
	case float32:
		return int(n), true
	case float64:
		return int(n), true
	case string:
		i, err := strconv.Atoi(n)
		if err != nil {
			return 0, false
		}
		return i, true
	default:
		return 0, false
	}
}

func (u *User) PropertiesString() string {
	res, err := json.Marshal(u.Properties)
	if err != nil {
		log.Println(err)
		return ""
	}
	return string(res)
}
