package api_key

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/hex"
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

type temporaryCredentials struct {
	Username   string `json:"username"`
	Credential string `json:"credential"`
}

func generateSalt() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (h *handlersImpl) getTemporaryCredentials() (*temporaryCredentials, error) {
	secret := h.cfg.AssistSecret
	if secret == "" {
		return nil, fmt.Errorf("secret not defined")
	}

	ttl := h.cfg.AssistTTL * 3600
	timestamp := time.Now().Unix() + int64(ttl)
	username := fmt.Sprintf("%d:%s", timestamp, generateSalt())

	mac := hmac.New(sha1.New, []byte(secret))
	mac.Write([]byte(username))
	credential := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	return &temporaryCredentials{
		Username:   username,
		Credential: credential,
	}, nil
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
	creds, err := h.getTemporaryCredentials()
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
