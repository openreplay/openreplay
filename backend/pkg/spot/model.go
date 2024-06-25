package spot

type CreateSpotRequest struct {
	Name     string `json:"name"`
	Comment  string `json:"comment"`
	IsShared bool   `json:"isShared"`
	Duration int    `json:"duration"`
	Preview  string `json:"preview"`
}

type CreateSpotResponse struct {
	ID       uint64 `json:"id"`
	MobURL   string `json:"mobURL"`
	VideoURL string `json:"videoURL"`
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

type GetSpotsRequest struct {
	Query    *string `json:"query"`    // for search by name (optional)
	FilterBy string  `json:"filterBy"` // "own", "all", "shared"
	Order    string  `json:"order"`
	Page     uint64  `json:"page"`
	Limit    uint64  `json:"limit"`
}
