package webhooks

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestWebhookRequestNormalize(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		wantName string
		wantID   int64
		wantErr  string
	}{
		{"create", `{"name":"  Ops  hook ","endpoint":" https://hooks.example.com/x "}`, "Ops hook", 0, ""},
		{"numeric id", `{"webhookId":7,"name":"a","endpoint":"http://example.com"}`, "a", 7, ""},
		{"string id from the form", `{"webhookId":"7","name":"a","endpoint":"http://example.com"}`, "a", 7, ""},
		{"extra fields ignored", `{"name":"a","endpoint":"https://x.io","type":"slack","createdAt":1}`, "a", 0, ""},
		{"missing name", `{"endpoint":"https://x.io"}`, "", 0, "name is required"},
		{"bad name", `{"name":"<b>","endpoint":"https://x.io"}`, "", 0, "name contains invalid characters"},
		{"missing endpoint", `{"name":"a"}`, "", 0, "endpoint is required"},
		{"non http scheme", `{"name":"a","endpoint":"file:///etc/passwd"}`, "", 0, "endpoint must be a valid http or https URL"},
		{"no host", `{"name":"a","endpoint":"https://"}`, "", 0, "endpoint must be a valid http or https URL"},
		{"long header", `{"name":"a","endpoint":"https://x.io","authHeader":"` + strings.Repeat("h", maxAuthHeaderLength+1) + `"}`, "", 0, "authHeader must be at most 4096 characters"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &WebhookRequest{}
			if err := json.Unmarshal([]byte(tt.body), req); err != nil {
				t.Fatalf("unmarshal: %s", err)
			}
			err := req.Normalize()
			if tt.wantErr != "" {
				if err == nil || err.Error() != tt.wantErr {
					t.Fatalf("got error %v, want %q", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}
			if req.Name != tt.wantName {
				t.Fatalf("got name %q, want %q", req.Name, tt.wantName)
			}
			if (tt.wantID == 0) != (req.ID() == nil) || (req.ID() != nil && *req.ID() != tt.wantID) {
				t.Fatalf("got id %v, want %d", req.ID(), tt.wantID)
			}
		})
	}
}

func TestWebhookIDRejectsGarbage(t *testing.T) {
	for _, body := range []string{`{"webhookId":"abc"}`, `{"webhookId":-1}`, `{"webhookId":1.5}`} {
		if err := json.Unmarshal([]byte(body), &WebhookRequest{}); err == nil {
			t.Fatalf("%s must be rejected", body)
		}
	}
}

func TestRedactHidesSecrets(t *testing.T) {
	slack := &Webhook{Type: "slack", Endpoint: "https://hooks.slack.com/services/T/B/X", AuthHeader: "x", Name: "eng"}
	slack.redact()
	if slack.Endpoint != "" || slack.AuthHeader != "" || slack.Name != "eng" {
		t.Fatalf("slack secrets must be removed, got %+v", slack)
	}
	custom := &Webhook{Type: typeWebhook, Endpoint: "https://x.io", AuthHeader: "Bearer t"}
	custom.redact()
	if custom.Endpoint != "https://x.io" || custom.AuthHeader != "" {
		t.Fatalf("custom webhooks keep the endpoint but never return the auth header, got %+v", custom)
	}
}

func TestAuthHeaderIsWriteOnly(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantAction headerAction
		wantHeader *string
		wantErr    string
	}{
		{"omitted keeps", `{"name":"a","endpoint":"https://x.io"}`, keepAuthHeader, nil, ""},
		{"empty keeps", `{"name":"a","endpoint":"https://x.io","authHeader":""}`, keepAuthHeader, nil, ""},
		{"null clears", `{"name":"a","endpoint":"https://x.io","authHeader":null}`, clearAuthHeader, nil, ""},
		{"value sets", `{"name":"a","endpoint":"https://x.io","authHeader":"Bearer t"}`, setAuthHeader, strPtr("Bearer t"), ""},
		{"newline rejected", `{"name":"a","endpoint":"https://x.io","authHeader":"Bearer t\r\nX-Evil: 1"}`, keepAuthHeader, nil, "authHeader contains invalid characters"},
		{"non string rejected", `{"name":"a","endpoint":"https://x.io","authHeader":5}`, keepAuthHeader, nil, "authHeader must be a string"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &WebhookRequest{}
			if err := json.Unmarshal([]byte(tt.body), req); err != nil {
				t.Fatalf("unmarshal: %s", err)
			}
			err := req.Normalize()
			if tt.wantErr != "" {
				if err == nil || err.Error() != tt.wantErr {
					t.Fatalf("got %v, want %q", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}
			got := req.authHeader()
			if req.action != tt.wantAction || (got == nil) != (tt.wantHeader == nil) || (got != nil && *got != *tt.wantHeader) {
				t.Fatalf("got action %d header %v, want %d %v", req.action, got, tt.wantAction, tt.wantHeader)
			}
		})
	}
}

func strPtr(v string) *string { return &v }
