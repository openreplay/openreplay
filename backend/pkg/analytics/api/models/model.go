package models

type Dashboard struct {
	DashboardID int    `json:"dashboardId"`
	ProjectID   int    `json:"projectId"`
	UserID      int    `json:"userId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsPublic    bool   `json:"isPublic"`
	IsPinned    bool   `json:"isPinned"`
	OwnerEmail  string `json:"ownerEmail"`
	OwnerName   string `json:"ownerName"`
}

type CreateDashboardResponse struct {
	DashboardID int `json:"dashboard_id"`
}

type GetDashboardResponse struct {
	Dashboard
}

type GetDashboardsResponsePaginated struct {
	Dashboards []Dashboard `json:"dashboards"`
	Total      uint64      `json:"total"`
}

type GetDashboardsResponse struct {
	Dashboards []Dashboard `json:"dashboards"`
}

// REQUESTS

type CreateDashboardRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description"`
	IsPublic    bool   `json:"is_public"`
	IsPinned    bool   `json:"is_pinned"`
	Metrics     []int  `json:"metrics"`
}

type GetDashboardsRequest struct {
	Page     uint64 `json:"page"`
	Limit    uint64 `json:"limit"`
	Order    string `json:"order"`
	Query    string `json:"query"`
	FilterBy string `json:"filterBy"`
}

type UpdateDashboardRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	IsPublic    bool   `json:"is_public"`
	IsPinned    bool   `json:"is_pinned"`
	Metrics     []int  `json:"metrics"`
}

type PinDashboardRequest struct {
	IsPinned bool `json:"is_pinned"`
}

type AddCardToDashboardRequest struct {
	CardIDs []int `json:"card_ids"`
}

type DeleteCardFromDashboardRequest struct {
	CardIDs []int `json:"card_ids"`
}
