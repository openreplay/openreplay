package admin

import (
	"encoding/json"
	"errors"
	"net/http"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

var (
	errRoleRequired        = errors.New("You need a different role to access this resource")
	errAllProjectsRequired = errors.New("unauthorized: you need allProjects permission to create a new project")
	errMetadataIndex       = errors.New("metadata index out of bound")
	errInternal            = errors.New("internal server error")
)

type handlersImpl struct {
	log      logger.Logger
	service  Service
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, service Service) (api.Handlers, error) {
	h := &handlersImpl{
		log:     log,
		service: service,
	}
	h.handlers = []*api.Description{
		{"/projects", "GET", req.Handle(h.listProjects), api.NoPermissions, api.DoNotTrack},
		{"/projects", "POST", req.HandleWithBody(h.createProject), api.NoPermissions, "create_project"},
		{"/projects/{projectId}", "GET", req.Handle(h.getProject), api.NoPermissions, "get_project"},
		{"/projects/{projectId}", "PUT", req.HandleWithBody(h.updateProject), api.NoPermissions, "edit_project"},
		{"/projects/{projectId}", "DELETE", req.Handle(h.deleteProject), api.NoPermissions, "delete_project"},
		{"/{project}/sample_rate", "GET", req.Handle(h.getCaptureRate), api.NoPermissions, api.DoNotTrack},
		{"/{project}/sample_rate", "POST", req.HandleWithBody(h.updateCaptureRate), api.NoPermissions, "update_capture_status"},
		{"/{project}/gdpr", "GET", req.Handle(h.getGDPR), api.NoPermissions, "get_gdpr"},
		{"/{project}/gdpr", "POST", req.HandleWithBody(h.updateGDPR), api.NoPermissions, "edit_gdpr"},
		{"/{project}/metadata", "GET", req.Handle(h.listMetadata), api.NoPermissions, api.DoNotTrack},
		{"/{project}/metadata", "POST", req.HandleWithBody(h.addMetadata), api.NoPermissions, "add_metadata"},
		{"/{project}/metadata/{index}", "POST", req.HandleWithBody(h.renameMetadata), api.NoPermissions, "edit_metadata"},
		{"/{project}/metadata/{index}", "DELETE", req.Handle(h.deleteMetadata), api.NoPermissions, "delete_metadata"},
		{"/limits", "GET", req.Handle(h.getLimits), api.NoPermissions, api.DoNotTrack},
	}
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
}

func (h *handlersImpl) fail(r *api.RequestContext, action string, err error) (any, int, error) {
	switch {
	case errors.Is(err, ErrProjectNotFound), errors.Is(err, ErrMetadataNotFound):
		return nil, http.StatusNotFound, err
	case errors.Is(err, ErrNameExists), errors.Is(err, ErrMetadataLimit):
		return nil, http.StatusBadRequest, err
	}
	h.log.Error(r.Request.Context(), "failed to %s: %s", action, err)
	return nil, http.StatusInternalServerError, errInternal
}

func requireAdmin(r *api.RequestContext) error {
	if !api.GetUser(r.Request).IsAdmin() {
		return errRoleRequired
	}
	return nil
}

func decode(r *api.RequestContext, dest any) error {
	if err := json.Unmarshal(r.Body, dest); err != nil {
		return errors.New("invalid request body")
	}
	return nil
}

func (h *handlersImpl) listProjects(r *api.RequestContext) (any, int, error) {
	u := api.GetUser(r.Request)
	list, err := h.service.List(r.Request.Context(), u.TenantID)
	if err != nil {
		return h.fail(r, "list projects", err)
	}
	allowed := make([]*ProjectListItem, 0, len(list))
	for _, p := range list {
		if u.CanAccessProject(p.ProjectID) {
			allowed = append(allowed, p)
		}
	}
	return allowed, 0, nil
}

func (h *handlersImpl) createProject(r *api.RequestContext) (any, int, error) {
	if err := requireAdmin(r); err != nil {
		return nil, http.StatusUnauthorized, err
	}
	u := api.GetUser(r.Request)
	if u.Projects != nil {
		return nil, http.StatusUnauthorized, errAllProjectsRequired
	}
	req := &ProjectRequest{}
	if err := decode(r, req); err != nil {
		return nil, http.StatusBadRequest, err
	}
	if err := req.Normalize(true); err != nil {
		return nil, http.StatusBadRequest, err
	}
	p, err := h.service.Create(r.Request.Context(), u.TenantID, req)
	if err != nil {
		return h.fail(r, "create project", err)
	}
	return p, 0, nil
}

func (h *handlersImpl) getProject(r *api.RequestContext) (any, int, error) {
	projectID, err := api.GetProject(r.Request)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	p, err := h.service.Get(r.Request.Context(), api.GetUser(r.Request).TenantID, projectID)
	if err != nil {
		return h.fail(r, "get project", err)
	}
	return p, 0, nil
}

func (h *handlersImpl) updateProject(r *api.RequestContext) (any, int, error) {
	if err := requireAdmin(r); err != nil {
		return nil, http.StatusUnauthorized, err
	}
	projectID, err := api.GetProject(r.Request)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	req := &ProjectRequest{}
	if err := decode(r, req); err != nil {
		return nil, http.StatusBadRequest, err
	}
	if err := req.Normalize(false); err != nil {
		return nil, http.StatusBadRequest, err
	}
	p, err := h.service.Update(r.Request.Context(), api.GetUser(r.Request).TenantID, projectID, req)
	if err != nil {
		return h.fail(r, "update project", err)
	}
	return p, 0, nil
}

func (h *handlersImpl) deleteProject(r *api.RequestContext) (any, int, error) {
	if err := requireAdmin(r); err != nil {
		return nil, http.StatusUnauthorized, err
	}
	projectID, err := api.GetProject(r.Request)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	if err := h.service.Delete(r.Request.Context(), api.GetUser(r.Request).TenantID, projectID); err != nil {
		return h.fail(r, "delete project", err)
	}
	return map[string]string{"state": "success"}, 0, nil
}

func (h *handlersImpl) getCaptureRate(r *api.RequestContext) (any, int, error) {
	projectID, err := api.GetProject(r.Request)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	rate, err := h.service.GetCaptureRate(r.Request.Context(), api.GetUser(r.Request).TenantID, projectID)
	if err != nil {
		return h.fail(r, "get capture rate", err)
	}
	return rate, 0, nil
}

func (h *handlersImpl) updateCaptureRate(r *api.RequestContext) (any, int, error) {
	if err := requireAdmin(r); err != nil {
		return nil, http.StatusUnauthorized, err
	}
	projectID, err := api.GetProject(r.Request)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	req := &CaptureRateRequest{}
	if err := decode(r, req); err != nil {
		return nil, http.StatusBadRequest, err
	}
	if err := req.Validate(); err != nil {
		return nil, http.StatusBadRequest, err
	}
	rate, err := h.service.UpdateCaptureRate(r.Request.Context(), api.GetUser(r.Request).TenantID, projectID, req)
	if err != nil {
		return h.fail(r, "update capture rate", err)
	}
	return rate, 0, nil
}

func (h *handlersImpl) getGDPR(r *api.RequestContext) (any, int, error) {
	projectID, err := api.GetProject(r.Request)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	gdpr, err := h.service.GetGDPR(r.Request.Context(), api.GetUser(r.Request).TenantID, projectID)
	if err != nil {
		return h.fail(r, "get gdpr", err)
	}
	return gdpr, 0, nil
}

func (h *handlersImpl) updateGDPR(r *api.RequestContext) (any, int, error) {
	projectID, err := api.GetProject(r.Request)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	req := &GDPRRequest{}
	if err := decode(r, req); err != nil {
		return nil, http.StatusBadRequest, err
	}
	if err := req.Validate(); err != nil {
		return nil, http.StatusBadRequest, err
	}
	gdpr, err := h.service.UpdateGDPR(r.Request.Context(), api.GetUser(r.Request).TenantID, projectID, req)
	if err != nil {
		return h.fail(r, "update gdpr", err)
	}
	return gdpr, 0, nil
}

func (h *handlersImpl) listMetadata(r *api.RequestContext) (any, int, error) {
	projectID, err := api.GetProject(r.Request)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	list, err := h.service.ListMetadata(r.Request.Context(), api.GetUser(r.Request).TenantID, projectID)
	if err != nil {
		return h.fail(r, "list metadata", err)
	}
	return list, 0, nil
}

func (h *handlersImpl) addMetadata(r *api.RequestContext) (any, int, error) {
	projectID, err := api.GetProject(r.Request)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	req := &MetadataRequest{}
	if err := decode(r, req); err != nil {
		return nil, http.StatusBadRequest, err
	}
	if err := req.Normalize(); err != nil {
		return nil, http.StatusBadRequest, err
	}
	key, err := h.service.AddMetadata(r.Request.Context(), api.GetUser(r.Request).TenantID, projectID, req.Key)
	if err != nil {
		return h.fail(r, "add metadata", err)
	}
	return key, 0, nil
}

func (h *handlersImpl) renameMetadata(r *api.RequestContext) (any, int, error) {
	projectID, err := api.GetProject(r.Request)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	index, err := api.GetPathParam(r.Request, "index", api.ParseInt32)
	if err != nil || !ValidMetadataIndex(index) {
		return nil, http.StatusBadRequest, errMetadataIndex
	}
	req := &MetadataRequest{}
	if err := decode(r, req); err != nil {
		return nil, http.StatusBadRequest, err
	}
	if err := req.Normalize(); err != nil {
		return nil, http.StatusBadRequest, err
	}
	key, err := h.service.RenameMetadata(r.Request.Context(), api.GetUser(r.Request).TenantID, projectID, index, req.Key)
	if err != nil {
		return h.fail(r, "rename metadata", err)
	}
	return key, 0, nil
}

func (h *handlersImpl) deleteMetadata(r *api.RequestContext) (any, int, error) {
	projectID, err := api.GetProject(r.Request)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	index, err := api.GetPathParam(r.Request, "index", api.ParseInt32)
	if err != nil {
		return nil, http.StatusBadRequest, errMetadataIndex
	}
	list, err := h.service.DeleteMetadata(r.Request.Context(), api.GetUser(r.Request).TenantID, projectID, index)
	if err != nil {
		return h.fail(r, "delete metadata", err)
	}
	return list, 0, nil
}

func (h *handlersImpl) getLimits(r *api.RequestContext) (any, int, error) {
	return &Limits{TeamMember: -1, Projects: -1}, 0, nil
}
