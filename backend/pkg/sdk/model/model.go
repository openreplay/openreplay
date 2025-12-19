package model

import (
	"encoding/json"
	"log"
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

var defaultUserProperties = map[string]struct{}{
	"email":      struct{}{},
	"name":       struct{}{},
	"first_name": struct{}{},
	"last_name":  struct{}{},
	"phone":      struct{}{},
	"avatar":     struct{}{},
}

func isDefaultUserProperty(property string) bool {
	_, ok := defaultUserProperties[property]
	return ok
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

func (u *User) PropertiesString() string {
	res, err := json.Marshal(u.Properties)
	if err != nil {
		log.Println(err)
		return ""
	}
	return string(res)
}
