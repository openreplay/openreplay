package service

import (
	"fmt"
	"openreplay/backend/pkg/analytics/api/models"
)

func (s serviceImpl) GetDashboard(projectId int, dashboardID int, userID uint64) (*models.GetDashboardResponse, error) {
	sql := `
		SELECT dashboard_id, name, description, is_public, is_pinned, user_id
		FROM dashboards
		WHERE dashboard_id = $1 AND project_id = $2 AND deleted_at is null`
	dashboard := &models.GetDashboardResponse{}

	var ownerID int
	err := s.pgconn.QueryRow(sql, dashboardID, projectId).Scan(&dashboard.DashboardID, &dashboard.Name, &dashboard.Description, &dashboard.IsPublic, &dashboard.IsPinned, &ownerID)
	if err != nil {
		return nil, err
	}

	if !dashboard.IsPublic && uint64(ownerID) != userID {
		return nil, fmt.Errorf("access denied: user %d does not own dashboard %d", userID, dashboardID)
	}

	return dashboard, nil
}

func (s serviceImpl) GetDashboards(projectId int, userID uint64) (*models.GetDashboardsResponse, error) {
	sql := `
		SELECT dashboard_id, user_id, name, description, is_public, is_pinned
		FROM dashboards
		WHERE (is_public = true OR user_id = $1) AND user_id IS NOT NULL AND deleted_at IS NULL AND project_id = $2
		ORDER BY dashboard_id`
	rows, err := s.pgconn.Query(sql, userID, projectId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dashboards []models.Dashboard
	for rows.Next() {
		var dashboard models.Dashboard

		err := rows.Scan(&dashboard.DashboardID, &dashboard.UserID, &dashboard.Name, &dashboard.Description, &dashboard.IsPublic, &dashboard.IsPinned)
		if err != nil {
			return nil, err
		}

		dashboards = append(dashboards, dashboard)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &models.GetDashboardsResponse{
		Dashboards: dashboards,
	}, nil
}
