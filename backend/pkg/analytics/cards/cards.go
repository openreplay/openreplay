package cards

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"

	"github.com/jackc/pgx/v5"
)

type Cards interface {
	Create(projectID int, userID uint64, req *CardCreateRequest) (*CardGetResponse, error)
	Get(projectID int, cardID int64) (*CardGetResponse, error)
	GetWithSeries(projectID int, cardID int64) (*CardGetResponse, error)
	GetAllPaginated(projectID int, filters CardListFilter, sort CardListSort, limit, offset int) (*GetCardsResponsePaginated, error)
	Update(projectID int, cardID int64, userID uint64, req *CardUpdateRequest) (*CardGetResponse, error)
	Delete(projectID int, cardID int64, userID uint64) error
}

type cardsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
}

func New(log logger.Logger, conn pool.Pool) Cards {
	return &cardsImpl{log: log, pgconn: conn}
}

// scanCard collects exactly one card row. Columns are mapped to
// CardGetResponse fields by name via the db tags; the card_info JSON column
// decodes directly into the embedded CardInfo.
func (s *cardsImpl) scanCard(rows pgx.Rows, err error) (*CardGetResponse, error) {
	if err != nil {
		return nil, err
	}
	card, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByNameLax[CardGetResponse])
	if err != nil {
		return nil, err
	}
	return &card, nil
}

func (s *cardsImpl) createSeries(ctx context.Context, tx *pool.Tx, metricID int64, series []model.Series) ([]model.Series, error) {
	if len(series) == 0 {
		return nil, nil
	}
	placeholders := make([]string, len(series))
	args := pgx.NamedArgs{"metricId": metricID}
	for i, ser := range series {
		data, err := json.Marshal(ser.Filter)
		if err != nil {
			s.log.Error(ctx, "marshal series filter: %v", err)
			return nil, err
		}
		placeholders[i] = fmt.Sprintf("(@metricId,@name%d,@index%d,@filter%d)", i, i, i)
		args[fmt.Sprintf("name%d", i)] = ser.Name
		args[fmt.Sprintf("index%d", i)] = i
		args[fmt.Sprintf("filter%d", i)] = string(data)
	}
	query := fmt.Sprintf(
		`INSERT INTO public.metric_series (metric_id,name,index,filter) 
				VALUES %s RETURNING series_id,metric_id,name,index,filter`,
		strings.Join(placeholders, ","),
	)
	r, err := tx.TxQuery(query, args)
	if err != nil {
		s.log.Error(ctx, "insert series: %v", err)
		return nil, err
	}
	defer r.Close()
	var out []model.Series
	for r.Next() {
		var srs model.Series
		if err := r.Scan(&srs.SeriesID, &srs.MetricID, &srs.Name, &srs.Index, &srs.Filter); err != nil {
			s.log.Error(ctx, "scan series: %v", err)
			continue
		}
		out = append(out, srs)
	}
	return out, nil
}

func (s *cardsImpl) fetchSeries(metricID int64) ([]model.Series, error) {
	const q = `SELECT series_id,metric_id,name,index,filter 
				FROM public.metric_series 
				WHERE metric_id=@metricId 
				ORDER BY index`
	rows, err := s.pgconn.Query(q, pgx.NamedArgs{"metricId": metricID})
	if err != nil {
		return nil, err
	}
	// Columns are mapped to model.Series fields by name via the db tags; the
	// filter JSON column decodes directly into FilterGroup.
	return pgx.CollectRows(rows, pgx.RowToStructByNameLax[model.Series])
}

func (s *cardsImpl) Create(projectID int, userID uint64, req *CardCreateRequest) (*CardGetResponse, error) {
	if req.MetricValue == nil {
		req.MetricValue = []string{}
	}
	infoData, err := json.Marshal(CardInfo{
		Rows:        req.Rows,
		StepsBefore: req.StepsBefore,
		StepsAfter:  req.StepsAfter,
		StartPoint:  req.StartPoint,
		Excludes:    req.Excludes,
		Breakdowns:  req.Breakdowns,
	})
	if err != nil {
		return nil, fmt.Errorf("marshal card info: %w", err)
	}
	tx, err := s.pgconn.Begin()
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	ctx := context.Background()
	defer func() {
		if err != nil {
			tx.TxRollback()
		} else {
			tx.TxCommit()
		}
	}()
	const ins = `INSERT INTO public.metrics (project_id,user_id,name,metric_type,view_type,
		metric_of,metric_value,metric_format,is_public,card_info, thumbnail) 
	VALUES (@projectId,@userId,@name,@metricType,@viewType,@metricOf,@metricValue,@metricFormat,@isPublic,@cardInfo,@thumbnail)
	RETURNING metric_id,project_id,user_id,name,metric_type,view_type,
		metric_of,metric_value,metric_format,is_public,created_at,edited_at,card_info`
	card, err := s.scanCard(tx.TxQuery(ins, pgx.NamedArgs{
		"projectId":    projectID,
		"userId":       userID,
		"name":         req.Name,
		"metricType":   req.MetricType,
		"viewType":     req.ViewType,
		"metricOf":     req.MetricOf,
		"metricValue":  req.MetricValue,
		"metricFormat": req.MetricFormat,
		"isPublic":     req.IsPublic,
		"cardInfo":     infoData,
		"thumbnail":    req.Thumbnail,
	}))
	if err != nil {
		return nil, fmt.Errorf("create card: %w", err)
	}
	series, err := s.createSeries(ctx, tx, card.CardID, req.Series)
	if err != nil || len(series) != len(req.Series) {
		return nil, fmt.Errorf("create series: %w", err)
	}
	card.Series = series
	return card, nil
}

func (s *cardsImpl) Get(projectID int, cardID int64) (*CardGetResponse, error) {
	const q = `SELECT metric_id,project_id,user_id,name,metric_type,view_type,metric_of,metric_value,metric_format,is_public,created_at,edited_at,COALESCE(card_info,'{}') AS card_info FROM public.metrics WHERE metric_id=@cardId AND project_id=@projectId AND deleted_at IS NULL`
	return s.scanCard(s.pgconn.Query(q, pgx.NamedArgs{"cardId": cardID, "projectId": projectID}))
}

func (s *cardsImpl) GetWithSeries(projectID int, cardID int64) (*CardGetResponse, error) {
	card, err := s.Get(projectID, cardID)
	if err != nil {
		return nil, err
	}
	series, err := s.fetchSeries(card.CardID)
	if err != nil {
		return nil, err
	}
	card.Series = series
	return card, nil
}

func (s *cardsImpl) GetAllPaginated(projectID int, filters CardListFilter, sort CardListSort, limit, offset int) (*GetCardsResponsePaginated, error) {
	if err := ValidateStruct(filters); err != nil {
		return nil, fmt.Errorf("invalid filters: %w", err)
	}
	if err := ValidateStruct(sort); err != nil {
		return nil, fmt.Errorf("invalid sort: %w", err)
	}
	conds := []string{"m.project_id=@projectId"}
	params := pgx.NamedArgs{"projectId": projectID}
	if name := filters.GetNameFilter(); name != nil {
		conds = append(conds, "m.name ILIKE @nameFilter")
		params["nameFilter"] = buildNamePattern(*name)
	}
	if t := filters.GetMetricTypeFilter(); t != nil {
		if *t == "monitors" {
			conds = append(conds, "m.metric_type = ANY(@metricTypes)")
			params["metricTypes"] = []string{"table", "webVital"}

			conds = append(conds, "m.metric_of = ANY(@metricOfs)")
			params["metricOfs"] = []string{"jsException", "errors", "issues"}
		} else if *t == "web_analytics" {
			conds = append(conds, "m.metric_type=@metricType")
			params["metricType"] = "table"

			conds = append(conds, "m.metric_of != ALL(@metricOfs)")
			params["metricOfs"] = []string{"webVitalUrl", "jsException", "REQUEST"}
		} else {
			conds = append(conds, "m.metric_type=@metricType")
			params["metricType"] = *t
		}
	}
	joinClause := "JOIN public.users u ON m.user_id = u.user_id"
	if ids := filters.GetDashboardIDs(); len(ids) > 0 {
		joinClause += " LEFT JOIN public.dashboard_widgets dw ON m.metric_id=dw.metric_id"
		conds = append(conds, "dw.dashboard_id=ANY(@dashboardIds)")
		params["dashboardIds"] = ids
	}
	conds = append(conds, "m.deleted_at IS NULL")
	where := "WHERE " + strings.Join(conds, " AND ")
	order := fmt.Sprintf("ORDER BY %s %s", sort.GetSQLField(), sort.GetSQLOrder())
	params["limit"] = limit
	params["offset"] = offset

	query := buildListQuery(joinClause, where, order)
	rows, err := s.pgconn.Query(query, params)
	if err != nil {
		return nil, fmt.Errorf("get paginated: %w", err)
	}
	// Columns are mapped to struct fields by name via the db tags.
	scanned, err := pgx.CollectRows(rows, pgx.RowToStructByName[cardListRow])
	if err != nil {
		return nil, fmt.Errorf("scan paginated cards: %w", err)
	}
	cards := make([]CardListItem, 0, len(scanned))
	var total int
	for _, r := range scanned {
		cards = append(cards, r.CardListItem)
		total = r.TotalCount
	}

	// The window count is only present when at least one row matched; when
	// paging past the end, fall back to a plain COUNT so total stays correct.
	// NamedArgs only binds the placeholders present in the query, so the
	// unused limit/offset entries are simply ignored here.
	if len(cards) == 0 && offset > 0 {
		countQuery := fmt.Sprintf("SELECT COUNT(*) FROM public.metrics m %s %s", joinClause, where)
		if err := s.pgconn.QueryRow(countQuery, params).Scan(&total); err != nil {
			return nil, fmt.Errorf("count cards: %w", err)
		}
	}
	return &GetCardsResponsePaginated{Cards: cards, Total: total}, nil
}

func buildNamePattern(name string) string {
	return "%" + postgres.EscapeILIKE(name) + "%"
}

func buildListQuery(joinClause, where, order string) string {
	return fmt.Sprintf(
		`SELECT
			m.metric_id,
			m.project_id,
			m.user_id,
			u.email,
			u.name   AS user_name,
			m.name,
			m.metric_type,
			m.view_type,
			m.metric_of,
			m.metric_value,
			m.metric_format,
			m.is_public,
			m.created_at,
			m.edited_at,
			m.deleted_at,
			COUNT(*) OVER() AS total_count
		 FROM public.metrics m
		 %s
		 %s
		 %s
		 LIMIT @limit
		 OFFSET @offset`,
		joinClause, where, order,
	)
}

func (s *cardsImpl) Update(projectID int, cardID int64, userID uint64, req *CardUpdateRequest) (*CardGetResponse, error) {
	if req.MetricValue == nil {
		req.MetricValue = []string{}
	}
	infoData, err := json.Marshal(CardInfo{
		Rows:        req.Rows,
		StepsBefore: req.StepsBefore,
		StepsAfter:  req.StepsAfter,
		StartPoint:  req.StartPoint,
		Excludes:    req.Excludes,
		Breakdowns:  req.Breakdowns,
	})
	if err != nil {
		return nil, fmt.Errorf("marshal card info: %w", err)
	}
	tx, err := s.pgconn.Begin()
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	ctx := context.Background()
	defer func() {
		if err != nil {
			tx.TxRollback()
		} else {
			tx.TxCommit()
		}
	}()
	const upd = `UPDATE public.metrics 
				 SET name=@name,metric_type=@metricType,
				     view_type=@viewType,metric_of=@metricOf,
				     metric_value=@metricValue,metric_format=@metricFormat,
				     is_public=@isPublic,card_info=@cardInfo,
				     thumbnail=@thumbnail 
				 WHERE metric_id=@cardId AND project_id=@projectId AND deleted_at IS NULL 
				 RETURNING metric_id,project_id,user_id,name,metric_type,view_type,
				 	metric_of,metric_value,metric_format,is_public,created_at,edited_at,card_info`
	card, err := s.scanCard(tx.TxQuery(upd, pgx.NamedArgs{
		"name":         req.Name,
		"metricType":   req.MetricType,
		"viewType":     req.ViewType,
		"metricOf":     req.MetricOf,
		"metricValue":  req.MetricValue,
		"metricFormat": req.MetricFormat,
		"isPublic":     req.IsPublic,
		"cardInfo":     infoData,
		"thumbnail":    req.Thumbnail,
		"cardId":       cardID,
		"projectId":    projectID,
	}))
	if err != nil {
		return nil, fmt.Errorf("update card: %w", err)
	}
	// remove old series
	if err := s.pgconn.Exec("DELETE FROM public.metric_series WHERE metric_id=@cardId", pgx.NamedArgs{"cardId": card.CardID}); err != nil {
		return nil, fmt.Errorf("delete series: %w", err)
	}
	series, err := s.createSeries(ctx, tx, card.CardID, req.Series)
	if err != nil || len(series) != len(req.Series) {
		return nil, fmt.Errorf("create series: %w", err)
	}
	card.Series = series
	return card, nil
}

func (s *cardsImpl) Delete(projectID int, cardID int64, userID uint64) error {
	const del = `UPDATE public.metrics 
				 SET deleted_at = now() 
				 WHERE metric_id=@cardId AND project_id=@projectId AND deleted_at IS NULL`
	if err := s.pgconn.Exec(del, pgx.NamedArgs{"cardId": cardID, "projectId": projectID}); err != nil {
		return fmt.Errorf("delete card: %w", err)
	}
	return nil
}
