package service

import (
	"fmt"
	"openreplay/backend/pkg/analytics/api/models"
)

func (s serviceImpl) CreateDashboard(projectId int, userID uint64, req *models.CreateDashboardRequest) (*models.GetDashboardResponse, error) {
	sql := `
		INSERT INTO dashboards (project_id, user_id, name, description, is_public, is_pinned)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING dashboard_id, project_id, user_id, name, description, is_public, is_pinned`

	dashboard := &models.GetDashboardResponse{}

	err := s.pgconn.QueryRow(sql, projectId, userID, req.Name, req.Description, req.IsPublic, req.IsPinned).Scan(
		&dashboard.DashboardID,
		&dashboard.ProjectID,
		&dashboard.UserID,
		&dashboard.Name,
		&dashboard.Description,
		&dashboard.IsPublic,
		&dashboard.IsPinned,
	)
	if err != nil {
		return nil, err
	}

	return dashboard, nil
}

func (s serviceImpl) GetDashboard(projectId int, dashboardID int, userID uint64) (*models.GetDashboardResponse, error) {
	sql := `
		SELECT dashboard_id, project_id, name, description, is_public, is_pinned, user_id
		FROM dashboards
		WHERE dashboard_id = $1 AND project_id = $2 AND deleted_at is null`
	dashboard := &models.GetDashboardResponse{}

	var ownerID int
	err := s.pgconn.QueryRow(sql, dashboardID, projectId).Scan(&dashboard.DashboardID, &dashboard.ProjectID, &dashboard.Name, &dashboard.Description, &dashboard.IsPublic, &dashboard.IsPinned, &ownerID)
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
		SELECT d.dashboard_id, d.user_id, d.project_id, d.name, d.description, d.is_public, d.is_pinned, u.email AS owner_email, u.name AS owner_name
		FROM dashboards d
		LEFT JOIN users u ON d.user_id = u.user_id
		WHERE (d.is_public = true OR d.user_id = $1) AND d.user_id IS NOT NULL AND d.deleted_at IS NULL AND d.project_id = $2
		ORDER BY d.dashboard_id`
	rows, err := s.pgconn.Query(sql, userID, projectId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dashboards []models.Dashboard
	for rows.Next() {
		var dashboard models.Dashboard

		err := rows.Scan(&dashboard.DashboardID, &dashboard.UserID, &dashboard.ProjectID, &dashboard.Name, &dashboard.Description, &dashboard.IsPublic, &dashboard.IsPinned, &dashboard.OwnerEmail, &dashboard.OwnerName)
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

func (s serviceImpl) UpdateDashboard(projectId int, dashboardID int, userID uint64, req *models.UpdateDashboardRequest) (*models.GetDashboardResponse, error) {
	sql := `
		UPDATE dashboards
		SET name = $1, description = $2, is_public = $3, is_pinned = $4
		WHERE dashboard_id = $5 AND project_id = $6 AND user_id = $7
		RETURNING dashboard_id, project_id, user_id, name, description, is_public, is_pinned`

	dashboard := &models.GetDashboardResponse{}

	err := s.pgconn.QueryRow(sql, req.Name, req.Description, req.IsPublic, req.IsPinned, dashboardID, projectId, userID).Scan(
		&dashboard.DashboardID,
		&dashboard.ProjectID,
		&dashboard.UserID,
		&dashboard.Name,
		&dashboard.Description,
		&dashboard.IsPublic,
		&dashboard.IsPinned,
	)
	if err != nil {
		return nil, err
	}

	return dashboard, nil
}

func (s serviceImpl) DeleteDashboard(projectId int, dashboardID int, userID uint64) error {
	sql := `
		UPDATE dashboards
		SET deleted_at = now()
		WHERE dashboard_id = $1 AND project_id = $2 AND user_id = $3 AND deleted_at IS NULL`

	err := s.pgconn.Exec(sql, dashboardID, projectId, userID)
	if err != nil {
		return err
	}

	return nil
}
