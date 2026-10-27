package api_key

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"openreplay/backend/pkg/assist"
	"openreplay/backend/pkg/server/api"
)

func (h *handlersImpl) assistHandlers(req api.RequestHandler) []*api.Description {
	return []*api.Description{
		{"/public/assist/credentials", "GET", req.Handle(h.getAssistCredentials), []string{api.PublicKeyPermission}, api.DoNotTrack},
		{"/public/{project}/assist/sessions", "GET", req.Handle(h.getAssistSessions), []string{api.PublicKeyPermission}, api.DoNotTrack},
		{"/public/{project}/assist/sessions", "POST", req.HandleWithBody(h.searchAssistSessions), []string{api.PublicKeyPermission}, api.DoNotTrack},
	}
}

func unwrapAssistData(resp interface{}) interface{} {
	if m, ok := resp.(map[string]interface{}); ok {
		if inner, ok := m["data"]; ok {
			return inner
		}
	}
	return resp
}

func (h *handlersImpl) getAssistCredentials(r *api.RequestContext) (any, int, error) {
	ttl := h.cfg.AssistTTL
	if ttl <= 0 {
		ttl = assist.DefaultTurnTTLHours
	}
	creds, err := assist.NewTurnCredentials(h.cfg.AssistSecret, ttl, time.Now())
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	return creds, 0, nil
}

func (h *handlersImpl) getAssistSessions(r *api.RequestContext) (any, int, error) {
	projID, statusCode, err := h.resolveProjectID(r)
	if err != nil {
		return nil, statusCode, err
	}

	userId := r.Request.URL.Query().Get("userId")

	req := &assist.GetLiveSessionsRequest{
		Sort:  "timestamp",
		Order: "desc",
		Limit: 10,
		Page:  1,
	}

	if userId != "" {
		req.Filters = []interface{}{
			map[string]interface{}{
				"name":     "userId",
				"operator": "is",
				"value":    []string{userId},
			},
		}
	}

	resp, err := h.assist.GetLiveSessionsWS(projID, req)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get assist sessions: %s", err)
		return nil, http.StatusInternalServerError, fmt.Errorf("failed to get assist sessions")
	}

	return unwrapAssistData(resp), 0, nil
}

func (h *handlersImpl) searchAssistSessions(r *api.RequestContext) (any, int, error) {
	projID, statusCode, err := h.resolveProjectID(r)
	if err != nil {
		return nil, statusCode, err
	}

	req := &assist.GetLiveSessionsRequest{}
	if err := json.Unmarshal(r.Body, req); err != nil {
		return nil, http.StatusBadRequest, fmt.Errorf("invalid JSON body")
	}

	if req.Limit == 0 {
		req.Limit = 10
	}
	if req.Page == 0 {
		req.Page = 1
	}
	if req.Sort == "" {
		req.Sort = "timestamp"
	}
	if req.Order == "" {
		req.Order = "desc"
	}

	resp, err := h.assist.GetLiveSessionsWS(projID, req)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to search assist sessions: %s", err)
		return nil, http.StatusInternalServerError, fmt.Errorf("failed to search assist sessions")
	}

	return unwrapAssistData(resp), 0, nil
}
