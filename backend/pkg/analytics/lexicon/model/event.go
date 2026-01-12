package model

type User struct {
	UserId string  `json:"userId" ch:"user_id"`
	Name   *string `json:"name" ch:"name"`
}

type LexiconEvent struct {
	Name         string `json:"name" ch:"name"`
	DisplayName  string `json:"displayName" ch:"display_name"`
	Description  string `json:"description" ch:"description"`
	Status       string `json:"status" ch:"status"`
	AutoCaptured bool   `json:"autoCaptured" ch:"is_auto_captured"`
	Count        uint64 `json:"count" ch:"count"`
	QueryCount   uint64 `json:"queryCount" ch:"query_count"`
	CreatedAt    int64  `json:"createdAt" ch:"created_at"`
}

type LexiconProperty struct {
	Name          string   `json:"name" ch:"name"`
	DisplayName   string   `json:"displayName" ch:"display_name"`
	Description   string   `json:"description" ch:"description"`
	Type          string   `json:"type" ch:"type"`
	DataType      string   `json:"dataType" ch:"data_type"`
	Status        string   `json:"status" ch:"status"`
	AutoCaptured  bool     `json:"autoCaptured" ch:"is_auto_captured"`
	Count         uint64   `json:"count" ch:"count"`
	QueryCount    uint64   `json:"queryCount" ch:"query_count"`
	CreatedAt     int64    `json:"createdAt" ch:"created_at"`
	PossibleTypes []string `json:"possibleTypes" ch:"possible_types"`
	SampleValues  []string `json:"sampleValues" ch:"sample_values"`
}

type LexiconEventsResponse struct {
	Events []LexiconEvent `json:"events"`
	Total  uint64         `json:"total"`
}

type LexiconPropertiesResponse struct {
	Properties []LexiconProperty `json:"properties"`
	Total      uint64            `json:"total"`
}

type UpdateEventRequest struct {
	Name         string  `json:"name" validate:"required"`
	AutoCaptured *bool   `json:"autoCaptured" validate:"required"`
	DisplayName  *string `json:"displayName"`
	Description  *string `json:"description"`
	Status       *string `json:"status"`
}

type UpdatePropertyRequest struct {
	Name         string  `json:"name" validate:"required"`
	Source       string  `json:"source" validate:"required"`
	AutoCaptured *bool   `json:"autoCaptured" validate:"required"`
	DisplayName  *string `json:"displayName"`
	Description  *string `json:"description"`
	Status       *string `json:"status"`
}
