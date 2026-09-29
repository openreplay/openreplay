package auth

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"

	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/user"
)

var errNoSuchProject = errors.New("no such project")

type fakeProjects struct {
	byID map[uint32]*projects.Project
}

func (f *fakeProjects) GetProject(projectID uint32) (*projects.Project, error) {
	return f.GetProjectNotDeleted(projectID)
}

func (f *fakeProjects) GetProjectByKey(projectKey string) (*projects.Project, error) {
	return nil, nil
}

func (f *fakeProjects) GetProjectByKeyAndTenant(projectKey string, tenantId int) (*projects.Project, error) {
	return nil, nil
}

func (f *fakeProjects) GetProjectNotDeleted(projectID uint32) (*projects.Project, error) {
	if p, ok := f.byID[projectID]; ok {
		return p, nil
	}
	return nil, errNoSuchProject
}

func (f *fakeProjects) ListProjectsByTenantID(tenantID int) ([]*projects.Project, error) {
	return nil, nil
}

func (f *fakeProjects) ExistsByName(name string, tenantID int) (bool, error) {
	return false, nil
}

func (f *fakeProjects) CreateProject(tenantID int, name string, platform string) (*projects.Project, error) {
	return nil, nil
}

func newRequest(t *testing.T, pathVar, value string) *http.Request {
	t.Helper()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	if pathVar != "" {
		r = mux.SetURLVars(r, map[string]string{pathVar: value})
	}
	return r
}

func TestValidateProjectAccess(t *testing.T) {
	fp := &fakeProjects{byID: map[uint32]*projects.Project{
		5: {ProjectID: 5, TenantID: 1},
	}}
	a := &authImpl{projects: fp}
	other := &user.User{TenantID: 2}
	owner := &user.User{TenantID: 1}

	cases := []struct {
		name     string
		pathVar  string
		value    string
		u        *user.User
		wantDeny bool
	}{
		{"no project on route", "", "", other, false},
		{"own tenant, plain id", "projectId", "5", owner, false},
		{"cross tenant, plain id", "projectId", "5", other, true},
		{"cross tenant, plus prefix", "projectId", "+5", other, true},
		{"cross tenant, leading zero", "projectId", "05", other, true},
		{"cross tenant, negative", "projectId", "-5", other, true},
		{"cross tenant, uint32 overflow", "projectId", "4294967301", other, true},
		{"garbage id", "projectId", "5abc", other, true},
		{"empty id", "projectId", "", other, false},
		{"zero id", "projectId", "0", other, true},
		{"project path var name", "project", "5", other, true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := newRequest(t, c.pathVar, c.value)
			err := a.validateProjectAccess(r, c.u)
			if c.wantDeny && err == nil {
				t.Fatalf("expected access to be denied, got nil error")
			}
			if !c.wantDeny && err != nil {
				t.Fatalf("expected access to be allowed, got error: %s", err)
			}
		})
	}
}

func TestValidateProjectAccessNoProjectsService(t *testing.T) {
	a := &authImpl{}
	r := newRequest(t, "projectId", "+5")
	if err := a.validateProjectAccess(r, &user.User{TenantID: 2}); err != nil {
		t.Fatalf("expected nil when projects service is not configured, got: %s", err)
	}
}
