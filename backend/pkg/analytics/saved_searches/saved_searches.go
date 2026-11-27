package saved_searches

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"

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

// SegmentsListItem is a lightweight projection used by the filters catalog.
type SegmentsListItem struct {
	SearchID string
	Name     string
	IsPublic bool
}

const (
	scopeSessions = "sessions"
	scopeLogs     = "logs"
)

// Store is the CRUD over public.saved_searches for one scope; D is the
// scope's search payload, kept in search_data.
type Store[D any] interface {
	Save(projectID int, userID uint64, req *model.SavedSearchRequestOf[D]) (*model.SavedSearchResponseOf[D], error)
	Get(projectID int, userID uint64, searchID string, withStats bool) (*model.SavedSearchOf[D], error)
	List(ctx context.Context, projectID int, userID uint64, limit, offset int, sort, order string, withStats bool) ([]*model.SavedSearchOf[D], int, error)
	// Update and Delete are allowed to the creator of the search and, when
	// isAdmin is set, to the admins / owner of the account.
	Update(projectID int, userID uint64, isAdmin bool, searchID string, req *model.SavedSearchRequestOf[D]) (*model.SavedSearchResponseOf[D], error)
	Delete(projectID int, userID uint64, isAdmin bool, searchID string) error
}

type SavedSearches interface {
	Store[model.SavedSearchData]
	ListForFilters(projectID, userID int) ([]SegmentsListItem, error)
}

// LogsViews are the saved searches of the logs scope. Their payload is the
// logs UI state, stored as an opaque JSON object.
type LogsViews = Store[json.RawMessage]

type storeImpl[D any] struct {
	log    logger.Logger
	pgconn pool.Pool
	scope  string
	// stats computes the sessions / users counts of a search; nil for scopes
	// that have none.
	stats func(ctx context.Context, projectID int, data *D) searchStats
}

type savedSearchesImpl struct {
	*storeImpl[model.SavedSearchData]
	search     search.Search
	statsCache cache.Cache
}

type searchStats struct {
	SessionsCount int64
	UsersCount    int64
	ComputedAt    time.Time
	Failed        bool
}

func New(log logger.Logger, conn pool.Pool, search search.Search) SavedSearches {
	s := &savedSearchesImpl{
		storeImpl:  &storeImpl[model.SavedSearchData]{log: log, pgconn: conn, scope: scopeSessions},
		search:     search,
		statsCache: cache.New(time.Minute*30, time.Hour),
	}
	s.stats = s.getSearchStats
	return s
}

func NewLogsViews(log logger.Logger, conn pool.Pool) LogsViews {
	return &storeImpl[json.RawMessage]{log: log, pgconn: conn, scope: scopeLogs}
}

func (s *storeImpl[D]) Save(projectID int, userID uint64, req *model.SavedSearchRequestOf[D]) (*model.SavedSearchResponseOf[D], error) {
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
		INSERT INTO public.saved_searches (project_id, user_id, name, is_public, is_share, search_data, expires_at, scope) 
		VALUES (@projectId, @userId, @name, @isPublic, @isShare, @searchData, @expiresAt, @scope)
		RETURNING search_id, created_at
	`

	var searchID string
	var createdAt time.Time
	err = s.pgconn.QueryRow(
		insertQuery,
		pgx.NamedArgs{
			"projectId":  projectID,
			"userId":     userID,
			"name":       req.Name,
			"isPublic":   isPublic,
			"isShare":    isShare,
			"searchData": searchDataJSON,
			"expiresAt":  expiresAt,
			"scope":      s.scope,
		},
	).Scan(&searchID, &createdAt)

	if err != nil {
		s.log.Error(ctx, "insert saved search: %v", err)
		return nil, fmt.Errorf("save search: %w", err)
	}

	return &model.SavedSearchResponseOf[D]{
		SearchID:  searchID,
		Name:      req.Name,
		IsPublic:  isPublic,
		IsShare:   isShare,
		Data:      req.Data,
		CreatedAt: createdAt,
	}, nil
}

func (s *storeImpl[D]) Get(projectID int, userID uint64, searchID string, withStats bool) (*model.SavedSearchOf[D], error) {
	ctx := context.Background()

	const selectQuery = `
		SELECT
			search_id, project_id, user_id, name, is_public, is_share, search_data, created_at, expires_at, deleted_at
		FROM public.saved_searches
		WHERE search_id=@searchId AND project_id=@projectId AND scope=@scope AND deleted_at IS NULL
			AND (expires_at IS NULL OR expires_at > NOW())
			AND (is_share OR is_public OR user_id=@userId)
	`

	var savedSearch model.SavedSearchOf[D]
	var searchDataJSON []byte

	err := s.pgconn.QueryRow(selectQuery, pgx.NamedArgs{"searchId": searchID, "projectId": projectID, "userId": userID, "scope": s.scope}).Scan(
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

	if withStats && s.stats != nil {
		stats := s.stats(ctx, projectID, &savedSearch.Data)
		savedSearch.SessionsCount = stats.SessionsCount
		savedSearch.UsersCount = stats.UsersCount
	}

	return &savedSearch, nil
}

var sortColumns = map[string]string{
	"name":      "ss.name",
	"createdAt": "ss.created_at",
	"userName":  "u.name",
}

func (s *storeImpl[D]) List(ctx context.Context, projectID int, userID uint64, limit, offset int, sort, order string, withStats bool) ([]*model.SavedSearchOf[D], int, error) {
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
			ss.search_data, ss.created_at,
			COUNT(*) OVER() AS total_count
		FROM public.saved_searches ss
		LEFT JOIN public.users u ON ss.user_id = u.user_id
		WHERE ss.project_id=@projectId AND ss.scope=@scope AND ss.deleted_at IS NULL
			AND ss.is_share=false
			AND (ss.user_id=@userId OR ss.is_public=true)
		ORDER BY %s %s NULLS LAST, ss.search_id %s
		LIMIT @limit OFFSET @offset
	`, column, direction, direction)

	rows, err := s.pgconn.Query(selectQuery, pgx.NamedArgs{
		"projectId": projectID,
		"scope":     s.scope,
		"userId":    userID,
		"limit":     limit,
		"offset":    offset,
	})
	if err != nil {
		s.log.Error(ctx, "list saved searches: %v", err)
		return nil, 0, fmt.Errorf("list saved searches: %w", err)
	}
	defer rows.Close()

	var searches []*model.SavedSearchOf[D]
	var total int

	for rows.Next() {
		var savedSearch model.SavedSearchOf[D]
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

	if !withStats || s.stats == nil {
		return searches, total, nil
	}

	statsCtx, cancel := context.WithTimeout(ctx, statsQueryTimeout)
	defer cancel()

	const statsConcurrency = 8
	sem := make(chan struct{}, statsConcurrency)
	var wg sync.WaitGroup
	var failed int64
	skipped := 0
	for i, ss := range searches {
		select {
		case sem <- struct{}{}:
		case <-statsCtx.Done():
		}
		if statsCtx.Err() != nil {
			skipped = len(searches) - i
			break
		}
		wg.Add(1)
		go func(ss *model.SavedSearchOf[D]) {
			defer wg.Done()
			defer func() { <-sem }()
			defer func() {
				if r := recover(); r != nil {
					s.log.Error(ctx, "saved search stats panic: %v", r)
				}
			}()
			stats := s.stats(statsCtx, projectID, &ss.Data)
			ss.SessionsCount = stats.SessionsCount
			ss.UsersCount = stats.UsersCount
			if stats.Failed {
				atomic.AddInt64(&failed, 1)
			}
		}(ss)
	}
	wg.Wait()

	if skipped > 0 || failed > 0 {
		s.log.Warn(ctx, "saved search stats incomplete: %d undispatched, %d failed of %d", skipped, failed, len(searches))
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

	now := time.Now().Truncate(5 * time.Minute)
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
		return searchStats{Failed: true}
	}

	stats := searchStats{
		SessionsCount: sessionsCount,
		UsersCount:    usersCount,
		ComputedAt:    time.Now(),
	}
	s.statsCache.Set(cacheKey, stats)
	return stats
}

func (s *storeImpl[D]) Update(projectID int, userID uint64, isAdmin bool, searchID string, req *model.SavedSearchRequestOf[D]) (*model.SavedSearchResponseOf[D], error) {
	ctx := context.Background()

	if err := s.checkCanModify(ctx, projectID, userID, isAdmin, searchID, "update saved search"); err != nil {
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
		SET name=@name, is_public=@isPublic, search_data=@searchData
		WHERE search_id=@searchId AND project_id=@projectId AND scope=@scope AND deleted_at IS NULL
		RETURNING is_share, created_at
	`

	var isShare bool
	var createdAt time.Time
	err = s.pgconn.QueryRow(
		updateQuery,
		pgx.NamedArgs{
			"name":       req.Name,
			"isPublic":   isPublic,
			"searchData": searchDataJSON,
			"searchId":   searchID,
			"projectId":  projectID,
			"scope":      s.scope,
		},
	).Scan(&isShare, &createdAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSavedSearchNotFound
		}
		s.log.Error(ctx, "update saved search: %v", err)
		return nil, fmt.Errorf("update saved search: %w", err)
	}

	return &model.SavedSearchResponseOf[D]{
		SearchID:  searchID,
		Name:      req.Name,
		IsPublic:  isPublic,
		IsShare:   isShare,
		Data:      req.Data,
		CreatedAt: createdAt,
	}, nil
}

func (s *storeImpl[D]) Delete(projectID int, userID uint64, isAdmin bool, searchID string) error {
	ctx := context.Background()

	if err := s.checkCanModify(ctx, projectID, userID, isAdmin, searchID, "delete saved search"); err != nil {
		return err
	}

	const deleteQuery = `
		UPDATE public.saved_searches
		SET deleted_at = NOW()
		WHERE search_id=@searchId AND project_id=@projectId AND scope=@scope AND deleted_at IS NULL
		RETURNING search_id
	`

	var deletedID string
	err := s.pgconn.QueryRow(deleteQuery, pgx.NamedArgs{"searchId": searchID, "projectId": projectID, "scope": s.scope}).Scan(&deletedID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSavedSearchNotFound
		}
		s.log.Error(ctx, "delete saved search: %v", err)
		return fmt.Errorf("delete saved search: %w", err)
	}

	return nil
}

func (s *savedSearchesImpl) ListForFilters(projectID, userID int) ([]SegmentsListItem, error) {
	const q = `
        SELECT search_id, name, is_public
        FROM public.saved_searches
        WHERE project_id = @projectId
          AND deleted_at IS NULL
          AND is_share = FALSE
          AND (user_id = @userId OR is_public)
          AND scope='sessions'
        ORDER BY name`
	rows, err := s.pgconn.Query(q, pgx.NamedArgs{"projectId": projectID, "userId": userID})
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SegmentsListItem
	for rows.Next() {
		var item SegmentsListItem
		if err := rows.Scan(&item.SearchID, &item.Name, &item.IsPublic); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

// checkCanModify reports whether the search exists and the user may update or
// delete it: its creator, or an admin / owner of the account.
func (s *storeImpl[D]) checkCanModify(ctx context.Context, projectID int, userID uint64, isAdmin bool, searchID, op string) error {
	const q = `
		SELECT user_id FROM public.saved_searches
		WHERE search_id=@searchId AND project_id=@projectId AND scope=@scope AND deleted_at IS NULL
	`
	var ownerID uint64
	err := s.pgconn.QueryRow(q, pgx.NamedArgs{"searchId": searchID, "projectId": projectID, "scope": s.scope}).Scan(&ownerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSavedSearchNotFound
		}
		s.log.Error(ctx, "%s (ownership check): %v", op, err)
		return fmt.Errorf("%s: %w", op, err)
	}
	if ownerID != userID && !isAdmin {
		return ErrSavedSearchForbidden
	}
	return nil
}
