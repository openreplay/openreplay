package cards

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v4"
	"github.com/lib/pq"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Cards interface {
	Create(projectId int, userId uint64, req *CardCreateRequest) (*CardGetResponse, error)
	Get(projectId int, cardId int) (*CardGetResponse, error)
	GetWithSeries(projectId int, cardId int) (*CardGetResponse, error)
	GetAll(projectId int) (*GetCardsResponse, error)
	GetAllPaginated(projectId int, filters CardListFilter, sort CardListSort, limit int, offset int) (*GetCardsResponsePaginated, error)
	Update(projectId int, cardId int64, userId uint64, req *CardUpdateRequest) (*CardGetResponse, error)
	Delete(projectId int, cardId int64, userId uint64) error
}

type cardsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
}

func New(log logger.Logger, conn pool.Pool) (Cards, error) {
	return &cardsImpl{
		log:    log,
		pgconn: conn,
	}, nil
}

func (s *cardsImpl) Create(projectId int, userID uint64, req *CardCreateRequest) (*CardGetResponse, error) {
	if req.MetricValue == nil {
		req.MetricValue = []string{}
	}

	tx, err := s.pgconn.Begin() // Start transaction
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
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

	// Insert the card
	sql := `
		INSERT INTO public.metrics (project_id, user_id, name, metric_type, view_type, metric_of, metric_value, metric_format, is_public)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING metric_id, project_id, user_id, name, metric_type, view_type, metric_of, metric_value, metric_format, is_public, created_at, edited_at`

	card := &CardGetResponse{}
	err = tx.QueryRow(
		ctx, sql,
		projectId, userID, req.Name, req.MetricType, req.ViewType, req.MetricOf, req.MetricValue, req.MetricFormat, req.IsPublic,
	).Scan(
		&card.CardID,
		&card.ProjectID,
		&card.UserID,
		&card.Name,
		&card.MetricType,
		&card.ViewType,
		&card.MetricOf,
		&card.MetricValue,
		&card.MetricFormat,
		&card.IsPublic,
		&card.CreatedAt,
		&card.EditedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create card: %w", err)
	}

	// Create series for the card
	seriesList := s.CreateSeries(ctx, tx, card.CardID, req.Series)
	if len(seriesList) != len(req.Series) {
		return nil, fmt.Errorf("not all series were created successfully")
	}

	card.Series = seriesList
	return card, nil
}

func (s *cardsImpl) CreateSeries(ctx context.Context, tx pgx.Tx, metricId int64, series []CardSeriesBase) []CardSeries {
	if len(series) == 0 {
		return nil // No series to create
	}

	// Batch insert for better performance
	sql := `
		INSERT INTO public.metric_series (metric_id, name, index, filter) VALUES %s
		RETURNING series_id, metric_id, name, index, filter`

	// Generate the VALUES placeholders dynamically
	var values []string
	var args []interface{}
	for i, ser := range series {
		values = append(values, fmt.Sprintf("($%d, $%d, $%d, $%d)", i*4+1, i*4+2, i*4+3, i*4+4))

		filterJSON, err := json.Marshal(ser.Filter) // Convert struct to JSON
		if err != nil {
			s.log.Error(ctx, "failed to serialize filter to JSON: %v", err)
			return nil
		}
		fmt.Println(string(filterJSON))
		args = append(args, metricId, ser.Name, i, string(filterJSON))
	}

	query := fmt.Sprintf(sql, strings.Join(values, ","))
	s.log.Info(ctx, "Executing query: %s with args: %v", query, args)

	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		s.log.Error(ctx, "failed to execute batch insert for series: %v", err)
		return nil
	}
	defer rows.Close()

	if rows.Err() != nil {
		s.log.Error(ctx, "Query returned an error: %v", rows.Err())
		return nil
	}

	// Collect inserted series
	var seriesList []CardSeries
	for rows.Next() {
		cardSeries := CardSeries{}
		if err := rows.Scan(&cardSeries.SeriesID, &cardSeries.MetricID, &cardSeries.Name, &cardSeries.Index, &cardSeries.Filter); err != nil {
			s.log.Error(ctx, "failed to scan series: %v", err)
			continue
		}
		seriesList = append(seriesList, cardSeries)
	}

	return seriesList
}

func (s *cardsImpl) Get(projectId int, cardID int) (*CardGetResponse, error) {
	sql :=
		`SELECT metric_id, project_id, user_id, name, metric_type, view_type, metric_of, metric_value, metric_format, is_public, created_at, edited_at
	FROM public.metrics
	WHERE metric_id = $1 AND project_id = $2 AND deleted_at IS NULL`

	card := &CardGetResponse{}
	err := s.pgconn.QueryRow(sql, cardID, projectId).Scan(
		&card.CardID, &card.ProjectID, &card.UserID, &card.Name, &card.MetricType, &card.ViewType, &card.MetricOf, &card.MetricValue, &card.MetricFormat, &card.IsPublic, &card.CreatedAt, &card.EditedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get card: %w", err)
	}

	return card, nil
}

func (s *cardsImpl) GetWithSeries(projectId int, cardID int) (*CardGetResponse, error) {
	sql := `
        SELECT m.metric_id, m.project_id, m.user_id, m.name, m.metric_type, m.view_type, m.metric_of, 
               m.metric_value, m.metric_format, m.is_public, m.created_at, m.edited_at,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'seriesId', ms.series_id,
                     'index', ms.index,
                     'name', ms.name,
                     'filter', ms.filter
                   )
                 ) FILTER (WHERE ms.series_id IS NOT NULL), '[]'
               ) AS series
        FROM public.metrics m
        LEFT JOIN public.metric_series ms ON m.metric_id = ms.metric_id
        WHERE m.metric_id = $1 AND m.project_id = $2 AND m.deleted_at IS NULL
        GROUP BY m.metric_id, m.project_id, m.user_id, m.name, m.metric_type, m.view_type, 
                 m.metric_of, m.metric_value, m.metric_format, m.is_public, m.created_at, m.edited_at
    `

	card := &CardGetResponse{}
	var seriesJSON []byte
	err := s.pgconn.QueryRow(sql, cardID, projectId).Scan(
		&card.CardID, &card.ProjectID, &card.UserID, &card.Name, &card.MetricType, &card.ViewType, &card.MetricOf,
		&card.MetricValue, &card.MetricFormat, &card.IsPublic, &card.CreatedAt, &card.EditedAt, &seriesJSON,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get card: %w", err)
	}

	if err := json.Unmarshal(seriesJSON, &card.Series); err != nil {
		return nil, fmt.Errorf("failed to unmarshal series: %w", err)
	}

	return card, nil
}

func (s *cardsImpl) GetAll(projectId int) (*GetCardsResponse, error) {
	sql := `
		SELECT metric_id, project_id, user_id, name, metric_type, view_type, metric_of, metric_value, metric_format, is_public, created_at, edited_at
		FROM public.metrics
		WHERE project_id = $1 AND deleted_at IS NULL`

	rows, err := s.pgconn.Query(sql, projectId)
	if err != nil {
		return nil, fmt.Errorf("failed to get cards: %w", err)
	}
	defer rows.Close()

	cards := make([]Card, 0)
	for rows.Next() {
		card := Card{}
		if err := rows.Scan(
			&card.CardID, &card.ProjectID, &card.UserID, &card.Name, &card.MetricType, &card.ViewType, &card.MetricOf,
			&card.MetricValue, &card.MetricFormat, &card.IsPublic, &card.CreatedAt, &card.EditedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan card: %w", err)
		}
		cards = append(cards, card)
	}

	return &GetCardsResponse{Cards: cards}, nil
}

func (s *cardsImpl) GetAllPaginated(
	projectId int,
	filters CardListFilter,
	sort CardListSort,
	limit,
	offset int,
) (*GetCardsResponsePaginated, error) {
	// Validate inputs
	if err := ValidateStruct(filters); err != nil {
		return nil, fmt.Errorf("invalid filters: %w", err)
	}
	if err := ValidateStruct(sort); err != nil {
		return nil, fmt.Errorf("invalid sort: %w", err)
	}

	var (
		conditions []string
		params     []interface{}
		paramIndex = 1
	)

	// Project ID is mandatory
	conditions = append(conditions, fmt.Sprintf("m.project_id = $%d", paramIndex))
	params = append(params, projectId)
	paramIndex++

	// Apply filters
	if nameFilter := filters.GetNameFilter(); nameFilter != nil {
		conditions = append(conditions, fmt.Sprintf("m.name ILIKE $%d", paramIndex))
		params = append(params, "%"+*nameFilter+"%")
		paramIndex++
	}

	if typeFilter := filters.GetMetricTypeFilter(); typeFilter != nil {
		conditions = append(conditions, fmt.Sprintf("m.metric_type = $%d", paramIndex))
		params = append(params, *typeFilter)
		paramIndex++
	}

	var joinClause string
	if dashboardIDs := filters.GetDashboardIDs(); len(dashboardIDs) > 0 {
		joinClause = "LEFT JOIN public.dashboard_widgets dw ON m.metric_id = dw.metric_id"
		conditions = append(conditions, fmt.Sprintf("dw.dashboard_id = ANY($%d)", paramIndex))
		params = append(params, pq.Array(dashboardIDs))
		paramIndex++
	}

	// Exclude deleted
	conditions = append(conditions, "m.deleted_at IS NULL")

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	orderClause := fmt.Sprintf("ORDER BY %s %s", sort.GetSQLField(), sort.GetSQLOrder())
	limitClause := fmt.Sprintf("LIMIT $%d", paramIndex)
	params = append(params, limit)
	paramIndex++
	offsetClause := fmt.Sprintf("OFFSET $%d", paramIndex)
	params = append(params, offset)
	paramIndex++

	// Main query
	query := fmt.Sprintf(`
		SELECT m.metric_id, m.project_id, m.user_id, m.name, m.metric_type, m.view_type, m.metric_of,
			   m.metric_value, m.metric_format, m.is_public, m.created_at, m.edited_at
		FROM public.metrics m
		%s
		%s
		%s
		%s
		%s
	`, joinClause, whereClause, orderClause, limitClause, offsetClause)

	rows, err := s.pgconn.Query(query, params...)
	if err != nil {
		return nil, fmt.Errorf("failed to get cards: %w", err)
	}
	defer rows.Close()

	var cards []Card
	for rows.Next() {
		var card Card
		if err := rows.Scan(
			&card.CardID, &card.ProjectID, &card.UserID, &card.Name, &card.MetricType, &card.ViewType, &card.MetricOf,
			&card.MetricValue, &card.MetricFormat, &card.IsPublic, &card.CreatedAt, &card.EditedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan card: %w", err)
		}
		cards = append(cards, card)
	}

	// Count total (exclude limit, offset, order)
	countParams := params[0 : len(params)-2] // all filter params without limit/offset
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM public.metrics m
		%s
		%s
	`, joinClause, whereClause)

	var total int
	if err := s.pgconn.QueryRow(countQuery, countParams...).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	return &GetCardsResponsePaginated{
		Cards: cards,
		Total: total,
	}, nil
}

func (s *cardsImpl) Update(projectId int, cardID int64, userID uint64, req *CardUpdateRequest) (*CardGetResponse, error) {
	if req.MetricValue == nil {
		req.MetricValue = []string{}
	}

	tx, err := s.pgconn.Begin() // Start transaction
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
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

	// Update the card
	sql := `
		UPDATE public.metrics
		SET name = $1, metric_type = $2, view_type = $3, metric_of = $4, metric_value = $5, metric_format = $6, is_public = $7
		WHERE metric_id = $8 AND project_id = $9 AND deleted_at IS NULL
		RETURNING metric_id, project_id, user_id, name, metric_type, view_type, metric_of, metric_value, metric_format, is_public, created_at, edited_at`

	card := &CardGetResponse{}
	err = tx.QueryRow(ctx, sql,
		req.Name, req.MetricType, req.ViewType, req.MetricOf, req.MetricValue, req.MetricFormat, req.IsPublic, cardID, projectId,
	).Scan(
		&card.CardID, &card.ProjectID, &card.UserID, &card.Name, &card.MetricType, &card.ViewType, &card.MetricOf,
		&card.MetricValue, &card.MetricFormat, &card.IsPublic, &card.CreatedAt, &card.EditedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to update card: %w", err)
	}

	// delete all series for the card and create new ones
	err = s.DeleteCardSeries(card.CardID)
	if err != nil {
		return nil, fmt.Errorf("failed to delete series: %w", err)
	}

	seriesList := s.CreateSeries(ctx, tx, card.CardID, req.Series)
	if len(seriesList) != len(req.Series) {
		return nil, fmt.Errorf("not all series were created successfully")
	}

	card.Series = seriesList
	return card, nil
}

func (s *cardsImpl) DeleteCardSeries(cardId int64) error {
	sql := `DELETE FROM public.metric_series WHERE metric_id = $1`
	err := s.pgconn.Exec(sql, cardId)
	if err != nil {
		return fmt.Errorf("failed to delete series: %w", err)
	}
	return nil
}

func (s *cardsImpl) Delete(projectId int, cardID int64, userID uint64) error {
	sql := `
		UPDATE public.metrics
		SET deleted_at = now()
		WHERE metric_id = $1 AND project_id = $2 AND user_id = $3 AND deleted_at IS NULL`

	err := s.pgconn.Exec(sql, cardID, projectId, userID)
	if err != nil {
		return fmt.Errorf("failed to delete card: %w", err)
	}
	return nil
}
