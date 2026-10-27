package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/gorilla/mux"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
)

type fakeService struct {
	Service
	list      []*ProjectListItem
	created   *ProjectRequest
	updated   *ProjectRequest
	deleteErr error
	addErr    error
	renamed   int
}

func (f *fakeService) List(context.Context, uint64) ([]*ProjectListItem, error) {
	return f.list, nil
}

func (f *fakeService) Create(_ context.Context, _ uint64, req *ProjectRequest) (*ProjectInfo, error) {
	f.created = req
	return &ProjectInfo{ProjectID: 7, Name: req.Name, Platform: req.Platform}, nil
}

func (f *fakeService) Update(_ context.Context, _ uint64, projectID uint32, req *ProjectRequest) (*ProjectUpdated, error) {
	f.updated = req
	return &ProjectUpdated{ProjectID: projectID, Name: req.Name}, nil
}

func (f *fakeService) Delete(context.Context, uint64, uint32) error {
	return f.deleteErr
}

func (f *fakeService) AddMetadata(_ context.Context, _ uint64, _ uint32, key string) (*MetadataKey, error) {
	if f.addErr != nil {
		return nil, f.addErr
	}
	return &MetadataKey{Key: key, Index: 1}, nil
}

func (f *fakeService) RenameMetadata(_ context.Context, _ uint64, _ uint32, index int, key string) (*MetadataKey, error) {
	f.renamed = index
	return &MetadataKey{Key: key, Index: index}, nil
}

func newRequest(u *user.User, vars map[string]string, body string) *api.RequestContext {
	r := httptest.NewRequest(http.MethodPost, "/", nil)
	r = r.WithContext(context.WithValue(r.Context(), "userData", u))
	r = mux.SetURLVars(r, vars)
	return &api.RequestContext{Request: r, Body: []byte(body)}
}

func newHandlers(svc Service) *handlersImpl {
	return &handlersImpl{log: logger.New(), service: svc}
}

func TestProjectWritesRequireAdmin(t *testing.T) {
	member := &user.User{ID: 1, Role: "member"}
	svc := &fakeService{}
	h := newHandlers(svc)
	vars := map[string]string{"projectId": "5", "project": "5"}

	calls := map[string]func(*api.RequestContext) (any, int, error){
		"create":      h.createProject,
		"update":      h.updateProject,
		"delete":      h.deleteProject,
		"sample rate": h.updateCaptureRate,
	}
	for name, call := range calls {
		t.Run(name, func(t *testing.T) {
			_, code, err := call(newRequest(member, vars, `{"name":"site","rate":10}`))
			if code != http.StatusUnauthorized || !errors.Is(err, errRoleRequired) {
				t.Fatalf("got (%d, %v), want 401 role error", code, err)
			}
		})
	}
	if svc.created != nil || svc.updated != nil {
		t.Fatalf("service must not be called for members")
	}
}

func TestCreateProject(t *testing.T) {
	tests := []struct {
		name     string
		user     *user.User
		body     string
		wantCode int
		wantName string
	}{
		{"owner creates", &user.User{Role: "owner"}, `{"name":" new  site ","platform":"web","projectId":3,"gdpr":{}}`, 0, "new site"},
		{"admin without all projects", &user.User{Role: "admin", Projects: map[uint32]bool{1: true}}, `{"name":"site"}`, http.StatusUnauthorized, ""},
		{"invalid json", &user.User{Role: "admin"}, `{"name":`, http.StatusBadRequest, ""},
		{"invalid name", &user.User{Role: "admin"}, `{"name":"<b>"}`, http.StatusBadRequest, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := &fakeService{}
			resp, code, err := newHandlers(svc).createProject(newRequest(tt.user, nil, tt.body))
			if code != tt.wantCode {
				t.Fatalf("got code %d (%v), want %d", code, err, tt.wantCode)
			}
			if tt.wantCode != 0 {
				return
			}
			p := resp.(*ProjectInfo)
			if p.Name != tt.wantName || p.Platform != "web" {
				t.Fatalf("unexpected project: %+v", p)
			}
		})
	}
}

func TestUpdateProjectKeepsPlatformWhenOmitted(t *testing.T) {
	svc := &fakeService{}
	_, code, err := newHandlers(svc).updateProject(newRequest(&user.User{Role: "admin"}, map[string]string{"projectId": "9"}, `{"name":"renamed"}`))
	if code != 0 || err != nil {
		t.Fatalf("unexpected failure: %d %v", code, err)
	}
	if svc.updated.Platform != "" {
		t.Fatalf("platform must stay empty so the stored value is kept, got %q", svc.updated.Platform)
	}
}

func TestListProjectsFiltersByRoleProjects(t *testing.T) {
	svc := &fakeService{list: []*ProjectListItem{{ProjectID: 1}, {ProjectID: 2}, {ProjectID: 3}}}
	h := newHandlers(svc)

	resp, _, _ := h.listProjects(newRequest(&user.User{Projects: map[uint32]bool{2: true}}, nil, ""))
	if got := resp.([]*ProjectListItem); len(got) != 1 || got[0].ProjectID != 2 {
		t.Fatalf("restricted role must only see project 2, got %+v", got)
	}

	resp, _, _ = h.listProjects(newRequest(&user.User{}, nil, ""))
	if got := resp.([]*ProjectListItem); len(got) != 3 {
		t.Fatalf("unrestricted role must see all projects, got %d", len(got))
	}

	svc.list = nil
	resp, _, _ = h.listProjects(newRequest(&user.User{}, nil, ""))
	body, _ := json.Marshal(resp)
	if string(body) != "[]" {
		t.Fatalf("empty list must serialize as [], got %s", body)
	}
}

func TestErrorStatusMapping(t *testing.T) {
	tests := []struct {
		err      error
		wantCode int
		wantErr  error
	}{
		{ErrProjectNotFound, http.StatusNotFound, ErrProjectNotFound},
		{ErrMetadataNotFound, http.StatusNotFound, ErrMetadataNotFound},
		{ErrNameExists, http.StatusBadRequest, ErrNameExists},
		{ErrMetadataLimit, http.StatusBadRequest, ErrMetadataLimit},
		{errors.New("pq: relation does not exist"), http.StatusInternalServerError, errInternal},
	}
	for _, tt := range tests {
		t.Run(tt.err.Error(), func(t *testing.T) {
			svc := &fakeService{deleteErr: tt.err}
			_, code, err := newHandlers(svc).deleteProject(newRequest(&user.User{Role: "owner"}, map[string]string{"projectId": "4"}, ""))
			if code != tt.wantCode || !errors.Is(err, tt.wantErr) {
				t.Fatalf("got (%d, %v), want (%d, %v)", code, err, tt.wantCode, tt.wantErr)
			}
		})
	}
}

func TestMetadataHandlers(t *testing.T) {
	u := &user.User{Role: "member"}
	h := newHandlers(&fakeService{})

	resp, code, err := h.addMetadata(newRequest(u, map[string]string{"project": "3"}, `{"key":" plan ","index":4}`))
	if code != 0 || err != nil || !reflect.DeepEqual(resp, &MetadataKey{Key: "plan", Index: 1}) {
		t.Fatalf("unexpected add result: %+v %d %v", resp, code, err)
	}

	for _, idx := range []string{"0", "11", "x"} {
		_, code, err = h.renameMetadata(newRequest(u, map[string]string{"project": "3", "index": idx}, `{"key":"plan"}`))
		if code != http.StatusBadRequest || !errors.Is(err, errMetadataIndex) {
			t.Fatalf("index %s: got (%d, %v), want 400", idx, code, err)
		}
	}

	_, code, _ = h.addMetadata(newRequest(u, map[string]string{"project": "3"}, `{"key":"   "}`))
	if code != http.StatusBadRequest {
		t.Fatalf("empty key must be rejected, got %d", code)
	}
}

func TestLimits(t *testing.T) {
	resp, _, _ := newHandlers(&fakeService{}).getLimits(newRequest(&user.User{}, nil, ""))
	body, _ := json.Marshal(resp)
	if string(body) != `{"teamMember":-1,"projects":-1}` {
		t.Fatalf("unexpected limits: %s", body)
	}
}
