package api

import (
	"openreplay/backend/pkg/spot/service"
	"time"
)

type CreateSpotRequest struct {
	Name     string `json:"name"`
	Comment  string `json:"comment"`
	Duration int    `json:"duration"`
	Crop     []int  `json:"crop"`
	Preview  string `json:"preview"`
}

type CreateSpotResponse struct {
	ID       string `json:"id"`
	MobURL   string `json:"mobURL"`
	VideoURL string `json:"videoURL"`
}

type Info struct {
	Name       string            `json:"name"`
	UserEmail  string            `json:"userEmail"`
	Duration   int               `json:"duration"`
	Comments   []service.Comment `json:"comments"`
	CreatedAt  time.Time         `json:"createdAt"`
	MobURL     string            `json:"mobURL"`
	PreviewURL string            `json:"previewURL"`
	VideoURL   string            `json:"videoURL"`
	StreamFile string            `json:"streamFile"`
}

type GetSpotResponse struct {
	Spot *Info `json:"spot"`
}

type GetSpotsRequest struct {
	Query    string `json:"query"`    // for search by name (optional)
	FilterBy string `json:"filterBy"` // "own", "all", "shared"
	Order    string `json:"order"`
	Page     uint64 `json:"page"`
	Limit    uint64 `json:"limit"`
}

type ShortInfo struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	UserEmail  string    `json:"userEmail"`
	Duration   int       `json:"duration"`
	CreatedAt  time.Time `json:"createdAt"`
	PreviewURL string    `json:"previewURL"`
}

type GetSpotsResponse struct {
	Spots          []ShortInfo `json:"spots"`
	Total          uint64      `json:"total"`
	TenantHasSpots bool        `json:"tenantHasSpots"`
}

type UpdateSpotRequest struct {
	Name string `json:"name"`
}

type AddCommentRequest struct {
	UserName string `json:"userName"`
	Comment  string `json:"comment"`
}

type DeleteSpotRequest struct {
	SpotIDs []string `json:"spotIDs"`
}

type UpdateSpotPublicKeyRequest struct {
	Expiration uint64 `json:"expiration"` // in seconds
}
