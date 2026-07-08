package assist

import (
	"errors"
)

var ErrNoLiveSession = errors.New("no live session")

type Assist interface {
	GetLiveSessionByID(projID uint32, sessID uint64) (interface{}, error)
	GetLiveSessionsWS(projID uint32, req *GetLiveSessionsRequest) (interface{}, error)
	IsLive(projID uint32, sessID uint64) (bool, error)
	Autocomplete(projID uint32, q, key string) ([]map[string]interface{}, error)
}

type GetLiveSessionsRequest struct {
	Filters []interface{} `json:"filters"`
	Sort    string        `json:"sort"`  // "userId", "timestamp" default
	Order   string        `json:"order"` // "asc" or "desc", default "desc"
	Limit   int           `json:"limit"` // default 10
	Page    int           `json:"page"`  // default 1
}
