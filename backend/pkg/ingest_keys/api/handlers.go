package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"unicode/utf8"

	"openreplay/backend/pkg/ingest_keys"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

const maxKeyNameLength = 100

type handlersImpl struct {
	log      logger.Logger
	keys     ingest_keys.Keys
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, keys ingest_keys.Keys) (api.Handlers, error) {
	h := &handlersImpl{log: log, keys: keys}
	h.handlers = []*api.Description{
		{Path: "/{project}/ingest-keys", Method: "GET", Handler: req.Handle(h.list), Permissions: api.NoPermissions, AuditTrail: api.DoNotTrack},
		{Path: "/{project}/ingest-keys", Method: "POST", Handler: req.HandleWithBody(h.create), Permissions: api.NoPermissions, AuditTrail: "create_ingest_key"},
		{Path: "/{project}/ingest-keys/{key}", Method: "DELETE", Handler: req.Handle(h.revoke), Permissions: api.NoPermissions, AuditTrail: "revoke_ingest_key"},
	}
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
}

type createRequest struct {
	Name string `json:"name"`
}

func (h *handlersImpl) list(ctx *api.RequestContext) (any, int, error) {
	projectID, err := ctx.GetProjectID()
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	keys, err := h.keys.List(projectID)
	if err != nil {
		h.log.Error(ctx.Request.Context(), "failed to list ingest keys: %s", err)
		return nil, http.StatusInternalServerError, errors.New("failed to list ingest keys")
	}
	return keys, http.StatusOK, nil
}

func (h *handlersImpl) create(ctx *api.RequestContext) (any, int, error) {
	projectID, err := ctx.GetProjectID()
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	req := &createRequest{}
	if err := json.Unmarshal(ctx.Body, req); err != nil {
		return nil, http.StatusBadRequest, fmt.Errorf("invalid request body: %w", err)
	}
	req.Name = strings.TrimSpace(req.Name)
	if utf8.RuneCountInString(req.Name) > maxKeyNameLength {
		return nil, http.StatusBadRequest, fmt.Errorf("name is longer than %d characters", maxKeyNameLength)
	}
	key, err := h.keys.Create(projectID, req.Name)
	if err != nil {
		h.log.Error(ctx.Request.Context(), "failed to create ingest key: %s", err)
		return nil, http.StatusInternalServerError, errors.New("failed to create ingest key")
	}
	return key, http.StatusOK, nil
}

func (h *handlersImpl) revoke(ctx *api.RequestContext) (any, int, error) {
	projectID, err := ctx.GetProjectID()
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	keyID, err := api.GetPathParam(ctx.Request, "key", api.ParseInt)
	if err != nil || keyID <= 0 {
		return nil, http.StatusBadRequest, errors.New("invalid key id")
	}
	if err := h.keys.Revoke(projectID, keyID); err != nil {
		if errors.Is(err, ingest_keys.ErrNotFound) {
			return nil, http.StatusNotFound, err
		}
		h.log.Error(ctx.Request.Context(), "failed to revoke ingest key: %s", err)
		return nil, http.StatusInternalServerError, errors.New("failed to revoke ingest key")
	}
	return map[string]any{"keyId": keyID}, http.StatusOK, nil
}
