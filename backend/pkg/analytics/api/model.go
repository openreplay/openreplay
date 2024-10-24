package api

type CreateDashboardRequest struct {
	Name        string `json:"name"`
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

type CreateDashboardResponse struct {
	DashboardID int `json:"dashboard_id"`
}

type Dashboard struct {
	DashboardID int    `json:"dashboard_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsPublic    bool   `json:"is_public"`
	IsPinned    bool   `json:"is_pinned"`
}

type GetDashboardResponse struct {
	Dashboard *Dashboard `json:"dashboard"`
}

type GetDashboardsResponse struct {
	Dashboards []Dashboard `json:"dashboards"`
}

type UpdateDashboardRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	IsPublic    bool   `json:"is_public"`
	IsPinned    bool   `json:"is_pinned"`
	Metrics     []int  `json:"metrics"`
}

type UpdateDashboardResponse struct {
	DashboardID int `json:"dashboard_id"`
}

type DeleteDashboardResponse struct {
	DashboardID int `json:"dashboard_id"`
}

type Dashboards interface {
	Add(projectID int, dashboard *Dashboard) error
	Create(projectID int, dashboard *Dashboard) error
	Get(projectID int, dashboardID int) (*Dashboard, error)
	GetAll(projectID int) ([]Dashboard, error)
	Update(projectID int, dashboardID int, dashboard *Dashboard) error
	Delete(projectID int, dashboardID int) error
}
