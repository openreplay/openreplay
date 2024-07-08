package spot

import "time"

type CreateSpotRequest struct {
	Name     string `json:"name"`
	Comment  string `json:"comment"`
	Duration int    `json:"duration"`
	Preview  string `json:"preview"`
}

type CreateSpotResponse struct {
	ID       uint64 `json:"id"`
	MobURL   string `json:"mobURL"`
	VideoURL string `json:"videoURL"`
}

type Info struct {
	Name      string    `json:"name"`
	UserID    uint64    `json:"userID"`
	Duration  int       `json:"duration"`
	Comments  []Comment `json:"comments"`
	CreatedAt time.Time `json:"createdAt"`
	MobURL    string    `json:"mobURL"`
	VideoURL  string    `json:"videoURL"`
	Key       *Key      `json:"key"`
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
	Name       string `json:"name"`
	UserID     uint64 `json:"userID"`
	Duration   int    `json:"duration"`
	PreviewURL string `json:"previewURL"`
}

type GetSpotsResponse struct {
	Spots []ShortInfo `json:"spots"`
}

type UpdateSpotRequest struct {
	Name          string `json:"name"`
	KeyExpiration int    `json:"keyExpiration"`
}

type AddCommentRequest struct {
	UserName string `json:"userName"`
	Comment  string `json:"comment"`
}

type DeleteSpotRequest struct {
	SpotIDs []uint64 `json:"spotIDs"`
}
