package api_key

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/analytics/events"
	eventsModel "openreplay/backend/pkg/analytics/events/model"
	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/analytics/users"
	usersModel "openreplay/backend/pkg/analytics/users/model"
	"openreplay/backend/pkg/assist"
	"openreplay/backend/pkg/jobs"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
)

const maxProjectNameLength = 200

type handlersImpl struct {
	log      logger.Logger
	projects projects.Projects
	users    users.Users
	events   events.Events
	jobs     jobs.Jobs
	assist   assist.Assist
	cfg      *config.Config
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, projects projects.Projects, users users.Users, events events.Events, jobsService jobs.Jobs, assist assist.Assist, cfg *config.Config) (api.Handlers, error) {
	h := &handlersImpl{
		log:      log,
		projects: projects,
		users:    users,
		events:   events,
		jobs:     jobsService,
		assist:   assist,
		cfg:      cfg,
	}
	h.handlers = []*api.Description{
		{"/public/projects/{project}", "GET", req.Handle(h.getProject), []string{api.PublicKeyPermission}, "api_get_project"},
		{"/public/projects", "GET", req.Handle(h.listProjects), []string{api.PublicKeyPermission}, api.DoNotTrack},
		{"/public/projects", "POST", req.HandleWithBody(h.createProject), []string{api.PublicKeyPermission}, "api_create_project"},
		{"/public/{project}/users", "POST", req.HandleWithBody(h.searchUsers), []string{api.PublicKeyPermission}, api.DoNotTrack},
		{"/public/{project}/users/{userID}", "GET", req.Handle(h.getUser), []string{api.PublicKeyPermission}, "api_get_user"},
		{"/public/{project}/users/{userID}/sessions", "POST", req.HandleWithBody(h.getUserSessions), []string{api.PublicKeyPermission}, api.DoNotTrack},
		{"/public/{project}/sessions/{sessionID}/events", "POST", req.HandleWithBody(h.searchEventsBySession), []string{api.PublicKeyPermission}, api.DoNotTrack},
		{"/public/{project}/users/{userID}", "DELETE", req.Handle(h.deleteUserData), []string{api.PublicKeyPermission}, "api_delete_user_data"},
		{"/public/{project}/jobs", "GET", req.Handle(h.listJobs), []string{api.PublicKeyPermission}, api.DoNotTrack},
		{"/public/{project}/jobs/{jobID}", "GET", req.Handle(h.getJob), []string{api.PublicKeyPermission}, "api_get_delete_job"},
		{"/public/{project}/jobs/{jobID}", "DELETE", req.Handle(h.cancelJob), []string{api.PublicKeyPermission}, "api_cancel_delete_job"},
	}
	h.handlers = append(h.handlers, h.assistHandlers(req)...)
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
}

func (h *handlersImpl) resolveProjectID(r *api.RequestContext) (uint32, int, error) {
	projectKey, err := api.GetParam(r.Request, "project")
	if err != nil {
		return 0, http.StatusBadRequest, err
	}

	tenantID, err := api.GetTenantID(r.Request)
	if err != nil {
		return 0, http.StatusUnauthorized, err
	}

	project, err := h.projects.GetProjectByKeyAndTenant(projectKey, tenantID)
	if err != nil {
		return 0, http.StatusNotFound, fmt.Errorf("project not found")
	}

	return project.ProjectID, 0, nil
}

func (h *handlersImpl) getProject(r *api.RequestContext) (any, int, error) {
	projectKey, err := api.GetParam(r.Request, "project")
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	tenantID, err := api.GetTenantID(r.Request)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}

	project, err := h.projects.GetProjectByKeyAndTenant(projectKey, tenantID)
	if err != nil {
		return nil, http.StatusNotFound, fmt.Errorf("project not found")
	}

	return project, 0, nil
}

func (h *handlersImpl) listProjects(r *api.RequestContext) (any, int, error) {
	tenantID, err := api.GetTenantID(r.Request)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}

	projectList, err := h.projects.ListProjectsByTenantID(tenantID)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to list projects: %s", err)
		return nil, http.StatusInternalServerError, fmt.Errorf("failed to list projects")
	}

	return projectList, 0, nil
}

type createProjectRequest struct {
	Name     string `json:"name"`
	Platform string `json:"platform"`
}

func (h *handlersImpl) createProject(r *api.RequestContext) (any, int, error) {
	tenantID, err := api.GetTenantID(r.Request)
	if err != nil {
		return nil, http.StatusUnauthorized, err
	}

	var req createProjectRequest
	if err := json.Unmarshal(r.Body, &req); err != nil {
		return nil, http.StatusBadRequest, fmt.Errorf("invalid JSON body")
	}

	if req.Name == "" {
		return nil, http.StatusBadRequest, fmt.Errorf("name is required")
	}
	if len(req.Name) > maxProjectNameLength {
		return nil, http.StatusBadRequest, fmt.Errorf("name must be at most %d characters", maxProjectNameLength)
	}

	if req.Platform == "" {
		req.Platform = "web"
	}
	if !projects.ValidPlatforms[req.Platform] {
		return nil, http.StatusBadRequest, fmt.Errorf("platform must be one of: web, ios")
	}

	exists, err := h.projects.ExistsByName(req.Name, tenantID)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to check project name: %s", err)
		return nil, http.StatusInternalServerError, fmt.Errorf("failed to create project")
	}
	if exists {
		return nil, http.StatusBadRequest, fmt.Errorf("name already exists")
	}

	project, err := h.projects.CreateProject(tenantID, req.Name, req.Platform)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to create project: %s", err)
		return nil, http.StatusInternalServerError, fmt.Errorf("failed to create project")
	}

	return project, 0, nil
}

func (h *handlersImpl) searchUsers(r *api.RequestContext) (any, int, error) {
	projID, statusCode, err := h.resolveProjectID(r)
	if err != nil {
		return nil, statusCode, err
	}

	req := &usersModel.SearchUsersRequest{}
	if err := json.Unmarshal(r.Body, req); err != nil {
		return nil, http.StatusBadRequest, fmt.Errorf("invalid JSON body")
	}

	if query := r.Request.URL.Query().Get("q"); query != "" {
		req.Query = query
	}

	if err := filters.ValidateStruct(req); err != nil {
		return nil, http.StatusBadRequest, err
	}

	response, err := h.users.SearchUsers(r.Request.Context(), projID, req)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to search users: %s", err)
		return nil, http.StatusInternalServerError, fmt.Errorf("failed to search users")
	}

	return response, 0, nil
}

func (h *handlersImpl) getUser(r *api.RequestContext) (any, int, error) {
	projID, statusCode, err := h.resolveProjectID(r)
	if err != nil {
		return nil, statusCode, err
	}

	userID, err := api.GetPathParam(r.Request, "userID", api.ParseString)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	if userID == "" {
		return nil, http.StatusBadRequest, fmt.Errorf("userID cannot be empty")
	}
	if len(userID) > 256 {
		return nil, http.StatusBadRequest, fmt.Errorf("userID exceeds maximum length of 256 characters")
	}

	response, err := h.users.GetByUserID(r.Request.Context(), projID, userID)
	if err != nil {
		return nil, http.StatusNotFound, fmt.Errorf("user not found")
	}

	return response, 0, nil
}

func (h *handlersImpl) getUserSessions(r *api.RequestContext) (any, int, error) {
	projID, statusCode, err := h.resolveProjectID(r)
	if err != nil {
		return nil, statusCode, err
	}

	userID, err := api.GetPathParam(r.Request, "userID", api.ParseString)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	if userID == "" {
		return nil, http.StatusBadRequest, fmt.Errorf("userID cannot be empty")
	}
	if len(userID) > 256 {
		return nil, http.StatusBadRequest, fmt.Errorf("userID exceeds maximum length of 256 characters")
	}

	req := &usersModel.UserSessionsRequest{}
	if err := json.Unmarshal(r.Body, req); err != nil {
		return nil, http.StatusBadRequest, fmt.Errorf("invalid JSON body")
	}

	if err := filters.ValidateStruct(req); err != nil {
		return nil, http.StatusBadRequest, err
	}

	response, err := h.users.GetUserSessions(r.Request.Context(), projID, userID, req)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get user sessions: %s", err)
		return nil, http.StatusInternalServerError, fmt.Errorf("failed to get user sessions")
	}

	return response, 0, nil
}

func (h *handlersImpl) searchEventsBySession(r *api.RequestContext) (any, int, error) {
	projID, statusCode, err := h.resolveProjectID(r)
	if err != nil {
		return nil, statusCode, err
	}

	sessionID, err := api.GetPathParam(r.Request, "sessionID", api.ParseString)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	if sessionID == "" {
		return nil, http.StatusBadRequest, fmt.Errorf("sessionID cannot be empty")
	}
	if len(sessionID) > 256 {
		return nil, http.StatusBadRequest, fmt.Errorf("sessionID exceeds maximum length of 256 characters")
	}

	req := &eventsModel.EventsSearchRequest{}
	if err := json.Unmarshal(r.Body, req); err != nil {
		return nil, http.StatusBadRequest, fmt.Errorf("invalid JSON body")
	}

	req.Filters = append(req.Filters, filters.Filter{
		Name:     "session_id",
		Operator: "is",
		Value:    []string{sessionID},
	})

	if err := filters.ValidateStruct(req); err != nil {
		return nil, http.StatusBadRequest, err
	}

	response, err := h.events.SearchEvents(r.Request.Context(), projID, req)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to search events: %s", err)
		return nil, http.StatusInternalServerError, fmt.Errorf("failed to search events")
	}

	return response, 0, nil
}

func (h *handlersImpl) deleteUserData(r *api.RequestContext) (any, int, error) {
	projID, statusCode, err := h.resolveProjectID(r)
	if err != nil {
		return nil, statusCode, err
	}

	userID, err := api.GetPathParam(r.Request, "userID", api.ParseString)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	if userID == "" {
		return nil, http.StatusBadRequest, fmt.Errorf("userID cannot be empty")
	}
	if len(userID) > 256 {
		return nil, http.StatusBadRequest, fmt.Errorf("userID exceeds maximum length of 256 characters")
	}

	active, err := h.jobs.HasActiveJob(projID, userID)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to check active jobs: %s", err)
		return nil, http.StatusInternalServerError, fmt.Errorf("failed to schedule user deletion")
	}
	if active {
		return nil, http.StatusConflict, fmt.Errorf("a deletion job for this user is already scheduled or running")
	}

	job, err := h.jobs.Create(projID, userID)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to schedule user deletion: %s", err)
		return nil, http.StatusInternalServerError, fmt.Errorf("failed to schedule user deletion")
	}

	return job, 0, nil
}

func (h *handlersImpl) listJobs(r *api.RequestContext) (any, int, error) {
	projID, statusCode, err := h.resolveProjectID(r)
	if err != nil {
		return nil, statusCode, err
	}

	limit := api.GetQueryParam(r.Request, "limit", api.ParseInt, 50)
	page := api.GetQueryParam(r.Request, "page", api.ParseInt, 1)
	if limit < 1 || limit > 200 {
		limit = 50
	}
	if page < 1 {
		page = 1
	}

	jobsList, err := h.jobs.GetAll(projID, limit, page)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to list jobs: %s", err)
		return nil, http.StatusInternalServerError, fmt.Errorf("failed to list jobs")
	}

	return jobsList, 0, nil
}

func (h *handlersImpl) getJob(r *api.RequestContext) (any, int, error) {
	projID, statusCode, err := h.resolveProjectID(r)
	if err != nil {
		return nil, statusCode, err
	}

	jobID, err := api.GetPathParam(r.Request, "jobID", api.ParseInt)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	job, err := h.jobs.Get(jobID, projID)
	if err != nil {
		return nil, http.StatusNotFound, fmt.Errorf("job not found")
	}

	return job, 0, nil
}

func (h *handlersImpl) cancelJob(r *api.RequestContext) (any, int, error) {
	projID, statusCode, err := h.resolveProjectID(r)
	if err != nil {
		return nil, statusCode, err
	}

	jobID, err := api.GetPathParam(r.Request, "jobID", api.ParseInt)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	job, err := h.jobs.Cancel(jobID, projID)
	if err != nil {
		if errors.Is(err, jobs.ErrJobNotFound) {
			return nil, http.StatusNotFound, fmt.Errorf("job not found")
		}
		return nil, http.StatusBadRequest, fmt.Errorf("%s", err)
	}

	return job, 0, nil
}
