package cards

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"

	"github.com/lib/pq"
)

type Cards interface {
	Create(projectID int, userID uint64, req *CardCreateRequest) (*CardGetResponse, error)
	Get(projectID int, cardID int64) (*CardGetResponse, error)
	GetWithSeries(projectID int, cardID int64) (*CardGetResponse, error)
	GetAll(projectID int) (*GetCardsResponse, error)
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

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func (s *cardsImpl) scanCard(r rowScanner) (*CardGetResponse, error) {
	c := &CardGetResponse{}
	var rawInfo []byte
	err := r.Scan(
		&c.CardID,
		&c.ProjectID,
		&c.UserID,
		&c.Name,
		&c.MetricType,
		&c.ViewType,
		&c.MetricOf,
		&c.MetricValue,
		&c.MetricFormat,
		&c.IsPublic,
		&c.CreatedAt,
		&c.EditedAt,
		&rawInfo,
	)
	if err != nil {
		return nil, err
	}
	var info CardInfo
	if json.Unmarshal(rawInfo, &info) == nil {
		c.Rows = info.Rows
		c.StepsBefore = info.StepsBefore
		c.StepsAfter = info.StepsAfter
		c.StartPoint = info.StartPoint
		c.Excludes = info.Excludes
	}
	return c, nil
}

func (s *cardsImpl) createSeries(ctx context.Context, tx *pool.Tx, metricID int64, series []model.Series) ([]model.Series, error) {
	if len(series) == 0 {
		return nil, nil
	}
	placeholders := make([]string, len(series))
	args := make([]interface{}, 0, len(series)*4)
	for i, ser := range series {
		data, err := json.Marshal(ser.Filter)
		if err != nil {
			s.log.Error(ctx, "marshal series filter: %v", err)
			return nil, err
		}
		idx := i*4 + 1
		placeholders[i] = fmt.Sprintf("($%d,$%d,$%d,$%d)", idx, idx+1, idx+2, idx+3)
		args = append(args, metricID, ser.Name, i, string(data))
	}
	query := fmt.Sprintf(
		`INSERT INTO public.metric_series (metric_id,name,index,filter) VALUES %s RETURNING series_id,metric_id,name,index,filter`,
		strings.Join(placeholders, ","),
	)
	r, err := tx.TxQuery(query, args...)
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
	const q = `SELECT series_id,metric_id,name,index,filter FROM public.metric_series WHERE metric_id=$1 ORDER BY index`
	rows, err := s.pgconn.Query(q, metricID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []model.Series
	for rows.Next() {
		var srs model.Series
		if err := rows.Scan(&srs.SeriesID, &srs.MetricID, &srs.Name, &srs.Index, &srs.Filter); err != nil {
			s.log.Error(context.Background(), "scan series: %v", err)
			continue
		}
		list = append(list, srs)
	}
	return list, nil
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
	const ins = `INSERT INTO public.metrics (
		project_id,user_id,name,metric_type,view_type,
		metric_of,metric_value,metric_format,is_public,card_info, thumbnail
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	RETURNING metric_id,project_id,user_id,name,metric_type,view_type,metric_of,metric_value,metric_format,is_public,created_at,edited_at,card_info`
	row := tx.TxQueryRow(ins, projectID, userID, req.Name, req.MetricType, req.ViewType, req.MetricOf, req.MetricValue, req.MetricFormat, req.IsPublic, infoData, req.Thumbnail)
	card, err := s.scanCard(row)
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
	const q = `SELECT metric_id,project_id,user_id,name,metric_type,view_type,metric_of,metric_value,metric_format,is_public,created_at,edited_at,card_info FROM public.metrics WHERE metric_id=$1 AND project_id=$2 AND deleted_at IS NULL`
	return s.scanCard(s.pgconn.QueryRow(q, cardID, projectID))
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

func (s *cardsImpl) GetAll(projectID int) (*GetCardsResponse, error) {
	const q = `SELECT metric_id,project_id,user_id,name,metric_type,view_type,metric_of,metric_value,metric_format,is_public,created_at,edited_at FROM public.metrics WHERE project_id=$1 AND deleted_at IS NULL`
	rows, err := s.pgconn.Query(q, projectID)
	if err != nil {
		return nil, fmt.Errorf("get all cards: %w", err)
	}
	defer rows.Close()
	resp := &GetCardsResponse{}
	for rows.Next() {
		var c Card
		if err := rows.Scan(&c.CardID, &c.ProjectID, &c.UserID, &c.Name, &c.MetricType, &c.ViewType, &c.MetricOf, &c.MetricValue, &c.MetricFormat, &c.IsPublic, &c.CreatedAt, &c.EditedAt); err != nil {
			return nil, err
		}
		resp.Cards = append(resp.Cards, c)
	}
	return resp, nil
}

func (s *cardsImpl) GetAllPaginated(projectID int, filters CardListFilter, sort CardListSort, limit, offset int) (*GetCardsResponsePaginated, error) {
	if err := ValidateStruct(filters); err != nil {
		return nil, fmt.Errorf("invalid filters: %w", err)
	}
	if err := ValidateStruct(sort); err != nil {
		return nil, fmt.Errorf("invalid sort: %w", err)
	}
	conds := []string{fmt.Sprintf("m.project_id=$1")}
	params := []interface{}{projectID}
	idx := 2
	if name := filters.GetNameFilter(); name != nil {
		conds = append(conds, fmt.Sprintf("m.name ILIKE $%d", idx))
		params = append(params, "%"+*name+"%")
		idx++
	}
	if t := filters.GetMetricTypeFilter(); t != nil {
		if *t == "monitors" {
			conds = append(conds, fmt.Sprintf("m.metric_type = ANY($%d)", idx))
			params = append(params, pq.Array([]string{"table", "webVital"}))
			idx++

			conds = append(conds, fmt.Sprintf("m.metric_of = ANY($%d)", idx))
			params = append(params, pq.Array([]string{"jsException", "errors", "issues"}))
			idx++
		} else if *t == "web_analytics" {
			conds = append(conds, fmt.Sprintf("m.metric_type=$%d", idx))
			params = append(params, "table")
			idx++

			conds = append(conds, fmt.Sprintf("m.metric_of != ALL($%d)", idx))
			params = append(params, pq.Array([]string{"webVitalUrl", "jsException", "REQUEST"}))
			idx++
		} else {
			conds = append(conds, fmt.Sprintf("m.metric_type=$%d", idx))
			params = append(params, *t)
			idx++
		}
	}
	joinClause := "JOIN public.users u ON m.user_id = u.user_id"
	if ids := filters.GetDashboardIDs(); len(ids) > 0 {
		joinClause += " LEFT JOIN public.dashboard_widgets dw ON m.metric_id=dw.metric_id"
		conds = append(conds, fmt.Sprintf("dw.dashboard_id=ANY($%d)", idx))
		params = append(params, pq.Array(ids))
		idx++
	}
	conds = append(conds, "m.deleted_at IS NULL")
	where := "WHERE " + strings.Join(conds, " AND ")
	order := fmt.Sprintf("ORDER BY %s %s", sort.GetSQLField(), sort.GetSQLOrder())
	params = append(params, limit)
	limitIdx := idx
	idx++
	params = append(params, offset)
	offsetIdx := idx

	query := fmt.Sprintf(
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
			m.deleted_at
		 FROM public.metrics m
		 %s
		 %s
		 %s
		 LIMIT $%d
		 OFFSET $%d`,
		joinClause, where, order, limitIdx, offsetIdx,
	)
	rows, err := s.pgconn.Query(query, params...)
	if err != nil {
		return nil, fmt.Errorf("get paginated: %w", err)
	}
	defer rows.Close()

	var cards []Card
	for rows.Next() {
		var c Card
		if err := rows.Scan(
			&c.CardID,
			&c.ProjectID,
			&c.UserID,
			&c.OwnerEmail,
			&c.OwnerName,
			&c.Name,
			&c.MetricType,
			&c.ViewType,
			&c.MetricOf,
			&c.MetricValue,
			&c.MetricFormat,
			&c.IsPublic,
			&c.CreatedAt,
			&c.EditedAt,
			&c.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan paginated card: %w", err)
		}
		cards = append(cards, c)
	}

	countParams := params[:len(params)-2]
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM public.metrics m %s %s", joinClause, where)
	var total int
	if err := s.pgconn.QueryRow(countQuery, countParams...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count cards: %w", err)
	}
	return &GetCardsResponsePaginated{Cards: cards, Total: total}, nil
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
	const upd = `UPDATE public.metrics SET name=$1,metric_type=$2,view_type=$3,metric_of=$4,metric_value=$5,metric_format=$6,is_public=$7,card_info=$8,thumbnail=$9 WHERE metric_id=$10 AND project_id=$11 AND deleted_at IS NULL RETURNING metric_id,project_id,user_id,name,metric_type,view_type,metric_of,metric_value,metric_format,is_public,created_at,edited_at,card_info`
	row := tx.TxQueryRow(upd, req.Name, req.MetricType, req.ViewType, req.MetricOf, req.MetricValue, req.MetricFormat, req.IsPublic, infoData, req.Thumbnail, cardID, projectID)
	card, err := s.scanCard(row)
	if err != nil {
		return nil, fmt.Errorf("update card: %w", err)
	}
	// remove old series
	if err := s.pgconn.Exec("DELETE FROM public.metric_series WHERE metric_id=$1", card.CardID); err != nil {
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
	const del = `UPDATE public.metrics SET deleted_at = now() WHERE metric_id=$1 AND project_id=$2 AND deleted_at IS NULL`
	if err := s.pgconn.Exec(del, cardID, projectID); err != nil {
		return fmt.Errorf("delete card: %w", err)
	}
	return nil
}
