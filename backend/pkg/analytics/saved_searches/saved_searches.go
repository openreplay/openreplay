package saved_searches

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

const expiryMonths = 1

type SavedSearches interface {
	Save(projectID int, userID uint64, req *model.SavedSearchRequest) (*model.SavedSearchResponse, error)
	Get(projectID int, searchID string) (*model.SavedSearch, error)
	List(projectID int, userID uint64, limit, offset int) ([]*model.SavedSearch, int, error)
	Update(projectID int, userID uint64, searchID string, req *model.SavedSearchRequest) (*model.SavedSearchResponse, error)
	Delete(projectID int, userID uint64, searchID string) error
}

type savedSearchesImpl struct {
	log    logger.Logger
	pgconn pool.Pool
}

func New(log logger.Logger, conn pool.Pool) SavedSearches {
	return &savedSearchesImpl{log: log, pgconn: conn}
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
		s.log.Error(ctx, "get saved search: %v", err)
		return nil, fmt.Errorf("get saved search: %w", err)
	}

	if err := json.Unmarshal(searchDataJSON, &savedSearch.Data); err != nil {
		return nil, fmt.Errorf("unmarshal search data: %w", err)
	}

	return &savedSearch, nil
}

func (s *savedSearchesImpl) List(projectID int, userID uint64, limit, offset int) ([]*model.SavedSearch, int, error) {
	ctx := context.Background()

	const selectQuery = `
		SELECT 
			search_id, project_id, user_id, name, is_public, is_share, search_data, created_at, expires_at, deleted_at,
			COUNT(*) OVER() AS total_count
		FROM public.saved_searches
		WHERE project_id=$1 AND deleted_at IS NULL 
			AND is_share=false
			AND (user_id=$2 OR is_public=true)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`

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

	return searches, total, nil
}

func (s *savedSearchesImpl) Update(projectID int, userID uint64, searchID string, req *model.SavedSearchRequest) (*model.SavedSearchResponse, error) {
	ctx := context.Background()

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
		WHERE search_id=$4 AND project_id=$5 AND user_id=$6 AND deleted_at IS NULL
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
		userID,
	).Scan(&isShare, &createdAt)

	if err != nil {
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

	const deleteQuery = `
		UPDATE public.saved_searches 
		SET deleted_at = NOW()
		WHERE search_id=$1 AND project_id=$2 AND user_id=$3 AND deleted_at IS NULL
		RETURNING search_id
	`

	var deletedID string
	err := s.pgconn.QueryRow(deleteQuery, searchID, projectID, userID).Scan(&deletedID)
	if err != nil {
		s.log.Error(ctx, "delete saved search: %v", err)
		return fmt.Errorf("delete saved search: %w", err)
	}

	return nil
}
