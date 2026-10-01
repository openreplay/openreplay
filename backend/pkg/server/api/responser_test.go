package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/web"
)

func TestResponseWithErrorMasks5xx(t *testing.T) {
	cases := []struct {
		name    string
		code    int
		err     error
		wantMsg string
	}{
		{"5xx hides internal error", http.StatusInternalServerError, errors.New("failed to encode args[0]: int4 overflow"), "internal server error"},
		{"503 hides internal error", http.StatusServiceUnavailable, errors.New("pool exhausted"), "internal server error"},
		{"5xx with nil error", http.StatusNotImplemented, nil, "internal server error"},
		{"4xx keeps message", http.StatusNotFound, errors.New("session not found"), "session not found"},
		{"400 keeps message", http.StatusBadRequest, errors.New(`invalid project id: "abc"`), `invalid project id: "abc"`},
	}
	resp := NewResponser(web.New("test"))
	log := logger.New()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			resp.ResponseWithError(log, context.Background(), w, tc.code, tc.err, time.Now(), "/test", 0)
			if w.Code != tc.code {
				t.Fatalf("status = %d, want %d", w.Code, tc.code)
			}
			var body response
			if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
				t.Fatalf("invalid json body %q: %s", w.Body.String(), err)
			}
			if len(body.Errors) != 1 || body.Errors[0] != tc.wantMsg {
				t.Fatalf("errors = %v, want [%q]", body.Errors, tc.wantMsg)
			}
		})
	}
}
