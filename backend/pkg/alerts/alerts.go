package alerts

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
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

// chQuerier is the slice of driver.Conn the service needs (narrow for testing).
type chQuerier interface {
	Query(ctx context.Context, query string, args ...any) (driver.Rows, error)
}

type alertsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
	ch     chQuerier
}

func New(log logger.Logger, pgconn pool.Pool, ch driver.Conn) Alerts {
	return &alertsImpl{
		log:    log,
		pgconn: pgconn,
		ch:     ch,
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
			Source:   "metrics",
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate alert series: %s", err)
	}
	props, err := s.propertyTriggers(ctx, projectID)
	if err != nil {
		return nil, err
	}
	return append(triggers, props...), nil
}

// propertyTriggersSQL lists the visible event and user properties of a project from the
// same catalog the lexicon serves (all_properties, the latest customization row for the
// display name and status, and the observed value type), without the lexicon's usage counts.
// Source enums are read as strings so the three subqueries join on plain String keys.
const propertyTriggersSQL = `
SELECT ap.source,
       ap.property_name,
       ap.auto_captured,
       if(apc.display_name != '', apc.display_name, or_property_display_name(ap.property_name)) AS display_name,
       coalesce(nullIf(apc.status, ''), 'visible') AS status,
       any(vt.value_type) AS value_type
FROM (SELECT project_id, toString(source) AS source, property_name, auto_captured
      FROM product_analytics.all_properties
      WHERE project_id = @projectId
        AND source IN ('events', 'users')) ap
     LEFT JOIN (SELECT project_id, toString(source) AS source, property_name, auto_captured, display_name, status
                FROM product_analytics.all_properties_customized
                WHERE project_id = @projectId
                  AND _is_deleted = false
                  AND source IN ('events', 'users')
                ORDER BY _timestamp DESC
                LIMIT 1 BY project_id, source, property_name, auto_captured) apc
               ON apc.project_id = ap.project_id
                   AND apc.source = ap.source
                   AND apc.property_name = ap.property_name
                   AND apc.auto_captured = ap.auto_captured
     LEFT JOIN (SELECT project_id, 'events' AS source, property_name, auto_captured_property AS auto_captured,
                       anyLast(value_type) AS value_type
                FROM product_analytics.event_properties
                WHERE project_id = @projectId
                GROUP BY project_id, property_name, auto_captured_property
                UNION ALL
                SELECT project_id, 'users' AS source, property_name, auto_captured_property AS auto_captured,
                       anyLast(value_type) AS value_type
                FROM product_analytics.user_properties
                WHERE project_id = @projectId
                GROUP BY project_id, property_name, auto_captured_property) vt
               ON vt.project_id = ap.project_id
                   AND vt.source = ap.source
                   AND vt.property_name = ap.property_name
                   AND vt.auto_captured = ap.auto_captured
GROUP BY ap.source, ap.property_name, ap.auto_captured, display_name, status
HAVING status = 'visible'
ORDER BY ap.source, display_name, ap.property_name`

// propertyTriggers runs propertyTriggersSQL and maps every row to a trigger.
func (s *alertsImpl) propertyTriggers(ctx context.Context, projectID uint32) ([]Trigger, error) {
	if s.ch == nil {
		return nil, nil
	}
	rows, err := s.ch.Query(ctx, propertyTriggersSQL, clickhouse.Named("projectId", uint16(projectID)))
	if err != nil {
		return nil, fmt.Errorf("list property triggers: %w", err)
	}
	defer rows.Close()

	var out []Trigger
	for rows.Next() {
		var (
			source, name, displayName, status, dataType string
			autoCaptured                                bool
		)
		if err := rows.Scan(&source, &name, &autoCaptured, &displayName, &status, &dataType); err != nil {
			return nil, fmt.Errorf("scan property trigger: %w", err)
		}
		if tr, ok := propertyTrigger(source, name, autoCaptured, displayName, dataType); ok {
			out = append(out, tr)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate property triggers: %w", err)
	}
	return out, nil
}

// propertyTrigger maps one catalog property to a trigger. The trigger value is the
// alerts.query.left the cron evaluates: "$properties.<name>" for auto-captured properties,
// "properties.<name>" otherwise.
func propertyTrigger(source, name string, autoCaptured bool, displayName, dataType string) (Trigger, bool) {
	if name == "" {
		return Trigger{}, false
	}
	column := PropertiesColumn
	if autoCaptured {
		column = AutoPropertiesColumn
	}
	if displayName == "" {
		displayName = name
	}
	return Trigger{
		Name:     displayName,
		Value:    column + "." + name,
		Source:   source,
		DataType: dataType,
	}, true
}
