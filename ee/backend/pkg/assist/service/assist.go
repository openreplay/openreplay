package service

import (
	"fmt"
	"strconv"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/sessionmanager"
)

type Query struct {
	Key   string
	Value string
}

type Filter struct {
	Value    []string `json:"values"`
	Operator string   `json:"operator"` // is|contains
}

type Pagination struct {
	Limit int `json:"limit"`
	Page  int `json:"page"`
}

type Sort struct {
	Key   string `json:"key"`   // useless
	Order string `json:"order"` // [ASC|DESC]
}

type Request struct {
	Filters    map[string]Filter `json:"filter"`
	Pagination Pagination        `json:"pagination"`
	Sort       Sort              `json:"sort"`
}

type assistImpl struct {
	log      logger.Logger
	pgconn   pool.Pool
	projects projects.Projects
	sessions sessionmanager.SessionManager
}

type Assist interface {
	Autocomplete(projectKey string, query *Query) (interface{}, error)
	IsLive(projectKey, sessionID string, filters *Request) (bool, error)
	GetAll(projectKey string, filters *Request) (interface{}, error)
	GetByID(projectKey, sessionID string, filters *Request) (interface{}, error)
}

func NewAssist(log logger.Logger, pgconn pool.Pool, projects projects.Projects, sessions sessionmanager.SessionManager) Assist {
	return &assistImpl{
		log:      log,
		pgconn:   pgconn,
		projects: projects,
		sessions: sessions,
	}
}

func (a *assistImpl) Autocomplete(projectKey string, query *Query) (interface{}, error) {
	switch {
	case projectKey == "":
		return nil, fmt.Errorf("project key is required")
	case query == nil:
		return nil, fmt.Errorf("query is required")
	case query.Key == "":
		return nil, fmt.Errorf("query key is required")
	case query.Value == "":
		return nil, fmt.Errorf("query value is required")
	}
	project, err := a.projects.GetProjectByKey(projectKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get project by key: %s", err)
	}
	return a.sessions.Autocomplete(strconv.Itoa(int(project.ProjectID)), sessionmanager.FilterType(query.Key), query.Value)
}

func (a *assistImpl) IsLive(projectKey, sessionID string, filters *Request) (bool, error) {
	switch {
	case projectKey == "":
		return false, fmt.Errorf("project key is required")
	case sessionID == "":
		return false, fmt.Errorf("session ID is required")
	case filters == nil:
		return false, fmt.Errorf("filters are required")
	}
	project, err := a.projects.GetProjectByKey(projectKey)
	if err != nil {
		return false, fmt.Errorf("failed to get project by key: %s", err)
	}
	sess, err := a.sessions.GetByID(strconv.Itoa(int(project.ProjectID)), sessionID)
	if err != nil {
		return false, fmt.Errorf("failed to get session by ID: %s", err)
	}
	return sess != nil, nil
}

func (a *assistImpl) GetAll(projectKey string, request *Request) (interface{}, error) {
	switch {
	case projectKey == "":
		return nil, fmt.Errorf("project key is required")
	case request == nil:
		return nil, fmt.Errorf("filters are required")
	}
	project, err := a.projects.GetProjectByKey(projectKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get project by key: %s", err)
	}
	order := sessionmanager.Asc
	if request.Sort.Order == "DESC" {
		order = sessionmanager.Desc
	}
	filters := make([]*sessionmanager.Filter, 0, len(request.Filters))
	for name, f := range request.Filters {
		filters = append(filters, &sessionmanager.Filter{
			Type:     sessionmanager.FilterType(name),
			Value:    f.Value,
			Operator: f.Operator == "is",
		})
	}
	return a.sessions.GetAll(strconv.Itoa(int(project.ProjectID)), filters, order, request.Pagination.Page, request.Pagination.Limit)
}

func (a *assistImpl) GetByID(projectKey, sessionID string, filters *Request) (interface{}, error) {
	switch {
	case projectKey == "":
		return nil, fmt.Errorf("project key is required")
	case sessionID == "":
		return nil, fmt.Errorf("session ID is required")
	case filters == nil:
		return nil, fmt.Errorf("filters are required")
	}
	project, err := a.projects.GetProjectByKey(projectKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get project by key: %s", err)
	}
	return a.sessions.GetByID(strconv.Itoa(int(project.ProjectID)), sessionID)
}
