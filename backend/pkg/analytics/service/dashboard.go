package service

import (
	"fmt"
	"time"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
)

type dashboardsImpl struct {
	flaker *flakeid.Flaker
	log    logger.Logger
	pgconn pool.Pool
}

type Dashboard struct {
	DashboardID int    `json:"dashboard_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsPublic    bool   `json:"is_public"`
	IsPinned    bool   `json:"is_pinned"`
	Metrics     []int  `json:"metrics"`
}

type CurrentContext struct {
	UserID int `json:"user_id"`
}

type Dashboards interface {
	Create(projectID int, dashboard *Dashboard) error
	Get(projectID int, dashboardID int) (*Dashboard, error)
	Update(projectID int, dashboardID int, dashboard *Dashboard) error
	Delete(projectID int, dashboardID int) error
}

func NewDashboards(log logger.Logger, pgconn pool.Pool, flaker *flakeid.Flaker) Dashboards {
	return &dashboardsImpl{
		log:    log,
		pgconn: pgconn,
		flaker: flaker,
	}
}

func (d *dashboardsImpl) Create(projectID int, dashboard *Dashboard) error {
	switch {
	case projectID == 0:
		return fmt.Errorf("projectID is required")
	case dashboard == nil:
		return fmt.Errorf("dashboard is required")
	}

	createdAt := time.Now()
	dashboardID, err := d.flaker.Compose(uint64(createdAt.UnixMilli()))
	if err != nil {
		return err
	}
	newDashboard := &Dashboard{
		DashboardID: int(dashboardID),
		Name:        dashboard.Name,
		Description: dashboard.Description,
		IsPublic:    dashboard.IsPublic,
		IsPinned:    dashboard.IsPinned,
		Metrics:     dashboard.Metrics,
	}

	if err := d.add(newDashboard); err != nil {
		return err
	}

	return nil
}

// Delete implements Dashboards.
func (d *dashboardsImpl) Delete(projectID int, dashboardID int) error {
	panic("unimplemented")
}

// Get implements Dashboards.
func (d *dashboardsImpl) Get(projectID int, dashboardID int) (*Dashboard, error) {
	panic("unimplemented")
}

// Update implements Dashboards.
func (d *dashboardsImpl) Update(projectID int, dashboardID int, dashboard *Dashboard) error {
	panic("unimplemented")
}

func (d *dashboardsImpl) add(dashboard *Dashboard) error {
	panic("unimplemented")
}
