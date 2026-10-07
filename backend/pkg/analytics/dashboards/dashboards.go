package dashboards

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

const (
	errNotFound     = "not_found: dashboard not found"
	errAccessDenied = "access_denied: user does not have access"
)

type Dashboards interface {
	Create(projectId int, userId uint64, req *CreateDashboardRequest) (*GetDashboardResponse, error)
	Get(projectId int, dashboardId int, userId uint64) (*GetDashboardResponse, error)
	GetAll(projectId int, userId uint64) (*GetDashboardsResponse, error)
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
		VALUES (@projectId, @userId, @name, @description, @isPublic, @isPinned)
		RETURNING dashboard_id, project_id, user_id, name, description, is_public, is_pinned, created_at`

	dashboard := &GetDashboardResponse{}
	err := s.pgconn.QueryRow(sql, pgx.NamedArgs{
		"projectId":   projectId,
		"userId":      userID,
		"name":        req.Name,
		"description": req.Description,
		"isPublic":    req.IsPublic,
		"isPinned":    req.IsPinned,
	}).Scan(
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

func evaluateAccess(ownerID *int, isPublic bool, userID uint64) error {
	if !isPublic && (ownerID == nil || uint64(*ownerID) != userID) {
		return errors.New(errAccessDenied)
	}
	return nil
}

func (s *dashboardsImpl) checkAccess(projectId int, dashboardID int, userID uint64) error {
	var ownerID *int
	var isPublic bool
	err := s.pgconn.QueryRow(
		`SELECT user_id, is_public FROM dashboards WHERE dashboard_id = $1 AND project_id = $2 AND deleted_at IS NULL`,
		dashboardID, projectId,
	).Scan(&ownerID, &isPublic)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			return errors.New(errNotFound)
		}
		return fmt.Errorf("error fetching dashboard: %w", err)
	}
	return evaluateAccess(ownerID, isPublic, userID)
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
					) ORDER BY ms.index, ms.series_id
				) AS series
			FROM metric_series ms
			WHERE ms.metric_id IN (
				SELECT dw.metric_id
				FROM dashboard_widgets dw
				JOIN metrics m ON m.metric_id = dw.metric_id AND m.deleted_at IS NULL
				WHERE dw.dashboard_id = @dashboardId
			) AND ms.deleted_at IS NULL
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
		LEFT JOIN metrics m ON dw.metric_id = m.metric_id AND m.deleted_at IS NULL
		LEFT JOIN series_agg s ON m.metric_id = s.metric_id
		WHERE d.dashboard_id = @dashboardId AND d.project_id = @projectId AND d.deleted_at IS NULL
		GROUP BY d.dashboard_id, d.project_id, d.name, d.description, d.is_public, d.is_pinned, d.user_id, d.created_at`

	dashboard := &GetDashboardResponse{}
	var ownerID *int
	var metricsJSON []byte

	err := s.pgconn.QueryRow(sql, pgx.NamedArgs{"dashboardId": dashboardID, "projectId": projectId}).Scan(
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
		if postgres.IsNoRowsErr(err) {
			return nil, errors.New(errNotFound)
		}
		return nil, fmt.Errorf("error fetching dashboard: %w", err)
	}

	if err := json.Unmarshal(metricsJSON, &dashboard.Metrics); err != nil {
		return nil, fmt.Errorf("error unmarshalling metrics: %w", err)
	}

	if err := evaluateAccess(ownerID, dashboard.IsPublic, userID); err != nil {
		return nil, err
	}

	return dashboard, nil
}

func (s *dashboardsImpl) GetAll(projectId int, userID uint64) (*GetDashboardsResponse, error) {
	sql := `
		SELECT d.dashboard_id, d.user_id, d.project_id, d.name, d.description, d.is_public, d.is_pinned, u.email AS owner_email, u.name AS owner_name, d.created_at
		FROM dashboards d
		LEFT JOIN users u ON d.user_id = u.user_id
		WHERE (d.is_public = true OR d.user_id = @userId) AND d.user_id IS NOT NULL AND d.deleted_at IS NULL AND d.project_id = @projectId
		ORDER BY d.dashboard_id`
	rows, err := s.pgconn.Query(sql, pgx.NamedArgs{"userId": userID, "projectId": projectId})
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dashboards []DashboardListItem
	for rows.Next() {
		var dashboard DashboardListItem

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

func (s *dashboardsImpl) Update(projectId int, dashboardID int, userID uint64, req *UpdateDashboardRequest) (*GetDashboardResponse, error) {
	if err := s.checkAccess(projectId, dashboardID, userID); err != nil {
		return nil, err
	}

	sql := `
		UPDATE dashboards
		SET name = @name, description = @description, is_public = @isPublic, is_pinned = @isPinned
		WHERE dashboard_id = @dashboardId AND project_id = @projectId AND deleted_at IS NULL
		RETURNING dashboard_id, project_id, user_id, name, description, is_public, is_pinned, created_at`

	dashboard := &GetDashboardResponse{}
	err := s.pgconn.QueryRow(sql, pgx.NamedArgs{
		"name":        req.Name,
		"description": req.Description,
		"isPublic":    req.IsPublic,
		"isPinned":    req.IsPinned,
		"dashboardId": dashboardID,
		"projectId":   projectId,
	}).Scan(
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
	if err := s.checkAccess(projectId, dashboardID, userID); err != nil {
		return err
	}

	sql := `
		UPDATE dashboards
		SET deleted_at = now()
		WHERE dashboard_id = @dashboardId AND project_id = @projectId AND user_id = @userId AND deleted_at IS NULL`

	err := s.pgconn.Exec(sql, pgx.NamedArgs{"dashboardId": dashboardID, "projectId": projectId, "userId": userID})
	if err != nil {
		return fmt.Errorf("error deleting dashboard: %w", err)
	}

	return nil
}

type MetricWithConfig struct {
	MetricID      int             `json:"metric_id"`
	DefaultConfig json.RawMessage `json:"default_config"`
}

func (s *dashboardsImpl) GetMetricsWithConfig(projectId int, metricIDs []int) ([]MetricWithConfig, error) {
	sql := `
		SELECT metric_id, COALESCE(default_config, '{}') as default_config
		FROM public.metrics
		WHERE project_id = @projectId AND metric_id = ANY(@metricIds)
	`
	rows, err := s.pgconn.Query(sql, pgx.NamedArgs{"projectId": projectId, "metricIds": metricIDs})
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

func (s *dashboardsImpl) GetExistingWidgets(tx *pool.Tx, dashboardId int, metricIDs []int) (map[int]bool, error) {
	sql := `
		SELECT metric_id
		FROM public.dashboard_widgets
		WHERE dashboard_id = @dashboardId AND metric_id = ANY(@metricIds)
	`
	rows, err := tx.TxQuery(sql, pgx.NamedArgs{"dashboardId": dashboardId, "metricIds": metricIDs})
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

func (s *dashboardsImpl) GetNextPosition(tx *pool.Tx, dashboardId int) (int, error) {
	sql := `SELECT COALESCE(MAX((config->>'position')::int), 0) + 1 FROM public.dashboard_widgets WHERE dashboard_id = @dashboardId`
	var nextPosition int
	err := tx.TxQueryRow(sql, pgx.NamedArgs{"dashboardId": dashboardId}).Scan(&nextPosition)
	if err != nil {
		return 0, fmt.Errorf("failed to get next position: %w", err)
	}
	return nextPosition, nil
}

func (s *dashboardsImpl) AddCards(projectId int, dashboardId int, userId uint64, req *AddCardToDashboardRequest) error {
	err := s.checkAccess(projectId, dashboardId, userId)
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

	tx, err := s.pgconn.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	committed := false
	defer func() {
		if !committed {
			tx.TxRollback()
		}
	}()

	existingWidgets, err := s.GetExistingWidgets(tx, dashboardId, req.MetricIDs)
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

	// Get starting position for new widgets
	startPosition, err := s.GetNextPosition(tx, dashboardId)
	if err != nil {
		return fmt.Errorf("failed to get next position: %w", err)
	}

	// Bulk insert new widgets
	if len(newMetricIDs) > 0 {

		// Build bulk insert query
		query := `INSERT INTO public.dashboard_widgets (dashboard_id, metric_id, user_id, config) VALUES `
		var values []string
		args := pgx.NamedArgs{"dashboardId": dashboardId, "userId": userId}
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

			i := len(values)
			values = append(values, fmt.Sprintf("(@dashboardId, @metricId%d, @userId, @config%d)", i, i))
			args[fmt.Sprintf("metricId%d", i)] = metricID
			args[fmt.Sprintf("config%d", i)] = configJSON
			currentPosition++
		}

		finalQuery := query + strings.Join(values, ", ")
		err = tx.TxExec(finalQuery, args)
		if err != nil {
			return fmt.Errorf("failed to bulk insert widgets: %w", err)
		}
	}

	// Commit transaction
	if err := tx.TxCommit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	committed = true

	return nil
}

func (s *dashboardsImpl) UpdateWidgetPosition(projectId int, dashboardId int, userId uint64, widgetId int, config map[string]interface{}) error {
	err := s.checkAccess(projectId, dashboardId, userId)
	if err != nil {
		return fmt.Errorf("failed to get dashboard: %w", err)
	}

	// Check if the widget exists
	var exists bool
	checkSQL := `SELECT EXISTS (
		SELECT 1 FROM public.dashboard_widgets
		WHERE dashboard_id = @dashboardId AND widget_id = @widgetId
	)`
	err = s.pgconn.QueryRow(checkSQL, pgx.NamedArgs{"dashboardId": dashboardId, "widgetId": widgetId}).Scan(&exists)
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
	updateSQL := `UPDATE public.dashboard_widgets SET config = @config WHERE dashboard_id = @dashboardId AND widget_id = @widgetId`

	err = s.pgconn.Exec(updateSQL, pgx.NamedArgs{"config": configJSON, "dashboardId": dashboardId, "widgetId": widgetId})
	if err != nil {
		return fmt.Errorf("failed to update widget position: %w", err)
	}

	return nil
}

func (s *dashboardsImpl) DeleteCard(projectId int, dashboardId int, userId uint64, cardId int) error {
	err := s.checkAccess(projectId, dashboardId, userId)
	if err != nil {
		return fmt.Errorf("failed to get dashboard: %w", err)
	}

	// Check if the widget exists before deletion
	var exists bool
	checkSQL := `SELECT EXISTS (
		SELECT 1 FROM public.dashboard_widgets
		WHERE dashboard_id = @dashboardId AND widget_id = @widgetId
	)`
	err = s.pgconn.QueryRow(checkSQL, pgx.NamedArgs{"dashboardId": dashboardId, "widgetId": cardId}).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check widget existence: %w", err)
	}

	if !exists {
		return errors.New("not_found: widget not found in dashboard")
	}

	// Delete the widget
	deleteSQL := `DELETE FROM public.dashboard_widgets WHERE dashboard_id = @dashboardId AND widget_id = @widgetId`
	err = s.pgconn.Exec(deleteSQL, pgx.NamedArgs{"dashboardId": dashboardId, "widgetId": cardId})
	if err != nil {
		return fmt.Errorf("failed to delete card from dashboard: %w", err)
	}

	return nil
}
