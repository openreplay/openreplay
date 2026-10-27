package accounts

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
)

type fakeService struct {
	Service
	updateErr   error
	gotIsAdmin  bool
	gotScope    int
	rotated     bool
	gotModule   string
	gotStatus   bool
	gotReport   bool
	accountErr  error
	updatedName *string
}

func (f *fakeService) Get(context.Context, uint64, uint64) (*Account, error) {
	if f.accountErr != nil {
		return nil, f.accountErr
	}
	return &Account{}, nil
}

func (f *fakeService) Update(_ context.Context, _, _ uint64, isAdmin bool, req *AccountRequest) (*AccountInfo, error) {
	f.gotIsAdmin = isAdmin
	f.updatedName = req.Name
	if f.updateErr != nil {
		return nil, f.updateErr
	}
	return &AccountInfo{}, nil
}

func (f *fakeService) UpdateScope(_ context.Context, _ uint64, scope int) error {
	f.gotScope = scope
	return nil
}

func (f *fakeService) RegenerateAPIKey(context.Context, uint64) (*APIKey, error) {
	f.rotated = true
	return &APIKey{APIKey: "k"}, nil
}

func (f *fakeService) UpdateWeeklyReport(_ context.Context, _, _ uint64, enabled bool) (*WeeklyReport, error) {
	f.gotReport = enabled
	return &WeeklyReport{WeeklyReport: enabled}, nil
}

func (f *fakeService) UpdateModule(_ context.Context, _, _ uint64, module string, status bool) (*UserSettings, error) {
	f.gotModule, f.gotStatus = module, status
	return &UserSettings{}, nil
}

func newRequest(u *user.User, body string) *api.RequestContext {
	r := httptest.NewRequest(http.MethodPost, "/", nil)
	r = r.WithContext(context.WithValue(r.Context(), "userData", u))
	return &api.RequestContext{Request: r, Body: []byte(body)}
}

func newHandlers(svc Service) *handlersImpl {
	return &handlersImpl{log: logger.New(), cfg: &config.Config{}, service: svc}
}

func TestRegenerateAPIKeyRequiresAdmin(t *testing.T) {
	tests := []struct {
		role     string
		wantCode int
	}{
		{"member", http.StatusUnauthorized},
		{"admin", 0},
		{"owner", 0},
	}
	for _, tt := range tests {
		t.Run(tt.role, func(t *testing.T) {
			svc := &fakeService{}
			_, code, _ := newHandlers(svc).regenerateAPIKey(newRequest(&user.User{Role: tt.role}, ""))
			if code != tt.wantCode || svc.rotated != (tt.wantCode == 0) {
				t.Fatalf("got code %d rotated=%v, want %d", code, svc.rotated, tt.wantCode)
			}
		})
	}
}

func TestUpdateAccount(t *testing.T) {
	svc := &fakeService{}
	h := newHandlers(svc)

	if _, code, err := h.updateAccount(newRequest(&user.User{Role: "member"}, `{"name":" Ana  ","tenantName":"Acme"}`)); code != 0 || err != nil {
		t.Fatalf("unexpected failure: %d %v", code, err)
	}
	if svc.gotIsAdmin || *svc.updatedName != "Ana" {
		t.Fatalf("expected a normalized member update, got admin=%v name=%q", svc.gotIsAdmin, *svc.updatedName)
	}

	svc.updateErr = ValidationError{errors.New("name contains invalid characters")}
	if _, code, err := h.updateAccount(newRequest(&user.User{Role: "member"}, `{"name":"<b>"}`)); code != http.StatusBadRequest || err.Error() != "name contains invalid characters" {
		t.Fatalf("invalid name must be rejected with 400, got %d %v", code, err)
	}
	svc.updateErr = nil
	if _, code, _ := h.updateAccount(newRequest(&user.User{Role: "member"}, `{"name":`)); code != http.StatusBadRequest {
		t.Fatalf("invalid json must be rejected with 400, got %d", code)
	}

	svc.updateErr = ErrUnauthorized
	_, code, err := h.updateAccount(newRequest(&user.User{Role: "member"}, `{"optOut":true}`))
	if code != http.StatusUnauthorized || !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("tenant changes by members must be 401, got %d %v", code, err)
	}
}

func TestErrorMapping(t *testing.T) {
	tests := []struct {
		err      error
		wantCode int
		wantErr  error
	}{
		{ErrUserNotFound, http.StatusNotFound, ErrUserNotFound},
		{ErrTenantNotFound, http.StatusNotFound, ErrTenantNotFound},
		{errors.New("connection refused"), http.StatusInternalServerError, errInternal},
	}
	for _, tt := range tests {
		_, code, err := newHandlers(&fakeService{accountErr: tt.err}).getAccount(newRequest(&user.User{}, ""))
		if code != tt.wantCode || !errors.Is(err, tt.wantErr) {
			t.Fatalf("%v: got (%d, %v), want (%d, %v)", tt.err, code, err, tt.wantCode, tt.wantErr)
		}
	}
}

func TestSettingsHandlers(t *testing.T) {
	svc := &fakeService{}
	h := newHandlers(svc)
	u := &user.User{Role: "member"}
	admin := &user.User{Role: "admin"}

	if _, code, _ := h.updateScope(newRequest(u, `{"scope":2}`)); code != http.StatusUnauthorized || svc.gotScope != 0 {
		t.Fatalf("members must not change the tenant scope, got %d", code)
	}
	if _, code, _ := h.updateScope(newRequest(admin, `{"scope":2}`)); code != 0 || svc.gotScope != 2 {
		t.Fatalf("scope update failed: %d %d", code, svc.gotScope)
	}
	if _, code, _ := h.updateScope(newRequest(admin, `{"scope":5}`)); code != http.StatusBadRequest {
		t.Fatalf("invalid scope must be 400, got %d", code)
	}
	for _, body := range []string{``, `null`, `{}`, `{"scope":null}`} {
		if _, code, _ := h.updateScope(newRequest(admin, body)); code != http.StatusBadRequest {
			t.Fatalf("body %q must not downgrade the scope, got %d", body, code)
		}
	}
	if _, code, _ := h.updateWeeklyReport(newRequest(u, ``)); code != http.StatusBadRequest {
		t.Fatalf("an empty weekly report body must be 400, got %d", code)
	}
	if _, code, _ := h.updateWeeklyReport(newRequest(u, `{}`)); code != 0 || !svc.gotReport {
		t.Fatalf("weekly report must default to true")
	}
	if _, code, _ := h.updateModule(newRequest(u, `{"module":"alerts","status":true}`)); code != 0 || svc.gotModule != "alerts" || !svc.gotStatus {
		t.Fatalf("module update failed: %d %s %v", code, svc.gotModule, svc.gotStatus)
	}
	if _, code, _ := h.updateModule(newRequest(u, ``)); code != http.StatusBadRequest {
		t.Fatalf("empty module body must be 400, got %d", code)
	}
}
