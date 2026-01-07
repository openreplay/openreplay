package model

type User struct {
	UserId string  `json:"userId" ch:"user_id"`
	Name   *string `json:"name" ch:"name"`
}

type LexiconEvent struct {
	Name           string `json:"name" ch:"name"`
	DisplayName    string `json:"displayName" ch:"display_name"`
	Description    string `json:"description" ch:"description"`
	IsHidden       bool   `json:"isHidden" ch:"is_hidden"`
	IsAutoCaptured bool   `json:"isAutoCaptured" ch:"is_auto_captured"`
	Count          uint64 `json:"count" ch:"count"`
	QueryCount     uint64 `json:"queryCount" ch:"query_count"`
	ModifiedAt     int64  `json:"modifiedAt" ch:"modified_at"`
	CreatedAt      int64  `json:"createdAt" ch:"created_at"`
	ModifiedBy     User   `json:"modifiedBy" ch:"modified_by"`
}

type LexiconProperty struct {
	Name           string   `json:"name" ch:"name"`
	DisplayName    string   `json:"displayName" ch:"display_name"`
	Description    string   `json:"description" ch:"description"`
	Type           string   `json:"type" ch:"type"`
	IsHidden       bool     `json:"isHidden" ch:"is_hidden"`
	IsAutoCaptured bool     `json:"isAutoCaptured" ch:"is_auto_captured"`
	Count          uint64   `json:"count" ch:"count"`
	QueryCount     uint64   `json:"queryCount" ch:"query_count"`
	ModifiedAt     int64    `json:"modifiedAt" ch:"modified_at"`
	CreatedAt      int64    `json:"createdAt" ch:"created_at"`
	ModifiedBy     User     `json:"modifiedBy" ch:"modified_by"`
	PossibleTypes  []string `json:"possibleTypes" ch:"possible_types"`
	SampleValues   []string `json:"sampleValues" ch:"sample_values"`
}

type LexiconEventsResponse struct {
	Events []LexiconEvent `json:"events"`
	Total  uint64         `json:"total"`
}

type LexiconPropertiesResponse struct {
	Properties []LexiconProperty `json:"properties"`
	Total      uint64            `json:"total"`
}
