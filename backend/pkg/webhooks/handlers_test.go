package webhooks

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
)

type fakeWebhooks struct {
	Webhooks
	list      []*Webhook
	saveErr   error
	deleteErr error
	deletedID int64
}

func (f *fakeWebhooks) List(context.Context, uint64) ([]*Webhook, error) {
	return f.list, nil
}

func (f *fakeWebhooks) Save(_ context.Context, _ uint64, req *WebhookRequest) (*Webhook, error) {
	if f.saveErr != nil {
		return nil, f.saveErr
	}
	return &Webhook{Name: req.Name, Type: typeWebhook}, nil
}

func (f *fakeWebhooks) Delete(_ context.Context, _ uint64, id int64) error {
	f.deletedID = id
	return f.deleteErr
}

func newRequest(vars map[string]string, body string) *api.RequestContext {
	r := httptest.NewRequest(http.MethodPost, "/", nil)
	r = r.WithContext(context.WithValue(r.Context(), "userData", &user.User{Role: "member"}))
	r = mux.SetURLVars(r, vars)
	return &api.RequestContext{Request: r, Body: []byte(body)}
}

func TestListWebhooksIsNeverNull(t *testing.T) {
	h := &handlersImpl{log: logger.New(), service: &fakeWebhooks{list: make([]*Webhook, 0)}}
	resp, _, _ := h.listWebhooks(newRequest(nil, ""))
	body, _ := json.Marshal(resp)
	if string(body) != "[]" {
		t.Fatalf("got %s, want []", body)
	}
}

func TestSaveWebhookErrors(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		saveErr  error
		wantCode int
	}{
		{"saved", `{"name":"a","endpoint":"https://x.io"}`, nil, 0},
		{"invalid json", `{"name":`, nil, http.StatusBadRequest},
		{"invalid endpoint", `{"name":"a","endpoint":"ftp://x.io"}`, nil, http.StatusBadRequest},
		{"duplicate name", `{"name":"a","endpoint":"https://x.io"}`, ErrNameExists, http.StatusBadRequest},
		{"not a custom webhook", `{"webhookId":3,"name":"a","endpoint":"https://x.io"}`, ErrWebhookNotFound, http.StatusNotFound},
		{"db failure is generic", `{"name":"a","endpoint":"https://x.io"}`, errors.New("pq: boom"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := &handlersImpl{log: logger.New(), service: &fakeWebhooks{saveErr: tt.saveErr}}
			_, code, err := h.saveWebhook(newRequest(nil, tt.body))
			if code != tt.wantCode {
				t.Fatalf("got %d (%v), want %d", code, err, tt.wantCode)
			}
			if code == http.StatusInternalServerError && !errors.Is(err, errInternal) {
				t.Fatalf("internal errors must not leak details, got %v", err)
			}
		})
	}
}

func TestDeleteWebhook(t *testing.T) {
	svc := &fakeWebhooks{}
	h := &handlersImpl{log: logger.New(), service: svc}
	if _, code, _ := h.deleteWebhook(newRequest(map[string]string{"webhookId": "12"}, "")); code != 0 || svc.deletedID != 12 {
		t.Fatalf("delete failed: %d %d", code, svc.deletedID)
	}
	if _, code, _ := h.deleteWebhook(newRequest(map[string]string{"webhookId": "x"}, "")); code != http.StatusBadRequest {
		t.Fatalf("invalid id must be 400, got %d", code)
	}
	svc.deleteErr = ErrWebhookNotFound
	if _, code, _ := h.deleteWebhook(newRequest(map[string]string{"webhookId": "13"}, "")); code != http.StatusNotFound {
		t.Fatalf("missing webhook must be 404, got %d", code)
	}
}
