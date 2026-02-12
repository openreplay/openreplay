package model

import "openreplay/backend/pkg/analytics/filters"

type Action struct {
	ActionID    string           `json:"actionId" db:"action_id"`
	ProjectID   uint64           `json:"projectId" db:"project_id" validate:"required"`
	UserID      uint64           `json:"userId" db:"user_id"`
	Name        string           `json:"name" db:"name" validate:"required,min=1,max=255"`
	Description string           `json:"description" db:"description" validate:"max=1024"`
	Filters     []filters.Filter `json:"filters" db:"filters" validate:"omitempty,dive"`
	IsPublic    bool             `json:"isPublic" db:"is_public"`
	CreatedAt   int64            `json:"createdAt" db:"created_at"`
	UpdatedAt   int64            `json:"updatedAt" db:"updated_at"`
}

type UpdateActionRequest struct {
	Name        *string           `json:"name" validate:"omitempty,min=1,max=255"`
	Description *string           `json:"description" validate:"omitempty,max=1024"`
	Filters     *[]filters.Filter `json:"filters" validate:"omitempty,dive"`
}

type CreateActionRequest struct {
	Name        string           `json:"name" validate:"required,min=1,max=255"`
	Description string           `json:"description" validate:"max=1024"`
	Filters     []filters.Filter `json:"filters" validate:"omitempty,dive"`
}

type SearchActionRequest struct {
	Name   string  `json:"name,omitempty"`
	UserID *uint64 `json:"userId,omitempty"`

	SortBy    string `json:"sortBy,omitempty" validate:"omitempty,oneof=name createdAt updatedAt"`
	SortOrder string `json:"sortOrder,omitempty" validate:"omitempty,oneof=asc desc"`

	Page  int `json:"page,omitempty" validate:"omitempty,min=1"`
	Limit int `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
}

type SearchActionsResponse struct {
	Actions []Action `json:"actions"`
	Total   int      `json:"total"`
	Page    int      `json:"page"`
	Limit   int      `json:"limit"`
}
