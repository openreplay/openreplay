package lexicon

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"openreplay/backend/pkg/analytics/lexicon/model"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Actions interface {
	Create(ctx context.Context, projectID uint32, userID uint64, req *model.CreateActionRequest) (*model.Action, error)
	Search(ctx context.Context, projectID uint32, userID uint64, req *model.SearchActionRequest) (*model.SearchActionsResponse, error)
	Update(ctx context.Context, projectID uint32, actionID string, req *model.UpdateActionRequest) (*model.Action, error)
	Delete(ctx context.Context, projectID uint32, actionID string) error
}

type actionsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
}

func NewActions(log logger.Logger, conn pool.Pool) Actions {
	return &actionsImpl{log: log, pgconn: conn}
}

func (a *actionsImpl) existsByName(ctx context.Context, projectID uint32, name string) (bool, error) {
	const query = `
		SELECT COUNT(*) FROM public.actions 
		WHERE project_id = $1 AND name = $2
	`
	var count int
	if err := a.pgconn.QueryRow(query, projectID, name).Scan(&count); err != nil {
		a.log.Error(ctx, "check action existence: %v", err)
		return false, fmt.Errorf("check action existence: %w", err)
	}
	return count > 0, nil
}

func (a *actionsImpl) Create(ctx context.Context, projectID uint32, userID uint64, req *model.CreateActionRequest) (*model.Action, error) {
	exists, err := a.existsByName(ctx, projectID, req.Name)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("action with name '%s' already exists for this project", req.Name)
	}

	filtersJSON, err := json.Marshal(req.Filters)
	if err != nil {
		return nil, fmt.Errorf("marshal filters: %w", err)
	}

	const insertQuery = `
		INSERT INTO public.actions (
			project_id, user_id, name, description, filters, is_public
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING action_id, created_at, updated_at
	`

	var actionID string
	var createdAt, updatedAt time.Time
	err = a.pgconn.QueryRow(
		insertQuery,
		projectID,
		userID,
		req.Name,
		req.Description,
		filtersJSON,
		req.IsPublic,
	).Scan(&actionID, &createdAt, &updatedAt)

	if err != nil {
		a.log.Error(ctx, "insert action: %v", err)
		return nil, fmt.Errorf("create action: %w", err)
	}

	return &model.Action{
		ActionID:    actionID,
		ProjectID:   uint(projectID),
		UserID:      uint(userID),
		Name:        req.Name,
		Description: req.Description,
		Filters:     req.Filters,
		IsPublic:    req.IsPublic,
		CreatedAt:   createdAt.UnixMilli(),
		UpdatedAt:   updatedAt.UnixMilli(),
	}, nil
}

func (a *actionsImpl) Update(ctx context.Context, projectID uint32, actionID string, req *model.UpdateActionRequest) (*model.Action, error) {
	// Build dynamic SET clause from non-zero fields
	setClauses := []string{}
	params := []interface{}{}
	idx := 1

	if req.Name != "" {
		// Check uniqueness only if name is being changed
		exists, err := a.existsByNameExcluding(ctx, projectID, req.Name, actionID)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, fmt.Errorf("action with name '%s' already exists for this project", req.Name)
		}
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", idx))
		params = append(params, req.Name)
		idx++
	}
	if req.Description != "" {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", idx))
		params = append(params, req.Description)
		idx++
	}
	if req.Filters != nil {
		filtersJSON, err := json.Marshal(req.Filters)
		if err != nil {
			return nil, fmt.Errorf("marshal filters: %w", err)
		}
		setClauses = append(setClauses, fmt.Sprintf("filters = $%d", idx))
		params = append(params, filtersJSON)
		idx++
	}
	if req.IsPublic != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_public = $%d", idx))
		params = append(params, *req.IsPublic)
		idx++
	}

	if len(setClauses) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	// Always update the updated_at timestamp
	setClauses = append(setClauses, "updated_at = NOW()")

	query := fmt.Sprintf(`
		UPDATE public.actions
		SET %s
		WHERE action_id = $%d AND project_id = $%d
		RETURNING action_id, project_id, user_id, name, description, filters, is_public, created_at, updated_at
	`, strings.Join(setClauses, ", "), idx, idx+1)
	params = append(params, actionID, projectID)

	var action model.Action
	var filtersJSON []byte
	var createdAt, updatedAt time.Time

	err := a.pgconn.QueryRow(query, params...).Scan(
		&action.ActionID,
		&action.ProjectID,
		&action.UserID,
		&action.Name,
		&action.Description,
		&filtersJSON,
		&action.IsPublic,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		a.log.Error(ctx, "update action %s: %v", actionID, err)
		return nil, fmt.Errorf("update action: %w", err)
	}

	if len(filtersJSON) > 0 {
		if err := json.Unmarshal(filtersJSON, &action.Filters); err != nil {
			a.log.Error(ctx, "unmarshal action filters: %v", err)
			return nil, fmt.Errorf("unmarshal action filters: %w", err)
		}
	}

	action.CreatedAt = createdAt.UnixMilli()
	action.UpdatedAt = updatedAt.UnixMilli()
	return &action, nil
}

func (a *actionsImpl) existsByNameExcluding(ctx context.Context, projectID uint32, name string, excludeActionID string) (bool, error) {
	const query = `
		SELECT COUNT(*) FROM public.actions
		WHERE project_id = $1 AND name = $2 AND action_id != $3
	`
	var count int
	if err := a.pgconn.QueryRow(query, projectID, name, excludeActionID).Scan(&count); err != nil {
		a.log.Error(ctx, "check action name uniqueness: %v", err)
		return false, fmt.Errorf("check action name uniqueness: %w", err)
	}
	return count > 0, nil
}

func (a *actionsImpl) Delete(ctx context.Context, projectID uint32, actionID string) error {
	const query = `
		DELETE FROM public.actions
		WHERE action_id = $1 AND project_id = $2
	`
	if err := a.pgconn.Exec(query, actionID, projectID); err != nil {
		a.log.Error(ctx, "delete action %s: %v", actionID, err)
		return fmt.Errorf("delete action: %w", err)
	}
	return nil
}

// sortColumnMap maps API sort field names to actual database column names.
var sortColumnMap = map[string]string{
	"name":      "name",
	"createdAt": "created_at",
	"updatedAt": "updated_at",
}

const (
	defaultSearchLimit = 50
	defaultSearchPage  = 1
)

func (a *actionsImpl) Search(ctx context.Context, projectID uint32, userID uint64, req *model.SearchActionRequest) (*model.SearchActionsResponse, error) {
	// Apply defaults
	limit := req.Limit
	if limit <= 0 {
		limit = defaultSearchLimit
	}
	page := req.Page
	if page <= 0 {
		page = defaultSearchPage
	}
	offset := (page - 1) * limit

	// Build dynamic WHERE clause
	conds := []string{"project_id = $1"}
	params := []interface{}{projectID}
	idx := 2

	// Visibility: show public actions + user's own private actions
	conds = append(conds, fmt.Sprintf("(is_public = true OR user_id = $%d)", idx))
	params = append(params, userID)
	idx++

	if req.Name != "" {
		conds = append(conds, fmt.Sprintf("name ILIKE $%d", idx))
		params = append(params, "%"+req.Name+"%")
		idx++
	}
	if req.UserID != nil {
		conds = append(conds, fmt.Sprintf("user_id = $%d", idx))
		params = append(params, *req.UserID)
		idx++
	}
	if req.IsPublic != nil {
		conds = append(conds, fmt.Sprintf("is_public = $%d", idx))
		params = append(params, *req.IsPublic)
		idx++
	}

	where := "WHERE " + strings.Join(conds, " AND ")

	// Build ORDER BY
	orderBy := "ORDER BY created_at DESC"
	if req.SortBy != "" {
		col, ok := sortColumnMap[req.SortBy]
		if !ok {
			col = "created_at"
		}
		dir := "DESC"
		if req.SortOrder == "asc" {
			dir = "ASC"
		}
		orderBy = fmt.Sprintf("ORDER BY %s %s", col, dir)
	}

	// Count query
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM public.actions %s`, where)
	var total int
	if err := a.pgconn.QueryRow(countQuery, params...).Scan(&total); err != nil {
		a.log.Error(ctx, "count actions: %v", err)
		return nil, fmt.Errorf("count actions: %w", err)
	}

	// Data query
	dataQuery := fmt.Sprintf(`
		SELECT action_id, project_id, user_id, name, description, filters, is_public, created_at, updated_at
		FROM public.actions
		%s %s
		LIMIT $%d OFFSET $%d
	`, where, orderBy, idx, idx+1)
	params = append(params, limit, offset)

	rows, err := a.pgconn.Query(dataQuery, params...)
	if err != nil {
		a.log.Error(ctx, "search actions: %v", err)
		return nil, fmt.Errorf("search actions: %w", err)
	}
	defer rows.Close()

	actions := make([]model.Action, 0)
	for rows.Next() {
		var action model.Action
		var filtersJSON []byte
		var createdAt, updatedAt time.Time

		if err := rows.Scan(
			&action.ActionID,
			&action.ProjectID,
			&action.UserID,
			&action.Name,
			&action.Description,
			&filtersJSON,
			&action.IsPublic,
			&createdAt,
			&updatedAt,
		); err != nil {
			a.log.Error(ctx, "scan action row: %v", err)
			return nil, fmt.Errorf("scan action: %w", err)
		}

		if len(filtersJSON) > 0 {
			if err := json.Unmarshal(filtersJSON, &action.Filters); err != nil {
				a.log.Error(ctx, "unmarshal action filters: %v", err)
				return nil, fmt.Errorf("unmarshal action filters: %w", err)
			}
		}

		action.CreatedAt = createdAt.UnixMilli()
		action.UpdatedAt = updatedAt.UnixMilli()
		actions = append(actions, action)
	}

	if err := rows.Err(); err != nil {
		a.log.Error(ctx, "iterate action rows: %v", err)
		return nil, fmt.Errorf("iterate actions: %w", err)
	}

	return &model.SearchActionsResponse{
		Actions: actions,
		Total:   total,
		Page:    page,
		Limit:   limit,
	}, nil
}
