package trails

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
)

func intPtr(v int) *int       { return &v }
func strPtr(v string) *string { return &v }
func int64Ptr(v int64) *int64 { return &v }

func TestSearchParams(t *testing.T) {
	now := time.UnixMilli(1_800_000_000_000)
	p, err := (&SearchRequest{}).params(now)
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	if p.limit != 200 || p.offset != 0 || p.order != "DESC" ||
		p.startDate != now.AddDate(0, 0, -7).UnixMilli() || p.endDate != now.AddDate(0, 0, 1).UnixMilli() {
		t.Fatalf("unexpected defaults: %+v", p)
	}

	p, err = (&SearchRequest{Limit: intPtr(20), Page: intPtr(3), Order: strPtr("asc"), Query: strPtr("  ana "), StartDate: int64Ptr(5)}).params(now)
	if err != nil || p.offset != 40 || p.order != "ASC" || p.query != "ana" || p.startDate != 5 {
		t.Fatalf("unexpected params: %+v %v", p, err)
	}

	if p, err = (&SearchRequest{Limit: intPtr(5000)}).params(now); err != nil || p.limit != 5000 {
		t.Fatalf("export-sized pages must be allowed: %+v %v", p, err)
	}

	for name, req := range map[string]*SearchRequest{
		"zero limit":  {Limit: intPtr(0)},
		"huge limit":  {Limit: intPtr(maxLimit + 1)},
		"zero page":   {Page: intPtr(0)},
		"sql in sort": {Order: strPtr("desc; drop table traces")},
	} {
		if _, err := req.params(now); err == nil {
			t.Fatalf("%s must be rejected", name)
		}
	}
}

type fakeTrails struct {
	Trails
	called bool
}

func (f *fakeTrails) Search(context.Context, uint64, *searchParams) (*SearchResponse, error) {
	f.called = true
	return &SearchResponse{Sessions: make([]*Trail, 0)}, nil
}

func (f *fakeTrails) Actions(context.Context, uint64) ([]string, error) {
	f.called = true
	return []string{}, nil
}

func TestTrailsRequireAdmin(t *testing.T) {
	for _, role := range []string{"member", "service", ""} {
		svc := &fakeTrails{}
		h := &handlersImpl{log: logger.New(), service: svc}
		r := httptest.NewRequest(http.MethodPost, "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), "userData", &user.User{Role: role}))
		for _, call := range []func(*api.RequestContext) (any, int, error){h.searchTrails, h.listActions} {
			if _, code, _ := call(&api.RequestContext{Request: r}); code != http.StatusUnauthorized || svc.called {
				t.Fatalf("role %q: got %d called=%v, want 401", role, code, svc.called)
			}
		}
	}
	svc := &fakeTrails{}
	h := &handlersImpl{log: logger.New(), service: svc}
	r := httptest.NewRequest(http.MethodPost, "/", nil)
	r = r.WithContext(context.WithValue(r.Context(), "userData", &user.User{Role: "owner"}))
	if _, code, _ := h.searchTrails(&api.RequestContext{Request: r, Body: []byte(`{"page":1,"limit":20}`)}); code != 0 || !svc.called {
		t.Fatalf("owner must be able to search, got %d", code)
	}
}
