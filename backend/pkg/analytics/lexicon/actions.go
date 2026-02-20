package lexicon

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v4"

	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/analytics/lexicon/model"
	analyticsModel "openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

var (
	ErrActionNotFound   = errors.New("action not found")
	ErrActionDuplicate  = errors.New("action with this name already exists for this project")
	ErrNoFieldsToUpdate = errors.New("no fields to update")
)

type Actions interface {
	Get(ctx context.Context, projectID uint32, actionID string) (*model.Action, error)
	Create(ctx context.Context, projectID uint32, userID uint64, req *model.CreateActionRequest) (*model.Action, error)
	Search(ctx context.Context, projectID uint32, req *model.SearchActionRequest) (*model.SearchActionsResponse, error)
	Update(ctx context.Context, projectID uint32, actionID string, req *model.UpdateActionRequest) (*model.Action, error)
	Delete(ctx context.Context, projectID uint32, actionID string) error
}

type actionsImpl struct {
	log    logger.Logger
	pgconn pool.Pool
}

func NewActions(log logger.Logger, conn pool.Pool) Actions {
	return &actionsImpl{
		log:    log,
		pgconn: conn,
	}
}

func (a *actionsImpl) Get(ctx context.Context, projectID uint32, actionID string) (*model.Action, error) {
	const query = `
		SELECT action_id, project_id, user_id, name, description, filters, is_public, created_at, updated_at
		FROM public.actions
		WHERE action_id = $1 AND project_id = $2
	`

	var action model.Action
	var filtersJSON []byte
	var createdAt, updatedAt time.Time

	err := a.pgconn.QueryRow(query, actionID, projectID).Scan(
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
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrActionNotFound
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.InvalidTextRepresentation {
			return nil, ErrActionNotFound
		}
		a.log.Error(ctx, "get action %s: %v", actionID, err)
		return nil, fmt.Errorf("get action: %w", err)
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

func (a *actionsImpl) Create(ctx context.Context, projectID uint32, userID uint64, req *model.CreateActionRequest) (*model.Action, error) {
	filtersJSON, err := json.Marshal(req.Filters)
	if err != nil {
		return nil, fmt.Errorf("marshal filters: %w", err)
	}

	const insertQuery = `
		INSERT INTO public.actions (
			project_id, user_id, name, description, filters, is_public
		) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (project_id, name) DO NOTHING
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
		true,
	).Scan(&actionID, &createdAt, &updatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrActionDuplicate
		}
		a.log.Error(ctx, "insert action: %v", err)
		return nil, fmt.Errorf("create action: %w", err)
	}

	return &model.Action{
		ActionID:    actionID,
		ProjectID:   uint64(projectID),
		UserID:      &userID,
		Name:        req.Name,
		Description: req.Description,
		Filters:     req.Filters,
		IsPublic:    true,
		CreatedAt:   createdAt.UnixMilli(),
		UpdatedAt:   updatedAt.UnixMilli(),
	}, nil
}

func (a *actionsImpl) Update(ctx context.Context, projectID uint32, actionID string, req *model.UpdateActionRequest) (*model.Action, error) {
	setClauses := []string{}
	params := []interface{}{}
	idx := 1

	if req.Name != nil {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", idx))
		params = append(params, *req.Name)
		idx++
	}
	if req.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", idx))
		params = append(params, *req.Description)
		idx++
	}
	if req.Filters != nil {
		filtersJSON, err := json.Marshal(*req.Filters)
		if err != nil {
			return nil, fmt.Errorf("marshal filters: %w", err)
		}
		setClauses = append(setClauses, fmt.Sprintf("filters = $%d", idx))
		params = append(params, filtersJSON)
		idx++
	}

	if len(setClauses) == 0 {
		return nil, ErrNoFieldsToUpdate
	}

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
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrActionNotFound
		}
		if strings.Contains(err.Error(), "actions_project_id_name_key") || strings.Contains(err.Error(), "unique constraint") {
			return nil, ErrActionDuplicate
		}
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

func (a *actionsImpl) Delete(ctx context.Context, projectID uint32, actionID string) error {
	const query = `
		DELETE FROM public.actions
		WHERE action_id = $1 AND project_id = $2
		RETURNING action_id
	`
	var deletedID string
	err := a.pgconn.QueryRow(query, actionID, projectID).Scan(&deletedID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrActionNotFound
		}
		a.log.Error(ctx, "delete action %s: %v", actionID, err)
		return fmt.Errorf("delete action: %w", err)
	}

	return nil
}

const maxActionResolveDepth = 3

func hasActionFilters(inputFilters []analyticsModel.Filter) bool {
	for i := range inputFilters {
		if inputFilters[i].ActionId != "" {
			return true
		}
	}
	return false
}

func hasEventActionFilters(inputFilters []filters.Filter) bool {
	for i := range inputFilters {
		if inputFilters[i].ActionId != "" {
			return true
		}
	}
	return false
}

func ResolveActionFilters(ctx context.Context, actions Actions, projID uint32, inputFilters []filters.Filter) ([]filters.Filter, error) {
	if !hasEventActionFilters(inputFilters) {
		return inputFilters, nil
	}
	return resolveActionFilters(ctx, actions, projID, inputFilters, 0, make(map[string]bool))
}

func resolveActionFilters(ctx context.Context, actions Actions, projID uint32, inputFilters []filters.Filter, depth int, seen map[string]bool) ([]filters.Filter, error) {
	if depth > maxActionResolveDepth {
		return nil, nil
	}
	resolved := make([]filters.Filter, 0, len(inputFilters))
	for _, f := range inputFilters {
		if f.ActionId == "" {
			resolved = append(resolved, f)
			continue
		}
		if seen[f.ActionId] {
			continue
		}
		seen[f.ActionId] = true
		action, err := actions.Get(ctx, projID, f.ActionId)
		if err != nil {
			delete(seen, f.ActionId)
			if errors.Is(err, ErrActionNotFound) {
				return nil, fmt.Errorf("action %s not found", f.ActionId)
			}
			return nil, fmt.Errorf("failed to resolve action %s: %w", f.ActionId, err)
		}
		nestedResolved, err := resolveActionFilters(ctx, actions, projID, action.Filters, depth+1, seen)
		if err != nil {
			return nil, err
		}
		resolved = append(resolved, nestedResolved...)
		delete(seen, f.ActionId)
	}
	return resolved, nil
}

func convertFilterToModel(f filters.Filter) analyticsModel.Filter {
	nested := make([]analyticsModel.Filter, 0, len(f.Filters))
	for _, nf := range f.Filters {
		nested = append(nested, convertFilterToModel(nf))
	}
	return analyticsModel.Filter{
		Name:          f.Name,
		Operator:      string(f.Operator),
		PropertyOrder: string(f.PropertyOrder),
		Value:         f.Value,
		IsEvent:       f.IsEvent,
		DataType:      string(f.DataType),
		AutoCaptured:  f.AutoCaptured,
		Filters:       nested,
		ActionId:      f.ActionId,
	}
}

func ResolveModelActionFilters(ctx context.Context, actions Actions, projID uint32, inputFilters []analyticsModel.Filter) ([]analyticsModel.Filter, error) {
	if !hasActionFilters(inputFilters) {
		return inputFilters, nil
	}
	return resolveModelActionFilters(ctx, actions, projID, inputFilters, 0, make(map[string]bool))
}

func resolveModelActionFilters(ctx context.Context, actions Actions, projID uint32, inputFilters []analyticsModel.Filter, depth int, seen map[string]bool) ([]analyticsModel.Filter, error) {
	if depth > maxActionResolveDepth {
		return nil, nil
	}
	resolved := make([]analyticsModel.Filter, 0, len(inputFilters))
	for _, f := range inputFilters {
		if f.ActionId == "" {
			resolved = append(resolved, f)
			continue
		}
		if seen[f.ActionId] {
			continue
		}
		seen[f.ActionId] = true
		action, err := actions.Get(ctx, projID, f.ActionId)
		if err != nil {
			delete(seen, f.ActionId)
			if errors.Is(err, ErrActionNotFound) {
				return nil, fmt.Errorf("action %s not found", f.ActionId)
			}
			return nil, fmt.Errorf("failed to resolve action %s: %w", f.ActionId, err)
		}
		converted := make([]analyticsModel.Filter, 0, len(action.Filters))
		for _, af := range action.Filters {
			converted = append(converted, convertFilterToModel(af))
		}
		nestedResolved, err := resolveModelActionFilters(ctx, actions, projID, converted, depth+1, seen)
		if err != nil {
			return nil, err
		}
		resolved = append(resolved, nestedResolved...)
		delete(seen, f.ActionId)
	}
	return resolved, nil
}

func ResolveSessionSearchFilters(ctx context.Context, actions Actions, projID uint32, req *analyticsModel.SessionsSearchRequest) error {
	resolved, err := ResolveModelActionFilters(ctx, actions, projID, req.Filters)
	if err != nil {
		return err
	}
	req.Filters = resolved
	for i, series := range req.Series {
		resolved, err := ResolveModelActionFilters(ctx, actions, projID, series.Filter.Filters)
		if err != nil {
			return err
		}
		req.Series[i].Filter.Filters = resolved
	}
	return nil
}

func ResolveMetricPayloadFilters(ctx context.Context, actions Actions, projID uint32, req *analyticsModel.MetricPayload) error {
	for i, series := range req.Series {
		resolved, err := ResolveModelActionFilters(ctx, actions, projID, series.Filter.Filters)
		if err != nil {
			return err
		}
		req.Series[i].Filter.Filters = resolved
	}
	resolved, err := ResolveModelActionFilters(ctx, actions, projID, req.StartPoint)
	if err != nil {
		return err
	}
	req.StartPoint = resolved
	resolved, err = ResolveModelActionFilters(ctx, actions, projID, req.Exclude)
	if err != nil {
		return err
	}
	req.Exclude = resolved
	return nil
}

var sortColumnMap = map[string]string{
	"name":      "name",
	"createdAt": "created_at",
	"updatedAt": "updated_at",
}

const (
	defaultSearchLimit = 50
	defaultSearchPage  = 1
)

func (a *actionsImpl) Search(ctx context.Context, projectID uint32, req *model.SearchActionRequest) (*model.SearchActionsResponse, error) {
	limit := req.Limit
	if limit <= 0 {
		limit = defaultSearchLimit
	}
	page := req.Page
	if page <= 0 {
		page = defaultSearchPage
	}
	offset := (page - 1) * limit

	conds := []string{"project_id = $1"}
	params := []interface{}{projectID}
	idx := 2

	if req.Name != "" {
		conds = append(conds, fmt.Sprintf("name ILIKE $%d ESCAPE '\\'", idx))
		params = append(params, "%"+filters.ILIKEReplacer.Replace(req.Name)+"%")
		idx++
	}
	if req.UserID != nil {
		conds = append(conds, fmt.Sprintf("user_id = $%d", idx))
		params = append(params, *req.UserID)
		idx++
	}

	where := "WHERE " + strings.Join(conds, " AND ")

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

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM public.actions %s`, where)
	var total int
	if err := a.pgconn.QueryRow(countQuery, params...).Scan(&total); err != nil {
		a.log.Error(ctx, "count actions: %v", err)
		return nil, fmt.Errorf("count actions: %w", err)
	}

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
