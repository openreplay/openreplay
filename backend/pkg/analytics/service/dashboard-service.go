package service

import (
	"errors"
	"fmt"
	"openreplay/backend/pkg/analytics/api/models"
)

// CreateDashboard Create a new dashboard
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
		return nil, fmt.Errorf("failed to create dashboard: %w", err)
	}
	return dashboard, nil
}

// GetDashboard Fetch a specific dashboard by ID
func (s serviceImpl) GetDashboard(projectId int, dashboardID int, userID uint64) (*models.GetDashboardResponse, error) {
	sql := `
		SELECT dashboard_id, project_id, name, description, is_public, is_pinned, user_id
		FROM dashboards
		WHERE dashboard_id = $1 AND project_id = $2 AND deleted_at IS NULL`

	dashboard := &models.GetDashboardResponse{}
	var ownerID int
	err := s.pgconn.QueryRow(sql, dashboardID, projectId).Scan(
		&dashboard.DashboardID,
		&dashboard.ProjectID,
		&dashboard.Name,
		&dashboard.Description,
		&dashboard.IsPublic,
		&dashboard.IsPinned,
		&ownerID,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, errors.New("not_found: dashboard not found")
		}
		return nil, fmt.Errorf("error fetching dashboard: %w", err)
	}

	// Access control
	if !dashboard.IsPublic && uint64(ownerID) != userID {
		return nil, fmt.Errorf("access_denied: user does not have access")
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

// GetDashboardsPaginated Fetch dashboards with pagination
func (s serviceImpl) GetDashboardsPaginated(projectId int, userID uint64, req *models.GetDashboardsRequest) (*models.GetDashboardsResponsePaginated, error) {
	baseSQL, args := buildBaseQuery(projectId, userID, req)

	// Count total dashboards
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM (%s) AS count_query", baseSQL)
	var total uint64
	err := s.pgconn.QueryRow(countSQL, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("error counting dashboards: %w", err)
	}

	// Fetch paginated dashboards
	paginatedSQL := fmt.Sprintf("%s ORDER BY %s %s LIMIT $%d OFFSET $%d",
		baseSQL, getOrderBy(req.OrderBy), getOrder(req.Order), len(args)+1, len(args)+2)
	args = append(args, req.Limit, req.Limit*(req.Page-1))

	rows, err := s.pgconn.Query(paginatedSQL, args...)
	if err != nil {
		return nil, fmt.Errorf("error fetching paginated dashboards: %w", err)
	}
	defer rows.Close()

	var dashboards []models.Dashboard
	for rows.Next() {
		var dashboard models.Dashboard
		err := rows.Scan(
			&dashboard.DashboardID,
			&dashboard.UserID,
			&dashboard.ProjectID,
			&dashboard.Name,
			&dashboard.Description,
			&dashboard.IsPublic,
			&dashboard.IsPinned,
			&dashboard.OwnerEmail,
			&dashboard.OwnerName,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning dashboard: %w", err)
		}
		dashboards = append(dashboards, dashboard)
	}

	return &models.GetDashboardsResponsePaginated{
		Dashboards: dashboards,
		Total:      total,
	}, nil
}

// UpdateDashboard Update a dashboard
func (s serviceImpl) UpdateDashboard(projectId int, dashboardID int, userID uint64, req *models.UpdateDashboardRequest) (*models.GetDashboardResponse, error) {
	sql := `
		UPDATE dashboards
		SET name = $1, description = $2, is_public = $3, is_pinned = $4
		WHERE dashboard_id = $5 AND project_id = $6 AND user_id = $7 AND deleted_at IS NULL
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
		return nil, fmt.Errorf("error updating dashboard: %w", err)
	}
	return dashboard, nil
}

// DeleteDashboard Soft-delete a dashboard
func (s serviceImpl) DeleteDashboard(projectId int, dashboardID int, userID uint64) error {
	sql := `
		UPDATE dashboards
		SET deleted_at = now()
		WHERE dashboard_id = $1 AND project_id = $2 AND user_id = $3 AND deleted_at IS NULL`

	err := s.pgconn.Exec(sql, dashboardID, projectId, userID)
	if err != nil {
		return fmt.Errorf("error deleting dashboard: %w", err)
	}

	return nil
}

// Helper to build the base query for dashboards
func buildBaseQuery(projectId int, userID uint64, req *models.GetDashboardsRequest) (string, []interface{}) {
	var conditions []string
	args := []interface{}{projectId}

	conditions = append(conditions, "d.project_id = $1")

	// Handle is_public filter
	if req.IsPublic {
		conditions = append(conditions, "d.is_public = true")
	} else {
		conditions = append(conditions, "(d.is_public = true OR d.user_id = $2)")
		args = append(args, userID)
	}

	// Handle search query
	if req.Query != "" {
		conditions = append(conditions, "(d.name ILIKE $3 OR d.description ILIKE $3)")
		args = append(args, "%"+req.Query+"%")
	}

	conditions = append(conditions, "d.deleted_at IS NULL")
	whereClause := "WHERE " + fmt.Sprint(conditions)

	baseSQL := fmt.Sprintf(`
		SELECT d.dashboard_id, d.user_id, d.project_id, d.name, d.description, d.is_public, d.is_pinned, 
		       u.email AS owner_email, u.name AS owner_name
		FROM dashboards d
		LEFT JOIN users u ON d.user_id = u.user_id
		%s`, whereClause)

	return baseSQL, args
}

func getOrderBy(orderBy string) string {
	if orderBy == "" {
		return "d.dashboard_id"
	}
	allowed := map[string]bool{"dashboard_id": true, "name": true, "description": true}
	if allowed[orderBy] {
		return fmt.Sprintf("d.%s", orderBy)
	}
	return "d.dashboard_id"
}

func getOrder(order string) string {
	if order == "DESC" {
		return "DESC"
	}
	return "ASC"
}
