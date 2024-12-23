package dashboards

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Dashboards interface {
	Create(projectId int, userId uint64, req *CreateDashboardRequest) (*GetDashboardResponse, error)
	Get(projectId int, dashboardId int, userId uint64) (*GetDashboardResponse, error)
	GetAll(projectId int, userId uint64) (*GetDashboardsResponse, error)
	GetAllPaginated(projectId int, userId uint64, req *GetDashboardsRequest) (*GetDashboardsResponsePaginated, error)
	Update(projectId int, dashboardId int, userId uint64, req *UpdateDashboardRequest) (*GetDashboardResponse, error)
	Delete(projectId int, dashboardId int, userId uint64) error
	AddCards(projectId int, dashboardId int, userId uint64, req *AddCardToDashboardRequest) error
	DeleteCard(dashboardId int, cardId int) error
}

type dashboardsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
}

func New(log logger.Logger, conn pool.Pool) (Dashboards, error) {
	return &dashboardsImpl{
		log:    log,
		pgconn: conn,
	}, nil
}

func (s *dashboardsImpl) Create(projectId int, userID uint64, req *CreateDashboardRequest) (*GetDashboardResponse, error) {
	sql := `
		INSERT INTO dashboards (project_id, user_id, name, description, is_public, is_pinned)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING dashboard_id, project_id, user_id, name, description, is_public, is_pinned`

	dashboard := &GetDashboardResponse{}
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

func (s *dashboardsImpl) Get(projectId int, dashboardID int, userID uint64) (*GetDashboardResponse, error) {
	sql := `
		WITH series_agg AS (
			SELECT 
				ms.metric_id,
				json_agg(
					json_build_object(
						'index', ms.index,
						'name', ms.name,
						'filter', ms.filter
					)
				) AS series
			FROM metric_series ms
			GROUP BY ms.metric_id
		)
		SELECT 
			d.dashboard_id, 
			d.project_id, 
			d.name, 
			d.description, 
			d.is_public, 
			d.is_pinned, 
			d.user_id,
			COALESCE(json_agg(
				json_build_object(
					'config', dw.config,
					'metric_id', m.metric_id,
					'name', m.name,
					'metric_type', m.metric_type,
					'view_type', m.view_type,
					'metric_of', m.metric_of,
					'metric_value', m.metric_value,
					'metric_format', m.metric_format,
					'series', s.series
				)
			) FILTER (WHERE m.metric_id IS NOT NULL), '[]') AS metrics
		FROM dashboards d
		LEFT JOIN dashboard_widgets dw ON d.dashboard_id = dw.dashboard_id
		LEFT JOIN metrics m ON dw.metric_id = m.metric_id
		LEFT JOIN series_agg s ON m.metric_id = s.metric_id
		WHERE d.dashboard_id = $1 AND d.project_id = $2 AND d.deleted_at IS NULL
		GROUP BY d.dashboard_id, d.project_id, d.name, d.description, d.is_public, d.is_pinned, d.user_id`

	dashboard := &GetDashboardResponse{}
	var ownerID int
	var metricsJSON []byte

	err := s.pgconn.QueryRow(sql, dashboardID, projectId).Scan(
		&dashboard.DashboardID,
		&dashboard.ProjectID,
		&dashboard.Name,
		&dashboard.Description,
		&dashboard.IsPublic,
		&dashboard.IsPinned,
		&ownerID,
		&metricsJSON,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, errors.New("not_found: dashboard not found")
		}
		return nil, fmt.Errorf("error fetching dashboard: %w", err)
	}

	if err := json.Unmarshal(metricsJSON, &dashboard.Metrics); err != nil {
		return nil, fmt.Errorf("error unmarshalling metrics: %w", err)
	}

	if !dashboard.IsPublic && uint64(ownerID) != userID {
		return nil, fmt.Errorf("access_denied: user does not have access")
	}

	return dashboard, nil
}

func (s *dashboardsImpl) GetAll(projectId int, userID uint64) (*GetDashboardsResponse, error) {
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

	var dashboards []Dashboard
	for rows.Next() {
		var dashboard Dashboard

		err := rows.Scan(&dashboard.DashboardID, &dashboard.UserID, &dashboard.ProjectID, &dashboard.Name, &dashboard.Description, &dashboard.IsPublic, &dashboard.IsPinned, &dashboard.OwnerEmail, &dashboard.OwnerName)
		if err != nil {
			return nil, err
		}

		dashboards = append(dashboards, dashboard)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &GetDashboardsResponse{
		Dashboards: dashboards,
	}, nil
}

func (s *dashboardsImpl) GetAllPaginated(projectId int, userID uint64, req *GetDashboardsRequest) (*GetDashboardsResponsePaginated, error) {
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

	var dashboards []Dashboard
	for rows.Next() {
		var dashboard Dashboard
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

	return &GetDashboardsResponsePaginated{
		Dashboards: dashboards,
		Total:      total,
	}, nil
}

func (s *dashboardsImpl) Update(projectId int, dashboardID int, userID uint64, req *UpdateDashboardRequest) (*GetDashboardResponse, error) {
	sql := `
		UPDATE dashboards
		SET name = $1, description = $2, is_public = $3, is_pinned = $4
		WHERE dashboard_id = $5 AND project_id = $6 AND user_id = $7 AND deleted_at IS NULL
		RETURNING dashboard_id, project_id, user_id, name, description, is_public, is_pinned`

	dashboard := &GetDashboardResponse{}
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

func (s *dashboardsImpl) Delete(projectId int, dashboardID int, userID uint64) error {
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

func buildBaseQuery(projectId int, userID uint64, req *GetDashboardsRequest) (string, []interface{}) {
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

func (s *dashboardsImpl) CardsExist(projectId int, cardIDs []int) (bool, error) {
	sql := `
		SELECT COUNT(*) FROM public.metrics
		WHERE project_id = $1 AND metric_id = ANY($2)
	`
	var count int
	err := s.pgconn.QueryRow(sql, projectId, cardIDs).Scan(&count)
	if err != nil {
		return false, err
	}
	return count == len(cardIDs), nil
}

func (s *dashboardsImpl) AddCards(projectId int, dashboardId int, userId uint64, req *AddCardToDashboardRequest) error {
	_, err := s.Get(projectId, dashboardId, userId)
	if err != nil {
		return fmt.Errorf("failed to get dashboard: %w", err)
	}

	// Check if all cards exist
	exists, err := s.CardsExist(projectId, req.MetricIDs)
	if err != nil {
		return fmt.Errorf("failed to check card existence: %w", err)
	}

	if !exists {
		return errors.New("not_found: one or more cards do not exist")
	}

	// Begin a transaction
	tx, err := s.pgconn.Begin() // Start transaction
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}

	ctx := context.Background()
	defer func() {
		if err != nil {
			tx.Rollback(ctx)
			if err != nil {
				return
			}
		} else {
			err := tx.Commit(ctx)
			if err != nil {
				return
			}
		}
	}()

	// Insert metrics into dashboard_widgets
	insertedWidgets := 0
	for _, metricID := range req.MetricIDs {
		// Check if the widget already exists
		var exists bool
		err := tx.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM public.dashboard_widgets
				WHERE dashboard_id = $1 AND metric_id = $2
			)
		`, dashboardId, metricID).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check existing widget: %w", err)
		}

		if exists {
			continue // Skip duplicates
		}

		// Insert new widget
		_, err = tx.Exec(ctx, `
			INSERT INTO public.dashboard_widgets (dashboard_id, metric_id, user_id, config)
			VALUES ($1, $2, $3, $4)
		`, dashboardId, metricID, userId, req.Config)
		if err != nil {
			return fmt.Errorf("failed to insert widget: %w", err)
		}
		insertedWidgets++
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (s *dashboardsImpl) DeleteCard(dashboardId int, cardId int) error {
	sql := `DELETE FROM public.dashboard_widgets WHERE dashboard_id = $1 AND metric_id = $2`
	err := s.pgconn.Exec(sql, dashboardId, cardId)
	if err != nil {
		return fmt.Errorf("failed to delete card from dashboard: %w", err)
	}

	return nil
}
