package api

import (
	"fmt"
	analyticsConfig "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics"
	"openreplay/backend/pkg/common"
	"openreplay/backend/pkg/common/api"
	"openreplay/backend/pkg/logger"
)

type Router struct {
	*api.Router
	cfg     *analyticsConfig.Config
	limiter *common.UserRateLimiter
}

func NewRouter(cfg *analyticsConfig.Config, log logger.Logger, services *analytics.ServiceBuilder) (*Router, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case services == nil:
		return nil, fmt.Errorf("services is empty")
	case log == nil:
		return nil, fmt.Errorf("logger is empty")
	}

	e := &Router{
		Router:  api.NewRouter(log),
		cfg:     cfg,
		limiter: common.NewUserRateLimiter(10, 30, 1, 5),
	}
	e.init()
	return e, nil
}

func (e *Router) init() {
	e.AddRoute("/{projectId}/dashboards", e.createDashboard, "POST")
	e.AddRoute("/v1/spots/{id}/uploaded", e.spotTest, "POST")
	e.AddRoute("/{projectId}/dashboards", e.getDashboards, "GET")
	e.AddRoute("/{projectId}/dashboards/{dashboardId}", e.getDashboard, "GET")
	e.AddRoute("/{projectId}/dashboards/{dashboardId}", e.updateDashboard, "PUT")
	e.AddRoute("/{projectId}/dashboards/{dashboardId}", e.deleteDashboard, "DELETE")
	e.AddRoute("/{projectId}/dashboards/{dashboardId}/pin", e.pinDashboard, "GET")
	e.AddRoute("/{projectId}/dashboards/{dashboardId}/cards", e.addCardToDashboard, "POST")
	e.AddRoute("/{projectId}/dashboards/{dashboardId}/metrics", e.createMetricAndAddToDashboard, "POST")
	e.AddRoute("/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}", e.updateWidgetInDashboard, "PUT")
	e.AddRoute("/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}", e.removeWidgetFromDashboard, "DELETE")
}
