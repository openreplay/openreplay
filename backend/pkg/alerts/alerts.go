package alerts

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

var (
	ErrAlertNotFound = errors.New("alert not found")
	ErrInvalidSeries = errors.New("series not found in project")
)

const alertColumns = `alerts.alert_id, alerts.project_id, alerts.series_id, alerts.name, alerts.description, alerts.active,
	alerts.detection_method::text, alerts.change::text, alerts.query, alerts.options, alerts.created_at`

type Alerts interface {
	Create(ctx context.Context, projectID uint32, req *AlertRequest) (*Alert, error)
	Get(ctx context.Context, projectID uint32, alertID int) (*Alert, error)
	GetAll(ctx context.Context, projectID uint32) ([]*Alert, error)
	Update(ctx context.Context, projectID uint32, alertID int, req *AlertRequest) (*Alert, error)
	Delete(ctx context.Context, projectID uint32, alertID int) error
	GetTriggers(ctx context.Context, projectID uint32, userID uint64) ([]Trigger, error)
}

type alertsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
}

func New(log logger.Logger, pgconn pool.Pool) Alerts {
	return &alertsImpl{
		log:    log,
		pgconn: pgconn,
	}
}

func scanAlert(row pgx.Row, extra ...any) (*Alert, error) {
	a := &Alert{}
	var createdAt time.Time
	dest := []any{&a.AlertID, &a.ProjectID, &a.SeriesID, &a.Name, &a.Description, &a.Active,
		&a.DetectionMethod, &a.Change, &a.Query, &a.Options, &createdAt}
	if err := row.Scan(append(dest, extra...)...); err != nil {
		return nil, err
	}
	a.CreatedAt = createdAt.UnixMilli()
	return a, nil
}

func (s *alertsImpl) checkSeries(projectID uint32, seriesID *int) error {
	if seriesID == nil {
		return nil
	}
	var exists bool
	err := s.pgconn.QueryRow(`
		SELECT EXISTS(SELECT 1
		              FROM public.metric_series
		                   INNER JOIN public.metrics USING (metric_id)
		              WHERE metric_series.series_id = $1
		                AND metric_series.deleted_at IS NULL
		                AND metrics.project_id = $2
		                AND metrics.metric_type = 'timeseries'
		                AND metrics.deleted_at IS NULL)`, *seriesID, projectID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("check series: %s", err)
	}
	if !exists {
		return ErrInvalidSeries
	}
	return nil
}

func encodeRequest(req *AlertRequest) ([]byte, []byte, error) {
	query, err := req.QueryJSON()
	if err != nil {
		return nil, nil, fmt.Errorf("encode query: %s", err)
	}
	options, err := req.OptionsJSON()
	if err != nil {
		return nil, nil, fmt.Errorf("encode options: %s", err)
	}
	return query, options, nil
}

func (s *alertsImpl) Create(ctx context.Context, projectID uint32, req *AlertRequest) (*Alert, error) {
	if err := s.checkSeries(projectID, req.SeriesID()); err != nil {
		return nil, err
	}
	query, options, err := encodeRequest(req)
	if err != nil {
		return nil, err
	}
	row := s.pgconn.QueryRow(`
		INSERT INTO public.alerts (project_id, name, description, detection_method, query, options, series_id, change)
		VALUES ($1, $2, $3, $4::alert_detection_method, $5::jsonb, $6::jsonb, $7, $8::alert_change_type)
		RETURNING `+alertColumns,
		projectID, *req.Name, req.Description, req.DetectionMethod, string(query), string(options), req.SeriesID(), req.ChangeType())
	a, err := scanAlert(row)
	if err != nil {
		return nil, fmt.Errorf("create alert: %s", err)
	}
	a.toFront()
	return a, nil
}

func (s *alertsImpl) Get(ctx context.Context, projectID uint32, alertID int) (*Alert, error) {
	row := s.pgconn.QueryRow(`
		SELECT `+alertColumns+`
		FROM public.alerts
		WHERE alerts.alert_id = $1
		  AND alerts.project_id = $2
		  AND alerts.deleted_at IS NULL`, alertID, projectID)
	a, err := scanAlert(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAlertNotFound
		}
		return nil, fmt.Errorf("get alert: %s", err)
	}
	a.toFront()
	return a, nil
}

func (s *alertsImpl) GetAll(ctx context.Context, projectID uint32) ([]*Alert, error) {
	rows, err := s.pgconn.Query(`
		SELECT `+alertColumns+`,
		       COALESCE(metrics.name || '.' || (COALESCE(metric_series.name, 'series ' || metric_series.index)) || '.count',
		                alerts.query ->> 'left') AS series_name
		FROM public.alerts
		     LEFT JOIN public.metric_series USING (series_id)
		     LEFT JOIN public.metrics USING (metric_id)
		WHERE alerts.project_id = $1
		  AND alerts.deleted_at IS NULL
		ORDER BY alerts.created_at`, projectID)
	if err != nil {
		return nil, fmt.Errorf("list alerts: %s", err)
	}
	defer rows.Close()

	list := make([]*Alert, 0)
	for rows.Next() {
		var seriesName *string
		a, err := scanAlert(rows, &seriesName)
		if err != nil {
			return nil, fmt.Errorf("scan alert: %s", err)
		}
		a.SeriesName = seriesName
		a.toFront()
		list = append(list, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate alerts: %s", err)
	}
	return list, nil
}

func (s *alertsImpl) Update(ctx context.Context, projectID uint32, alertID int, req *AlertRequest) (*Alert, error) {
	if err := s.checkSeries(projectID, req.SeriesID()); err != nil {
		return nil, err
	}
	query, options, err := encodeRequest(req)
	if err != nil {
		return nil, err
	}
	row := s.pgconn.QueryRow(`
		UPDATE public.alerts
		SET name             = $3,
		    description      = $4,
		    active           = TRUE,
		    detection_method = $5::alert_detection_method,
		    query            = $6::jsonb,
		    options          = $7::jsonb,
		    series_id        = $8,
		    change           = $9::alert_change_type
		WHERE alert_id = $1
		  AND project_id = $2
		  AND deleted_at IS NULL
		RETURNING `+alertColumns,
		alertID, projectID, *req.Name, req.Description, req.DetectionMethod, string(query), string(options), req.SeriesID(), req.ChangeType())
	a, err := scanAlert(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAlertNotFound
		}
		return nil, fmt.Errorf("update alert: %s", err)
	}
	a.toFront()
	return a, nil
}

func (s *alertsImpl) Delete(ctx context.Context, projectID uint32, alertID int) error {
	var id int
	err := s.pgconn.QueryRow(`
		UPDATE public.alerts
		SET deleted_at = timezone('utc'::text, now()),
		    active     = FALSE
		WHERE alert_id = $1
		  AND project_id = $2
		  AND deleted_at IS NULL
		RETURNING alert_id`, alertID, projectID).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrAlertNotFound
		}
		return fmt.Errorf("delete alert: %s", err)
	}
	return nil
}

func (s *alertsImpl) GetTriggers(ctx context.Context, projectID uint32, userID uint64) ([]Trigger, error) {
	triggers := PredefinedTriggers()
	rows, err := s.pgconn.Query(`
		SELECT metrics.name || '.' || (COALESCE(metric_series.name, 'series ' || metric_series.index)) || '.count' AS name,
		       metric_series.metric_id,
		       metric_series.series_id
		FROM public.metric_series
		     INNER JOIN public.metrics USING (metric_id)
		WHERE metrics.deleted_at IS NULL
		  AND metric_series.deleted_at IS NULL
		  AND metrics.project_id = $1
		  AND metrics.metric_type = 'timeseries'
		  AND (metrics.user_id = $2 OR metrics.is_public)
		ORDER BY name`, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("list alert series: %s", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			name     string
			metricID int
			seriesID int
		)
		if err := rows.Scan(&name, &metricID, &seriesID); err != nil {
			return nil, fmt.Errorf("scan alert series: %s", err)
		}
		triggers = append(triggers, Trigger{
			Name:     name,
			Value:    seriesID,
			Unit:     "count",
			MetricID: &metricID,
			SeriesID: &seriesID,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate alert series: %s", err)
	}
	return triggers, nil
}
