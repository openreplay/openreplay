package dashboards

import (
	"openreplay/backend/pkg/analytics/cards"
	"time"
)

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
	CreatedAt   time.Time        `json:"createdAt"`
	Metrics     []cards.CardBase `json:"widgets"`
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
	IsPublic    bool   `json:"isPublic"`
	IsPinned    bool   `json:"isPinned"`
	Metrics     []int  `json:"metrics"`
}

type GetDashboardsRequest struct {
	Page     uint64 `json:"page"`
	Limit    uint64 `json:"limit"`
	IsPublic bool   `json:"isPublic"`
	Order    string `json:"order"`
	Query    string `json:"query"`
	OrderBy  string `json:"orderBy"`
}

type UpdateDashboardRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	IsPublic    bool   `json:"isPublic"`
	IsPinned    bool   `json:"isPinned"`
	Metrics     []int  `json:"metrics"`
}

type PinDashboardRequest struct {
	IsPinned bool `json:"isPinned"`
}

type AddCardToDashboardRequest struct {
	MetricIDs []int                  `json:"metric_ids" validate:"required,min=1,dive,gt=0"`
	Config    map[string]interface{} `json:"config"` // Optional
}

type UpdateWidgetPositionRequest struct {
	Config map[string]interface{} `json:"config" validate:"required"`
}
