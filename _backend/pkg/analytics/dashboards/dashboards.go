package dashboards

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

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
	DeleteCard(projectId int, dashboardId int, userId uint64, cardId int) error
	UpdateWidgetPosition(projectId int, dashboardId int, userId uint64, widgetId int, config map[string]interface{}) error
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
		RETURNING dashboard_id, project_id, user_id, name, description, is_public, is_pinned, created_at`

	dashboard := &GetDashboardResponse{}
	err := s.pgconn.QueryRow(sql, projectId, userID, req.Name, req.Description, req.IsPublic, req.IsPinned).Scan(
		&dashboard.DashboardID,
		&dashboard.ProjectID,
		&dashboard.UserID,
		&dashboard.Name,
		&dashboard.Description,
		&dashboard.IsPublic,
		&dashboard.IsPinned,
		&dashboard.CreatedAt,
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
			d.created_at,
			COALESCE(json_agg(
				json_build_object(
					'widgetId', dw.widget_id,
					'config', dw.config,
					'metricId', m.metric_id,
					'name', m.name,
					'metricType', m.metric_type,
					'metricFormat', m.metric_format,
					'viewType', m.view_type,
					'metricOf', m.metric_of,
					'metricValue', m.metric_value,
					'thumbnail', m.thumbnail,
					'series', s.series
				) ORDER BY COALESCE((dw.config->>'position')::int, 999999) ASC
			) FILTER (WHERE m.metric_id IS NOT NULL), '[]') AS metrics
		FROM dashboards d
		LEFT JOIN dashboard_widgets dw ON d.dashboard_id = dw.dashboard_id
		LEFT JOIN metrics m ON dw.metric_id = m.metric_id
		LEFT JOIN series_agg s ON m.metric_id = s.metric_id
		WHERE d.dashboard_id = $1 AND d.project_id = $2 AND d.deleted_at IS NULL
		GROUP BY d.dashboard_id, d.project_id, d.name, d.description, d.is_public, d.is_pinned, d.user_id, d.created_at`

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
		&dashboard.CreatedAt,
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
		SELECT d.dashboard_id, d.user_id, d.project_id, d.name, d.description, d.is_public, d.is_pinned, u.email AS owner_email, u.name AS owner_name, d.created_at
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

		err := rows.Scan(&dashboard.DashboardID, &dashboard.UserID, &dashboard.ProjectID, &dashboard.Name, &dashboard.Description, &dashboard.IsPublic, &dashboard.IsPinned, &dashboard.OwnerEmail, &dashboard.OwnerName, &dashboard.CreatedAt)
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
			&dashboard.CreatedAt,
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
	// First check if the dashboard exists and user has access
	_, err := s.Get(projectId, dashboardID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get dashboard: %w", err)
	}

	sql := `
		UPDATE dashboards
		SET name = $1, description = $2, is_public = $3, is_pinned = $4
		WHERE dashboard_id = $5 AND project_id = $6 AND deleted_at IS NULL
		RETURNING dashboard_id, project_id, user_id, name, description, is_public, is_pinned, created_at`

	dashboard := &GetDashboardResponse{}
	err = s.pgconn.QueryRow(sql, req.Name, req.Description, req.IsPublic, req.IsPinned, dashboardID, projectId).Scan(
		&dashboard.DashboardID,
		&dashboard.ProjectID,
		&dashboard.UserID,
		&dashboard.Name,
		&dashboard.Description,
		&dashboard.IsPublic,
		&dashboard.IsPinned,
		&dashboard.CreatedAt,
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
		       u.email AS owner_email, u.name AS owner_name, d.created_at
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

type MetricWithConfig struct {
	MetricID      int             `json:"metric_id"`
	DefaultConfig json.RawMessage `json:"default_config"`
}

func (s *dashboardsImpl) GetMetricsWithConfig(projectId int, metricIDs []int) ([]MetricWithConfig, error) {
	sql := `
		SELECT metric_id, COALESCE(default_config, '{}') as default_config
		FROM public.metrics
		WHERE project_id = $1 AND metric_id = ANY($2)
	`
	rows, err := s.pgconn.Query(sql, projectId, metricIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var metrics []MetricWithConfig
	for rows.Next() {
		var metric MetricWithConfig
		err := rows.Scan(&metric.MetricID, &metric.DefaultConfig)
		if err != nil {
			return nil, err
		}
		metrics = append(metrics, metric)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return metrics, nil
}

func (s *dashboardsImpl) GetExistingWidgets(dashboardId int, metricIDs []int) (map[int]bool, error) {
	sql := `
		SELECT metric_id
		FROM public.dashboard_widgets
		WHERE dashboard_id = $1 AND metric_id = ANY($2)
	`
	rows, err := s.pgconn.Query(sql, dashboardId, metricIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	existingWidgets := make(map[int]bool)
	for rows.Next() {
		var metricID int
		err := rows.Scan(&metricID)
		if err != nil {
			return nil, err
		}
		existingWidgets[metricID] = true
	}

	return existingWidgets, nil
}

func (s *dashboardsImpl) GetNextPosition(dashboardId int) (int, error) {
	sql := `SELECT COALESCE(MAX((config->>'position')::int), 0) + 1 FROM public.dashboard_widgets WHERE dashboard_id = $1`
	var nextPosition int
	err := s.pgconn.QueryRow(sql, dashboardId).Scan(&nextPosition)
	if err != nil {
		return 0, fmt.Errorf("failed to get next position: %w", err)
	}
	return nextPosition, nil
}

func (s *dashboardsImpl) AddCards(projectId int, dashboardId int, userId uint64, req *AddCardToDashboardRequest) error {
	// Verify dashboard exists and user has access
	_, err := s.Get(projectId, dashboardId, userId)
	if err != nil {
		return fmt.Errorf("failed to get dashboard: %w", err)
	}

	// Get all metrics with their default config in bulk
	metrics, err := s.GetMetricsWithConfig(projectId, req.MetricIDs)
	if err != nil {
		return fmt.Errorf("failed to get metrics: %w", err)
	}

	// Check if all requested metrics exist
	if len(metrics) != len(req.MetricIDs) {
		return errors.New("not_found: one or more cards do not exist")
	}

	// Create a map for quick lookup of metrics with their config
	metricConfigMap := make(map[int]json.RawMessage)
	for _, metric := range metrics {
		metricConfigMap[metric.MetricID] = metric.DefaultConfig
	}

	// Check existing widgets in bulk
	existingWidgets, err := s.GetExistingWidgets(dashboardId, req.MetricIDs)
	if err != nil {
		return fmt.Errorf("failed to check existing widgets: %w", err)
	}

	// Filter out metrics that already have widgets
	var newMetricIDs []int
	for _, metricID := range req.MetricIDs {
		if !existingWidgets[metricID] {
			newMetricIDs = append(newMetricIDs, metricID)
		}
	}

	// If no new widgets to insert, return early
	if len(newMetricIDs) == 0 {
		return nil
	}

	// Begin transaction for bulk insert
	tx, err := s.pgconn.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}

	defer func() {
		if err != nil {
			tx.TxRollback()
		}
	}()

	// Get starting position for new widgets
	startPosition, err := s.GetNextPosition(dashboardId)
	if err != nil {
		return fmt.Errorf("failed to get next position: %w", err)
	}

	// Bulk insert new widgets
	if len(newMetricIDs) > 0 {

		// Build bulk insert query
		query := `INSERT INTO public.dashboard_widgets (dashboard_id, metric_id, user_id, config) VALUES `
		var values []string
		var args []interface{}
		argIndex := 1
		currentPosition := startPosition

		for _, metricID := range newMetricIDs {
			// Use provided config or fall back to default config from metric
			var configMap map[string]interface{}
			if req.Config != nil && len(req.Config) > 0 {
				configMap = req.Config
			} else {
				// Use default config from metrics table
				if len(metricConfigMap[metricID]) > 0 {
					if err := json.Unmarshal(metricConfigMap[metricID], &configMap); err != nil {
						configMap = make(map[string]interface{})
					}
				} else {
					configMap = make(map[string]interface{})
				}
			}

			// Add position to config
			configMap["position"] = currentPosition

			// Convert back to JSON
			configJSON, err := json.Marshal(configMap)
			if err != nil {
				return fmt.Errorf("failed to marshal config: %w", err)
			}

			values = append(values, fmt.Sprintf("($%d, $%d, $%d, $%d)", argIndex, argIndex+1, argIndex+2, argIndex+3))
			args = append(args, dashboardId, metricID, userId, configJSON)
			argIndex += 4
			currentPosition++
		}

		finalQuery := query + strings.Join(values, ", ")
		err = tx.TxExec(finalQuery, args...)
		if err != nil {
			return fmt.Errorf("failed to bulk insert widgets: %w", err)
		}
	}

	// Commit transaction
	if err := tx.TxCommit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (s *dashboardsImpl) UpdateWidgetPosition(projectId int, dashboardId int, userId uint64, widgetId int, config map[string]interface{}) error {
	// Verify dashboard exists and user has access
	_, err := s.Get(projectId, dashboardId, userId)
	if err != nil {
		return fmt.Errorf("failed to get dashboard: %w", err)
	}

	// Check if the widget exists
	var exists bool
	checkSQL := `SELECT EXISTS (
		SELECT 1 FROM public.dashboard_widgets
		WHERE dashboard_id = $1 AND widget_id = $2
	)`
	err = s.pgconn.QueryRow(checkSQL, dashboardId, widgetId).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check widget existence: %w", err)
	}

	if !exists {
		return errors.New("not_found: widget not found in dashboard")
	}

	// Convert config to JSON
	configJSON, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	// Update widget config (position is already included in the config JSON)
	updateSQL := `UPDATE public.dashboard_widgets SET config = $1 WHERE dashboard_id = $2 AND widget_id = $3`
	args := []interface{}{configJSON, dashboardId, widgetId}

	err = s.pgconn.Exec(updateSQL, args...)
	if err != nil {
		return fmt.Errorf("failed to update widget position: %w", err)
	}

	return nil
}

func (s *dashboardsImpl) DeleteCard(projectId int, dashboardId int, userId uint64, cardId int) error {
	// Verify dashboard exists and user has access
	_, err := s.Get(projectId, dashboardId, userId)
	if err != nil {
		return fmt.Errorf("failed to get dashboard: %w", err)
	}

	// Check if the widget exists before deletion
	var exists bool
	checkSQL := `SELECT EXISTS (
		SELECT 1 FROM public.dashboard_widgets
		WHERE dashboard_id = $1 AND widget_id = $2
	)`
	err = s.pgconn.QueryRow(checkSQL, dashboardId, cardId).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check widget existence: %w", err)
	}

	if !exists {
		return errors.New("not_found: widget not found in dashboard")
	}

	// Delete the widget
	deleteSQL := `DELETE FROM public.dashboard_widgets WHERE dashboard_id = $1 AND widget_id = $2`
	err = s.pgconn.Exec(deleteSQL, dashboardId, cardId)
	if err != nil {
		return fmt.Errorf("failed to delete card from dashboard: %w", err)
	}

	return nil
}
