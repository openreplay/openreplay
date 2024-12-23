package dashboards

import "openreplay/backend/pkg/analytics/cards"

type Dashboard struct {
	DashboardID int              `json:"dashboardId"`
	ProjectID   int              `json:"projectId"`
	UserID      int              `json:"userId"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	IsPublic    bool             `json:"isPublic"`
	IsPinned    bool             `json:"isPinned"`
	OwnerEmail  string           `json:"ownerEmail"`
	OwnerName   string           `json:"ownerName"`
	Metrics     []cards.CardBase `json:"cards"`
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
	Name        string `json:"name" validate:"required,min=3,max=150"`
	Description string `json:"description" validate:"max=500"`
	IsPublic    bool   `json:"is_public"`
	IsPinned    bool   `json:"is_pinned"`
	Metrics     []int  `json:"metrics"`
}

type GetDashboardsRequest struct {
	Page     uint64 `json:"page"`
	Limit    uint64 `json:"limit"`
	IsPublic bool   `json:"is_public"`
	Order    string `json:"order"`
	Query    string `json:"query"`
	OrderBy  string `json:"orderBy"`
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
	MetricIDs []int                  `json:"metric_ids" validate:"required,min=1,dive,gt=0"`
	Config    map[string]interface{} `json:"config"` // Optional
}
