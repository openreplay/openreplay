package saved_searches

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/analytics/search"
	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

var (
	ErrSavedSearchNotFound  = errors.New("saved search not found")
	ErrSavedSearchForbidden = errors.New("not allowed to modify this saved search")
)

const (
	expiryMonths         = 1
	statsWindowDays      = 7
	statsFreshnessWindow = 30 * time.Minute
	statsQueryTimeout    = 10 * time.Second
)

type SavedSearches interface {
	Save(projectID int, userID uint64, req *model.SavedSearchRequest) (*model.SavedSearchResponse, error)
	Get(projectID int, searchID string) (*model.SavedSearch, error)
	List(ctx context.Context, projectID int, userID uint64, limit, offset int, sort, order string) ([]*model.SavedSearch, int, error)
	Update(projectID int, userID uint64, searchID string, req *model.SavedSearchRequest) (*model.SavedSearchResponse, error)
	Delete(projectID int, userID uint64, searchID string) error
}

type savedSearchesImpl struct {
	log        logger.Logger
	pgconn     pool.Pool
	search     search.Search
	statsCache cache.Cache
}

type searchStats struct {
	SessionsCount int64
	UsersCount    int64
	ComputedAt    time.Time
}

func New(log logger.Logger, conn pool.Pool, search search.Search) SavedSearches {
	return &savedSearchesImpl{
		log:        log,
		pgconn:     conn,
		search:     search,
		statsCache: cache.New(time.Minute*30, time.Hour),
	}
}

func (s *savedSearchesImpl) Save(projectID int, userID uint64, req *model.SavedSearchRequest) (*model.SavedSearchResponse, error) {
	ctx := context.Background()

	isShare := false
	if req.IsShare != nil {
		isShare = *req.IsShare
	}

	if !isShare && (req.Name == nil || *req.Name == "") {
		return nil, fmt.Errorf("name is required for saved searches")
	}

	searchDataJSON, err := json.Marshal(req.Data)
	if err != nil {
		return nil, fmt.Errorf("marshal search data: %w", err)
	}

	isPublic := false
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}

	var expiresAt *time.Time
	if isShare {
		exp := time.Now().AddDate(0, expiryMonths, 0)
		expiresAt = &exp
	}

	const insertQuery = `
		INSERT INTO public.saved_searches (
			project_id, user_id, name, is_public, is_share, search_data, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING search_id, created_at
	`

	var searchID string
	var createdAt time.Time
	err = s.pgconn.QueryRow(
		insertQuery,
		projectID,
		userID,
		req.Name,
		isPublic,
		isShare,
		searchDataJSON,
		expiresAt,
	).Scan(&searchID, &createdAt)

	if err != nil {
		s.log.Error(ctx, "insert saved search: %v", err)
		return nil, fmt.Errorf("save search: %w", err)
	}

	return &model.SavedSearchResponse{
		SearchID:  searchID,
		Name:      req.Name,
		IsPublic:  isPublic,
		IsShare:   isShare,
		Data:      req.Data,
		CreatedAt: createdAt,
	}, nil
}

func (s *savedSearchesImpl) Get(projectID int, searchID string) (*model.SavedSearch, error) {
	ctx := context.Background()

	const selectQuery = `
		SELECT 
			search_id, project_id, user_id, name, is_public, is_share, search_data, created_at, expires_at, deleted_at
		FROM public.saved_searches
		WHERE search_id=$1 AND project_id=$2 AND deleted_at IS NULL
			AND (expires_at IS NULL OR expires_at > NOW())
	`

	var savedSearch model.SavedSearch
	var searchDataJSON []byte

	err := s.pgconn.QueryRow(selectQuery, searchID, projectID).Scan(
		&savedSearch.SearchID,
		&savedSearch.ProjectID,
		&savedSearch.UserID,
		&savedSearch.Name,
		&savedSearch.IsPublic,
		&savedSearch.IsShare,
		&searchDataJSON,
		&savedSearch.CreatedAt,
		&savedSearch.ExpiresAt,
		&savedSearch.DeletedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSavedSearchNotFound
		}
		s.log.Error(ctx, "get saved search: %v", err)
		return nil, fmt.Errorf("get saved search: %w", err)
	}

	if err := json.Unmarshal(searchDataJSON, &savedSearch.Data); err != nil {
		return nil, fmt.Errorf("unmarshal search data: %w", err)
	}

	stats := s.getSearchStats(ctx, projectID, &savedSearch.Data)
	savedSearch.SessionsCount = stats.SessionsCount
	savedSearch.UsersCount = stats.UsersCount

	return &savedSearch, nil
}

var sortColumns = map[string]string{
	"name":      "ss.name",
	"createdAt": "ss.created_at",
	"userName":  "u.name",
}

func (s *savedSearchesImpl) List(ctx context.Context, projectID int, userID uint64, limit, offset int, sort, order string) ([]*model.SavedSearch, int, error) {
	column, ok := sortColumns[sort]
	if !ok {
		column = sortColumns["createdAt"]
	}
	direction := "DESC"
	if order == "asc" {
		direction = "ASC"
	}

	selectQuery := fmt.Sprintf(`
		SELECT
			ss.search_id, ss.project_id, ss.user_id, u.name AS user_name, ss.name, ss.is_public, ss.is_share,
			ss.search_data, ss.created_at, ss.expires_at, ss.deleted_at,
			COUNT(*) OVER() AS total_count
		FROM public.saved_searches ss
		LEFT JOIN public.users u ON ss.user_id = u.user_id
		WHERE ss.project_id=$1 AND ss.deleted_at IS NULL
			AND ss.is_share=false
			AND (ss.user_id=$2 OR ss.is_public=true)
		ORDER BY %s %s NULLS LAST, ss.search_id %s
		LIMIT $3 OFFSET $4
	`, column, direction, direction)

	rows, err := s.pgconn.Query(selectQuery, projectID, userID, limit, offset)
	if err != nil {
		s.log.Error(ctx, "list saved searches: %v", err)
		return nil, 0, fmt.Errorf("list saved searches: %w", err)
	}
	defer rows.Close()

	var searches []*model.SavedSearch
	var total int

	for rows.Next() {
		var savedSearch model.SavedSearch
		var searchDataJSON []byte

		err := rows.Scan(
			&savedSearch.SearchID,
			&savedSearch.ProjectID,
			&savedSearch.UserID,
			&savedSearch.UserName,
			&savedSearch.Name,
			&savedSearch.IsPublic,
			&savedSearch.IsShare,
			&searchDataJSON,
			&savedSearch.CreatedAt,
			&savedSearch.ExpiresAt,
			&savedSearch.DeletedAt,
			&total,
		)

		if err != nil {
			s.log.Error(ctx, "scan saved search: %v", err)
			return nil, 0, fmt.Errorf("scan saved search: %w", err)
		}

		if err := json.Unmarshal(searchDataJSON, &savedSearch.Data); err != nil {
			return nil, 0, fmt.Errorf("unmarshal search data: %w", err)
		}

		searches = append(searches, &savedSearch)
	}

	if err := rows.Err(); err != nil {
		s.log.Error(ctx, "rows error: %v", err)
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	for _, ss := range searches {
		if ctx.Err() != nil {
			break
		}
		stats := s.getSearchStats(ctx, projectID, &ss.Data)
		ss.SessionsCount = stats.SessionsCount
		ss.UsersCount = stats.UsersCount
	}

	return searches, total, nil
}

func (s *savedSearchesImpl) getSearchStats(ctx context.Context, projectID int, data *model.SavedSearchData) searchStats {
	if s.search == nil {
		return searchStats{}
	}

	filtersJSON, err := json.Marshal(data.Filters)
	if err != nil {
		return searchStats{}
	}
	cacheKey := fmt.Sprintf("saved_search_stats:%d:%s:%s", projectID, data.EventsOrder, filtersJSON)

	if cached, ok := s.statsCache.GetAndRefresh(cacheKey); ok {
		if v, ok := cached.(searchStats); ok && time.Since(v.ComputedAt) < statsFreshnessWindow {
			return v
		}
	}

	now := time.Now()
	req := &model.SessionsSearchRequest{
		Filters:     append([]model.Filter(nil), data.Filters...),
		EventsOrder: data.EventsOrder,
		StartDate:   now.AddDate(0, 0, -statsWindowDays).UnixMilli(),
		EndDate:     now.UnixMilli(),
	}

	qctx, cancel := context.WithTimeout(ctx, statsQueryTimeout)
	defer cancel()

	sessionsCount, usersCount, err := s.search.GetCounts(qctx, projectID, req)
	if err != nil {
		s.log.Warn(ctx, "saved search counts: %.200s", err)
		return searchStats{}
	}

	stats := searchStats{
		SessionsCount: sessionsCount,
		UsersCount:    usersCount,
		ComputedAt:    time.Now(),
	}
	s.statsCache.Set(cacheKey, stats)
	return stats
}

func (s *savedSearchesImpl) Update(projectID int, userID uint64, searchID string, req *model.SavedSearchRequest) (*model.SavedSearchResponse, error) {
	ctx := context.Background()

	if err := s.checkOwnership(ctx, projectID, userID, searchID, "update saved search"); err != nil {
		return nil, err
	}

	searchDataJSON, err := json.Marshal(req.Data)
	if err != nil {
		return nil, fmt.Errorf("marshal search data: %w", err)
	}

	isPublic := false
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}

	const updateQuery = `
		UPDATE public.saved_searches
		SET name=$1, is_public=$2, search_data=$3
		WHERE search_id=$4 AND project_id=$5 AND deleted_at IS NULL
		RETURNING is_share, created_at
	`

	var isShare bool
	var createdAt time.Time
	err = s.pgconn.QueryRow(
		updateQuery,
		req.Name,
		isPublic,
		searchDataJSON,
		searchID,
		projectID,
	).Scan(&isShare, &createdAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSavedSearchNotFound
		}
		s.log.Error(ctx, "update saved search: %v", err)
		return nil, fmt.Errorf("update saved search: %w", err)
	}

	return &model.SavedSearchResponse{
		SearchID:  searchID,
		Name:      req.Name,
		IsPublic:  isPublic,
		IsShare:   isShare,
		Data:      req.Data,
		CreatedAt: createdAt,
	}, nil
}

func (s *savedSearchesImpl) Delete(projectID int, userID uint64, searchID string) error {
	ctx := context.Background()

	if err := s.checkOwnership(ctx, projectID, userID, searchID, "delete saved search"); err != nil {
		return err
	}

	const deleteQuery = `
		UPDATE public.saved_searches
		SET deleted_at = NOW()
		WHERE search_id=$1 AND project_id=$2 AND deleted_at IS NULL
		RETURNING search_id
	`

	var deletedID string
	err := s.pgconn.QueryRow(deleteQuery, searchID, projectID).Scan(&deletedID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSavedSearchNotFound
		}
		s.log.Error(ctx, "delete saved search: %v", err)
		return fmt.Errorf("delete saved search: %w", err)
	}

	return nil
}

func (s *savedSearchesImpl) checkOwnership(ctx context.Context, projectID int, userID uint64, searchID, op string) error {
	const q = `
		SELECT user_id FROM public.saved_searches
		WHERE search_id=$1 AND project_id=$2 AND deleted_at IS NULL
	`
	var ownerID uint64
	err := s.pgconn.QueryRow(q, searchID, projectID).Scan(&ownerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSavedSearchNotFound
		}
		s.log.Error(ctx, "%s (ownership check): %v", op, err)
		return fmt.Errorf("%s: %w", op, err)
	}
	if ownerID != userID {
		return ErrSavedSearchForbidden
	}
	return nil
}
